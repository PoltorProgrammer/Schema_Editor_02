/**
 * Export and Save Mixin for SchemaEditor
 */
Object.assign(SchemaEditor.prototype, {
    async saveChanges(isAutoSave = false) {
        if (!this.hasUnsavedChanges) return;

        if (!this.currentProject || this.currentProject.isPreDiscovered) {
            // Don't prompt for folder connection during auto-save
            if (isAutoSave) return;

            const confirmed = await AppUI.showConfirm(
                'Folder Not Connected',
                'This project is currently in read-only mode. Would you like to select the "projects" folder on your computer to enable saving?'
            );
            if (confirmed) {
                await this.scanProjects();
                // After scanning, if the project is now connected, retry saving
                if (this.currentProject && !this.currentProject.isPreDiscovered) {
                    return this.saveChanges(isAutoSave);
                }
            }
            return;
        }

        try {
            // Check for Username (required for backups)
            if (!this.settings.username) {
                // Don't prompt for nickname during auto-save
                if (isAutoSave) return;

                const name = await AppUI.showNicknamePrompt(
                    "Nickname Required",
                    "Please enter a nickname for version tracking (e.g., 'Joan'):"
                );
                if (name && name.trim()) {
                    this.settings.username = name.trim();
                    this.saveSettingsToStorage();
                } else {
                    return; // Can't save without name
                }
            }

            if (!isAutoSave) AppUI.showProcessing('Saving changes...');
            const project = this.currentProject;
            const analysisHandle = await project.handle.getDirectoryHandle('analysis_data');

            // 1. Locate Main File
            const baseName = project.name.replace(/[-_]project$/, '');
            let fileName = `${baseName}-analysis_data.json`; // Default modern name

            // Try to respect existing file name
            for await (const [name, handle] of analysisHandle.entries()) {
                if (name.endsWith('.json')) {
                    fileName = name;
                    break;
                }
            }

            const fileHandle = await analysisHandle.getFileHandle(fileName, { create: true });

            // 2. Read Current Disk State
            const diskFile = await fileHandle.getFile();
            const diskText = await diskFile.text();
            let diskJson;
            try {
                diskJson = JSON.parse(diskText);
            } catch (e) {
                // If empty or invalid, assume empty object or handle error
                console.warn("Could not parse disk version, assuming fresh save.");
                diskJson = {};
            }

            // 3. Concurrency Check
            // Ensure we have a Primal Base. If not (legacy session), assume Disk is Primal to avoid false conflict on first save,
            // OR if session existed, use diskJson as best-effort base if no primal. 
            // Correct logic: If we loaded the project, primalSchema IS set.
            const baseSchema = this.primalSchema || diskJson;

            // Update My Metadata before comparison (as this is what I INTEND to save)
            this.currentSchema.last_updated_at = new Date().toISOString();
            this.currentSchema.last_updated_by = this.settings.username;

            // Perform Analysis
            let result = { status: 'clean' };
            // specific check: if diskJson differs from baseSchema, then someone else saved.
            // ConcurrencyManager.analyze handles the 3-way check.
            if (typeof ConcurrencyManager !== 'undefined') {
                result = ConcurrencyManager.analyze(baseSchema, diskJson, this.currentSchema);
            } else {
                console.warn("ConcurrencyManager not loaded, skipping conflict checks.");
            }

            let showWarning = false;
            let warningMessage = "";
            let showSuccessMessage = isAutoSave ? "Auto-saved!" : "Project saved!";

            // 4. Handle Status
            if (result.status === 'conflict') {
                const timestamp = AppUtils.getTimestamp();
                const conflictDir = await project.handle.getDirectoryHandle('conflicts', { create: true });

                // Save Backup Versions
                const writeConflict = async (name, data) => {
                    const h = await conflictDir.getFileHandle(name, { create: true });
                    const w = await h.createWritable();
                    await w.write(JSON.stringify(data, null, 2));
                    await w.close();
                };

                const userTheirs = diskJson.last_updated_by || 'Unknown';
                const userMine = this.settings.username || 'Me';

                await writeConflict(`${baseName}_base_${timestamp}.json`, baseSchema);
                await writeConflict(`${baseName}_conflict_by_${userTheirs}_${timestamp}.json`, diskJson);
                await writeConflict(`${baseName}_conflict_by_${userMine}_${timestamp}.json`, this.currentSchema);

                const report = ConcurrencyManager.generateReport(baseSchema, diskJson, this.currentSchema, result.conflicts);
                await writeConflict(`${baseName}_report_${timestamp}.json`, report);

                // Logic: "Version kept... from user who entered the last".
                // We overwrite with OUR version (Last Writer), but backups exist.
                // We update our in-memory primal to match what we just wrote.

                showWarning = true;
                warningMessage = `Conflict detected with user "${userTheirs}".\n\nA conflict report and copies of all versions have been saved to the "conflicts" folder.\n\nYour version has been saved as the working version.`;
            }
            else if (result.status === 'mergeable') {
                // Apply merge
                this.currentSchema = result.merged;
                // Update timestamp again on the results? 
                // The merged result should probably keep the LATEST timestamp or generate new.
                // analyzing logic usually merges content. Metadata might need refresh.
                this.currentSchema.last_updated_at = new Date().toISOString();
                this.currentSchema.last_updated_by = this.settings.username; // I am the merger

                // Refresh UI to show merged changes
                if (this.processProjectData) this.processProjectData();
                if (this.renderFieldsTable) this.renderFieldsTable();
                if (this.selectedField && this.showFieldDetails) this.showFieldDetails(this.selectedField);

                showSuccessMessage = `Merged changes from ${diskJson.last_updated_by}.`;
            }

            // 5. Write to Disk (Overwrite) - for clean, mergeable, AND conflict (Last Writer Wins policy)
            const writable = await fileHandle.createWritable();
            const content = JSON.stringify(this.currentSchema, null, 2);
            await writable.write(content);
            await writable.close();

            // 6. Update State
            // The state on disk is now exactly this.currentSchema. So that becomes our new Primal.
            this.primalSchema = JSON.parse(JSON.stringify(this.currentSchema));
            this.lastKnownModificationTime = (await fileHandle.getFile()).lastModified;

            // 7. Standard Security Copy (Historical Backup)
            if (this.settings.username) {
                try {
                    await this.createSecurityCopy(project, baseName, content, this.settings.username);
                } catch (backupErr) {
                    console.warn("Backup creation failed:", backupErr);
                }
            }

            if (!isAutoSave) AppUI.hideProcessing();
            this.hasUnsavedChanges = false;
            this.updateHeaderMetadata();
            this.updateSaveButtonUI();

            if (showWarning && AppUI.showAlert) {
                await AppUI.showAlert("Conflict Warning", warningMessage);
            } else {
                AppUI.showSaveSuccess(showSuccessMessage);
            }

        } catch (error) {
            if (!isAutoSave) AppUI.hideProcessing();
            AppUI.showError(`Error saving project: ${error.message}`);
        }
    },



    async createSecurityCopy(project, projectName, content, username) {
        const securityDir = await project.handle.getDirectoryHandle('security_copies', { create: true });

        // Naming: [project_name]-analysis_data-[YYMMDDhhmmss]-[nickname].json
        const timestamp = AppUtils.getTimestamp();

        const backupName = `${projectName}-analysis_data-${timestamp}-${username}.json`;

        // Write Backup
        const backupHandle = await securityDir.getFileHandle(backupName, { create: true });
        const writable = await backupHandle.createWritable();
        await writable.write(content);
        await writable.close();

        // Pruning: Keep last 30 versions for THIS user
        const files = [];
        const prefix = `${projectName}-analysis_data-`;
        const suffix = `-${username}.json`;

        for await (const [name, handle] of securityDir.entries()) {
            // Filter by user and project pattern to be safe
            if (name.startsWith(prefix) && name.endsWith(suffix)) {
                files.push({ name, handle });
            }
        }

        // Sort desc (newest first)
        files.sort((a, b) => {
            if (a.name < b.name) return 1;
            if (a.name > b.name) return -1;
            return 0;
        });

        // Delete if > 30 (keep 0-29, delete 30+)
        if (files.length > 30) {
            for (let i = 30; i < files.length; i++) {
                try {
                    await securityDir.removeEntry(files[i].name);
                    console.log(`Pruned old backup: ${files[i].name}`);
                } catch (e) {
                    console.warn(`Failed to prune ${files[i].name}`, e);
                }
            }
        }

    },

    downloadFile(name) {
        const b = new Blob([JSON.stringify(this.currentSchema, null, 2)], { type: 'application/json' });
        const u = URL.createObjectURL(b);
        const a = document.createElement('a'); a.href = u; a.download = name; a.click(); URL.revokeObjectURL(u);
        AppUI.showSaveSuccess('Downloaded!');
    },

    async downloadProgress() {
        if (!this.currentProject) return;

        AppUI.showProcessing('Processing...');

        // 1. Try to save locally if the project folder is connected
        if (!this.currentProject.isPreDiscovered) {
            try {
                const project = this.currentProject;
                const analysisHandle = await project.handle.getDirectoryHandle('analysis_data');

                const baseName = project.name.replace('_project', '');
                let fileName = `${baseName}_analysis_data.json`;
                for await (const [name, handle] of analysisHandle.entries()) {
                    if (name.endsWith('.json')) {
                        fileName = name;
                        break;
                    }
                }

                const fileHandle = await analysisHandle.getFileHandle(fileName, { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(JSON.stringify(this.currentSchema, null, 2));
                await writable.close();

                this.hasUnsavedChanges = false;
                this.updateSaveButtonUI();
            } catch (error) {
                console.warn("Auto-save failed during download progress, proceeding to browser download:", error);
            }
        }

        // 2. Trigger Browser Download
        const timestamp = AppUtils.getTimestamp();
        const baseName = this.currentProject.name.replace(/[-_]project$/, '');
        const fileName = `${timestamp}-${baseName}-analysis_data.json`;

        const b = new Blob([JSON.stringify(this.currentSchema, null, 2)], { type: 'application/json' });
        const u = URL.createObjectURL(b);
        const a = document.createElement('a'); a.href = u; a.download = fileName; a.click(); URL.revokeObjectURL(u);

        AppUI.hideProcessing();
        AppUI.showDownloadProgressSuccess();
    },

    async downloadFilteredFields() {
        const filtered = { type: "object", properties: {}, required: [], additionalProperties: true };
        this.filteredFields.forEach(f => {
            const c = JSON.parse(JSON.stringify(f.definition));
            ['group_id', 'changes', 'errors', 'comments', 'improvements'].forEach(k => delete c[k]);
            filtered.properties[f.id] = c;
        });
        const name = `filtered_schema_v${(this.currentVersion + 1).toString().padStart(3, '0')}.json`;
        if (this.directoryHandle) {
            try {
                const h = await this.directoryHandle.getFileHandle(name, { create: true });
                const w = await h.createWritable();
                await w.write(JSON.stringify(filtered, null, 2));
                await w.close();
                AppUI.showDownloadSuccess(); return;
            } catch { }
        }
        const b = new Blob([JSON.stringify(filtered, null, 2)], { type: 'application/json' });
        const u = URL.createObjectURL(b);
        const a = document.createElement('a'); a.href = u; a.download = name; a.click(); URL.revokeObjectURL(u);
        AppUI.showDownloadSuccess();
    }
});
