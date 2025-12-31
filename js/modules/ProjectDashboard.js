/**
 * Project Dashboard UI Mixin
 */
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
        document.getElementById('downloadProgressBtn').style.display = 'none';
        if (document.getElementById('headerMoreFilter')) {
            document.getElementById('headerMoreFilter').style.display = 'none';
        }

        // Hide schema info (Project name, stats) in dashboard
        const schemaInfo = document.querySelector('.schema-info');
        if (schemaInfo) schemaInfo.style.display = 'none';
        document.getElementById('addPatientBtn').style.display = 'none';
        document.getElementById('addOutputBtn').style.display = 'none';
        document.getElementById('downloadFilteredBtn').style.display = 'none';

        if (this.updateScrollTopVisibility) {
            this.updateScrollTopVisibility();
        }

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

        this.renderProjectList();
    },

    renderProjectList() {
        const list = document.getElementById('projectList');
        if (!list) return;
        list.innerHTML = '';

        // Hide dashboard button when on dashboard
        const dashboardBtn = document.getElementById('projectDashboardBtn');
        if (dashboardBtn) dashboardBtn.style.display = 'none';

        // 1. "Connect/Rescan" Card (Unified)
        let headerText = "Connect Google Drive";
        let subText = "Select your 'projects' folder (G:)";
        let showChangeOption = false;
        let isDriveStyle = true;
        let iconSvg = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21,12H3V18A2,2 0 0,0 5,20H19A2,2 0 0,0 21,18V12M6,17A1,1 0 1,1 7,16A1,1 0 0,1 6,17M10,17A1,1 0 1,1 11,16A1,1 0 0,1 10,17M21,7.24V11H3V7.24A2,2 0 0,1 4,5.53L6.5,4H17.5L20,5.53A2,2 0 0,1 21,7.24Z" />
            </svg>`;

        if (this.appRootHandle) {
            headerText = "Rescan System";
            subText = "Scan 'SchemaEditor2' root for updates";
            showChangeOption = true;
            isDriveStyle = false;
            iconSvg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M10,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V8C22,6.89 21.1,6 20,6H12L10,4Z" /></svg>`;
        } else if (this.projectsDirectoryHandle) {
            headerText = "Rescan Projects";
            subText = "Rescan currently selected projects";
            showChangeOption = true;
        } else if (this.pendingHandle) {
            headerText = `Reconnect "${this.pendingHandle.name}"`;
            subText = "Restore access to previous folder";
            showChangeOption = true;
        }

        const scanCard = document.createElement('div');
        scanCard.className = 'project-card add-project-card';
        if (isDriveStyle) {
            scanCard.style.borderColor = '#4285F4';
        }

        scanCard.onclick = async () => {
            // If completely disconnected (Google Drive mode), show the helpful prompt first
            if (!this.appRootHandle && !this.projectsDirectoryHandle && !this.pendingHandle) {
                const confirm = await AppUI.showConfirm(
                    'Connect Google Drive',
                    'To connect Google Drive, please select your "Google Drive (G:)" folder in the next window.\n\nThen navigate to your "projects" folder.'
                );
                if (confirm) {
                    this.scanProjects(false, true);
                }
            } else {
                // Standard Rescan
                this.scanProjects(false, false);
            }
        };

        scanCard.innerHTML = `
            <div class="project-icon" ${isDriveStyle ? 'style="color: #4285F4;"' : ''}>
                ${iconSvg}
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
        card.onclick = (e) => {
            // Don't load project if clicking the more button or menu
            if (e.target.closest('.project-card-more') || e.target.closest('.project-options-menu')) {
                return;
            }
            this.loadProject(project.name);
        };

        const patientCount = project.validationFiles ? project.validationFiles.length : 0;

        card.innerHTML = `
            <button class="project-card-more" title="More Options">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12,16A2,2 0 0,1 14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18A2,2 0 0,1 12,16M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4Z" />
                </svg>
            </button>
            <div class="project-options-menu">
                <button class="project-option-item" data-action="download">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z" />
                    </svg>
                    Download as Zip
                </button>
                <button class="project-option-item" data-action="duplicate">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M11,17H4A2,2 0 0,1 2,15V3A2,2 0 0,1 4,1H16A2,2 0 0,1 18,3V8H16V3H4V15H11V17M19,21V11H13V21H19M19,9A2,2 0 0,1 21,11V21A2,2 0 0,1 19,23H13A2,2 0 0,1 11,21V11A2,2 0 0,1 13,9H19Z" />
                    </svg>
                    Make a Duplicate
                </button>
                <button class="project-option-item delete" data-action="delete">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19V4M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" />
                    </svg>
                    Delete Project
                </button>
            </div>
            <div class="project-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M10,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V8C22,6.89 21.1,6 20,6H12L10,4Z" />
                </svg>
            </div>
            <div class="project-details">
                <h3 style="text-transform: capitalize;">${displayName}</h3>
                <p>${isRecent ? 'Recently Edited' : 'Local folder'}</p>
                <div style="font-size: 0.8em; color: var(--text-secondary); margin-top: 4px;">
                   ${patientCount} Patient${patientCount !== 1 ? 's' : ''} | ${project.medixtractOutputFiles?.length || 0} Outputs
                </div>
            </div>
        `;

        // More button handler
        const moreBtn = card.querySelector('.project-card-more');
        const menu = card.querySelector('.project-options-menu');
        moreBtn.onclick = (e) => {
            e.stopPropagation();
            const isActive = menu.classList.contains('active');
            // Close all other menus first
            document.querySelectorAll('.project-options-menu.active').forEach(m => m.classList.remove('active'));
            if (!isActive) menu.classList.add('active');
        };

        // Menu item handlers
        menu.querySelectorAll('.project-option-item').forEach(item => {
            item.onclick = async (e) => {
                e.stopPropagation();
                menu.classList.remove('active');
                const action = item.dataset.action;

                if (action === 'download') {
                    await this.downloadProjectAsZip(project);
                } else if (action === 'duplicate') {
                    await this.duplicateProject(project);
                } else if (action === 'delete') {
                    const confirm = await AppUI.showConfirm('Delete Project', `Are you sure you want to delete "${displayName}"? This cannot be undone.`);
                    if (confirm) {
                        await this.deleteProject(project);
                    }
                }
            };
        });

        return card;
    },

    async downloadProjectAsZip(project) {
        if (!project.handle) {
            AppUI.showAlert('Cannot Download', 'This project is auto-discovered and its local files are not accessible for zipping.');
            return;
        }

        try {
            AppUI.showLoading(`Zipping ${project.name}...`);
            const zip = new JSZip();

            // Helper to add files/folders recursively
            const addToZip = async (dirHandle, currentZipFolder) => {
                for await (const [name, handle] of dirHandle.entries()) {
                    if (handle.kind === 'file') {
                        const file = await handle.getFile();
                        currentZipFolder.file(name, file);
                    } else if (handle.kind === 'directory') {
                        const subFolder = currentZipFolder.folder(name);
                        await addToZip(handle, subFolder);
                    }
                }
            };

            const projectFolder = zip.folder(project.name);
            await addToZip(project.handle, projectFolder);

            const content = await zip.generateAsync({ type: 'blob' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = `${project.name}.zip`;
            link.click();
            URL.revokeObjectURL(link.href);

            AppUI.hideLoading();
        } catch (error) {
            console.error('Zip generation failed:', error);
            AppUI.hideLoading();
            AppUI.showAlert('Error', 'Failed to generate project zip.');
        }
    },

    async duplicateProject(project) {
        if (!project.handle || !this.projectsDirectoryHandle) {
            AppUI.showAlert('Cannot Duplicate', 'Local file access is required to duplicate projects.');
            return;
        }

        try {
            AppUI.showLoading(`Duplicating ${project.name}...`);
            const baseName = project.name.replace(/[-_]project$/, '');
            const newProjectName = await this.getUniqueProjectName(baseName);
            const newProjectHandle = await this.projectsDirectoryHandle.getDirectoryHandle(newProjectName, { create: true });

            const copyDir = async (sourceHandle, targetHandle) => {
                for await (const [name, handle] of sourceHandle.entries()) {
                    if (handle.kind === 'file') {
                        const sourceFile = await handle.getFile();
                        const targetFileHandle = await targetHandle.getFileHandle(name, { create: true });
                        const writable = await targetFileHandle.createWritable();
                        await writable.write(sourceFile);
                        await writable.close();
                    } else if (handle.kind === 'directory') {
                        const subTargetHandle = await targetHandle.getDirectoryHandle(name, { create: true });
                        await copyDir(handle, subTargetHandle);
                    }
                }
            };

            await copyDir(project.handle, newProjectHandle);
            await this.scanProjects(false);
            AppUI.hideLoading();
            AppUI.showAlert('Success', `Project duplicated as "${newProjectName}"`);
        } catch (error) {
            console.error('Duplication failed:', error);
            AppUI.hideLoading();
            AppUI.showAlert('Error', 'Failed to duplicate project.');
        }
    },

    async deleteProject(project) {
        if (!project.handle || !this.projectsDirectoryHandle) {
            AppUI.showAlert('Cannot Delete', 'Local file access is required to delete projects.');
            return;
        }

        try {
            AppUI.showLoading(`Deleting ${project.name}...`);
            // FileSystemDirectoryHandle.removeEntry is for single files or folders.
            // For recursive deletion, it often needs to be done carefully or with older spec helpers if needed.
            // But directoryHandle.removeEntry(name, { recursive: true }) is supported in modern browsers.
            await this.projectsDirectoryHandle.removeEntry(project.name, { recursive: true });

            // If current project was deleted, clear it
            if (this.currentProject && this.currentProject.name === project.name) {
                this.currentProject = null;
                localStorage.removeItem('lastActiveProject');
            }

            await this.scanProjects(false);
            AppUI.hideLoading();
        } catch (error) {
            console.error('Deletion failed:', error);
            AppUI.hideLoading();
            AppUI.showAlert('Error', 'Failed to delete project folder: ' + error.message);
        }
    }
});
