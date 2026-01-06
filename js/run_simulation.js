
// Mock Dependencies
const AppUI = {
    showProcessing: (msg) => console.log(`[UI] Processing: ${msg}`),
    hideProcessing: () => console.log(`[UI] Hide Processing`),
    showSaveSuccess: (msg, type) => console.log(`[UI] Save Success: "${msg}" (Type: ${type})`),
    showLoserModal: (winner, vars) => console.log(`[UI] Loser Modal: Winner=${winner}, Vars=${vars}`),
    showConfirm: async () => true,
    showNicknamePrompt: async () => "Tester"
};

const AppUtils = {
    getTimestamp: () => "20240101-120000"
};

// Mock File System Handles
class MockFileHandle {
    constructor(name, content = "") {
        this.name = name;
        this.content = content;
        this.kind = 'file';
    }
    getFile() {
        return Promise.resolve({
            text: () => Promise.resolve(this.content),
            lastModified: Date.now()
        });
    }
    createWritable() {
        return Promise.resolve({
            write: (data) => { this.content = data; console.log(`[FS] Wrote to ${this.name}`); },
            close: () => Promise.resolve()
        });
    }
}

class MockDirectoryHandle {
    constructor() {
        this.files = new Map();
        this.kind = 'directory';
    }
    async getDirectoryHandle(name, opts) {
        return this; // Simplified: everything is in root
    }
    async getFileHandle(name, opts) {
        if (!this.files.has(name)) {
            if (opts && opts.create) {
                this.files.set(name, new MockFileHandle(name));
            } else {
                throw new Error(`File not found: ${name}`);
            }
        }
        return this.files.get(name);
    }
    async *entries() {
        for (const [name, handle] of this.files) {
            yield [name, handle];
        }
    }
}

// Mock SchemaEditor
class SchemaEditor {
    constructor() {
        this.baseSchema = null;
        this.currentSchema = null;
        this.currentProject = {
            name: "Test_Project",
            handle: new MockDirectoryHandle()
        };
        this.settings = { username: "LocalUser" };
        this.hasUnsavedChanges = true;
    }

    async createSecurityCopy() { console.log("[Backup] Created security copy"); }
    updateHeaderMetadata() { }
    updateSaveButtonUI() { }
    checkConflictLogs() { }
}

const editor = new SchemaEditor();

// Load Real Code (Modules)
// We need to simulate loading the mixins. 
// Since we can't easily require the files in this environment without full module support or eval,
// I will manually paste the CRITICAL MergeManager logic here to ensure it matches the file.
// Ideally I'd read the file, but for this reproduction I'll use the class definition I verified earlier.

class MergeManager {
    static merge(base, local, remote, currentUser, forceRemoteWin = false) {
        const merged = JSON.parse(JSON.stringify(remote));
        const conflicts = [];
        const overrodeOthers = [];
        const normalize = (val) => JSON.stringify(val);

        const allKeys = new Set([
            ...Object.keys(base.properties || base),
            ...Object.keys(local.properties || local),
            ...Object.keys(remote.properties || remote)
        ]);

        const baseProps = base.properties || base;
        const localProps = local.properties || local;
        const mergedProps = merged.properties || merged;

        allKeys.forEach(key => {
            const baseVal = baseProps[key];
            const localVal = localProps[key];
            const remoteVal = mergedProps[key];

            const localChanged = normalize(localVal) !== normalize(baseVal);
            const remoteChanged = normalize(remoteVal) !== normalize(baseVal);

            if (localChanged) {
                if (!remoteChanged) {
                    mergedProps[key] = localVal;
                } else {
                    if (normalize(localVal) === normalize(remoteVal)) {
                        // Clean
                    } else {
                        const winner = forceRemoteWin ? (remote.last_updated_by || 'Other User') : currentUser;
                        const winnerVal = forceRemoteWin ? remoteVal : localVal;

                        const conflictInfo = {
                            variable_id: key,
                            winner: winner,
                            remote_user: remote.last_updated_by || 'Other User'
                        };

                        conflicts.push(conflictInfo);
                        if (!forceRemoteWin) {
                            overrodeOthers.push({
                                variable_id: key,
                                remote_user: remote.last_updated_by || 'Other User',
                                ...conflictInfo
                            });
                        }
                        mergedProps[key] = winnerVal;
                    }
                }
            }
        });

        return { merged, conflicts, overrodeOthers };
    }

    static generateConflictLog() { return {}; }
}

// Copy-Paste the relevant saveChanges method from ExportManager.js (with my added logs)
// I will bind it to the editor instance.

