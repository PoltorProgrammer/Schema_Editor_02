/**
 * Main Application Class for SchemaEditor
 */
class SchemaEditor {
    constructor() {
        this.currentSchema = null;
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
        this.pendingZipFile = null;

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
        this.showProjectSelection();
    }

    initializeUnsavedChangesHandler() {
        window.addEventListener('beforeunload', (e) => {
            if (this.hasUnsavedChanges) {
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
            if (!saveBtn.innerHTML.includes('*')) {
                saveBtn.innerHTML = saveBtn.innerHTML.replace('Save Changes', 'Save Changes *');
            }
        } else {
            saveBtn.classList.remove('unsaved');
            saveBtn.innerHTML = saveBtn.innerHTML.replace(' *', '');
        }
    }
}
