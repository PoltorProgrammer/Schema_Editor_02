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
        document.getElementById('saveBtn').addEventListener('click', this.saveChanges.bind(this));
        document.getElementById('downloadFilteredBtn').addEventListener('click', this.downloadFilteredFields.bind(this));

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
        ['type', 'group', 'label', 'status'].forEach(t => {
            const el = document.getElementById(`${t}Filter`);
            if (el) {
                el.querySelector('.dropdown-trigger').addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleDropdown(t);
                });
            }
        });

        // Hardcoded dropdown options for status
        const statusDropdown = document.getElementById('statusFilter');
        if (statusDropdown) {
            statusDropdown.querySelectorAll('.dropdown-option').forEach(opt => {
                opt.addEventListener('click', (e) => {
                    this.handleDropdownOptionClick('status', opt.dataset.value, e);
                });
            });
        }

        document.getElementById('clearFilters').addEventListener('click', this.clearAllFilters.bind(this));

        // Panel management
        document.getElementById('closePanelBtn').addEventListener('click', this.closeFieldDetails.bind(this));

        // Settings
        document.getElementById('settingsBtn').addEventListener('click', this.openSettings.bind(this));
        document.getElementById('closeSettingsBtn').addEventListener('click', this.cancelSettings.bind(this));
        document.getElementById('cancelSettingsBtn').addEventListener('click', this.cancelSettings.bind(this));
        document.getElementById('saveSettingsBtn').addEventListener('click', this.saveSettings.bind(this));

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
                const searchInput = document.getElementById('searchInput');
                if (searchInput) {
                    searchInput.focus();
                    searchInput.select();
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
            if (e.target.classList.contains('settings-overlay')) {
                this.cancelSettings();
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
        const container = document.getElementById('combobox-labels');
        if (container) {
            container.classList.add('open');
            this.renderLabelComboboxOptions(document.getElementById('input-labels').value);
        }
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
        const container = document.getElementById(`combobox-${prop}`);
        if (container) {
            container.classList.add('open');
            this.renderPropertyComboboxOptions(prop, document.getElementById(`input-${prop}`).value);
        }
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
    }
});
