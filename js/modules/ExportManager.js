/**
 * Export and Save Mixin for SchemaEditor
 */
Object.assign(SchemaEditor.prototype, {
    async saveChanges(options = {}) {
        const { isBackground = false, forceRemoteWin = false } = options;

        if (!this.hasUnsavedChanges && !isBackground) return;

        if (!this.currentProject || this.currentProject.isPreDiscovered) {
            if (isBackground) return; // Silent skip
            const confirmed = await AppUI.showConfirm(
                'Folder Not Connected',
                'This project is currently in read-only mode. Would you like to select the "projects" folder on your computer to enable saving?'
            );
            if (confirmed) {
                await this.scanProjects();
                if (this.currentProject && !this.currentProject.isPreDiscovered) {
                    return this.saveChanges(options);
                }
            }
            return;
        }

        try {
            // Check for Username (required for backups)
            if (!this.settings.username && !isBackground) {
                const name = await AppUI.showNicknamePrompt(
                    "Nickname Required",
                    "Please enter a nickname for version tracking (e.g., 'Joan'):"
                );
                if (name && name.trim()) {
                    this.settings.username = name.trim();
                    this.saveSettingsToStorage();
                }
            }

            if (!isBackground) AppUI.showProcessing('Saving changes...');
            const project = this.currentProject;
            const analysisHandle = await project.handle.getDirectoryHandle('analysis_data');

            // 1. Identify Main File
            const baseName = project.name.replace(/[-_]project$/, '');
            let fileName = `${baseName}-analysis_data.json`;
            for await (const [name, handle] of analysisHandle.entries()) {
                if (name.endsWith('.json')) {
                    fileName = name;
                    break;
                }
            }

            // 2. Read-Merge-Write Cycle
            const fileHandle = await analysisHandle.getFileHandle(fileName, { create: true });
            const file = await fileHandle.getFile();
            const remoteText = await file.text();
            let remoteSchema;
            try {
                remoteSchema = JSON.parse(remoteText);
            } catch (e) {
                console.warn("Could not parse remote file, assuming empty or corrupt. Overwriting.", e);
                remoteSchema = this.baseSchema || this.currentSchema;
            }

            // 3. Perform 3-Way Merge
            if (!this.baseSchema) this.baseSchema = JSON.parse(JSON.stringify(remoteSchema));

            const mergeResult = MergeManager.merge(
                this.baseSchema,
                this.currentSchema,
                remoteSchema,
                this.settings.username,
                forceRemoteWin
            );

            this.currentSchema = mergeResult.merged;

            // 4. Handle Conflicts (Logs)
            if (mergeResult.conflicts.length > 0) {
                console.log("Merge Conflicts Detected:", mergeResult.conflicts);
                try {
                    const conflictsDir = await this.currentProject.handle.getDirectoryHandle('conflicts', { create: true });
                    const logName = `conflict-${AppUtils.getTimestamp()}-${this.settings.username}.json`;
                    const logHandle = await conflictsDir.getFileHandle(logName, { create: true });
                    const logWritable = await logHandle.createWritable();
                    const logData = MergeManager.generateConflictLog(this.currentProject, mergeResult.conflicts);
                    await logWritable.write(JSON.stringify(logData, null, 2));
                    await logWritable.close();
                } catch (logErr) {
                    console.error("Failed to write conflict log:", logErr);
                }
            }

            // 5. Notify if we won (Overwrote others) - Suppress in background
            if (!isBackground && mergeResult.overrodeOthers.length > 0) {
                const conflictDetails = mergeResult.overrodeOthers.map(c => {
                    return c.patient_id ? `${c.variable_id} (Patient: ${c.patient_id})` : c.variable_id;
                }).join(', ');

                const losers = [...new Set(mergeResult.overrodeOthers.map(c => c.remote_user))].join(', ');

                AppUI.showToast(`Conflict Warning: Your version of ${conflictDetails} was kept, overriding changes by: ${losers}`, 'warning', 6000);
            }

            // 6. Write Final Merged Content
            const writable = await fileHandle.createWritable();
            this.currentSchema.last_updated_at = new Date().toISOString();
            this.currentSchema.last_updated_by = this.settings.username || 'System';

            const content = JSON.stringify(this.currentSchema, null, 2);
            await writable.write(content);
            await writable.close();

            // 7. Update Class State
            this.baseSchema = JSON.parse(content);
            this.lastKnownModificationTime = (await fileHandle.getFile()).lastModified;
            this.hasUnsavedChanges = false;

            // 8. Security Copy (Backup)
            if (this.settings.username) {
                try {
                    await this.createSecurityCopy(project, baseName, content, this.settings.username);
                } catch (backupErr) {
                    console.warn("Backup creation failed:", backupErr);
                }
            }

            if (!isBackground) {
                AppUI.hideProcessing();
                this.updateHeaderMetadata();
                this.updateSaveButtonUI();
                AppUI.showSaveSuccess('Project saved!');
            } else {
                // Background sync also needs to update UI metadata but silently
                this.updateHeaderMetadata();
                this.updateSaveButtonUI();
            }
        } catch (error) {
            if (!isBackground) {
                AppUI.hideProcessing();
                AppUI.showError(`Error saving project: ${error.message}`);
            } else {
                console.error("Background save failed:", error);
            }
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
    },

    async checkForExternalUpdates() {
        if (!this.currentProject || !this.currentAnalysisFileHandle) return;

        try {
            // 1. Check Main File
            const file = await this.currentAnalysisFileHandle.getFile();
            if (file.lastModified > this.lastKnownModificationTime) {
                console.log("External change detected. Processing...");

                const text = await file.text();
                const remoteSchema = JSON.parse(text);

                if (!this.baseSchema) this.baseSchema = this.currentSchema;

                if (!this.hasUnsavedChanges) {
                    // SILENT AUTO-SYNC: No local edits to protect
                    this.currentSchema = remoteSchema;
                    this.baseSchema = JSON.parse(JSON.stringify(remoteSchema));
                    this.lastKnownModificationTime = file.lastModified;
                    if (typeof this.processProjectData === 'function') {
                        this.processProjectData();
                        this.updateHeaderMetadata();
                    }
                } else {
                    // PROACTIVE CONFLICT DETECTION: User is currently editing
                    // Use a 3-way merge to detect if remote changes overlap with unsaved local changes
                    // Pass forceRemoteWin=true because the Remote save is "Last"
                    const mergeResult = MergeManager.merge(
                        this.baseSchema,
                        this.currentSchema,
                        remoteSchema,
                        this.settings.username,
                        true
                    );

                    if (mergeResult.conflicts.length > 0) {
                        // OVERLAP DETECTED: Someone else saved changes to a variable we are currently editing
                        const winner = remoteSchema.last_updated_by || 'Another user';
                        // Pass full conflict info so the modal can show variable + patient
                        const conflicts = mergeResult.conflicts;
                        console.warn("Proactive partial merge detected. Conflict on:", conflicts);

                        // Refresh UI to show adoption of non-conflicting remote changes
                        if (typeof this.processProjectData === 'function') {
                            this.processProjectData();
                        }

                        // Trigger background save to officialize non-conflicting edits
                        if (typeof this.saveChanges === 'function') {
                            try {
                                // IMPORTANT: pass forceRemoteWin=true so Remote wins the conflict we just detected
                                await this.saveChanges({ isBackground: true, forceRemoteWin: true });
                                console.log("Non-conflicting local edits successfully committed to disk.");
                            } catch (err) {
                                console.error("Failed to commit safe edits during proactive merge:", err);
                            }
                        }

                        await AppUI.showLoserModal(winner, conflicts);
                        return;
                    } else {
                        // CLEAN MERGE: Someone else saved changes to variables we AREN'T editing
                        if (typeof this.saveChanges === 'function') {
                            try {
                                // Background sync will adopt remote and keep non-conflicting local changes
                                await this.saveChanges({ isBackground: true, forceRemoteWin: true });
                                console.log("Silent clean merge and safe-save completed.");
                            } catch (err) {
                                console.error("Failed to save during clean merge:", err);
                            }
                        }

                        if (typeof this.processProjectData === 'function') {
                            this.processProjectData();
                        }
                    }
                }
            }

            // 2. Check for "Loser" Notifications (Conflict Logs)
            await this.checkConflictLogs();

        } catch (error) {
            console.warn("Polling error:", error);
        }
    },

    async checkConflictLogs() {
        if (!this.currentProject || !this.settings.username) return;

        try {
            const conflictsDir = await this.currentProject.handle.getDirectoryHandle('conflicts', { create: false });

            // We only care about logs created AFTER we last checked (or last loaded)
            if (!this.lastCheckedConflictTime) this.lastCheckedConflictTime = Date.now();

            let latestFound = this.lastCheckedConflictTime;
            for await (const [name, handle] of conflictsDir.entries()) {
                if (name.endsWith('.json')) {
                    const file = await handle.getFile();
                    if (file.lastModified > this.lastCheckedConflictTime) {
                        if (file.lastModified > latestFound) latestFound = file.lastModified;

                        // New log! Read it.
                        const text = await file.text();
                        const log = JSON.parse(text);

                        // Check if we are the "Remote User" (the one who was overwritten)
                        const myLosses = (log.details || []).filter(d => d.remote_user === this.settings.username);

                        if (myLosses.length > 0) {
                            // Usage: Show Modal
                            const winner = myLosses[0].winner || (log.details && log.details[0] ? log.details[0].winner : 'Another user');
                            // Fix: Pass full conflict objects so modal can read variable_id and patient_id
                            AppUI.showLoserModal(winner, myLosses);
                            this.lastCheckedConflictTime = Date.now();
                            return;
                        }
                    }
                }
            }
            this.lastCheckedConflictTime = latestFound;

        } catch (e) {
            // No conflicts folder or error reading
        }
    }
});
