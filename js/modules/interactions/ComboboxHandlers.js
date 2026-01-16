/**
 * Combobox Handlers Mixin
 * Handles logic for various comboboxes (Output, Label, Nickname, Property).
 */
Object.assign(SchemaEditor.prototype, {
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
    }
});
