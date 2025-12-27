/**
 * Data Processing and State Management Mixin for SchemaEditor
 */
Object.assign(SchemaEditor.prototype, {
    processProjectData() {
        if (!this.currentSchema) return;
        const variables = this.currentSchema.properties || this.currentSchema;
        if (!variables || typeof variables !== 'object') return;

        const validationPatients = Object.keys(this.validationData || {});
        const medixtractPatients = Object.keys(this.medixtractOutputData || {});
        // Collect all patient IDs from all properties' performance objects
        const performancePatients = new Set();
        Object.values(variables).forEach(def => {
            if (def && def.performance) {
                Object.keys(def.performance).forEach(pid => performancePatients.add(pid));
            }
        });
        const patients = Array.from(new Set([...validationPatients, ...medixtractPatients, ...performancePatients])).sort();

        this.allFields = Object.entries(variables).map(([key, def]) => {
            if (key === 'note' || !def || typeof def !== 'object') return null;

            const id = def.variable_id || key;
            const description = def.description || '';
            const group = def.group_id || def.group || 'ungrouped';

            if (!def.performance) def.performance = {};

            patients.forEach(patientId => {
                if (!def.performance[patientId]) {
                    def.performance[patientId] = {
                        matched: false,
                        pending: true,
                        unmatched: null,
                        output: [],
                        last_updated: new Date().toISOString()
                    };
                }
                const perf = def.performance[patientId];
                if (!perf.output) perf.output = [];

                // Pre-populate output from MediXtract output files if empty
                if (perf.output.length === 0 && this.medixtractOutputData?.[patientId]) {
                    const outputs = Array.isArray(this.medixtractOutputData[patientId])
                        ? this.medixtractOutputData[patientId]
                        : [this.medixtractOutputData[patientId]];

                    const valueCounts = {};
                    outputs.forEach(outputJson => {
                        const mOutput = outputJson[id];
                        if (mOutput !== undefined) {
                            const values = Array.isArray(mOutput) ? mOutput : [mOutput];
                            values.forEach(val => {
                                if (val !== null && val !== undefined) {
                                    const strVal = String(val);
                                    valueCounts[strVal] = (valueCounts[strVal] || 0) + 1;
                                }
                            });
                        }
                    });

                    Object.entries(valueCounts).forEach(([value, count]) => {
                        perf.output.push({ value, count });
                    });
                }

                const patientData = this.validationData[patientId];
                if (!patientData) return;

                const patientValArray = patientData[id];
                const humanValue = Array.isArray(patientValArray) ? patientValArray[0] : null;

                const aiValue = AppUtils.getMostCommonValue(perf.output);

                if (perf.pending && aiValue !== null && humanValue !== null) {
                    const isMatch = (String(aiValue) === String(humanValue));
                    perf.matched = isMatch;
                    perf.unmatched = isMatch ? null : { structural: false };
                    perf.pending = false;
                }
            });

            // Multi-patient Status Logic (Priority: Pending > Issued > Improved > Matched > Dismissed)
            let overallMatch = 'pending';
            const perfs = Object.values(def.performance || {});

            if (perfs.length === 0 || perfs.some(p => p.pending)) {
                overallMatch = 'pending';
            } else {
                const hasIssue = perfs.some(p => p.unmatched && !(p.unmatched.filled_blank || p.unmatched.correction || p.unmatched.standardized || p.unmatched.improved_comment));
                const hasImprovement = perfs.some(p => p.unmatched && (p.unmatched.filled_blank || p.unmatched.correction || p.unmatched.standardized || p.unmatched.improved_comment));
                const hasMatch = perfs.some(p => p.matched);
                const allDismissed = perfs.every(p => p.dismissed);

                if (hasIssue) {
                    overallMatch = 'unmatched';
                } else if (hasImprovement) {
                    overallMatch = 'improved';
                } else if (hasMatch) {
                    overallMatch = 'matched';
                } else if (allDismissed) {
                    overallMatch = 'dismissed';
                } else {
                    overallMatch = 'pending';
                }
            }

            return {
                id,
                definition: def,
                type: AppUtils.getFieldType(def),
                group,
                description,
                comments: def.notes || def.comment || '',
                aiValue: patients.map(pid => {
                    const val = AppUtils.getMostCommonValue(def.performance[pid]?.output) || '--';
                    const displayVal = AppUtils.formatValueWithLabel(val, def);
                    return patients.length > 1 ? `${pid.replace('patient_', 'P')} - ${displayVal}` : displayVal;
                }).join('\n'),
                humanValue: patients.map(pid => {
                    const val = this.validationData[pid]?.[id]?.[0] || '--';
                    const displayVal = AppUtils.formatValueWithLabel(val, def);
                    return patients.length > 1 ? `${pid.replace('patient_', 'P')} - ${displayVal}` : displayVal;
                }).join('\n'),
                matchStatus: overallMatch,
                labels: def.labels || []
            };
        }).filter(f => f !== null);

        this.typeOptions.clear();
        this.groupOptions.clear();
        this.labelOptions.clear();
        this.allFields.forEach(f => {
            this.typeOptions.add(f.type);
            this.groupOptions.add(f.group);
            (f.labels || []).forEach(l => this.labelOptions.add(l));
        });

        const fieldStats = document.getElementById('fieldStats');
        if (fieldStats) {
            fieldStats.textContent = `${this.allFields.length} fields`;
        }

        let patientStats = document.getElementById('patientStats');
        if (!patientStats) {
            const infoContainer = document.querySelector('.schema-info');
            if (infoContainer) {
                patientStats = document.createElement('span');
                patientStats.id = 'patientStats';
                patientStats.className = 'field-stats';
                infoContainer.appendChild(patientStats);
            }
        }

        if (patientStats) {
            patientStats.textContent = `${patients.length} patient${patients.length !== 1 ? 's' : ''}`;
        }

        this.applyFilters();
        this.populateFilterOptions();

        if (this.selectedField) {
            this.refreshFieldData(this.selectedField);
        }
    },

    refreshFieldData(id) {
        const variables = this.currentSchema.properties || this.currentSchema;
        const def = variables[id];
        if (!def) return;

        const idx = this.allFields.findIndex(f => f.id === id);
        if (idx !== -1) {
            // Multi-patient Status Logic (Priority: Pending > Issued > Improved > Matched > Dismissed)
            let overallMatch = 'pending';
            const perfs = Object.values(def.performance || {});

            if (perfs.length === 0 || perfs.some(p => p.pending)) {
                overallMatch = 'pending';
            } else {
                const hasIssue = perfs.some(p => p.unmatched && !(p.unmatched.filled_blank || p.unmatched.correction || p.unmatched.standardized || p.unmatched.improved_comment));
                const hasImprovement = perfs.some(p => p.unmatched && (p.unmatched.filled_blank || p.unmatched.correction || p.unmatched.standardized || p.unmatched.improved_comment));
                const hasMatch = perfs.some(p => p.matched);
                const allDismissed = perfs.every(p => p.dismissed);

                if (hasIssue) {
                    overallMatch = 'unmatched';
                } else if (hasImprovement) {
                    overallMatch = 'improved';
                } else if (hasMatch) {
                    overallMatch = 'matched';
                } else if (allDismissed) {
                    overallMatch = 'dismissed';
                } else {
                    overallMatch = 'pending';
                }
            }

            const validationPatients = Object.keys(this.validationData || {});
            const performancePatients = Object.keys(def.performance || {});
            const pidList = Array.from(new Set([...validationPatients, ...performancePatients])).sort();
            const aiVal = pidList.map(pid => {
                const outputs = def.performance?.[pid]?.output || [];
                const val = AppUtils.getMostCommonValue(outputs) || '--';
                const displayVal = AppUtils.formatValueWithLabel(val, def);
                return pidList.length > 1 ? `${pid.replace('patient_', 'P')} - ${displayVal}` : displayVal;
            }).join('\n');
            const humanVal = pidList.map(pid => {
                const val = this.validationData[pid]?.[id]?.[0] || '--';
                const displayVal = AppUtils.formatValueWithLabel(val, def);
                return pidList.length > 1 ? `${pid.replace('patient_', 'P')} - ${displayVal}` : displayVal;
            }).join('\n');

            this.allFields[idx] = {
                id,
                definition: def,
                type: AppUtils.getFieldType(def),
                group: def.group_id || 'ungrouped',
                description: def.description || '',
                comments: def.notes || def.comment || '',
                aiValue: aiVal,
                humanValue: humanVal,
                matchStatus: overallMatch,
                labels: def.labels || []
            };
        }
        this.updateTableRow(id);
        if (this.selectedField === id) {
            this.updatePanelHeader(id);
            this.renderFieldDetailsForm(def);
        }
        this.applyFilters();
    },

    updateFieldProperty(id, prop, val) {
        const variables = this.currentSchema.properties || this.currentSchema;
        const def = variables[id];
        if (!def || !prop) return;

        if (prop === 'group_id') {
            def.group_id = val;
        } else if (['description', 'notes', 'subgroup_01', 'subgroup_02', 'subgroup_03', 'default', 'type'].includes(prop)) {
            def[prop] = val;
        } else {
            if (val === '' || val === false) delete def[prop];
            else def[prop] = val;
        }
        this.markAsUnsaved();
    },

    handleFieldPropertyChange(e) {
        if (!this.selectedField) return;
        const prop = e.target.dataset.property;
        const solvedProp = e.target.dataset.solved;
        const patientId = e.target.dataset.patient;
        const perfProp = e.target.dataset.perfProp;
        const unmatchedProp = e.target.dataset.unmatched;

        let val = e.target.type === 'checkbox' ? e.target.checked : e.target.value.trim();
        const variables = this.currentSchema.properties || this.currentSchema;
        const def = variables[this.selectedField];

        if (solvedProp) {
            if (!def.was_solved) def.was_solved = {};
            def.was_solved[solvedProp] = val;
            def.was_solved.changed_at = new Date().toISOString();
        } else if (patientId) {
            if (!def.performance) def.performance = {};
            if (!def.performance[patientId]) def.performance[patientId] = {};
            const perf = def.performance[patientId];

            if (perfProp === 'status') {
                const standardStatuses = ['matched', 'pending', 'dismissed'];
                if (standardStatuses.includes(val)) {
                    perf.matched = (val === 'matched');
                    perf.pending = (val === 'pending');
                    perf.dismissed = (val === 'dismissed');
                    perf.unmatched = false;
                } else {
                    // Value is an unmatched reason (e.g. 'filled_blank', 'missing_docs')
                    perf.matched = false;
                    perf.pending = false;
                    perf.dismissed = false;
                    perf.unmatched = { [val]: true };
                }
            } else if (perfProp === 'severity') {
                perf.severity = parseInt(val) || 1;
            } else if (perfProp === 'comment') {
                perf.comment = val;
            } else if (perfProp === 'primary_output') {
                if (!perf.output) perf.output = [];
                if (perf.output.length > 0) perf.output[0].value = val;
                else perf.output.push({ value: val, count: 1 });
            } else if (perfProp === 'human_val') {
                if (!this.validationData[patientId]) this.validationData[patientId] = {};

                // Extract code from "Label (Code)" format if present
                let cleanVal = val;
                const match = val.match(/\(([^)]+)\)$/);
                if (match) cleanVal = match[1];

                if (!this.validationData[patientId][this.selectedField]) {
                    this.validationData[patientId][this.selectedField] = [cleanVal, "", 1];
                } else {
                    this.validationData[patientId][this.selectedField][0] = cleanVal;
                }
            } else if (unmatchedProp) {
                if (!perf.unmatched || typeof perf.unmatched !== 'object') perf.unmatched = {};
                // Exclusivity: if checking a reason, clear all others first
                if (val) {
                    perf.unmatched = { [unmatchedProp]: true };
                } else {
                    // If unchecking the active one (though radios usually don't allow uncheck by clicking the same one unless custom JS)
                    delete perf.unmatched[unmatchedProp];
                }
            }
            perf.last_updated = new Date().toISOString();
        } else if (prop === 'group_id' && val === '__new__') {
            const name = prompt('New group name:');
            if (name?.trim()) {
                val = name.trim();
                this.groupOptions.add(val);
                this.populateFilterOptions();
                e.target.innerHTML = this.generateGroupOptions(val);
                e.target.value = val;
            } else {
                e.target.value = def.group_id || 'ungrouped';
                return;
            }
        } else if (prop === 'group_id' && val) {
            if (!this.groupOptions.has(val)) {
                this.groupOptions.add(val);
                this.populateFilterOptions();
            }
        } else if (prop === 'type' && val) {
            if (!this.typeOptions.has(val)) {
                this.typeOptions.add(val);
                this.populateFilterOptions();
            }
        }

        this.updateFieldProperty(this.selectedField, prop, val);
        if (e.target.tagName === 'TEXTAREA') AppUI.autoResizeTextarea(e.target);
        this.markAsUnsaved();
        this.refreshFieldData(this.selectedField);
    },

    setSeverity(patientId, level) {
        if (!this.selectedField || !patientId) return;
        const variables = this.currentSchema.properties || this.currentSchema;
        const def = variables[this.selectedField];
        if (!def.performance) def.performance = {};
        if (!def.performance[patientId]) def.performance[patientId] = {};

        def.performance[patientId].severity = level;
        def.performance[patientId].last_updated = new Date().toISOString();
        this.markAsUnsaved();
        this.refreshFieldData(this.selectedField);
    },

    setReviewStatus(patientId, status, unmatchedReason) {
        if (!this.selectedField || !patientId) return;
        const variables = this.currentSchema.properties || this.currentSchema;
        const def = variables[this.selectedField];
        if (!def.performance) def.performance = {};
        if (!def.performance[patientId]) def.performance[patientId] = {};

        const perf = def.performance[patientId];

        // Reset all states
        perf.pending = false;
        perf.matched = false;
        perf.dismissed = false;
        perf.unmatched = false;

        if (status === 'pending') {
            perf.pending = true;
        } else if (status === 'matched') {
            perf.matched = true;
        } else if (status === 'dismissed') {
            perf.dismissed = true;
        } else if (status === 'unmatched') {
            // For unmatched, we expect a reason, but support generic if needed (though UI prevents it)
            perf.unmatched = unmatchedReason ? { [unmatchedReason]: true } : { structural: true };
        }

        perf.last_updated = new Date().toISOString();
        this.refreshFieldData(this.selectedField);
    },

    addLabel(label, e) {
        if (e) e.stopPropagation();
        const variables = this.currentSchema.properties || this.currentSchema;
        const def = variables[this.selectedField];
        if (!def.labels) def.labels = [];
        if (!def.labels.includes(label)) {
            def.labels.push(label);

            // Add to global options so it appears in suggestions for other variables
            if (!this.labelOptions.has(label)) {
                this.labelOptions.add(label);
                this.populateFilterOptions();
            }

            this.renderLabels(def.labels);
            this.markAsUnsaved();
        }
    },

    removeLabel(label, e) {
        if (e) e.stopPropagation();
        const variables = this.currentSchema.properties || this.currentSchema;
        const def = variables[this.selectedField];
        if (def.labels) {
            def.labels = def.labels.filter(l => l !== label);
            this.renderLabels(def.labels);
            this.markAsUnsaved();
        }
    },

    addOutput(patientId, e) {
        if (e) e.stopPropagation();
        const input = document.getElementById(`newOutput-${patientId}`);
        if (!input) return;
        const val = input.value.trim();
        if (!val) return;
        const variables = this.currentSchema.properties || this.currentSchema;
        const def = variables[this.selectedField];

        // Check if variable has restricted options
        let restrictedOptions = [];
        if (def.options && Array.isArray(def.options)) {
            restrictedOptions = def.options.map(o => String(o.value));
        } else if (def.enum && Array.isArray(def.enum)) {
            restrictedOptions = def.enum.map(e => String(e));
        }

        if (restrictedOptions.length > 0 && !restrictedOptions.includes(val)) {
            AppUI.showError(`Invalid option: "${val}" is not allowed for this field.`);
            input.focus();
            setTimeout(() => {
                const errorEl = document.getElementById('errorMessage');
                if (errorEl) errorEl.style.display = 'none';
            }, 3000);
            return;
        }

        if (!def.performance[patientId]) def.performance[patientId] = { output: [] };
        if (!def.performance[patientId].output) def.performance[patientId].output = []; // Ensure output array exists

        const existing = def.performance[patientId].output.find(o => String(o.value) === val);
        if (existing) {
            existing.count = (Number(existing.count) || 1) + 1;
        } else {
            def.performance[patientId].output.push({ value: val, count: 1 });
        }

        this.renderOutputList(patientId, def.performance[patientId].output);
        input.value = '';
        this.markAsUnsaved();
        this.refreshFieldData(this.selectedField);

        // Re-focus the newly rendered input and show all options (persistent behavior)
        const newInput = document.getElementById(`newOutput-${patientId}`);
        if (newInput) {
            newInput.focus();
            this.renderComboboxOptions(patientId, '');
            const container = document.getElementById(`combobox-${patientId}`);
            if (container) container.classList.add('open');
        }
    },

    removeOutput(patientId, index, e) {
        if (e) e.stopPropagation();
        const variables = this.currentSchema.properties || this.currentSchema;
        const def = variables[this.selectedField];
        if (def.performance[patientId]?.output) {
            def.performance[patientId].output.splice(index, 1);
            this.renderOutputList(patientId, def.performance[patientId].output);
            this.markAsUnsaved();
            this.refreshFieldData(this.selectedField);
        }
    },

    updateOutputCount(patientId, index, delta, e) {
        if (e && e.type === 'click') e.stopPropagation();
        const variables = this.currentSchema.properties || this.currentSchema;
        const def = variables[this.selectedField];
        if (def.performance[patientId]?.output?.[index]) {
            const out = def.performance[patientId].output[index];
            out.count = Math.max(1, (out.count || 1) + delta);

            // Update input value directly to maintain focus/state without re-rendering list
            const inputs = document.querySelectorAll(`#outputsList-${patientId} .output-count-input`);
            if (inputs && inputs[index]) {
                inputs[index].value = out.count;
            }

            this.updatePatientSummary(patientId, def.performance[patientId].output);
            this.markAsUnsaved();
        }
    },

    setOutputCount(patientId, index, value) {
        const variables = this.currentSchema.properties || this.currentSchema;
        const def = variables[this.selectedField];
        if (def.performance[patientId]?.output?.[index]) {
            const out = def.performance[patientId].output[index];
            let newVal = parseInt(value);
            if (isNaN(newVal) || newVal < 1) newVal = 1;
            out.count = newVal;

            // Sync DOM in case user entered invalid value
            const inputs = document.querySelectorAll(`#outputsList-${patientId} .output-count-input`);
            if (inputs && inputs[index]) {
                inputs[index].value = newVal;
            }

            this.updatePatientSummary(patientId, def.performance[patientId].output);
            this.markAsUnsaved();
        }
    },

    ensureFilterArrays() {
        if (!this.filters.types || !Array.isArray(this.filters.types)) this.filters.types = [];
        if (!this.filters.groups || !Array.isArray(this.filters.groups)) this.filters.groups = [];
        if (!this.filters.labels || !Array.isArray(this.filters.labels)) this.filters.labels = [];
        if (!this.filters.statuses || !Array.isArray(this.filters.statuses)) this.filters.statuses = [];
    }
});
