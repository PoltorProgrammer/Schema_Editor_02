/**
 * Export and Save Mixin for SchemaEditor
 */
Object.assign(SchemaEditor.prototype, {
    async saveChanges() {
        if (!this.hasUnsavedChanges) return;

        if (!this.currentProject || this.currentProject.isPreDiscovered) {
            const confirmed = await AppUI.showConfirm(
                'Folder Not Connected',
                'This project is currently in read-only mode. Would you like to select the "projects" folder on your computer to enable saving?'
            );
            if (confirmed) {
                await this.scanProjects();
                // After scanning, if the project is now connected, retry saving
                if (this.currentProject && !this.currentProject.isPreDiscovered) {
                    return this.saveChanges();
                }
            }
            return;
        }

        try {
            // Check for Username (required for backups)
            if (!this.settings.username) {
                const name = await AppUI.showNicknamePrompt(
                    "Nickname Required",
                    "Please enter a nickname for version tracking (e.g., 'Joan'):"
                );
                if (name && name.trim()) {
                    this.settings.username = name.trim();
                    this.saveSettingsToStorage();
                }
            }

            AppUI.showProcessing('Saving changes...');
            const project = this.currentProject;
            const analysisHandle = await project.handle.getDirectoryHandle('analysis_data');

            // 1. Save Main File
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
            const writable = await fileHandle.createWritable();
            const content = JSON.stringify(this.currentSchema, null, 2);
            await writable.write(content);
            await writable.close();

            // 2. Create Security Copy (Backup)
            if (this.settings.username) {
                try {
                    await this.createSecurityCopy(project, baseName, content, this.settings.username);
                } catch (backupErr) {
                    console.warn("Backup creation failed:", backupErr);
                }
            }

            AppUI.hideProcessing();
            this.hasUnsavedChanges = false;
            this.updateSaveButtonUI();
            AppUI.showSaveSuccess('Project saved!');
        } catch (error) {
            AppUI.hideProcessing();
            AppUI.showError(`Error saving project: ${error.message}`);
        }
    },



    async createSecurityCopy(project, projectName, content, username) {
        const securityDir = await project.handle.getDirectoryHandle('security_copies', { create: true });

        // Naming: [project_name]-analysis_data-[YYMMDDhhmmss]-[nickname].json
        const now = new Date();
        const yy = String(now.getFullYear()).slice(-2);
        const MM = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        const ss = String(now.getSeconds()).padStart(2, '0');
        const timestamp = `${yy}${MM}${dd}${hh}${mm}${ss}`;

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
