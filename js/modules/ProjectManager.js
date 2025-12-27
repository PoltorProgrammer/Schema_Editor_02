/**
 * Project Management Mixin for SchemaEditor
 */

// IndexedDB Helpers for persistent directory handle
const DB_NAME = 'SchemaEditorDB';
const DB_VERSION = 1;
const STORE_NAME = 'handles';
const HANDLE_KEY = 'projectRootHandle';

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function saveHandle(handle) {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            store.put(handle, HANDLE_KEY);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } catch (e) {
        console.warn("Retaining handle failed", e);
    }
}

async function getHandle() {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.get(HANDLE_KEY);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    } catch (e) {
        return null; // DB might not be ready or available
    }
}

Object.assign(SchemaEditor.prototype, {
    async showProjectSelection(forceDashboard) {
        if (this.hasUnsavedChanges) {
            const confirm = await AppUI.showConfirm('Unsaved Changes', 'You have unsaved changes. Are you sure you want to leave?');
            if (!confirm) return;
            this.hasUnsavedChanges = false; // Reset if user confirmed leaving
            this.updateSaveButtonUI();
        }
        const projectSelection = document.getElementById('projectSelection');
        const schemaEditor = document.getElementById('schemaEditor');
        const emptyState = document.getElementById('emptyState');
        const loading = document.getElementById('loadingIndicator');

        if (projectSelection) projectSelection.style.display = 'block';
        if (schemaEditor) schemaEditor.style.display = 'none';
        if (emptyState) emptyState.style.display = 'none';
        if (loading) loading.style.display = 'none';

        document.getElementById('saveBtn').style.display = 'none';
        document.getElementById('addPatientBtn').style.display = 'none';
        document.getElementById('addOutputBtn').style.display = 'none';
        document.getElementById('downloadFilteredBtn').style.display = 'none';

        const isUserAction = forceDashboard && (typeof forceDashboard === 'object' || forceDashboard === true);

        // Try to auto-connect if we have a stored handle and it's not a user logout/dashboard action
        if (!isUserAction && !this.projectsDirectoryHandle) {
            const storedHandle = await getHandle();
            if (storedHandle) {
                this.pendingHandle = storedHandle;
                // Check if we have permission already
                try {
                    const perm = await storedHandle.queryPermission({ mode: 'readwrite' });
                    if (perm === 'granted') {
                        await this.scanProjects(true); // Auto-load enabled
                        return;
                    }
                } catch (e) {
                    console.warn("Permission check failed", e);
                }
            }
        }

        // If we have projects (from PRE_DISCOVERED or scanning), show them
        if (this.projects.length > 0) {
            this.renderProjectList();
        } else {
            // Check config fallback
            if (typeof PRE_DISCOVERED_PROJECTS !== 'undefined' && PRE_DISCOVERED_PROJECTS.length > 0) {
                this.projects = PRE_DISCOVERED_PROJECTS.map(p => ({
                    name: p.name,
                    path: p.path,
                    validationFiles: p.validationFiles,
                    isPreDiscovered: true
                }));
                this.renderProjectList();

                // If auto-load logic applies
                const lastActiveProjectName = localStorage.getItem('lastActiveProject');
                const lastActiveProject = lastActiveProjectName ? this.projects.find(p => p.name === lastActiveProjectName) : null;
                if (!isUserAction && lastActiveProject) {
                    await this.loadProject(lastActiveProject.name);
                }
            } else {
                this.renderProjectList();
            }
        }
    },

    async scanProjects(isAutoLoad = false, forcePicker = false) {
        try {
            AppUI.showLoading('Scanning for projects...');

            let rootHandle = this.pendingHandle || this.projectsDirectoryHandle || this.appRootHandle;

            // 1. Acquire Handle if needed or forced
            if (!rootHandle || forcePicker) {
                try {
                    const pickerOpts = {
                        mode: 'readwrite',
                        id: 'schema-editor-main'
                    };

                    // Prioritize current known handles for startIn to make "Enter" confirmation easy
                    if (this.projectsDirectoryHandle) {
                        pickerOpts.startIn = this.projectsDirectoryHandle;
                    } else if (this.appRootHandle) {
                        pickerOpts.startIn = this.appRootHandle;
                    } else if (this.pendingHandle) {
                        pickerOpts.startIn = this.pendingHandle;
                    } else {
                        pickerOpts.startIn = 'documents';
                    }

                    rootHandle = await window.showDirectoryPicker(pickerOpts);
                } catch (e) {
                    if (e.name === 'AbortError') {
                        return; // finally will call hideLoading
                    }
                    throw e;
                }
            } else {
                // If we have a handle, ensure we have permission
                const perm = await rootHandle.queryPermission({ mode: 'readwrite' });
                if (perm !== 'granted') {
                    const requestedPerm = await rootHandle.requestPermission({ mode: 'readwrite' });
                    if (requestedPerm !== 'granted') {
                        throw new Error("Permission denied to access folder.");
                    }
                }
            }

            this.pendingHandle = null;

            // 2. Determine Structure (Root vs Projects dir)
            let projectsDirHandle = null;
            let appRootHandle = null;

            try {
                // Check if this is the App Root by looking for 'projects' submenu
                const subProjects = await rootHandle.getDirectoryHandle('projects');
                appRootHandle = rootHandle;
                projectsDirHandle = subProjects;
            } catch (e) {
                // Likely not app root (or empty). Assume user picked 'projects' folder directly.
                projectsDirHandle = rootHandle;
            }

            // Persist the *Selected* handle
            await saveHandle(rootHandle);

            // Update Class State
            this.appRootHandle = appRootHandle;
            this.projectsDirectoryHandle = projectsDirHandle;

            // 3. Deep Scan & Validation
            const newProjects = [];
            for await (const [name, handle] of this.projectsDirectoryHandle.entries()) {
                // Determine if it looks like a project folder (ends with _project)
                if (handle.kind === 'directory' && (name.endsWith('_project') || name.endsWith('-project'))) {
                    try {
                        // Check subdirectory structure
                        const analysisHandle = await handle.getDirectoryHandle('analysis_data');
                        const validationHandle = await handle.getDirectoryHandle('validation_data');
                        let medixtractHandle = null;
                        try {
                            medixtractHandle = await handle.getDirectoryHandle('medixtract_output');
                        } catch (e) { /* might not exist yet */ }

                        // Deep Validation: Check Analysis Data
                        let hasValidAnalysis = false;
                        for await (const [fName, fHandle] of analysisHandle.entries()) {
                            if (fName.endsWith('.json')) {
                                try {
                                    const file = await fHandle.getFile();
                                    const text = await file.text();
                                    const json = JSON.parse(text);
                                    if (json && typeof json === 'object') {
                                        hasValidAnalysis = true;
                                        break;
                                    }
                                } catch (e) { /* invalid json */ }
                            }
                        }

                        // Deep Validation: Check Validation Data
                        const validationFiles = [];
                        for await (const [vName, vHandle] of validationHandle.entries()) {
                            if (vName.endsWith('.json')) {
                                try {
                                    const file = await vHandle.getFile();
                                    const text = await file.text();
                                    JSON.parse(text); // Verify validity

                                    const patientId = vName.split('-')[0];

                                    validationFiles.push({
                                        name: vName,
                                        patientId: patientId
                                    });
                                } catch (e) { /* invalid json */ }
                            }
                        }

                        // Deep Validation: Check MediXtract Output Data
                        const medixtractFiles = [];
                        if (medixtractHandle) {
                            for await (const [mName, mHandle] of medixtractHandle.entries()) {
                                if (mName.endsWith('.json')) {
                                    try {
                                        const file = await mHandle.getFile();
                                        const text = await file.text();
                                        JSON.parse(text); // Verify validity

                                        const patientId = mName.split('-')[0];

                                        medixtractFiles.push({
                                            name: mName,
                                            patientId: patientId
                                        });
                                    } catch (e) { /* invalid json */ }
                                }
                            }
                        }

                        if (hasValidAnalysis && validationFiles.length > 0) {
                            newProjects.push({
                                name,
                                handle,
                                validationFiles, // Attach discovered validation files 
                                medixtractOutputFiles: medixtractFiles // Attach discovered medixtract output files
                            });
                        }

                    } catch (e) {
                        console.warn(`Skipping invalid project folder: ${name}`, e);
                    }
                }
            }

            this.projects = newProjects;

            // 4. Update Config File (if we have Root access)
            if (this.appRootHandle) {
                await this.updateConfigFile(newProjects);
            }

            // Handle transition
            if (this.currentProject) {
                const connected = this.projects.find(p => p.name === this.currentProject.name);
                if (connected) {
                    this.currentProject = connected;
                }
            }

            // Trigger "Up to Date" feedback if NOT an auto-load
            if (!isAutoLoad) {
                this._showUpToDateEffect = true;
            }

            // Auto-load logic if applicable
            const lastActiveProjectName = localStorage.getItem('lastActiveProject');
            const lastActiveProject = lastActiveProjectName ? this.projects.find(p => p.name === lastActiveProjectName) : null;

            if (isAutoLoad && lastActiveProject) {
                await this.loadProject(lastActiveProject.name);
            } else {
                this.renderProjectList();
            }

        } catch (error) {
            console.error("Scan Error:", error);
            // No banner alert here, keeping it silent but logging
            AppUI.hideLoading();
            this.renderProjectList();
        } finally {
            AppUI.hideLoading();
        }
    },

    async updateConfigFile(projects) {
        try {
            const jsDir = await this.appRootHandle.getDirectoryHandle('js');
            const fileHandle = await jsDir.getFileHandle('projects-config.js', { create: true });
            const writable = await fileHandle.createWritable();

            const configData = projects.map(p => ({
                name: p.name,
                path: `projects/${p.name}`,
                validationFiles: p.validationFiles || [],
                medixtractOutputFiles: p.medixtractOutputFiles || []
            }));

            const content = `const PRE_DISCOVERED_PROJECTS = ${JSON.stringify(configData, null, 2)};`;

            await writable.write(content);
            await writable.close();
        } catch (e) {
            console.warn("Failed to update config file:", e);
        }
    },

    renderProjectList() {
        const list = document.getElementById('projectList');
        if (!list) return;
        list.innerHTML = '';

        // Hide dashboard button when on dashboard
        const dashboardBtn = document.getElementById('projectDashboardBtn');
        if (dashboardBtn) dashboardBtn.style.display = 'none';

        // 1. "Rescan" Card (First)
        let headerText = "Pick Projects Folder";
        let subText = "Select the 'projects' directory";
        let showChangeOption = false;

        if (this.appRootHandle) {
            headerText = "Rescan System";
            subText = "Scan 'SchemaEditor2' root for updates";
            showChangeOption = true;
        } else if (this.projectsDirectoryHandle) {
            headerText = "Rescan Projects";
            subText = "Rescan currently selected projects folder";
            showChangeOption = true;
        }

        const scanCard = document.createElement('div');
        scanCard.className = 'project-card add-project-card';
        scanCard.onclick = () => this.scanProjects(false, false);
        scanCard.innerHTML = `
            <div class="project-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M10,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V8C22,6.89 21.1,6 20,6H12L10,4Z" />
                </svg>
            </div>
            <div class="project-details" style="position: relative;">
                <h3>${headerText}</h3>
                <p>${subText}</p>
                ${showChangeOption ? '<div style="margin-top:8px; font-size: 0.8em; text-decoration: underline; color: var(--text-secondary);" onclick="event.stopPropagation(); app.scanProjects(false, true)">Change Folder</div>' : ''}
            </div>
        `;

        if (this._showUpToDateEffect) {
            const feedback = document.createElement('div');
            feedback.className = 'up-to-date-feedback';
            feedback.innerText = 'Content Up to Date';
            scanCard.appendChild(feedback);
            this._showUpToDateEffect = false;
        }
        list.appendChild(scanCard);

        // Prepare sorted projects list
        const lastActiveProjectName = localStorage.getItem('lastActiveProject');
        const sortedProjects = [...this.projects];

        // FindRecentlyEdited
        let recentlyEdited = null;
        if (lastActiveProjectName) {
            const idx = sortedProjects.findIndex(p => p.name === lastActiveProjectName);
            if (idx !== -1) {
                recentlyEdited = sortedProjects.splice(idx, 1)[0];
            }
        }

        // 2. Recently Edited Project (Second)
        if (recentlyEdited) {
            list.appendChild(this.createProjectCard(recentlyEdited, true));
        }

        // 3. "Add New Project" Card (Third)
        const addCard = document.createElement('div');
        addCard.className = 'project-card add-project-card';
        addCard.onclick = () => this.handleCreateProject();
        addCard.innerHTML = `
                <div class="project-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
                    </svg>
                </div>
                <div class="project-details">
                    <h3>Add New Project</h3>
                    <p>Create a new project folder</p>
                </div>
            `;
        list.appendChild(addCard);

        // 4. Remaining Projects
        sortedProjects.forEach(project => {
            list.appendChild(this.createProjectCard(project));
        });

        const projectSelection = document.getElementById('projectSelection');
        const loadingIndicator = document.getElementById('loadingIndicator');
        if (projectSelection) projectSelection.style.display = 'block';
        if (loadingIndicator) loadingIndicator.style.display = 'none';
    },

    createProjectCard(project, isRecent = false) {
        const displayName = project.name.replace(/[-_]project$/, '').replace(/_/g, ' ');
        const card = document.createElement('div');
        card.className = 'project-card' + (isRecent ? ' recent-project' : '');
        card.onclick = () => this.loadProject(project.name);

        const patientCount = project.validationFiles ? project.validationFiles.length : 0;

        card.innerHTML = `
            <div class="project-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M10,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V8C22,6.89 21.1,6 20,6H12L10,4Z" />
                </svg>
            </div>
            <div class="project-details">
                <h3 style="text-transform: capitalize;">${displayName}</h3>
                <p>${isRecent ? 'Recently Edited' : (project.isPreDiscovered ? 'Auto-discovered' : 'Local folder')}</p>
                <div style="font-size: 0.8em; color: var(--text-secondary); margin-top: 4px;">
                   ${patientCount} Patient${patientCount !== 1 ? 's' : ''} | ${project.medixtractOutputFiles?.length || 0} Outputs
                </div>
            </div>
        `;
        return card;
    },

    async loadProject(projectName) {
        AppUI.showLoading(`Loading ${projectName}...`);
        try {
            const project = this.projects.find(p => p.name === projectName);
            if (!project) throw new Error('Project not found');

            this.currentProject = project;
            localStorage.setItem('lastActiveProject', projectName);
            this.validationData = {};
            this.medixtractOutputData = {};

            let analysisData;

            if (project.handle) {
                let analysisHandle = await project.handle.getDirectoryHandle('analysis_data');
                let validationHandle = await project.handle.getDirectoryHandle('validation_data');

                let mainFileHandle;
                const baseName = projectName.replace(/[-_]project/, '');

                for await (const [name, handle] of analysisHandle.entries()) {
                    if (name.endsWith('.json')) {
                        if (name.includes(baseName)) {
                            mainFileHandle = handle;
                            break;
                        }
                        if (!mainFileHandle) mainFileHandle = handle;
                    }
                }

                if (!mainFileHandle) throw new Error('No analysis data found.');
                analysisData = JSON.parse(await (await mainFileHandle.getFile()).text());

                if (project.validationFiles) {
                    for (const vFile of project.validationFiles) {
                        try {
                            const vHandle = await validationHandle.getFileHandle(vFile.name);
                            const vData = JSON.parse(await (await vHandle.getFile()).text());
                            this.validationData[vFile.patientId] = vData;
                        } catch (e) { console.warn("Error loading validation file", vFile.name); }
                    }
                }

                if (project.medixtractOutputFiles) {
                    try {
                        const mHandleDir = await project.handle.getDirectoryHandle('medixtract_output');
                        for (const mFile of project.medixtractOutputFiles) {
                            try {
                                const mHandle = await mHandleDir.getFileHandle(mFile.name);
                                const mData = JSON.parse(await (await mHandle.getFile()).text());
                                if (!this.medixtractOutputData[mFile.patientId]) this.medixtractOutputData[mFile.patientId] = [];
                                this.medixtractOutputData[mFile.patientId].push(mData);
                            } catch (e) { console.warn("Error loading medixtract file", mFile.name); }
                        }
                    } catch (e) { console.warn("MediXtract output folder not found or skipped"); }
                }

            } else if (project.isPreDiscovered) {
                const baseName = projectName.replace(/[-_]project/, '');
                const variants = [
                    `${baseName}-analysis_data.json`,
                    `${baseName}_analysis_data.json`,
                    'analysis_data.json',
                    `patient01-${baseName}-analysis_data.json`,
                    `patient01_${baseName}_analysis_data.json`
                ];

                let analysisRes;
                for (const v of variants) {
                    analysisRes = await fetch(`${project.path}/analysis_data/${v}`);
                    if (analysisRes.ok) break;
                }

                if (!analysisRes || !analysisRes.ok) throw new Error('Could not fetch analysis data (404)');
                analysisData = await analysisRes.json();

                if (project.validationFiles) {
                    for (const v of project.validationFiles) {
                        try {
                            const vRes = await fetch(`${project.path}/validation_data/${v.name}`);
                            if (vRes.ok) this.validationData[v.patientId] = await vRes.json();
                        } catch (e) { }
                    }
                }

                if (project.medixtractOutputFiles) {
                    for (const m of project.medixtractOutputFiles) {
                        try {
                            const mRes = await fetch(`${project.path}/medixtract_output/${m.name}`);
                            if (mRes.ok) {
                                const mData = await mRes.json();
                                if (!this.medixtractOutputData[m.patientId]) this.medixtractOutputData[m.patientId] = [];
                                this.medixtractOutputData[m.patientId].push(mData);
                            }
                        } catch (e) { }
                    }
                }
            }

            this.currentSchema = analysisData;
            document.getElementById('currentVersion').textContent = `Project: ${projectName.replace(/[-_]project$/, '')}`;

            try {
                this.processProjectData();
                this.populateFilterOptions();
                this.showSchemaEditor();
            } catch (innerError) {
                console.error("Data processing error:", innerError);
                throw new Error(`Data processing failed: ${innerError.message}`);
            }

        } catch (error) {
            console.error("Project load error:", error);
            AppUI.hideLoading();
            this.renderProjectList();
        } finally {
            AppUI.hideLoading();
        }
    },

    async handleCreateProject() {
        this.showCreateProjectModal();
    },

    showCreateProjectModal() {
        const modal = document.getElementById('createProjectModal');
        if (modal) {
            modal.style.display = 'flex';
            this.resetCreateProjectForm();
        }
    },

    resetCreateProjectForm() {
        document.getElementById('newProjectName').value = '';
        document.getElementById('analyzerSchemaFile').value = '';
        document.getElementById('validationDataFile').value = '';
    },

    async finalizeCreateProject() {
        const rawName = document.getElementById('newProjectName').value.trim();
        const schemaFile = document.getElementById('analyzerSchemaFile').files[0];
        const validationFile = document.getElementById('validationDataFile').files[0];

        if (!rawName || !schemaFile || !validationFile) {
            return; // Silent fail or console as user requested no banners
        }

        const projectName = rawName.toLowerCase().replace(/\s+/g, '_') + '-project';

        try {
            if (!this.projectsDirectoryHandle) {
                const pickerOpts = { mode: 'readwrite' };
                if (this.appRootHandle) pickerOpts.startIn = this.appRootHandle;
                this.projectsDirectoryHandle = await window.showDirectoryPicker(pickerOpts);
                await saveHandle(this.projectsDirectoryHandle);
            }

            if ((await this.projectsDirectoryHandle.queryPermission({ mode: 'readwrite' })) !== 'granted') {
                await this.projectsDirectoryHandle.requestPermission({ mode: 'readwrite' });
            }

            const projectHandle = await this.projectsDirectoryHandle.getDirectoryHandle(projectName, { create: true });
            const analysisDir = await projectHandle.getDirectoryHandle('analysis_data', { create: true });
            const validationDir = await projectHandle.getDirectoryHandle('validation_data', { create: true });
            const medixtractDir = await projectHandle.getDirectoryHandle('medixtract_output', { create: true });

            const cleanName = rawName.toLowerCase().replace(/\s+/g, '_');
            const schemaHandle = await analysisDir.getFileHandle(`${cleanName}-analysis_data.json`, { create: true });
            const schemaWritable = await schemaHandle.createWritable();
            await schemaWritable.write(await schemaFile.text());
            await schemaWritable.close();

            const validationHandle = await validationDir.getFileHandle(`patient01-${cleanName}-validation_data.json`, { create: true });
            const validationWritable = await validationHandle.createWritable();
            await validationWritable.write(await validationFile.text());
            await validationWritable.close();

            document.getElementById('createProjectModal').style.display = 'none';
            await this.scanProjects(false);

        } catch (error) {
            console.error(`Failed to create project: ${error.message}`);
        }
    },

    async handleAddPatientClick() {
        if ('showOpenFilePicker' in window && this.currentProject) {
            try {
                const pickerOpts = {
                    types: [{
                        description: 'JSON Files',
                        accept: { 'application/json': ['.json'] },
                    }],
                    multiple: true
                };

                // Set default folder to project's validation_data or the projects root
                if (this.currentProject.handle) {
                    try {
                        pickerOpts.startIn = await this.currentProject.handle.getDirectoryHandle('validation_data');
                    } catch (e) {
                        pickerOpts.startIn = this.projectsDirectoryHandle || 'documents';
                    }
                } else if (this.projectsDirectoryHandle) {
                    pickerOpts.startIn = this.projectsDirectoryHandle;
                }

                const fileHandles = await window.showOpenFilePicker(pickerOpts);
                const files = [];
                for (const handle of fileHandles) {
                    files.push(await handle.getFile());
                }
                await this.processPatientFiles(files);
            } catch (e) {
                if (e.name !== 'AbortError') {
                    console.error("File picker error:", e);
                    document.getElementById('patientFileInput').click();
                }
            }
        } else {
            document.getElementById('patientFileInput').click();
        }
    },

    async handleAddPatientFile(e) {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        await this.processPatientFiles(files);
        e.target.value = ''; // Reset input
    },

    async processPatientFiles(files) {
        if (!files || files.length === 0) return;

        AppUI.showLoading('Adding new patient data...');

        try {
            for (const file of files) {
                const text = await file.text();
                let json;
                try {
                    json = JSON.parse(text);
                } catch (err) {
                    console.error("Invalid JSON file:", file.name, err);
                    continue;
                }

                const patientId = json.Patient ? (Array.isArray(json.Patient) ? json.Patient[0] : json.Patient) : file.name.split('-')[0];
                const projectPart = this.currentProject?.name?.replace(/[-_]project$/, '') || 'project';
                const vName = `${patientId}-${projectPart}-validation_data.json`;

                if (!this.validationData) this.validationData = {};
                this.validationData[patientId] = json;

                if (this.currentProject && this.currentProject.handle) {
                    try {
                        const validationHandle = await this.currentProject.handle.getDirectoryHandle('validation_data', { create: true });
                        const fileHandle = await validationHandle.getFileHandle(vName, { create: true });
                        const writable = await fileHandle.createWritable();
                        await writable.write(text);
                        await writable.close();

                        if (!this.currentProject.validationFiles) this.currentProject.validationFiles = [];
                        if (!this.currentProject.validationFiles.some(vf => vf.name === vName)) {
                            this.currentProject.validationFiles.push({
                                name: vName,
                                patientId: patientId
                            });
                            if (this.appRootHandle) {
                                await this.updateConfigFile(this.projects);
                            }
                        }
                    } catch (saveErr) {
                        console.warn("Failed to save patient file:", saveErr);
                    }
                }
            }

            this.processProjectData();
            this.populateFilterOptions();
            this.showSchemaEditor();

        } catch (error) {
            console.error("Error processing patient files:", error);
        } finally {
            AppUI.hideLoading();
        }
    },

    async handleAddOutputClick() {
        if ('showOpenFilePicker' in window && this.currentProject) {
            try {
                const pickerOpts = {
                    types: [{
                        description: 'JSON Files',
                        accept: { 'application/json': ['.json'] },
                    }],
                    multiple: true
                };

                if (this.currentProject.handle) {
                    try {
                        pickerOpts.startIn = await this.currentProject.handle.getDirectoryHandle('medixtract_output');
                    } catch (e) {
                        pickerOpts.startIn = this.projectsDirectoryHandle || 'documents';
                    }
                } else if (this.projectsDirectoryHandle) {
                    pickerOpts.startIn = this.projectsDirectoryHandle;
                }

                const fileHandles = await window.showOpenFilePicker(pickerOpts);
                const files = [];
                for (const handle of fileHandles) {
                    files.push(await handle.getFile());
                }
                await this.processOutputFiles(files);
            } catch (e) {
                if (e.name !== 'AbortError') {
                    console.error("File picker error:", e);
                    document.getElementById('outputFileInput').click();
                }
            }
        } else {
            document.getElementById('outputFileInput').click();
        }
    },

    async handleAddOutputFile(e) {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        await this.processOutputFiles(files);
        e.target.value = ''; // Reset input
    },

    async processOutputFiles(files) {
        if (!files || files.length === 0) return;

        AppUI.showLoading('Adding new output data...');

        try {
            for (const file of files) {
                const text = await file.text();
                let json;
                try {
                    json = JSON.parse(text);
                } catch (err) {
                    console.error("Invalid JSON file:", file.name, err);
                    continue;
                }

                const patientId = json.Patient ? (Array.isArray(json.Patient) ? json.Patient[0] : json.Patient) : file.name.split('-')[0];
                const recordId = json.record_id ? (Array.isArray(json.record_id) ? json.record_id[0] : json.record_id) : '0000';
                const idStr = String(recordId).padStart(8, '0');
                const projectPart = this.currentProject?.name?.replace(/[-_]project$/, '') || 'project';
                const mName = `${patientId}-${idStr}-${projectPart}-medixtract_output.json`;

                if (!this.medixtractOutputData) this.medixtractOutputData = {};
                if (!this.medixtractOutputData[patientId]) this.medixtractOutputData[patientId] = [];
                this.medixtractOutputData[patientId].push(json);

                if (this.currentProject && this.currentProject.handle) {
                    try {
                        const medixtractHandle = await this.currentProject.handle.getDirectoryHandle('medixtract_output', { create: true });
                        const fileHandle = await medixtractHandle.getFileHandle(mName, { create: true });
                        const writable = await fileHandle.createWritable();
                        await writable.write(text);
                        await writable.close();

                        if (!this.currentProject.medixtractOutputFiles) this.currentProject.medixtractOutputFiles = [];
                        if (!this.currentProject.medixtractOutputFiles.some(mf => mf.name === mName)) {
                            this.currentProject.medixtractOutputFiles.push({
                                name: mName,
                                patientId: patientId
                            });
                            if (this.appRootHandle) {
                                await this.updateConfigFile(this.projects);
                            }
                        }
                    } catch (saveErr) {
                        console.warn("Failed to save output file:", saveErr);
                    }
                }
            }

            this.processProjectData();
            this.populateFilterOptions();
            this.showSchemaEditor();

        } catch (error) {
            console.error("Error processing output files:", error);
        } finally {
            AppUI.hideLoading();
        }
    }
});
