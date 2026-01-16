/**
 * User Interface and Interaction Manager Mixin for SchemaEditor
 * Main entry point for event initialization and core UI interactions.
 */
Object.assign(SchemaEditor.prototype, {
    initializeEventListeners() {
        // File operations
        document.getElementById('projectDashboardBtn').addEventListener('click', this.showProjectSelection.bind(this));

        document.getElementById('addProjectQuickBtn').addEventListener('click', this.handleCreateProject.bind(this));
        document.getElementById('addPatientBtn').addEventListener('click', this.handleAddPatientClick.bind(this));
        document.getElementById('patientFileInput').addEventListener('change', (e) => this.handleAddPatientFile(e));
        document.getElementById('addOutputBtn').addEventListener('click', this.handleAddOutputClick.bind(this));
        document.getElementById('outputFileInput').addEventListener('change', (e) => this.handleAddOutputFile(e));
        document.getElementById('saveBtn').addEventListener('click', this.saveChanges.bind(this));
        document.getElementById('downloadProgressBtn').addEventListener('click', this.downloadProgress.bind(this));
        document.getElementById('downloadFilteredBtn').addEventListener('click', this.downloadFilteredFields.bind(this));

        // Header More Menu interactions
        document.getElementById('headerMoreBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleDropdown('headerMore');
        });

        document.getElementById('menuAddPatient').addEventListener('click', () => {
            this.closeDropdown('headerMore');
            this.handleAddPatientClick();
        });
        document.getElementById('menuAddOutput').addEventListener('click', () => {
            this.closeDropdown('headerMore');
            this.handleAddOutputClick();
        });
        document.getElementById('menuDownloadFiltered').addEventListener('click', () => {
            this.closeDropdown('headerMore');
            this.downloadFilteredFields();
        });
        document.getElementById('menuDownloadProgress').addEventListener('click', () => {
            this.closeDropdown('headerMore');
            this.downloadProgress();
        });

        // Zip upload listeners
        const zipFileInput = document.getElementById('zipFileInput');
        if (zipFileInput) {
            zipFileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.prepareZipPreview(e.target.files[0]);
                    e.target.value = ''; // Reset
                }
            });
        }

        const zipDropZone = document.getElementById('zipDropZone');
        if (zipDropZone) {
            zipDropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                zipDropZone.classList.add('drag-over');
            });
            zipDropZone.addEventListener('dragleave', () => zipDropZone.classList.remove('drag-over'));
            zipDropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                zipDropZone.classList.remove('drag-over');
                if (e.dataTransfer.files.length > 0) {
                    this.prepareZipPreview(e.dataTransfer.files[0]);
                }
            });
            zipDropZone.addEventListener('click', (e) => {
                if (e.target !== zipDropZone.querySelector('button') && e.target !== document.getElementById('zipFileInput')) {
                    document.getElementById('zipFileInput').click();
                }
            });
        }

        // Filtering
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', this.handleSearchInput.bind(this));
            searchInput.addEventListener('focus', () => searchInput.select());
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    e.stopPropagation();
                    this.clearSearch();
                }
            });
        }
        document.getElementById('clearSearch').addEventListener('click', this.clearSearch.bind(this));

        // Custom dropdowns
        ['type', 'group', 'label', 'status', 'reviewed', 'severity', 'reviewerNoteUser', 'reviewerCommentUser', 'headerMore'].forEach(t => {
            const el = document.getElementById(`${t}Filter`);
            if (el) {
                const trigger = el.querySelector('.dropdown-trigger');
                if (trigger) {
                    trigger.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.toggleDropdown(t);
                    });
                }
            }
        });

        ['status', 'reviewed', 'severity'].forEach(type => {
            const dropdown = document.getElementById(`${type}Filter`);
            if (dropdown) {
                dropdown.querySelectorAll('.dropdown-option').forEach(opt => {
                    opt.addEventListener('click', (e) => {
                        this.handleDropdownOptionClick(type, opt.dataset.value, e);
                    });
                });
            }
        });

        document.getElementById('clearFilters').addEventListener('click', this.clearAllFilters.bind(this));

        // Panel management
        document.getElementById('closePanelBtn').addEventListener('click', this.closeFieldDetails.bind(this));

        // Settings
        document.getElementById('settingsBtn').addEventListener('click', this.openSettings.bind(this));
        document.getElementById('closeSettingsBtn').addEventListener('click', this.cancelSettings.bind(this));
        document.getElementById('cancelSettingsBtn').addEventListener('click', this.cancelSettings.bind(this));
        document.getElementById('saveSettingsBtn').addEventListener('click', this.saveSettings.bind(this));
        document.getElementById('resetSettingsBtn').addEventListener('click', this.resetToDefaults.bind(this));

        ['light', 'dark', 'joan'].forEach(t => {
            const btn = document.getElementById(`${t}ThemeBtn`);
            if (btn) btn.addEventListener('click', () => this.selectTheme(t));
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeFieldDetails();
                this.closeAllDropdowns();
                const modal = document.getElementById('settingsModal');
                if (modal.style.display === 'flex') this.cancelSettings();
            } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.saveChanges();
            } else if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                if (searchInput) {
                    const panel = document.getElementById('fieldDetailsPanel');
                    if (panel && panel.classList.contains('open')) {
                        this.togglePanelSearch();
                    } else {
                        searchInput.focus();
                        searchInput.select();
                    }
                }
            } else if (e.key === 'F5' || ((e.ctrlKey || e.metaKey) && (e.key === 'r' || e.key === 'R'))) {
                if (this.hasUnsavedChanges && !this.bypassUnsavedChangesWarning) {
                    e.preventDefault();
                    AppUI.showConfirm(
                        'Unsaved Changes',
                        'You have unsaved changes. Reloading will discard them. Are you sure?',
                        'Reload',
                        'Cancel',
                        true
                    ).then(confirm => {
                        if (confirm) {
                            this.hasUnsavedChanges = false;
                            window.location.reload();
                        }
                    });
                }
            }
        });

        document.addEventListener('click', (e) => {
            const panel = document.getElementById('fieldDetailsPanel');
            if (panel && panel.style.display === 'flex' &&
                !panel.contains(e.target) &&
                !e.target.closest('.field-row') &&
                e.target.isConnected) {
                this.closeFieldDetails();
            }
            if (!e.target.closest('.custom-dropdown') && !e.target.closest('.combobox-container')) {
                this.closeAllDropdowns();
                document.querySelectorAll('.combobox-container').forEach(c => c.classList.remove('open'));
            }
            if (!e.target.closest('.project-card-more') && !e.target.closest('.project-options-menu')) {
                document.querySelectorAll('.project-options-menu.active').forEach(m => m.classList.remove('active'));
            }
            if (e.target.classList.contains('settings-overlay')) {
                this.cancelSettings();
            }
        });

        // Scroll to Top functionality
        const scrollToTopBtn = document.getElementById('scrollToTopBtn');
        if (scrollToTopBtn) {
            scrollToTopBtn.addEventListener('click', () => {
                const tableBody = document.getElementById('fieldsTableBody');
                if (tableBody) {
                    tableBody.scrollTo({ top: 0, behavior: 'smooth' });
                }
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });

            const handleScroll = () => {
                const tableBody = document.getElementById('fieldsTableBody');
                const schemaEditor = document.getElementById('schemaEditor');
                const panel = document.getElementById('fieldDetailsPanel');

                if (!schemaEditor || schemaEditor.style.display === 'none' || (panel && panel.classList.contains('open'))) {
                    scrollToTopBtn.classList.remove('visible');
                    return;
                }

                const tableScrolled = tableBody && tableBody.scrollTop > 300;
                const windowScrolled = window.scrollY > 300;

                if (tableScrolled || windowScrolled) {
                    scrollToTopBtn.classList.add('visible');
                } else {
                    scrollToTopBtn.classList.remove('visible');
                }
            };

            window.addEventListener('scroll', handleScroll);
            document.addEventListener('scroll', (e) => {
                if (e.target && e.target.id === 'fieldsTableBody') handleScroll();
            }, true);

            this.updateScrollTopVisibility = handleScroll;
        }

        this.setupPanelResizer();
    },

    checkBrowserSupport() {
        const hasFileSystemAccess = 'showDirectoryPicker' in window;
        const info = document.getElementById('browserLimitationInfo');
        const fallback = document.getElementById('fallbackControls');
        if (hasFileSystemAccess) {
            if (info) info.style.display = 'none';
            if (fallback) fallback.style.display = 'none';
        } else {
            if (info) info.style.display = 'block';
            if (fallback) fallback.style.display = 'flex';
        }
    }
});
