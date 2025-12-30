/**
 * Project Creation (Manual) Mixin
 */
Object.assign(SchemaEditor.prototype, {
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
        this.clearZipPreview();
        this.pendingZipFile = null;
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
    }
});
