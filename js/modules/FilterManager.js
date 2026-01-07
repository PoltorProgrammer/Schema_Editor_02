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
        this.filters = {
            search: '',
            types: [],
            groups: [],
            labels: [],
            statuses: [],
            reviewed: [],
            severity: [],
            reviewerNoteUsers: [],
            reviewerCommentUsers: []
        };
        this.dropdowns.type.selected = [];
        this.dropdowns.group.selected = [];
        this.dropdowns.label.selected = [];
        this.dropdowns.status.selected = [];
        this.dropdowns.reviewed.selected = [];
        this.dropdowns.severity.selected = [];
        this.dropdowns.reviewerNoteUser.selected = [];
        this.dropdowns.reviewerCommentUser.selected = [];

        document.getElementById('searchInput').value = '';
        const clearBtn = document.getElementById('clearSearch');
        if (clearBtn) clearBtn.style.display = 'none';
        ['type', 'group', 'label', 'status', 'reviewed', 'severity', 'reviewerNoteUser', 'reviewerCommentUser'].forEach(t => {
            this.updateDropdownDisplay(t);
            this.updateDropdownOptions(t);
        });
        this.applyFilters();
    },

    applyFilters() {
        this.ensureFilterArrays();

        const s = this.filters.search;
        let results = this.allFields.map(f => {
            let score = 0;
            if (s) {
                // Normalize search string: underscores treat as spaces
                const normSearch = s.replace(/_/g, ' ');

                // ID Match (Priority 1)
                // Normalize both ID and Search string to handle underscores/spaces
                // We check if the ID (treated with spaces) contains the search string
                const normId = f.id.toLowerCase().replace(/_/g, ' ');

                if (normId.includes(normSearch)) {
                    score = 100;
                    // Boost for starting with the term
                    if (normId.startsWith(normSearch)) score += 50;
                    // Boost for exact match (rare but possible)
                    if (normId === normSearch) score += 50;
                }

                // Content Match (Priority 2)
                if (score === 0) {
                    // Check metadata using normalized search
                    const matchesProps = [f.description, f.comments, f.reviewer_notes, f.group].some(v => v && v.toLowerCase().includes(normSearch)) ||
                        (f.labels && f.labels.some(l => l.toLowerCase().includes(normSearch)));
                    if (matchesProps) score = 10;

                    if (score === 0) {
                        const matchesPatients = Object.entries(f.definition.performance || {}).some(([pid, perf]) => {
                            // Search in comments
                            const mComment = perf.medixtract_comment || '';
                            const rComments = Array.isArray(perf.reviewer_comment)
                                ? perf.reviewer_comment.map(c => c.comment).join(' ')
                                : (perf.reviewer_comment || '');

                            if (mComment.toLowerCase().includes(normSearch)) return true;
                            if (rComments.toLowerCase().includes(normSearch)) return true;

                            // Helper to check value content or label
                            const checkValueWithLabel = (val) => {
                                const normalized = AppUtils.normalizeValue(val).toLowerCase();
                                if (normalized.includes(normSearch)) return true;
                                if (f.definition.options) {
                                    const opt = f.definition.options.find(o => AppUtils.normalizeValue(o.value).toLowerCase() === normalized);
                                    if (opt && opt.label && opt.label.toLowerCase().includes(normSearch)) return true;
                                }
                                return false;
                            };

                            // Search in MediXtract outputs
                            if (perf.output && Array.isArray(perf.output)) {
                                if (perf.output.some(o => checkValueWithLabel(o.value))) return true;
                            }

                            // Search in Human inputs
                            const valRaw = this.validationData && this.validationData[pid] ? this.validationData[pid][f.id] : null;
                            if (valRaw !== undefined && valRaw !== null) {
                                const humanVal = (Array.isArray(valRaw) ? valRaw[0] : valRaw);
                                if (humanVal !== null && humanVal !== undefined && checkValueWithLabel(humanVal)) return true;
                            }

                            return false;
                        });
                        if (matchesPatients) score = 10;
                    }
                }
            } else {
                score = 1; // Pass all if no search
            }

            return { field: f, score };
        });

        // Filter out non-matches (score 0), unless search is empty (where score is 1)
        results = results.filter(r => r.score > 0);

        // Filter by Facets
        results = results.filter(({ field: f }) => {
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
                    if (r === 'reviewed') return perfs.every(p => p.reviewed || p.pending || p.matched);
                    if (r === 'not_reviewed') return perfs.some(p => !p.reviewed && !p.pending && !p.matched);
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

            // Reviewer Note User filter
            if (this.filters.reviewerNoteUsers.length) {
                const notes = f.definition.reviewer_notes || [];
                const hasMatch = Array.isArray(notes) && notes.some(n => this.filters.reviewerNoteUsers.includes(n.user));
                if (!hasMatch) return false;
            }

            // Reviewer Comment User filter
            if (this.filters.reviewerCommentUsers.length) {
                const perfs = Object.values(f.definition.performance || {});
                const hasMatch = perfs.some(p => {
                    const coms = p.reviewer_comment || [];
                    return Array.isArray(coms) && coms.some(c => this.filters.reviewerCommentUsers.includes(c.user));
                });
                if (!hasMatch) return false;
            }

            return true;
        });

        // Sort based on score if searching
        if (s) {
            results.sort((a, b) => {
                if (b.score !== a.score) {
                    return b.score - a.score; // Higher score first
                }
                // Tie-breaker: Shorter ID length is better (more specific match)
                if (a.field.id.length !== b.field.id.length) {
                    return a.field.id.length - b.field.id.length;
                }
                return a.field.id.localeCompare(b.field.id);
            });
        }

        this.filteredFields = results.map(r => r.field);
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

        const filterMap = {
            'type': 'types',
            'group': 'groups',
            'label': 'labels',
            'status': 'statuses',
            'reviewed': 'reviewed',
            'severity': 'severity',
            'reviewerNoteUser': 'reviewerNoteUsers',
            'reviewerCommentUser': 'reviewerCommentUsers'
        };
        this.filters[filterMap[type]] = [...selected];
        this.updateDropdownDisplay(type);
        this.updateDropdownOptions(type);
        this.applyFilters();
    },

    updateDropdownDisplay(type) {
        const label = document.querySelector(`#${type}Filter .dropdown-label`);
        const selected = this.dropdowns[type].selected;
        const defaultLabels = {
            type: 'All Types',
            group: 'All Groups',
            label: 'All Labels',
            status: 'All Statuses',
            reviewed: 'All Reviewed',
            severity: 'All Severities',
            reviewerNoteUser: 'All Note Users',
            reviewerCommentUser: 'All Comment Users'
        };

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
