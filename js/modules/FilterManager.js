/**
 * Filtering Logic Mixin for SchemaEditor
 */
Object.assign(SchemaEditor.prototype, {
    handleSearchInput(e) {
        this.filters.search = e.target.value.toLowerCase().trim();
        const clearBtn = document.getElementById('clearSearch');
        if (clearBtn) clearBtn.style.display = e.target.value ? 'flex' : 'none';
        this.applyFilters();
    },

    clearSearch() {
        const input = document.getElementById('searchInput');
        if (!input) return;
        input.value = '';
        this.filters.search = '';
        const clearBtn = document.getElementById('clearSearch');
        if (clearBtn) clearBtn.style.display = 'none';
        this.applyFilters();
    },

    handleThreeStateFilter(name, e) {
        const states = ['all', 'true', 'false'];
        const current = this.filters[name];
        this.filters[name] = states[(states.indexOf(current) + 1) % 3];
        this.updateFilterButtonState(e.currentTarget, name, this.filters[name]);
        this.applyFilters();
    },

    updateFilterButtonState(btn, name, state) {
        btn.setAttribute('data-state', state);
        const label = btn.querySelector('.filter-label');
        const cap = name.charAt(0).toUpperCase() + name.slice(1);
        label.textContent = `${cap}: ${state.charAt(0).toUpperCase() + state.slice(1)}`;
    },

    clearAllFilters() {
        this.filters = { search: '', types: [], groups: [], labels: [], statuses: [], reviewed: [], severity: [] };
        this.dropdowns.type.selected = [];
        this.dropdowns.group.selected = [];
        this.dropdowns.label.selected = [];
        this.dropdowns.status.selected = [];
        this.dropdowns.reviewed.selected = [];
        this.dropdowns.severity.selected = [];
        document.getElementById('searchInput').value = '';
        const clearBtn = document.getElementById('clearSearch');
        if (clearBtn) clearBtn.style.display = 'none';
        ['type', 'group', 'label', 'status', 'reviewed', 'severity'].forEach(t => {
            this.updateDropdownDisplay(t);
            this.updateDropdownOptions(t);
        });
        this.applyFilters();
    },

    applyFilters() {
        this.ensureFilterArrays();
        this.filteredFields = this.allFields.filter(f => {
            // Search filter
            if (this.filters.search) {
                const s = this.filters.search;
                const matchesProps = [f.id, f.description, f.comments, f.group].some(v => v && v.toLowerCase().includes(s));
                const matchesPatients = Object.entries(f.definition.performance || {}).some(([pid, perf]) => {
                    const comment = perf.comment || (
                        this.validationData &&
                        this.validationData[pid] &&
                        Array.isArray(this.validationData[pid][f.id]) &&
                        this.validationData[pid][f.id][1]
                    ) || '';
                    return comment && comment.toLowerCase().includes(s);
                });

                if (!matchesProps && !matchesPatients) return false;
            }

            // Categories
            if (this.filters.types.length && !this.filters.types.includes(f.type)) return false;
            if (this.filters.groups.length && !this.filters.groups.includes(f.group)) return false;

            // Labels
            if (this.filters.labels.length) {
                const hasMatch = (f.labels || []).some(l => this.filters.labels.includes(l));
                if (!hasMatch) return false;
            }

            // Status filter (multi-select)
            if (this.filters.statuses.length) {
                const subStatuses = ['filled_blank', 'correction', 'standardized', 'improved_comment', 'missing_docs', 'contradictions', 'ambiguous', 'structural'];
                const hasMatch = this.filters.statuses.some(status => {
                    if (status === 'unmatched_any') {
                        return f.matchStatus === 'unmatched' || f.matchStatus === 'improved';
                    }
                    if (status === f.matchStatus) return true;
                    if (subStatuses.includes(status)) {
                        const perfs = Object.values(f.definition.performance || {});
                        return perfs.some(p => p.unmatched && p.unmatched[status]);
                    }
                    return false;
                });
                if (!hasMatch) return false;
            }

            // Reviewed filter
            if (this.filters.reviewed.length) {
                const hasMatch = this.filters.reviewed.some(r => {
                    const perfs = Object.values(f.definition.performance || {});
                    if (r === 'reviewed') return perfs.every(p => p.reviewed);
                    if (r === 'not_reviewed') return perfs.some(p => !p.reviewed);
                    return false;
                });
                if (!hasMatch) return false;
            }

            // Severity filter
            if (this.filters.severity.length) {
                const hasMatch = this.filters.severity.some(s => {
                    const perfs = Object.values(f.definition.performance || {});
                    return perfs.some(p => p.severity === parseInt(s));
                });
                if (!hasMatch) return false;
            }

            return true;

            return true;
        });
        this.renderFieldsTable();
        this.updateResultsCount();
    },

    handleDropdownOptionClick(type, value, event) {
        event.stopPropagation();
        const selected = this.dropdowns[type].selected;

        if (type === 'status') {
            const hierarchy = {
                'unmatched_any': ['improved', 'unmatched'],
                'improved': ['filled_blank', 'correction', 'standardized', 'improved_comment'],
                'unmatched': ['missing_docs', 'contradictions', 'ambiguous', 'structural']
            };

            const toggle = (val, force) => {
                const idx = selected.indexOf(val);
                const isSelected = force !== undefined ? force : (idx === -1);
                if (isSelected && idx === -1) selected.push(val);
                else if (!isSelected && idx !== -1) selected.splice(idx, 1);

                // Handle children
                if (hierarchy[val]) {
                    hierarchy[val].forEach(child => toggle(child, isSelected));
                }
            };

            toggle(value);

            // Re-sync parents based on children
            const syncParents = () => {
                let changed = false;
                Object.entries(hierarchy).forEach(([parent, children]) => {
                    const allSelected = children.every(c => selected.includes(c));
                    const isParentSelected = selected.includes(parent);
                    if (allSelected && !isParentSelected) {
                        selected.push(parent);
                        changed = true;
                    } else if (!allSelected && isParentSelected) {
                        selected.splice(selected.indexOf(parent), 1);
                        changed = true;
                    }
                });
                if (changed) syncParents(); // Recursively sync for multi-level hierarchy
            };
            syncParents();
        } else {
            const index = selected.indexOf(value);
            if (index === -1) selected.push(value);
            else selected.splice(index, 1);
        }

        const filterMap = { 'type': 'types', 'group': 'groups', 'label': 'labels', 'status': 'statuses', 'reviewed': 'reviewed', 'severity': 'severity' };
        this.filters[filterMap[type]] = [...selected];
        this.updateDropdownDisplay(type);
        this.updateDropdownOptions(type);
        this.applyFilters();
    },

    updateDropdownDisplay(type) {
        const label = document.querySelector(`#${type}Filter .dropdown-label`);
        const selected = this.dropdowns[type].selected;
        const defaultLabels = { type: 'All Types', group: 'All Groups', label: 'All Labels', status: 'All Statuses', reviewed: 'All Reviewed', severity: 'All Severities' };

        if (selected.length === 0) {
            label.innerHTML = defaultLabels[type];
        } else if (selected.length === 1) {
            label.innerHTML = type === 'group' ? AppUtils.formatGroupName(selected[0]) : selected[0];
        } else if (selected.length <= 2) {
            label.innerHTML = selected.map(val => type === 'group' ? AppUtils.formatGroupName(val) : val).join(', ');
        } else {
            label.innerHTML = `${selected.length} ${type.charAt(0).toUpperCase() + type.slice(1)}s`;
        }
    },

    updateDropdownOptions(type) {
        const content = document.querySelector(`#${type}Filter .dropdown-content`);
        const selected = this.dropdowns[type].selected;
        if (!content) return;
        content.querySelectorAll('.dropdown-option').forEach(option => {
            option.classList.toggle('selected', selected.includes(option.dataset.value));
        });
    }
});
