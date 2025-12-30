/**
 * Project Zip Upload and Handling Mixin
 */
Object.assign(SchemaEditor.prototype, {
    async prepareZipPreview(file) {
        if (!file || !file.name.toLowerCase().endsWith('.zip')) {
            AppUI.showAlert('Invalid File', 'Please select a valid .zip project file.');
            return;
        }

        this.pendingZipFile = file;
        const prompt = document.getElementById('dropZonePrompt');
        const preview = document.getElementById('zipPreview');
        const actions = document.getElementById('zipActions');
        const fileNameEl = document.getElementById('previewFileName');
        const fileSizeEl = document.getElementById('previewFileSize');
        const fileListEl = document.getElementById('zipFileList');

        if (!prompt || !preview || !actions) return;

        try {
            AppUI.showLoading('Analyzing zip contents...');
            const zip = await JSZip.loadAsync(file);

            fileNameEl.textContent = file.name;
            fileSizeEl.textContent = (file.size / (1024 * 1024)).toFixed(2) + ' MB';

            fileListEl.innerHTML = '';

            // 1. Build a tree structure from flat paths
            const tree = { name: file.name, children: {}, isDir: true };

            Object.keys(zip.files).forEach(path => {
                if (path.startsWith('__MACOSX/') || path.includes('.DS_Store')) return;

                const parts = path.split('/').filter(p => p !== '');
                if (parts.length === 0) return;

                let current = tree;
                parts.forEach((part, index) => {
                    if (!current.children[part]) {
                        current.children[part] = {
                            name: part,
                            children: {},
                            isDir: index < parts.length - 1 || zip.files[path].dir
                        };
                    }
                    current = current.children[part];
                });
            });

            // 2. Recursive function to render the tree with box-drawing characters
            const renderTree = (node, prefix = '', isLast = true, depth = 0) => {
                if (depth > 0) {
                    const div = document.createElement('div');

                    // Tree lines span
                    const connector = isLast ? '└── ' : '├── ';
                    const treeLine = document.createElement('span');
                    treeLine.className = 'zip-tree-line';
                    treeLine.textContent = prefix + connector;
                    div.appendChild(treeLine);

                    // Icon & Name span
                    const nameSpan = document.createElement('span');
                    nameSpan.className = 'zip-item-name ' + (node.isDir ? 'zip-item-folder' : 'zip-item-file');

                    const icon = node.isDir ? '📁 ' : '📄 ';
                    nameSpan.textContent = icon + node.name + (node.isDir ? '/' : '');
                    div.appendChild(nameSpan);

                    fileListEl.appendChild(div);
                }

                const childNames = Object.keys(node.children).sort((a, b) => {
                    // Folders first, then files
                    const nodeA = node.children[a];
                    const nodeB = node.children[b];
                    if (nodeA.isDir && !nodeB.isDir) return -1;
                    if (!nodeA.isDir && nodeB.isDir) return 1;
                    return a.localeCompare(b);
                });

                const newPrefix = depth === 0 ? '' : prefix + (isLast ? '    ' : '│   ');

                childNames.forEach((name, index) => {
                    const childIsLast = index === childNames.length - 1;
                    renderTree(node.children[name], newPrefix, childIsLast, depth + 1);
                });
            };

            renderTree(tree);

            prompt.style.display = 'none';
            preview.style.display = 'flex';
            actions.style.display = 'flex';
            document.getElementById('zipDropZone')?.classList.add('has-preview');

        } catch (error) {
            console.error('Failed to read zip:', error);
            AppUI.showAlert('Error', 'Failed to read zip file contents.');
        } finally {
            AppUI.hideLoading();
        }
    },

    async uploadPendingZip() {
        if (!this.pendingZipFile) return;
        const file = this.pendingZipFile;
        this.pendingZipFile = null; // Clear so we don't re-upload
        await this.handleZipUpload(file);
    },

    clearZipPreview() {
        const prompt = document.getElementById('dropZonePrompt');
        const preview = document.getElementById('zipPreview');
        const actions = document.getElementById('zipActions');
        const fileInput = document.getElementById('zipFileInput');

        if (prompt) prompt.style.display = 'flex';
        if (preview) preview.style.display = 'none';
        if (actions) actions.style.display = 'none';
        if (fileInput) fileInput.value = '';
        document.getElementById('zipDropZone')?.classList.remove('has-preview');
        this.pendingZipFile = null;
    },

    async handleZipUpload(file) {
        if (!file || !file.name.toLowerCase().endsWith('.zip')) {
            console.error('Invalid file type. Please upload a .zip file.');
            return;
        }

        try {
            AppUI.showLoading('Reading zip file...');
            const zipBuffer = await file.arrayBuffer();
            await this.unzipAndSaveProject(zipBuffer, file.name);
        } catch (error) {
            console.error('Zip upload failed:', error);
            AppUI.hideLoading();
            AppUI.showAlert('Upload Failed', 'There was an error processing the zip file: ' + error.message);
        }
    },

    async unzipAndSaveProject(zipBuffer, originalFileName) {
        const zip = await JSZip.loadAsync(zipBuffer);

        // 1. Determine Project Name
        let baseName = originalFileName.replace(/\.zip$/i, '');

        // Check for common suffixes like -project-v1 or -project-2023
        const projectMatch = baseName.match(/^(.*?[_-]project)([_-].*)?$/i);
        let projectName = projectMatch ? projectMatch[1].replace('_project', '-project') : baseName;

        if (!projectName.endsWith('-project')) {
            projectName += '-project';
        }

        // Detect common root folder more robustly
        let rootPrefix = '';
        const entries = Object.keys(zip.files);
        const paths = entries.filter(e => !e.startsWith('__MACOSX/') && !e.includes('.DS_Store'));

        if (paths.length > 0) {
            const firstParts = paths.map(p => p.split('/')[0]);
            const allSameRoot = firstParts.every(p => p === firstParts[0]);
            if (allSameRoot) {
                const potentialRoot = firstParts[0];
                if (potentialRoot.endsWith('-project') || potentialRoot.endsWith('_project')) {
                    projectName = potentialRoot.replace('_project', '-project');
                    rootPrefix = potentialRoot + '/';
                }
            }
        }

        // Ensure we have a directory handle
        if (!this.projectsDirectoryHandle) {
            const pickerOpts = { mode: 'readwrite' };
            if (this.appRootHandle) pickerOpts.startIn = this.appRootHandle;
            this.projectsDirectoryHandle = await window.showDirectoryPicker(pickerOpts);
            await saveHandle(this.projectsDirectoryHandle);
        }

        if ((await this.projectsDirectoryHandle.queryPermission({ mode: 'readwrite' })) !== 'granted') {
            AppUI.hideLoading();
            await this.projectsDirectoryHandle.requestPermission({ mode: 'readwrite' });
        }

        // 2. Handle Collisions
        let existingProject = false;
        try {
            await this.projectsDirectoryHandle.getDirectoryHandle(projectName);
            existingProject = true;
        } catch (e) {
            // Project doesn't exist
        }

        let targetProjectName = projectName;
        if (existingProject) {
            AppUI.hideLoading();
            const action = await AppUI.showProjectConflictDialog(projectName);
            if (action === 'cancel') {
                AppUI.hideLoading();
                return;
            } else if (action === 'copy') {
                targetProjectName = await this.getUniqueProjectName(projectName);
            }
            // 'update' continues with targetProjectName = projectName
        }

        AppUI.showLoading(`Extracting to ${targetProjectName}...`);

        // 3. Extract Files
        const projectHandle = await this.projectsDirectoryHandle.getDirectoryHandle(targetProjectName, { create: true });

        for (const [path, zipFile] of Object.entries(zip.files)) {
            if (zipFile.dir) continue;

            // Remove the original top-level folder prefix if it was detected
            let targetPath = path;
            if (rootPrefix && path.startsWith(rootPrefix)) {
                targetPath = path.substring(rootPrefix.length);
            }

            const pathParts = targetPath.split('/');
            const fileName = pathParts.pop();
            let currentDirHandle = projectHandle;

            for (const part of pathParts) {
                if (!part) continue;
                currentDirHandle = await currentDirHandle.getDirectoryHandle(part, { create: true });
            }

            try {
                const fileHandle = await currentDirHandle.getFileHandle(fileName, { create: true });
                const writable = await fileHandle.createWritable();
                const content = await zipFile.async('uint8array');
                await writable.write(content);
                await writable.close();
            } catch (err) {
                console.warn(`Could not extract file ${path}:`, err);
            }
        }

        document.getElementById('createProjectModal').style.display = 'none';
        await this.scanProjects(false);
        AppUI.hideLoading();
        AppUI.showAlert('Success', `Project "${targetProjectName}" has been ${existingProject && targetProjectName === projectName ? 'updated' : 'uploaded'} successfully.`);
    },

    async getUniqueProjectName(baseName) {
        const base = baseName.replace(/[-_]project$/, '');
        let n = 0;
        while (n < 1000) {
            const paddedN = String(n).padStart(3, '0');
            const candidateName = `${base}_${paddedN}-project`;
            try {
                await this.projectsDirectoryHandle.getDirectoryHandle(candidateName);
                n++;
            } catch (e) {
                // Found a name that doesn't exist
                return candidateName;
            }
        }
        return `${base}_${Math.floor(Math.random() * 10000)}-project`; // Ultimate fallback
    }
});
