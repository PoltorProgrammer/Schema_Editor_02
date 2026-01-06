/**
 * Main Application Class for SchemaEditor
 */
class SchemaEditor {
    constructor() {
        this.currentSchema = null;
        this.baseSchema = null; // Snapshot of schema at load/last-save time for 3-way merge
        this.currentVersion = 0;
        this.allSchemas = new Map();
        this.selectedField = null;
        this.directoryHandle = null;

        this.allFields = [];
        this.filteredFields = [];
        this.projects = [];
        this.currentProject = null;
        this.projectsDirectoryHandle = null;
        this.panelStates = {}; // Persistent UI state for field details panel
        this.validationData = {};
        this.medixtractOutputData = {};
        this.hasUnsavedChanges = false;
        this.bypassUnsavedChangesWarning = false; // Flag to allow reloads without prompt (e.g. on merge loss)
        this.lastSaveTime = Date.now();
        this.pendingZipFile = null;
        this.projectNicknames = new Set();
        this.autoSaveInterval = null;

        this.filters = {
            search: '',
            types: [],
            groups: [],
            labels: [],
            statuses: [],
            reviewed: [],
            severity: []
        };

        this.typeOptions = new Set();
        this.groupOptions = new Set();
        this.labelOptions = new Set();

        this.dropdowns = {
            type: { isOpen: false, selected: [] },
            group: { isOpen: false, selected: [] },
            label: { isOpen: false, selected: [] },
            status: { isOpen: false, selected: [] },
            reviewed: { isOpen: false, selected: [] },
            severity: { isOpen: false, selected: [] },
            headerMore: { isOpen: false, selected: [] }
        };

        this.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));

        // Initialization - Note: All inherited methods from modules/mixins 
        // will be available as they are attached to SchemaEditor.prototype.
        this.loadSettings();
        this.initializeEventListeners();
        this.checkBrowserSupport();
        this.initializeTheme();
        this.applyFilterVisibility();
        this.initializeUnsavedChangesHandler();
        this.startAutoSaveCheck();
        this.startUpdatePolling();
        this.showProjectSelection();
    }

    initializeUnsavedChangesHandler() {
        window.addEventListener('beforeunload', (e) => {
            if (this.hasUnsavedChanges && !this.bypassUnsavedChangesWarning) {
                e.preventDefault();
                e.returnValue = ''; // Standard way to show confirm dialog
            }
        });
    }

    markAsUnsaved() {
        if (this.hasUnsavedChanges) return;
        this.hasUnsavedChanges = true;
        this.updateSaveButtonUI();
    }

    updateSaveButtonUI() {
        const saveBtn = document.getElementById('saveBtn');
        if (!saveBtn) return;

        if (this.hasUnsavedChanges) {
            saveBtn.classList.add('unsaved');
            saveBtn.disabled = false;
            if (!saveBtn.innerHTML.includes('*')) {
                saveBtn.innerHTML = saveBtn.innerHTML.replace('Save Changes', 'Save Changes *');
            }
        } else {
            saveBtn.classList.remove('unsaved');
            saveBtn.disabled = true;
            saveBtn.innerHTML = saveBtn.innerHTML.replace(' *', '');
            // Update last save time when changes are cleared (meaning we just saved)
            this.lastSaveTime = Date.now();
        }
    }

    startAutoSaveCheck() {
        if (this.autoSaveInterval) clearInterval(this.autoSaveInterval);

        // Check every minute
        this.autoSaveInterval = setInterval(() => {
            this.checkAutoSave();
        }, 60 * 1000);
    }

    startUpdatePolling() {
        // Check every 5 seconds for external updates
        setInterval(() => {
            if (typeof this.checkForExternalUpdates === 'function') {
                this.checkForExternalUpdates();
            }
        }, 5000);
    }


    async checkAutoSave() {
        if (!this.hasUnsavedChanges || !this.currentProject) return;

        const tenMinutes = 10 * 60 * 1000;
        const timeSinceLastSave = Date.now() - this.lastSaveTime;

        if (timeSinceLastSave >= tenMinutes) {
            console.log(`Auto-saving project: ${this.currentProject.name} (Unsaved changes for ${Math.round(timeSinceLastSave / 1000 / 60)} minutes)`);

            // Call saveChanges from ExportManager.js (it will be on 'this' because it's mixed in)
            if (typeof this.saveChanges === 'function') {
                try {
                    // We might want to pass a flag to saveChanges to indicate it's an auto-save
                    // to avoid showing the same alerts or to use a different success message.
                    await this.saveChanges(true);
                } catch (error) {
                    console.error("Auto-save failed:", error);
                }
            }
        }
    }
}
