/**
 * User Interface and Interaction Manager Mixin for SchemaEditor
 * Handles events, dropdowns, and browser compatibility checks.
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
                // Only trigger if click wasn't on the button (which already triggers it via label/onclick)
                if (e.target !== zipDropZone.querySelector('button') && e.target !== document.getElementById('zipFileInput')) {
                    document.getElementById('zipFileInput').click();
                }
            });
        }

        // Filtering
        const searchInput = document.getElementById('searchInput');
        searchInput.addEventListener('input', this.handleSearchInput.bind(this));
        searchInput.addEventListener('focus', () => searchInput.select());
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                this.clearSearch();
            }
        });
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

        // Hardcoded dropdown options for status, reviewed, severity
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
                    // Check if panel is visible (open), regardless of current focus
                    // The user wants "if ctrl+f when having a detailed view side panel opened"
                    if (panel && getComputedStyle(panel).transform !== 'none' && panel.classList.contains('open')) {
                        // Note: My previous check for display:flex might be misleading if CSS handles visibility via transform/class
                        // Let's rely on the class 'open' which we use in PanelStateManager/Renderer
                        this.togglePanelSearch();
                    } else if (panel && panel.style.display === 'flex' && panel.classList.contains('open')) {
                        this.togglePanelSearch();
                    } else {
                        // Fallback: Check if it simply has the 'open' class which is our primary toggle
                        if (panel && panel.classList.contains('open')) {
                            this.togglePanelSearch();
                        } else {
                            searchInput.focus();
                            searchInput.select();
                        }
                    }
                }
            } else if (e.key === 'F5' || ((e.ctrlKey || e.metaKey) && (e.key === 'r' || e.key === 'R'))) {
                if (this.hasUnsavedChanges && !this.bypassUnsavedChangesWarning) {
                    e.preventDefault();
                    // Pass true as last argument to focus Cancel button by default
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
            // If the element was removed from DOM during a re-render (like clicking severity), 
            // e.target.isConnected will be false. We shouldn't close the panel in that case.
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

                // Hide if not in schema editor or if the details panel is open
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
            // We need to wait for the table body to be available or just delegate
            document.addEventListener('scroll', (e) => {
                if (e.target && e.target.id === 'fieldsTableBody') handleScroll();
            }, true);

            // Also check on theme or filter changes which might affect scroll
            this.updateScrollTopVisibility = handleScroll;
        }

        this.setupPanelResizer();
    },

    setupPanelResizer() {
        const panel = document.getElementById('fieldDetailsPanel');
        const resizer = document.getElementById('panelResizer');
        if (!panel || !resizer) return;

        // Apply saved width
        if (this.settings && this.settings.panelWidth) {
            let savedWidth = this.settings.panelWidth;
            if (savedWidth.endsWith('px')) {
                let widthPx = parseFloat(savedWidth);
                const minWidth = window.innerWidth / 3;
                const maxWidth = (window.innerWidth * 4) / 5;
                if (widthPx < minWidth) widthPx = minWidth;
                if (widthPx > maxWidth) widthPx = maxWidth;
                panel.style.width = `${widthPx}px`;
            } else {
                panel.style.width = savedWidth;
            }
        }

        let isResizing = false;

        resizer.addEventListener('mousedown', (e) => {
            isResizing = true;
            panel.classList.add('is-resizing');
            resizer.classList.add('active');
            document.body.style.cursor = 'col-resize';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;

            // Calculate new width: viewport width - mouse X position
            // Since the panel is fixed to the right (right: 0), width = screenWidth - mouseX
            let newWidth = window.innerWidth - e.clientX;

            // Constraints: 1/3 (33.3vw) to 4/5 (80vw)
            const minWidth = window.innerWidth / 3;
            const maxWidth = (window.innerWidth * 4) / 5;

            if (newWidth < minWidth) newWidth = minWidth;
            if (newWidth > maxWidth) newWidth = maxWidth;

            panel.style.width = `${newWidth}px`;
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                panel.classList.remove('is-resizing');
                resizer.classList.remove('active');
                document.body.style.cursor = '';

                // Save width
                if (this.settings) {
                    this.settings.panelWidth = panel.style.width;
                    this.saveSettingsToStorage();
                }
            }
        });
    },

    toggleDropdown(type) {
        Object.keys(this.dropdowns).forEach(key => {
            if (key !== type) this.closeDropdown(key);
        });
        if (this.dropdowns[type].isOpen) this.closeDropdown(type);
        else this.openDropdown(type);
    },

    openDropdown(type) {
        const el = document.getElementById(`${type}Filter`);
        if (el) el.classList.add('open');
        this.dropdowns[type].isOpen = true;
    },

    closeDropdown(type) {
        const el = document.getElementById(`${type}Filter`);
        if (el) el.classList.remove('open');
        this.dropdowns[type].isOpen = false;
    },

    closeAllDropdowns() {
        Object.keys(this.dropdowns).forEach(key => this.closeDropdown(key));
    },



    handleOutputInputKey(patientId, e) {
        const container = document.getElementById(`combobox-${patientId}`);
        const list = document.getElementById(`comboboxList-${patientId}`);
        if (!container || !list) return;

        const options = Array.from(list.querySelectorAll('.combobox-option:not(.no-results)'));
        let currentIndex = options.findIndex(opt => opt.classList.contains('highlighted'));

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!container.classList.contains('open')) {
                this.handleComboboxFocus(patientId);
                return;
            }
            if (currentIndex < options.length - 1) {
                if (currentIndex >= 0) options[currentIndex].classList.remove('highlighted');
                options[currentIndex + 1].classList.add('highlighted');
                options[currentIndex + 1].scrollIntoView({ block: 'nearest' });
            } else if (currentIndex === -1 && options.length > 0) {
                options[0].classList.add('highlighted');
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (currentIndex > 0) {
                options[currentIndex].classList.remove('highlighted');
                options[currentIndex - 1].classList.add('highlighted');
                options[currentIndex - 1].scrollIntoView({ block: 'nearest' });
            }
        } else if (e.key === 'Enter') {
            if (container.classList.contains('open')) {
                const target = currentIndex >= 0 ? options[currentIndex] : options[0];
                if (target) {
                    e.preventDefault();
                    this.selectComboboxOption(patientId, target.dataset.value);
                } else {
                    const def = this.currentSchema.properties[this.selectedField];
                    const hasOptions = (def.options && def.options.length > 0) || (def.enum && def.enum.length > 0);
                    if (!hasOptions) {
                        e.preventDefault();
                        this.addOutput(patientId);
                    } else {
                        // Restricted options but no match: keep text for editing
                        e.preventDefault();
                    }
                }
            } else {
                // Default addOutput behavior
                this.addOutput(patientId);
            }
        } else if (e.key === 'Escape') {
            container.classList.remove('open');
        } else if (e.key === 'Tab') {
            if (container.classList.contains('open') && currentIndex >= 0) {
                e.preventDefault();
                options[currentIndex].click();
            }
        }
    },

    handleComboboxFocus(patientId) {
        const container = document.getElementById(`combobox-${patientId}`);
        if (container) {
            container.classList.add('open');
            this.renderComboboxOptions(patientId, document.getElementById(`newOutput-${patientId}`).value);
        }
    },

    handleComboboxBlur(patientId) {
        // Delay hiding to allow click events on options to fire
        setTimeout(() => {
            const input = document.getElementById(`newOutput-${patientId}`);
            if (document.activeElement !== input) {
                const container = document.getElementById(`combobox-${patientId}`);
                if (container) container.classList.remove('open');
            }
        }, 200);
    },

    handleComboboxInput(patientId, value) {
        this.renderComboboxOptions(patientId, value);
    },

    selectComboboxOption(patientId, value, e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        const input = document.getElementById(`newOutput-${patientId}`);
        if (input) {
            input.value = value;
            this.addOutput(patientId);
            input.focus();
        }
    },

    // Label Combobox Handlers
    handleLabelComboboxFocus() {
        const input = document.getElementById('input-labels');
        const container = document.getElementById('combobox-labels');
        if (container) {
            container.classList.add('open');
            this.renderLabelComboboxOptions('');
        }
        if (input) input.select();
    },

    handleLabelComboboxBlur() {
        setTimeout(() => {
            const input = document.getElementById('input-labels');
            if (document.activeElement !== input) {
                const container = document.getElementById('combobox-labels');
                if (container) container.classList.remove('open');
            }
        }, 200);
    },

    handleLabelComboboxInput(value) {
        this.renderLabelComboboxOptions(value);
    },

    selectLabelComboboxOption(value, e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        this.addLabel(value);
        const input = document.getElementById('input-labels');
        if (input) {
            input.value = '';
            input.focus();
            this.renderLabelComboboxOptions('');
        }
    },

    handleLabelComboboxKey(e) {
        const container = document.getElementById('combobox-labels');
        const list = document.getElementById('comboboxList-labels');
        if (!container || !list) return;

        const options = Array.from(list.querySelectorAll('.combobox-option:not(.no-results)'));
        let currentIndex = options.findIndex(opt => opt.classList.contains('highlighted'));

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!container.classList.contains('open')) {
                this.handleLabelComboboxFocus();
                return;
            }
            if (currentIndex < options.length - 1) {
                if (currentIndex >= 0) options[currentIndex].classList.remove('highlighted');
                options[currentIndex + 1].classList.add('highlighted');
                options[currentIndex + 1].scrollIntoView({ block: 'nearest' });
            } else if (currentIndex === -1 && options.length > 0) {
                options[0].classList.add('highlighted');
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (currentIndex > 0) {
                options[currentIndex].classList.remove('highlighted');
                options[currentIndex - 1].classList.add('highlighted');
                options[currentIndex - 1].scrollIntoView({ block: 'nearest' });
            }
        } else if (e.key === 'Enter') {
            if (container.classList.contains('open')) {
                const target = currentIndex >= 0 ? options[currentIndex] : options[0];
                if (target) {
                    e.preventDefault();
                    this.selectLabelComboboxOption(target.dataset.value);
                } else {
                    const val = document.getElementById('input-labels').value.trim();
                    if (val) {
                        e.preventDefault();
                        this.selectLabelComboboxOption(val);
                    }
                }
            }
        } else if (e.key === 'Escape') {
            container.classList.remove('open');
        }
    },

    // Nickname Combobox Handlers
    handleNicknameComboboxFocus(idSuffix = 'settingsNickname') {
        const input = document.getElementById(idSuffix);
        const container = document.getElementById(idSuffix === 'settingsNickname' ? 'combobox-nickname' : `combobox-${idSuffix}`);
        if (container) {
            container.classList.add('open');
            // When focusing, show all options by default
            this.renderNicknameComboboxOptions('', idSuffix);
        }
        if (input) input.select();
    },

    handleNicknameComboboxBlur(idSuffix = 'settingsNickname') {
        setTimeout(() => {
            const input = document.getElementById(idSuffix);
            if (document.activeElement !== input) {
                const container = document.getElementById(idSuffix === 'settingsNickname' ? 'combobox-nickname' : `combobox-${idSuffix}`);
                if (container) container.classList.remove('open');
            }
        }, 200);
    },

    handleNicknameComboboxInput(value, idSuffix = 'settingsNickname') {
        const input = document.getElementById(idSuffix);
        if (value.includes('-')) {
            value = value.replace(/-/g, '');
            if (input) input.value = value;
        }
        // Note: value comes from this.value in HTML, idSuffix defaults to settingsNickname
        this.renderNicknameComboboxOptions(value, idSuffix);
    },

    selectNicknameOption(value, idSuffix = 'settingsNickname', e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        value = value.replace(/-/g, ''); // Ensure no hyphens
        const input = document.getElementById(idSuffix);
        if (input) {
            input.value = value;
            const container = document.getElementById(idSuffix === 'settingsNickname' ? 'combobox-nickname' : `combobox-${idSuffix}`);
            if (container) container.classList.remove('open');
        }
    },

    handleNicknameComboboxKey(e, idSuffix = 'settingsNickname') {
        const container = document.getElementById(idSuffix === 'settingsNickname' ? 'combobox-nickname' : `combobox-${idSuffix}`);
        const list = document.getElementById(idSuffix === 'settingsNickname' ? 'comboboxList-nickname' : `comboboxList-${idSuffix}`);
        if (!container || !list) return;

        const options = Array.from(list.querySelectorAll('.combobox-option:not(.no-results)'));
        let currentIndex = options.findIndex(opt => opt.classList.contains('highlighted'));

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!container.classList.contains('open')) {
                this.handleNicknameComboboxFocus(idSuffix);
                return;
            }
            if (currentIndex < options.length - 1) {
                if (currentIndex >= 0) options[currentIndex].classList.remove('highlighted');
                options[currentIndex + 1].classList.add('highlighted');
                options[currentIndex + 1].scrollIntoView({ block: 'nearest' });
            } else if (currentIndex === -1 && options.length > 0) {
                options[0].classList.add('highlighted');
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (currentIndex > 0) {
                options[currentIndex].classList.remove('highlighted');
                options[currentIndex - 1].classList.add('highlighted');
                options[currentIndex - 1].scrollIntoView({ block: 'nearest' });
            }
        } else if (e.key === 'Enter') {
            if (container.classList.contains('open')) {
                const target = currentIndex >= 0 ? options[currentIndex] : options[0];
                if (target) {
                    e.preventDefault();
                    this.selectNicknameOption(target.dataset.value, idSuffix);
                } else {
                    const inp = document.getElementById(idSuffix);
                    const val = inp ? inp.value.trim() : '';
                    if (val) {
                        e.preventDefault();
                        this.selectNicknameOption(val, idSuffix);
                    }
                }
            }
        } else if (e.key === 'Escape') {
            container.classList.remove('open');
        }
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
    },

    // Property Combobox Handlers
    handlePropertyComboboxFocus(prop) {
        const input = document.getElementById(`input-${prop}`);
        const container = document.getElementById(`combobox-${prop}`);
        if (container) {
            container.classList.add('open');
            this.renderPropertyComboboxOptions(prop, '');
        }
        if (input) input.select();
    },

    handlePropertyComboboxBlur(prop) {
        setTimeout(() => {
            const input = document.getElementById(`input-${prop}`);
            if (document.activeElement !== input) {
                const container = document.getElementById(`combobox-${prop}`);
                if (container) container.classList.remove('open');
            }
        }, 200);
    },

    handlePropertyComboboxInput(prop, value) {
        this.renderPropertyComboboxOptions(prop, value);
    },

    selectPropertyComboboxOption(prop, value, e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        const input = document.getElementById(`input-${prop}`);
        if (input) {
            input.value = value;
            // Fake an event for handleFieldPropertyChange
            this.handleFieldPropertyChange({ target: input });
            const container = document.getElementById(`combobox-${prop}`);
            if (container) container.classList.remove('open');
        }
    },

    handlePropertyComboboxKey(prop, e) {
        const container = document.getElementById(`combobox-${prop}`);
        const list = document.getElementById(`comboboxList-${prop}`);
        if (!container || !list) return;

        const options = Array.from(list.querySelectorAll('.combobox-option:not(.no-results)'));
        let currentIndex = options.findIndex(opt => opt.classList.contains('highlighted'));

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!container.classList.contains('open')) {
                this.handlePropertyComboboxFocus(prop);
                return;
            }
            if (currentIndex < options.length - 1) {
                if (currentIndex >= 0) options[currentIndex].classList.remove('highlighted');
                options[currentIndex + 1].classList.add('highlighted');
                options[currentIndex + 1].scrollIntoView({ block: 'nearest' });
            } else if (currentIndex === -1 && options.length > 0) {
                options[0].classList.add('highlighted');
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (currentIndex > 0) {
                options[currentIndex].classList.remove('highlighted');
                options[currentIndex - 1].classList.add('highlighted');
                options[currentIndex - 1].scrollIntoView({ block: 'nearest' });
            }
        } else if (e.key === 'Enter') {
            if (container.classList.contains('open')) {
                const target = currentIndex >= 0 ? options[currentIndex] : options[0];
                if (target) {
                    e.preventDefault();
                    this.selectPropertyComboboxOption(prop, target.dataset.value);
                }
            }
        } else if (e.key === 'Escape') {
            container.classList.remove('open');
        } else if (e.key === 'Tab') {
            if (container.classList.contains('open') && currentIndex >= 0) {
                e.preventDefault();
                options[currentIndex].click();
            }
        }
    },

    togglePanelSearch() {
        const panel = document.getElementById('fieldDetailsPanel');
        if (!panel) return;

        let searchBar = document.getElementById('panelSearchBar');
        if (!searchBar) {
            searchBar = document.createElement('div');
            searchBar.id = 'panelSearchBar';
            searchBar.className = 'panel-search-bar';

            searchBar.style.cssText = `
                position: absolute;
                top: 70px;
                right: 24px;
                background: var(--white);
                border: 1px solid var(--gray-200);
                border-radius: var(--radius-lg);
                box-shadow: var(--shadow-xl);
                padding: 10px 14px;
                display: flex;
                gap: 12px;
                z-index: 1000;
                align-items: center;
                animation: slideDown 0.25s cubic-bezier(0.16, 1, 0.3, 1);
            `;

            searchBar.innerHTML = `
                <div style="position: relative; display: flex; align-items: center;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" stroke-width="2.5" style="position: absolute; left: 10px;">
                        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
                    </svg>
                    <input type="text" id="panelSearchInput" placeholder="Find in panel..." 
                        style="border: 1px solid var(--gray-200); padding: 7px 12px 7px 32px; border-radius: 6px; font-size: 13px; width: 220px; outline: none; transition: border-color 0.2s; background: var(--gray-50);">
                </div>
                <div style="display: flex; align-items: center; gap: 4px; border-left: 1px solid var(--gray-100); padding-left: 8px;">
                    <span id="panelSearchCount" style="font-size: 12px; font-weight: 600; color: var(--gray-500); min-width: 45px; text-align: center; font-variant-numeric: tabular-nums;"></span>
                    <button id="panelSearchPrev" class="btn btn-ghost btn-sm" style="padding: 4px; height: 28px; width: 28px; display: flex; align-items: center; justify-content: center; color: var(--primary);" title="Previous match">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m18 15-6-6-6 6"/></svg>
                    </button>
                    <button id="panelSearchNext" class="btn btn-ghost btn-sm" style="padding: 4px; height: 28px; width: 28px; display: flex; align-items: center; justify-content: center; color: var(--primary);" title="Next match">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
                    </button>
                    <button id="panelSearchClose" class="btn btn-ghost btn-sm" style="padding: 4px; height: 28px; width: 28px; display: flex; align-items: center; justify-content: center; color: var(--gray-400);" title="Close search (Esc)">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                    </button>
                </div>
            `;
            panel.appendChild(searchBar);

            const input = searchBar.querySelector('#panelSearchInput');
            const prev = searchBar.querySelector('#panelSearchPrev');
            const next = searchBar.querySelector('#panelSearchNext');
            const close = searchBar.querySelector('#panelSearchClose');
            const count = searchBar.querySelector('#panelSearchCount');

            input.onfocus = () => input.style.borderColor = 'var(--primary)';
            input.onblur = () => input.style.borderColor = 'var(--gray-200)';

            let matches = [];
            let currentIdx = -1;

            const executeSearch = () => {
                // Clear previous highlights
                CSS.highlights.clear();
                matches = [];
                currentIdx = -1;
                count.textContent = '';

                const query = input.value.trim().toLowerCase();
                if (!query) return;

                const walker = document.createTreeWalker(document.getElementById('fieldDetailsContent'), NodeFilter.SHOW_TEXT, null, false);
                const ranges = [];
                let node;
                while (node = walker.nextNode()) {
                    // Removed the offsetParent check as it might hide legitimate matches in initially collapsed sections
                    const text = node.textContent.toLowerCase();
                    let index = text.indexOf(query);
                    while (index !== -1) {
                        const range = new Range();
                        range.setStart(node, index);
                        range.setEnd(node, index + query.length);
                        ranges.push(range);
                        matches.push(range); // Store range directly
                        index = text.indexOf(query, index + 1);
                    }
                }

                if (ranges.length > 0) {
                    const highlight = new Highlight(...ranges);
                    CSS.highlights.set('search-results', highlight);
                    currentIdx = 0;
                    updateCurrentMatch();
                } else {
                    count.textContent = '0/0';
                }
            };

            const updateCurrentMatch = () => {
                if (matches.length === 0) return;
                count.textContent = `${currentIdx + 1}/${matches.length}`;

                const range = matches[currentIdx];
                const el = range.startContainer.parentElement;

                this.ensureMatchVisibility(el);

                el.scrollIntoView({ behavior: 'smooth', block: 'center' });

                // Create a "current" highlight
                const currentHighlight = new Highlight(range);
                CSS.highlights.set('search-current', currentHighlight);
            };

            input.addEventListener('input', executeSearch);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    if (e.shiftKey) prev.click();
                    else next.click();
                } else if (e.key === 'Escape') {
                    this.clearPanelSearch();
                }
            });

            next.addEventListener('click', () => {
                if (matches.length === 0) return;
                currentIdx = (currentIdx + 1) % matches.length;
                updateCurrentMatch();
            });

            prev.addEventListener('click', () => {
                if (matches.length === 0) return;
                currentIdx = (currentIdx - 1 + matches.length) % matches.length;
                updateCurrentMatch();
            });

            close.addEventListener('click', () => this.clearPanelSearch());
        }

        searchBar.style.display = 'flex';
        const inp = searchBar.querySelector('input');
        inp.value = '';
        inp.focus();
    },

    ensureMatchVisibility(element) {
        let current = element;
        while (current && current !== document.getElementById('fieldDetailsContent')) {
            if (current.classList.contains('patient-content') && !current.classList.contains('open')) {
                const header = current.previousElementSibling;
                if (header && header.classList.contains('patient-header')) {
                    this.togglePatientSection(current.parentElement.dataset.patientId, { currentTarget: header, stopPropagation: () => { } });
                }
            }
            if (current.classList.contains('form-section-content') && current.classList.contains('collapsed')) {
                const header = current.previousElementSibling;
                if (header && header.classList.contains('form-section-header')) {
                    this.toggleFormSection(header.querySelector('h4')?.textContent, { currentTarget: header, stopPropagation: () => { } });
                }
            }
            current = current.parentElement;
        }
    },

    clearPanelSearch() {
        const searchBar = document.getElementById('panelSearchBar');
        if (searchBar) {
            searchBar.style.display = 'none';
            CSS.highlights.clear();
        }
    },

    openPatientDetails(fieldId, patientId, event) {
        if (event) event.stopPropagation();
        this.selectField(fieldId);

        if (this.panelStates && this.panelStates[fieldId]) {
            const state = this.panelStates[fieldId];

            // 1. Update Internal State
            state.openSections.add('Per Patient Analysis');

            // Exclusive expansion: Close other patients in state
            const toRemove = [];
            state.openSections.forEach(section => {
                if (section.startsWith('Patient: ') && section !== `Patient: ${patientId}`) {
                    toRemove.push(section);
                }
            });
            toRemove.forEach(s => state.openSections.delete(s));

            // Add target patient to state
            state.openSections.add(`Patient: ${patientId}`);

            // 2. Trigger standard state restoration (handles parents, etc.)
            // Pass false to skip auto-restore scrolling
            this.restorePanelState(false);

            // 3. Force Visual Expansion & Scroll (The "Hammer" fix)
            // We delay slightly to ensure 'restorePanelState' has finished its DOM touches
            setTimeout(() => {
                const panel = document.getElementById('fieldDetailsContent');
                if (!panel) return;

                const targetCollapsible = panel.querySelector(`.patient-collapsible[data-patient-id="${patientId}"]`);
                if (targetCollapsible) {
                    // Force classes
                    targetCollapsible.classList.add('expanded');
                    const content = targetCollapsible.querySelector('.patient-content');
                    if (content) {
                        content.classList.add('open');
                        content.querySelectorAll('textarea').forEach(t => AppUI.autoResizeTextarea(t));
                    }

                    // Manual Scroll to Top
                    // Use the container (targetCollapsible) for coordinates because the header might be 'sticky'
                    // and report a position at the top of the viewport even when we are deep in the content.
                    const containerRect = targetCollapsible.getBoundingClientRect();
                    const panelRect = panel.getBoundingClientRect();

                    // Current scroll + distance from top of panel to top of container
                    const targetScroll = panel.scrollTop + (containerRect.top - panelRect.top) - 10;
                    panel.scrollTo({ top: targetScroll, behavior: 'smooth' });
                }
            }, 50);
        }
    },

    openPatientComment(fieldId, patientId, event) {
        this.openPatientDetails(fieldId, patientId, event);

        setTimeout(() => {
            const textarea = document.getElementById(`medixtract-comment-${patientId}`);
            if (textarea) {
                textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
                textarea.focus();
                // Highlight momentarily
                textarea.style.transition = 'box-shadow 0.3s';
                const originalShadow = textarea.style.boxShadow;
                textarea.style.boxShadow = '0 0 0 3px var(--primary-light)';
                setTimeout(() => {
                    textarea.style.boxShadow = originalShadow;
                }, 1000);
            }
        }, 200);
    }
});
