/**
 * Results Page Mixin for SchemaEditor
 * Main entry point for Results view orchestration
 */
Object.assign(SchemaEditor.prototype, {
    showResultsPage() {
        // Hide other views
        document.getElementById('projectSelection').style.display = 'none';
        document.getElementById('schemaEditor').style.display = 'none';
        document.getElementById('settingsModal').style.display = 'none';

        // Hide original buttons if visible
        const hideEl = (id) => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        };

        hideEl('addPatientBtn');
        hideEl('addOutputBtn');
        hideEl('downloadFilteredBtn');
        hideEl('saveBtn');
        hideEl('downloadProgressBtn');
        hideEl('headerMoreFilter');

        // Show Download Graphics Button
        const dlBtn = document.getElementById('downloadGraphicsBtn');
        if (dlBtn) dlBtn.style.display = 'flex';

        // Ensure navigation buttons are correct
        const backBtn = document.getElementById('backToTableBtn');
        if (backBtn) {
            backBtn.style.display = 'flex';
            if (this.isGlobalView) {
                backBtn.innerHTML = `
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z" />
                    </svg>
                    Back to Dashboard`;
                backBtn.onclick = () => this.showProjectSelection(true);
            } else {
                backBtn.innerHTML = `
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20,11H7.83L13.42,5.41L12,4L4,12L12,20L13.41,18.59L7.83,13H20V11Z" />
                    </svg>
                    Back to Table`;
                backBtn.onclick = () => this.showSchemaEditor();
            }
        }

        document.getElementById('projectDashboardBtn').style.display = this.isGlobalView ? 'none' : 'flex';
        document.getElementById('resultsPageBtn').style.display = 'none';
        document.getElementById('globalResultsPageBtn').style.display = 'none';

        // Show project info (Name, stats, last edit)
        const schemaInfo = document.querySelector('.schema-info');
        if (schemaInfo) schemaInfo.style.display = 'flex';
        this.updateHeaderMetadata();

        // Remember current view
        localStorage.setItem('lastActivePage', 'results');

        // Show Results Page
        let resultsPage = document.getElementById('resultsPage');
        if (!resultsPage) {
            console.error('Results Page container not found in DOM');
            return;
        }
        resultsPage.style.display = 'flex';

        this.calculateAndRenderResults();

        // Update Scroll Top Visibility
        if (this.updateScrollTopVisibility) {
            this.updateScrollTopVisibility();
        }

        // Add resize listener for results
        if (!this.resultsResizeBound) {
            this.resultsResizeBound = this.syncResultsHeights.bind(this);
            window.addEventListener('resize', this.resultsResizeBound);
        }
    },

    calculateAndRenderResults() {
        if (!this.allFields || !this.validationData) return;

        const patientIds = Object.keys(this.validationData).sort();
        const stats = {
            byPatient: {},
            byField: {},
            global: this.createEmptyStatObject(),
            personal: this.createEmptyStatObject(),
            byFieldCategory: {
                matched: new Set(),
                improved: new Set(),
                unmatched: new Set(),
                uncertain: new Set(),
                pending: new Set(),
                dismissed: new Set()
            },
            totals: {
                fields: this.allFields.length,
                patients: patientIds.length
            }
        };

        // Initialize Patient Stats
        patientIds.forEach(pid => {
            stats.byPatient[pid] = this.createEmptyStatObject();
        });

        // Initialize Field Stats
        this.allFields.forEach(f => {
            stats.byField[f.id] = this.createEmptyStatObject();
        });

        // Iterate and Count
        this.allFields.forEach(field => {
            patientIds.forEach(pid => {
                const perf = field.definition.performance ? field.definition.performance[pid] : null;
                const status = this.resolveStatusForStats(perf);
                const subStatus = this.resolveSubStatusForStats(perf, status);

                // Update Patient Stats
                this.incrementStat(stats.byPatient[pid], status, subStatus);

                // Update Field Stats
                this.incrementStat(stats.byField[field.id], status, subStatus);

                // Update Global vs Personal Stats
                const isPersonal = field.group === 'personal_data' || field.definition.group_id === 'personal_data' || field.definition.group === 'personal_data';

                if (isPersonal) {
                    this.incrementStat(stats.personal, status, subStatus);
                } else {
                    this.incrementStat(stats.global, status, subStatus);
                }

                // Update Field Category Stats (Unique fields per status)
                if (stats.byFieldCategory[status]) {
                    stats.byFieldCategory[status].add(field.id);
                }
            });
        });

        // Global view totals for meta-analysis references
        if (this.isGlobalView && this.globalProjectNames) {
            stats.totals.avgProjects = this.globalProjectNames.length;
            stats.totals.uniqueFields = stats.totals.fields;
        }

        const variableStats = this.calculateVariableStats(stats.byField);

        // Calculate Variable Stats per Patient
        stats.byPatientVariable = {};
        patientIds.forEach(pid => {
            const patientFieldStats = {};
            this.allFields.forEach(f => {
                const perf = f.definition.performance ? f.definition.performance[pid] : null;
                const status = this.resolveStatusForStats(perf);
                const subStatus = this.resolveSubStatusForStats(perf, status);

                const obj = this.createEmptyStatObject();
                this.incrementStat(obj, status, subStatus);
                patientFieldStats[f.id] = obj;
            });
            stats.byPatientVariable[pid] = this.calculateVariableStats(patientFieldStats);
        });

        // Cache for filtering
        this.cachedStats = stats;
        this.cachedVariableStats = variableStats;
        this.cachedPatientIds = patientIds;
        this.activeTableFilter = null;

        this.renderFieldSummary(stats.byFieldCategory, this.allFields.length);
        this.registerCurvedTextPlugin();
        this.renderResultsCharts(stats.global, stats.personal, stats.totals, variableStats, stats.byPatient, stats.byPatientVariable);
        this.renderResultsTables(stats, patientIds);

        // Sync heights so Field table scrolls to match Patient table length
        setTimeout(() => this.syncResultsHeights(), 0);
    }
});
