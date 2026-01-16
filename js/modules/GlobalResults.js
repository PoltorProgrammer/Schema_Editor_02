/**
 * Global Results Module for SchemaEditor
 * Handles aggregation of data across all projects for averaged statistics.
 */
Object.assign(SchemaEditor.prototype, {
    async showGlobalResults(skipModal = false) {
        if (!this.projects || this.projects.length < 2) {
            AppUI.showAlert('Not Enough Projects', 'Global analysis requires at least 2 projects.');
            localStorage.removeItem('isGlobalViewActive');
            return;
        }

        let selectedProjects;
        if (skipModal) {
            const lastSelection = JSON.parse(localStorage.getItem('lastGlobalProjectSelection') || '[]');
            selectedProjects = this.projects.filter(p => lastSelection.includes(p.name));
            if (selectedProjects.length < 2) {
                selectedProjects = await this.showProjectSelectionModal();
            }
        } else {
            selectedProjects = await this.showProjectSelectionModal();
        }

        if (!selectedProjects || selectedProjects.length < 2) {
            if (!skipModal) localStorage.removeItem('isGlobalViewActive');
            return;
        }

        AppUI.showLoading('Aggregating Global Data...');
        try {
            this.isGlobalView = true;
            localStorage.setItem('isGlobalViewActive', 'true');
            localStorage.setItem('lastActivePage', 'results');
            this.validationData = {};
            this.medixtractOutputData = {};
            this.allFields = [];
            const fieldMap = new Map();
            const projectNames = [];
            let totalPatients = 0;
            const uniqueFieldIds = new Set();

            for (const project of selectedProjects) {
                projectNames.push(project.name);

                // Load project data handles
                const validationHandle = await project.handle.getDirectoryHandle('validation_data');
                const analysisHandle = await project.handle.getDirectoryHandle('analysis_data');
                let medixtractHandle;
                try {
                    medixtractHandle = await project.handle.getDirectoryHandle('medixtract_output');
                } catch (e) { }

                // Load validation data
                for (const vFile of project.validationFiles) {
                    try {
                        const vHandle = await validationHandle.getFileHandle(vFile.name);
                        const vData = JSON.parse(await (await vHandle.getFile()).text());
                        const shortProject = project.name.replace(/[-_]project$/, '');
                        const globalPid = `${shortProject} / ${vFile.patientId}`;
                        this.validationData[globalPid] = vData;
                        totalPatients++;
                    } catch (e) {
                        console.warn(`Error loading validation file ${vFile.name} in project ${project.name}`);
                    }
                }

                // Load medixtract outputs
                if (medixtractHandle && project.medixtractOutputFiles) {
                    for (const mFile of project.medixtractOutputFiles) {
                        try {
                            const mHandle = await medixtractHandle.getFileHandle(mFile.name);
                            const mData = JSON.parse(await (await mHandle.getFile()).text());
                            const shortProject = project.name.replace(/[-_]project$/, '');
                            const globalPid = `${shortProject} / ${mFile.patientId}`;
                            if (!this.medixtractOutputData[globalPid]) this.medixtractOutputData[globalPid] = [];
                            this.medixtractOutputData[globalPid].push(mData);
                        } catch (e) {
                            console.warn(`Error loading output file ${mFile.name} in project ${project.name}`);
                        }
                    }
                }

                // Load and merge fields (schema)
                let mainFileHandle;
                const baseName = project.name.replace(/[-_]project$/, '');
                for await (const [name, handle] of analysisHandle.entries()) {
                    if (name.endsWith('.json')) {
                        if (name.includes(baseName)) {
                            mainFileHandle = handle;
                            break;
                        }
                        if (!mainFileHandle) mainFileHandle = handle;
                    }
                }

                if (mainFileHandle) {
                    const analysisData = JSON.parse(await (await mainFileHandle.getFile()).text());
                    const properties = analysisData.properties || {};
                    const fields = analysisData.fields || [];

                    const mergeField = (id, field) => {
                        if (!id || id === 'note') return;
                        uniqueFieldIds.add(id);
                        if (!fieldMap.has(id)) {
                            fieldMap.set(id, JSON.parse(JSON.stringify(field)));
                            fieldMap.get(id).performance = {};
                            // Ensure the object itself has the id if it didn't
                            if (!fieldMap.get(id).variable_id) fieldMap.get(id).variable_id = id;
                        }
                        const globalField = fieldMap.get(id);
                        if (field.performance) {
                            Object.entries(field.performance).forEach(([pid, perf]) => {
                                const shortProject = project.name.replace(/[-_]project$/, '');
                                globalField.performance[`${shortProject} / ${pid}`] = perf;
                            });
                        }
                    };

                    // Handle both properties object and fields array
                    Object.entries(properties).forEach(([id, field]) => mergeField(id, field));
                    if (Array.isArray(fields)) {
                        fields.forEach(field => mergeField(field.variable_id || field.id, field));
                    }
                }
            }

            // Create a virtual project state
            this.currentSchema = { properties: Object.fromEntries(fieldMap) };
            this.currentProject = { name: 'global_averages' };
            this.currentProjectDisplay = `Global Averages`;
            this.globalProjectNames = projectNames;
            this.globalTotalPatients = totalPatients;
            this.globalTotalFields = uniqueFieldIds.size;

            this.processProjectData();
            this.showResultsPage();

        } catch (error) {
            console.error('Global aggregation failed:', error);
            AppUI.showAlert('Error', 'Failed to aggregate project results: ' + error.message);
            this.isGlobalView = false;
        } finally {
            AppUI.hideLoading();
        }
    },

    showProjectSelectionModal() {
        return new Promise((resolve) => {
            const modal = document.getElementById('customModal');
            const titleEl = document.getElementById('customModalTitle');
            const messageEl = document.getElementById('customModalMessage');
            const footerEl = document.getElementById('customModalFooter');

            if (!modal) {
                resolve(null);
                return;
            }

            titleEl.textContent = 'Select Projects for Global Analysis';

            // Get last selection from localStorage
            const lastSelection = JSON.parse(localStorage.getItem('lastGlobalProjectSelection') || '[]');

            let html = `
                <div style="margin-bottom: 1rem; color: var(--gray-600); font-size: 0.95rem;">
                    Select at least 2 projects to aggregate. This may take a moment depending on the number of patients.
                </div>
                <div class="project-selection-list" style="max-height: 300px; overflow-y: auto; background: var(--gray-50); border: 1px solid var(--gray-200); border-radius: var(--radius); padding: 0.5rem;">
            `;

            this.projects.forEach(project => {
                const isChecked = lastSelection.includes(project.name) || lastSelection.length === 0;
                const displayName = project.name.replace(/[-_]project$/, '').replace(/_/g, ' ');
                html += `
                    <label class="project-selection-item" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; border-radius: var(--radius-sm); cursor: pointer; transition: background 0.2s;">
                        <input type="checkbox" name="globalProject" value="${project.name}" ${isChecked ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer;">
                        <div style="flex: 1;">
                            <div style="font-weight: 600; text-transform: capitalize; color: var(--gray-800);">${displayName}</div>
                            <div style="font-size: 0.8rem; color: var(--gray-500);">${project.validationFiles?.length || 0} Patients</div>
                        </div>
                    </label>
                `;
            });
            html += `</div>`;

            messageEl.innerHTML = html;
            footerEl.innerHTML = '';

            const cancelBtn = document.createElement('button');
            const confirmBtn = document.createElement('button');

            cancelBtn.textContent = 'Cancel';
            confirmBtn.textContent = 'Start Analysis';

            cancelBtn.className = 'btn btn-ghost';
            confirmBtn.className = 'btn btn-primary';

            const updateConfirmState = () => {
                const selected = document.querySelectorAll('input[name="globalProject"]:checked');
                confirmBtn.disabled = selected.length < 2;
                confirmBtn.style.opacity = selected.length < 2 ? '0.5' : '1';
            };

            const cleanup = () => {
                modal.classList.remove('active');
                setTimeout(() => {
                    modal.style.display = 'none';
                    messageEl.innerHTML = '';
                }, 200);
            };

            cancelBtn.onclick = () => {
                cleanup();
                resolve(null);
            };

            confirmBtn.onclick = () => {
                const selectedNames = Array.from(document.querySelectorAll('input[name="globalProject"]:checked')).map(cb => cb.value);
                if (selectedNames.length < 2) return;

                // Save selection to localStorage
                localStorage.setItem('lastGlobalProjectSelection', JSON.stringify(selectedNames));

                const selectedProjects = this.projects.filter(p => selectedNames.includes(p.name));
                cleanup();
                resolve(selectedProjects);
            };

            // Add change listeners to checkboxes
            messageEl.querySelectorAll('input[name="globalProject"]').forEach(cb => {
                cb.onchange = updateConfirmState;
            });

            footerEl.appendChild(cancelBtn);
            footerEl.appendChild(confirmBtn);

            modal.style.display = 'flex';
            requestAnimationFrame(() => {
                modal.classList.add('active');
                updateConfirmState();
            });
        });
    }
});