editor.saveChanges = async function () {
    if (!this.hasUnsavedChanges) return;

    // ... skipping prompts ...

    try {
        AppUI.showProcessing('Saving changes...');
        const project = this.currentProject;
        const analysisHandle = await project.handle.getDirectoryHandle('analysis_data');

        // 1. Save Main File
        let fileName = `Test_Project.json`;

        // Mock finding file
        try {
            await analysisHandle.getFileHandle(fileName);
        } catch (e) {
            await analysisHandle.getFileHandle(fileName, { create: true });
        }

        const fileHandle = await analysisHandle.getFileHandle(fileName, { create: true });

        // Re-read file to get latest "Remote" version
        const file = await fileHandle.getFile();
        const remoteText = await file.text();
        let remoteSchema;
        try {
            remoteSchema = JSON.parse(remoteText);
        } catch (e) {
            console.warn("Could not parse remote file", e);
            remoteSchema = this.baseSchema || this.currentSchema;
        }

        // 2. Perform 3-Way Merge
        if (!this.baseSchema) this.baseSchema = JSON.parse(JSON.stringify(remoteSchema));

        const mergeResult = MergeManager.merge(
            this.baseSchema,
            this.currentSchema,
            remoteSchema,
            this.settings.username
        );

        // 3. Handle Conflicts
        if (mergeResult.conflicts.length > 0) {
            console.log("Merge Conflicts Detected:", mergeResult.conflicts);
        }

        let saveMessage = 'Project saved!';
        let saveType = 'success';

        // 4. Handle Conflict Messaging for the Winner
        const overrodeOthers = mergeResult.overrodeOthers || [];

        console.log("DEBUG: Save Merge Analysis", {
            conflictsCount: mergeResult.conflicts.length,
            overrodeOthersCount: overrodeOthers.length,
            overrodeUniqueUsers: [...new Set(overrodeOthers.map(c => c.remote_user))],
            baseSchemaExists: !!this.baseSchema
        });

        if (overrodeOthers.length > 0) {
            const vars = overrodeOthers.map(c => c.variable_id).join(', ');
            const users = [...new Set(overrodeOthers.map(c => c.remote_user))].join(', ');
            saveMessage = `Project Saved - Overwrote Remote Changes (${vars}) by: ${users}`;
            saveType = 'warning';
            console.warn("Winner Conflict Notification Triggered:", saveMessage);
        }

        // 5. Write Final Merged Content
        const writable = await fileHandle.createWritable();
        this.currentSchema.last_updated_at = new Date().toISOString();
        this.currentSchema.last_updated_by = this.settings.username;

        const content = JSON.stringify(this.currentSchema, null, 2);
        await writable.write(content);
        await writable.close();

        // 6. Update Base Snapshot
        this.baseSchema = JSON.parse(content);

        AppUI.hideProcessing();
        this.hasUnsavedChanges = false;
        this.updateHeaderMetadata();
        this.updateSaveButtonUI();

        // Critical: Pass saveType to ensure color change
        AppUI.showSaveSuccess(saveMessage, saveType);
    } catch (error) {
        AppUI.hideProcessing();
        AppUI.showError(`Error saving project: ${error.message}`);
    }
};


// SCENARIO SETUP
async function runSimulation() {
    console.log("--- Starting Simulation ---");

    // 1. Initial State (Base)
    const baseState = {
        last_updated_by: "OriginalUser",
        properties: {
            "var1": { "description": "Base Desc" }
        }
    };
    editor.baseSchema = JSON.parse(JSON.stringify(baseState));

    // 2. Remote State (Someone else saved)
    const remoteState = {
        last_updated_by: "RemoteUser",
        properties: {
            "var1": { "description": "Remote Desc" } // They changed it
        }
    };

    // Write Remote State to Disk Mock
    const projectHandle = editor.currentProject.handle;
    const analysisDir = await projectHandle.getDirectoryHandle('analysis_data', { create: true });
    const fileHandle = await analysisDir.getFileHandle('Test_Project.json', { create: true });
    fileHandle.content = JSON.stringify(remoteState);


    // 3. Local State (I changed it too)
    editor.currentSchema = {
        last_updated_by: "OriginalUser", // Was me before
        properties: {
            "var1": { "description": "Local Desc" } // I changed it
        }
    };
    editor.settings.username = "LocalUser";

    // 4. Run Save
    console.log("Exec saveChanges()...");
    await editor.saveChanges();
    console.log("---------------------------");
}

runSimulation();
