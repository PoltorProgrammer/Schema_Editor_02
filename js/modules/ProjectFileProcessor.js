/**
 * Project File Processing and Analysis Generation Mixin
 */
Object.assign(SchemaEditor.prototype, {
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
    },

    async generateAnalysisFile(projectHandle, projectName, validationFiles, medixtractFiles, validationDirHandle, medixtractDirHandle) {
        try {
            console.log("Attempting to auto-generate analysis data for", projectName);
            // 1. Get Template
            let templateData;
            try {
                // Try projects root 'template' folder
                const templateDir = await this.projectsDirectoryHandle.getDirectoryHandle('template');
                const templateFile = await templateDir.getFileHandle('template.json');
                const file = await templateFile.getFile();
                templateData = JSON.parse(await file.text());
            } catch (e) {
                console.error("Could not find template/template.json for generation", e);
                return false;
            }

            // 2. Load Data
            const humanData = {};
            const aiData = {};

            // Validation Data
            for (const vf of validationFiles) {
                try {
                    const fh = await validationDirHandle.getFileHandle(vf.name);
                    const json = JSON.parse(await (await fh.getFile()).text());
                    humanData[vf.patientId] = json;
                } catch (e) { console.warn("Error reading validation file for gen", vf.name); }
            }

            // MediXtract Data
            for (const mf of medixtractFiles) {
                try {
                    const fh = await medixtractDirHandle.getFileHandle(mf.name);
                    const json = JSON.parse(await (await fh.getFile()).text());
                    if (!aiData[mf.patientId]) aiData[mf.patientId] = [];
                    // Handle array wrapper if present, though users usually fix this
                    if (Array.isArray(json)) {
                        aiData[mf.patientId].push(...json);
                    } else {
                        aiData[mf.patientId].push(json);
                    }
                } catch (e) { console.warn("Error reading medixtract file for gen", mf.name); }
            }

            // 3. Construct Analysis Data
            const newAnalysis = {
                properties: {}
            };

            // Get Union of keys from validation data map
            const validKeys = new Set();
            for (const pid in humanData) {
                Object.keys(humanData[pid]).forEach(k => validKeys.add(k));
            }

            if (templateData.groups) newAnalysis.groups = templateData.groups;

            for (const [key, prop] of Object.entries(templateData.properties)) {
                if (!validKeys.has(key)) continue;

                newAnalysis.properties[key] = { ...prop, performance: {} };
                const performance = newAnalysis.properties[key].performance;

                for (const pid of Object.keys(humanData)) {
                    // Initialize patient perf
                    const hVal = humanData[pid][key]; // Human Value
                    const aiVals = aiData[pid] ? aiData[pid].map(o => o[key]).filter(v => v !== undefined) : [];

                    // Determine AI Value (Most Frequent)
                    let bestAiVal = null;
                    if (aiVals.length > 0) {
                        const counts = {};
                        for (const av of aiVals) {
                            const vStr = String(av);
                            counts[vStr] = (counts[vStr] || 0) + 1;
                        }
                        let maxC = -1;
                        let maxV = null;
                        for (const v in counts) {
                            if (counts[v] > maxC) {
                                maxC = counts[v];
                                maxV = v;
                            }
                        }
                        bestAiVal = maxV;
                    }

                    // Compare
                    const hValStr = (hVal === null || hVal === undefined) ? "" : String(hVal);
                    const aiValStr = (bestAiVal === null) ? "" : String(bestAiVal);

                    // Similarity
                    let similarity = 0;
                    if (hValStr.toLowerCase() === aiValStr.toLowerCase()) {
                        similarity = 1.0;
                    } else if (hValStr && aiValStr) {
                        similarity = this._calculateSimilarity(hValStr, aiValStr);
                    }

                    // Logic: Match >= 90% (0.9)
                    const isMatch = similarity >= 0.9;

                    performance[pid] = {
                        pending: !isMatch,
                        severity: 1,
                        comment: "",
                        last_updated: new Date().toISOString(),
                        output: [],
                        reviewed: isMatch,
                        matched: isMatch,
                        unmatched: !isMatch ? hValStr : null
                    };

                    // Populate output counts
                    if (aiVals.length > 0) {
                        const counts = {};
                        aiVals.forEach(v => {
                            const s = String(v);
                            counts[s] = (counts[s] || 0) + 1;
                        });
                        performance[pid].output = Object.entries(counts).map(([val, count]) => ({
                            value: val,
                            count: count
                        }));
                    }
                }
            }

            // 4. Write File
            const analysisDir = await projectHandle.getDirectoryHandle('analysis_data', { create: true });

            const cleanName = projectName.replace(/[-_]project$/, '').replace(/_/g, '_');
            const fileName = `${cleanName}-analysis_data.json`;
            console.log("Writing generated analysis file:", fileName);

            const fileHandle = await analysisDir.getFileHandle(fileName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(JSON.stringify(newAnalysis, null, 2));
            await writable.close();

            return true;

        } catch (e) {
            console.error("Generator Error", e);
            return false;
        }
    },

    _calculateSimilarity(s1, s2) {
        if (s1 === s2) return 1.0;
        if (!s1 || !s2) return 0.0;

        s1 = String(s1).toLowerCase();
        s2 = String(s2).toLowerCase();

        const longer = s1.length > s2.length ? s1 : s2;
        const shorter = s1.length > s2.length ? s2 : s1;
        const longerLength = longer.length;
        if (longerLength === 0) return 1.0;

        // Levenshtein distance
        const costs = new Array();
        for (let i = 0; i <= shorter.length; i++) {
            let lastValue = i;
            for (let j = 0; j <= longer.length; j++) {
                if (i == 0) costs[j] = j;
                else {
                    if (j > 0) {
                        let newValue = costs[j - 1];
                        if (shorter.charAt(i - 1) != longer.charAt(j - 1))
                            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                        costs[j - 1] = lastValue;
                        lastValue = newValue;
                    }
                }
            }
            if (i > 0) costs[longer.length] = lastValue;
        }

        return (longerLength - costs[longer.length]) / parseFloat(longerLength);
    }
});
