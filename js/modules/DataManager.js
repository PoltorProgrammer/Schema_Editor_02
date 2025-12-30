/**
 * Data Processing and State Management Mixin for SchemaEditor
 */
Object.assign(SchemaEditor.prototype, {
    processProjectData() {
        if (!this.currentSchema) return;
        const variables = this.currentSchema.properties || this.currentSchema;
        if (!variables || typeof variables !== 'object') return;

        const validationPatients = Object.keys(this.validationData || {});
        const patients = validationPatients.sort();

        // Purge patients that have no validation data from performance tracking
        Object.values(variables).forEach(def => {
            if (def && def.performance) {
                Object.keys(def.performance).forEach(pid => {
                    if (!validationPatients.includes(pid)) {
                        delete def.performance[pid];
                    }
                });
            }
        });

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
                        reviewed: false,
                        last_updated: new Date().toISOString()
                    };
                }
                const perf = def.performance[patientId];
                if (!perf.output) perf.output = [];

                // Always sync output from MediXtract output files
                if (this.medixtractOutputData?.[patientId]) {
                    perf.output = []; // Reset existing output to ensure it reflects folder contents
                    const outputs = Array.isArray(this.medixtractOutputData[patientId])
                        ? this.medixtractOutputData[patientId]
                        : [this.medixtractOutputData[patientId]];

                    const valueCounts = {};
                    outputs.forEach(outputJson => {
                        const mOutput = outputJson[id];
                        if (mOutput !== undefined) {
                            // Normalize to array for uniform processing, but handle non-array values gracefully
                            const values = Array.isArray(mOutput) ? mOutput : [mOutput];
                            values.forEach(val => {
                                const strVal = AppUtils.normalizeValue(val);
                                valueCounts[strVal] = (valueCounts[strVal] || 0) + 1;
                            });
                        }
                    });

                    Object.entries(valueCounts).forEach(([value, count]) => {
                        perf.output.push({ value, count });
                    });
                }

                const patientData = this.validationData[patientId];
                if (!patientData) return;

                const valRaw = patientData[id];
                // Handle both array format [value, ...] and direct value format
                let humanValue = Array.isArray(valRaw)
                    ? (valRaw.length > 0 ? valRaw[0] : null)
                    : (valRaw !== undefined ? valRaw : null);
                humanValue = AppUtils.normalizeValue(humanValue);

                const totalCount = perf.output.reduce((sum, o) => sum + (Number(o.count) || 0), 0);
                const matchingOutput = perf.output.find(o => AppUtils.normalizeValue(o.value) === humanValue);
                const matchingCount = matchingOutput ? Number(matchingOutput.count) : 0;
                const matchPercentage = totalCount > 0 ? (matchingCount / totalCount) * 100 : 0;

                const aiOutput = perf.output.reduce((prev, current) => {
                    return (Number(prev.count || 0) >= Number(current.count || 0)) ? prev : current;
                }, { value: null, count: 0 });

                const aiValue = aiOutput.value;
                const aiCount = Number(aiOutput.count) || 0;
                const aiFrequency = totalCount > 0 ? (aiCount / totalCount) * 100 : 0;
                const normalizedAi = aiValue !== null ? AppUtils.normalizeValue(aiValue) : null;

                // A match is only automatic if the most common value matches AND it meets the 90% threshold
                const isMatch = (normalizedAi !== null && normalizedAi === humanValue && matchPercentage >= 90);

                // SPECIFIC RULE: if AI is "null" (>90% frequency) and human is "empty", it's automatically "Standardized"
                const isAutoStandardized = (normalizedAi === 'null' && humanValue === 'empty' && aiFrequency >= 90);

                if (isMatch) {
                    // Auto-match if pending or if it was previously an auto-unmatched/discrepancy state
                    const noManualUnmatched = !perf.unmatched || typeof perf.unmatched !== 'object' || Object.values(perf.unmatched).every(v => v === false);
                    if (perf.pending || (noManualUnmatched && !perf.dismissed && !perf.matched)) {
                        perf.matched = true;
                        perf.unmatched = null;
                        perf.pending = false;
                    }
                } else if (isAutoStandardized) {
                    // Auto-standardize if pending or if it was previously an auto-discrepancy state
                    const noManualUnmatched = !perf.unmatched || typeof perf.unmatched !== 'object' || Object.values(perf.unmatched).every(v => v === false);
                    if (perf.pending || (noManualUnmatched && !perf.dismissed && (!perf.unmatched || !perf.unmatched.standardized))) {
                        perf.matched = false;
                        perf.unmatched = { standardized: true };
                        perf.pending = false;
                        perf.reviewed = false;
                    }
                } else if (aiValue !== null) {
                    // It's a discrepancy or doesn't meet the 90% threshold. 
                    // If it was auto-marked as matched or unmatched before, reset to pending.
                    const noManualUnmatched = !perf.unmatched || typeof perf.unmatched !== 'object' || Object.values(perf.unmatched).every(v => v === false);
                    if (perf.matched || (noManualUnmatched && !perf.dismissed)) {
                        perf.matched = false;
                        perf.unmatched = null;
                        perf.pending = true;
                        perf.reviewed = false; // Reset review status when discrepancy occurs
                    }
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
                    const perf = def.performance[pid];
                    let val = AppUtils.getMostCommonValue(perf?.output);
                    if (val === null || val === undefined) val = '--';
                    return {
                        pid,
                        label: patients.length > 1 ? pid.replace('patient_', 'P') : null,
                        value: AppUtils.formatValueWithLabel(val, def),
                        status: this.getPatientPerformanceStatus(perf),
                        reviewed: perf?.reviewed ?? false
                    };
                }),
                humanValue: patients.map(pid => {
                    const perf = def.performance[pid];
                    let valRaw = this.validationData[pid]?.[id];
                    let val = (Array.isArray(valRaw) ? valRaw[0] : valRaw) ?? null;
                    if (val !== null) val = AppUtils.normalizeValue(val);
                    else val = '--';
                    return {
                        pid,
                        label: patients.length > 1 ? pid.replace('patient_', 'P') : null,
                        value: AppUtils.formatValueWithLabel(val, def),
                        status: this.getPatientPerformanceStatus(perf),
                        reviewed: perf?.reviewed ?? false
                    };
                }),
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

            const pidList = Object.keys(this.validationData || {}).sort();
            const aiVal = pidList.map(pid => {
                const perf = def.performance?.[pid];
                const val = AppUtils.getMostCommonValue(perf?.output) || '--';
                return {
                    pid,
                    label: pidList.length > 1 ? pid.replace('patient_', 'P') : null,
                    value: AppUtils.formatValueWithLabel(val, def),
                    status: this.getPatientPerformanceStatus(perf),
                    reviewed: perf?.reviewed ?? false
                };
            });
            const humanVal = pidList.map(pid => {
                const perf = def.performance?.[pid];
                let valRaw = this.validationData[pid]?.[id];
                let val = (Array.isArray(valRaw) ? valRaw[0] : valRaw) ?? null;
                val = AppUtils.normalizeValue(val);
                return {
                    pid,
                    label: pidList.length > 1 ? pid.replace('patient_', 'P') : null,
                    value: AppUtils.formatValueWithLabel(val, def),
                    status: this.getPatientPerformanceStatus(perf),
                    reviewed: perf?.reviewed ?? false
                };
            });

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

                const currentVal = this.validationData[patientId][this.selectedField];

                // Respect existing format (Array vs Primitive) to support both legacy and new simplified JSON
                if (Array.isArray(currentVal)) {
                    this.validationData[patientId][this.selectedField][0] = cleanVal;
                } else {
                    this.validationData[patientId][this.selectedField] = cleanVal;
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
            perf.reviewed = false;
        } else if (status === 'matched') {
            perf.matched = true;
            perf.reviewed = true; // Auto-review matched records
        } else if (status === 'dismissed') {
            perf.dismissed = true;
            perf.reviewed = false;
        } else if (status === 'unmatched') {
            // For unmatched, we expect a reason, but support generic if needed (though UI prevents it)
            perf.unmatched = unmatchedReason ? { [unmatchedReason]: true } : { structural: true };
            perf.reviewed = false; // Require review for issues/improvements
        }

        perf.last_updated = new Date().toISOString();
        this.markAsUnsaved();
        this.refreshFieldData(this.selectedField);
    },

    setReviewedStatus(patientId, isReviewed) {
        if (!this.selectedField || !patientId) return;
        const variables = this.currentSchema.properties || this.currentSchema;
        const def = variables[this.selectedField];
        if (!def.performance) def.performance = {};
        if (!def.performance[patientId]) def.performance[patientId] = {};

        const perf = def.performance[patientId];
        perf.reviewed = isReviewed;
        perf.last_updated = new Date().toISOString();

        this.markAsUnsaved();

        // Surgical DOM update to prevent scrolling jumps/re-renders
        const card = document.querySelector(`.patient-collapsible[data-patient-id="${patientId}"]`);
        if (card) {
            card.classList.toggle('is-reviewed', isReviewed);
            card.classList.toggle('is-pending-review', !isReviewed);

            const header = card.querySelector('.patient-header');
            if (header) {
                const badgeContainer = header.querySelector('div[style*="display: flex"]');
                if (badgeContainer) {
                    const existingBang = badgeContainer.querySelector('span[style*="color: var(--warning)"]');
                    if (!isReviewed && !existingBang) {
                        badgeContainer.insertAdjacentHTML('afterbegin', '<span style="color: var(--warning); font-weight: 900; font-size: 1.1rem; line-height: 1;">!</span>');
                    } else if (isReviewed && existingBang) {
                        existingBang.remove();
                    }
                }
            }
        }

        // Sync with sidebar table row
        const idx = this.allFields.findIndex(f => f.id === this.selectedField);
        if (idx !== -1) {
            this.allFields[idx].definition = def;
            this.updateTableRow(this.selectedField);
        }
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
            this.refreshFieldData(this.selectedField);
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
            this.refreshFieldData(this.selectedField);
        }
    },



    ensureFilterArrays() {
        if (!this.filters.types || !Array.isArray(this.filters.types)) this.filters.types = [];
        if (!this.filters.groups || !Array.isArray(this.filters.groups)) this.filters.groups = [];
        if (!this.filters.labels || !Array.isArray(this.filters.labels)) this.filters.labels = [];
        if (!this.filters.statuses || !Array.isArray(this.filters.statuses)) this.filters.statuses = [];
    },

    getPatientPerformanceStatus(p) {
        if (!p) return 'pending';
        if (p.pending) return 'pending';
        if (p.unmatched) {
            const isImprovement = p.unmatched.filled_blank || p.unmatched.correction || p.unmatched.standardized || p.unmatched.improved_comment;
            return isImprovement ? 'improved' : 'unmatched';
        }
        if (p.matched) return 'matched';
        if (p.dismissed) return 'dismissed';
        return 'pending';
    }
});
