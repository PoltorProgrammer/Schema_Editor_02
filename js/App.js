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

        this.filters = {
            search: '',
            types: [],
            groups: [],
            labels: [],
            statuses: []
        };

        this.typeOptions = new Set();
        this.groupOptions = new Set();
        this.labelOptions = new Set();

        this.dropdowns = {
            type: { isOpen: false, selected: [] },
            group: { isOpen: false, selected: [] },
            label: { isOpen: false, selected: [] },
            status: { isOpen: false, selected: [] }
        };

        this.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));

        // Initialization - Note: All inherited methods from modules/mixins 
        // will be available as they are attached to SchemaEditor.prototype.
        this.initializeEventListeners();
        this.checkBrowserSupport();
        this.loadSettings();
        this.initializeTheme();
        this.showProjectSelection();
    }
}
