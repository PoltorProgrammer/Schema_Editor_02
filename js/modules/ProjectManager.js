/**
 * Core Project Management Mixin for SchemaEditor
 * Handles scanning and loading projects.
 */

Object.assign(SchemaEditor.prototype, {
    async scanProjects(isAutoLoad = false, forcePicker = false) {
        try {
            AppUI.showLoading('Scanning for projects...');

            let rootHandle = this.pendingHandle || this.projectsDirectoryHandle || this.appRootHandle;

            // 1. Acquire Handle if needed or forced
            if (!rootHandle || forcePicker) {
                try {
                    // Use a specific ID for Google Drive connection so the browser "remembers" G:\
                    // after the first time you select it.
                    const isFirstDriveConnect = !this.projectsDirectoryHandle && !this.appRootHandle;

                    const pickerOpts = {
                        mode: 'readwrite',
                        id: isFirstDriveConnect ? 'google-drive-connect' : 'schema-editor-main'
                    };

                    // Prioritize current known handles for startIn to make "Enter" confirmation easy
                    if (this.projectsDirectoryHandle) {
                        pickerOpts.startIn = this.projectsDirectoryHandle;
                    } else if (this.appRootHandle) {
                        pickerOpts.startIn = this.appRootHandle;
                    } else if (this.pendingHandle) {
                        pickerOpts.startIn = this.pendingHandle;
                    } else {
                        // Fallback for the very first time if no handles are known
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
                        let analysisHandle = null;
                        let validationHandle = null;
                        let medixtractHandle = null;

                        try {
                            validationHandle = await handle.getDirectoryHandle('validation_data');
                        } catch (e) {
                            // Validation data is mandatory for a valid project in this context
                            // console.warn(`Skipping ${name}: No validation_data folder`);
                            continue;
                        }

                        try {
                            analysisHandle = await handle.getDirectoryHandle('analysis_data');
                        } catch (e) {
                            // Analysis data might be missing, we can try to generate it
                        }

                        try {
                            medixtractHandle = await handle.getDirectoryHandle('medixtract_output');
                        } catch (e) { /* might not exist */ }

                        // Deep Validation: Check Validation Data
                        const validationFiles = [];
                        for await (const [vName, vHandle] of validationHandle.entries()) {
                            if (vName.endsWith('.json')) {
                                try {
                                    const file = await vHandle.getFile();
                                    const text = await file.text();
                                    JSON.parse(text);

                                    const patientId = vName.split('-')[0];
                                    validationFiles.push({
                                        name: vName,
                                        patientId: patientId
                                    });
                                } catch (e) { /* invalid json */ }
                            }
                        }

                        // Check MediXtract Output Data
                        const medixtractFiles = [];
                        if (medixtractHandle) {
                            for await (const [mName, mHandle] of medixtractHandle.entries()) {
                                if (mName.endsWith('.json')) {
                                    try {
                                        const file = await mHandle.getFile();
                                        const text = await file.text();
                                        JSON.parse(text);

                                        const patientId = mName.split('-')[0];
                                        medixtractFiles.push({
                                            name: mName,
                                            patientId: patientId
                                        });
                                    } catch (e) { /* invalid json */ }
                                }
                            }
                        }

                        // Deep Validation: Check Analysis Data
                        let hasValidAnalysis = false;
                        if (analysisHandle) {
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
                        }

                        // Auto-Generation Logic
                        if (!hasValidAnalysis && validationFiles.length > 0 && medixtractFiles.length > 0) {
                            // Try to generate analysis data from template
                            const success = await this.generateAnalysisFile(handle, name, validationFiles, medixtractFiles, validationHandle, medixtractHandle);
                            if (success) {
                                hasValidAnalysis = true;
                            }
                        }

                        if (validationFiles.length === 0) {
                            console.warn(`Skipping ${name}: No .json files found in validation_data.`);
                            continue;
                        }

                        // Even if it has no valid analysis yet, we show it (it might be a fresh project)
                        newProjects.push({
                            name,
                            handle,
                            validationFiles,
                            medixtractOutputFiles: medixtractFiles,
                            hasValidAnalysis: hasValidAnalysis
                        });

                    } catch (e) {
                        console.warn(`Skipping invalid project folder: ${name}`, e);
                    }
                }
            }

            this.projects = newProjects;


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
            AppUI.hideLoading();
            this.renderProjectList();
        } finally {
            AppUI.hideLoading();
        }
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
            this.hasUnsavedChanges = false;

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

            }

            this.currentSchema = analysisData;

            // Format project name: Remove suffix, replace underscores with spaces, and Capitalize Each Word
            const cleanName = projectName.replace(/[-_]project$/, '').replace(/_/g, ' ');
            const capitalizedName = cleanName.split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');

            document.getElementById('currentVersion').innerHTML = `Project: <span class="project-name-vibrant">${capitalizedName}</span>`;

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
    }
});
