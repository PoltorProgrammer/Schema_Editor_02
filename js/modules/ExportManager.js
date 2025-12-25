/**
 * Export and Save Mixin for SchemaEditor
 */
Object.assign(SchemaEditor.prototype, {
    async saveChanges() {
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
            AppUI.showProcessing('Saving changes...');
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

            AppUI.hideProcessing();
            this.hasUnsavedChanges = false;
            this.updateSaveButtonUI();
            AppUI.showSaveSuccess('Project saved!');
        } catch (error) {
            AppUI.hideProcessing();
            AppUI.showError(`Error saving project: ${error.message}`);
        }
    },

    downloadFile(name) {
        const b = new Blob([JSON.stringify(this.currentSchema, null, 2)], { type: 'application/json' });
        const u = URL.createObjectURL(b);
        const a = document.createElement('a'); a.href = u; a.download = name; a.click(); URL.revokeObjectURL(u);
        AppUI.showSaveSuccess('Downloaded!');
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
