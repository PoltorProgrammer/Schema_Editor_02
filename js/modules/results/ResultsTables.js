/**
 * Results Page Tables Mixin
 * Handles table rendering, summary chips, and layout syncing for the Results Page
 */
Object.assign(SchemaEditor.prototype, {
    renderResultsTables(stats, patientIds) {
        // Render Patient Stats Table
        const patientTbody = document.getElementById('resultsPatientTbody');
        const patientTfoot = document.getElementById('resultsPatientTfoot');
        if (patientTbody) {
            patientTbody.innerHTML = patientIds.map(pid => {
                const s = stats.byPatient[pid];
                const label = patientIds.length > 1 ? pid.replace(/^Patient[_\s]?/i, 'P') : pid;
                return this.createStatRowHtml(label, s, pid);
            }).join('');

            // Calculate Patient Totals
            const patientTotal = this.createEmptyStatObject();
            patientIds.forEach(pid => {
                const s = stats.byPatient[pid];
                this.addStats(patientTotal, s);
            });
            if (patientTfoot) {
                patientTfoot.innerHTML = this.createStatRowHtml('TOTAL', patientTotal, 'Sum of all patients');
            }
        }

        // Render Field Stats Table
        const fieldTbody = document.getElementById('resultsFieldTbody');
        const fieldTfoot = document.getElementById('resultsFieldTfoot');
        if (fieldTbody) {
            // Apply Filter
            let fieldsToRender = this.allFields;
            if (this.activeTableFilter) {
                // Use robust inclusive filtering: Show field if ANY patient has this status
                fieldsToRender = this.allFields.filter(f => {
                    return patientIds.some(pid => {
                        const perf = f.definition.performance ? f.definition.performance[pid] : null;
                        const s = this.resolveStatusForStats(perf);
                        return s === this.activeTableFilter;
                    });
                });
            }

            fieldTbody.innerHTML = fieldsToRender.map(f => {
                const s = stats.byField[f.id];
                return this.createStatRowHtml(f.id, s, f.description, true);
            }).join('');

            // Calculate Field Totals (based on filtered view)
            const fieldTotal = this.createEmptyStatObject();
            fieldsToRender.forEach(f => {
                const s = stats.byField[f.id];
                this.addStats(fieldTotal, s);
            });

            const totalLabel = this.activeTableFilter
                ? `TOTAL (${this.activeTableFilter})`
                : 'TOTAL';

            if (fieldTfoot) {
                fieldTfoot.innerHTML = this.createStatRowHtml(totalLabel, fieldTotal, 'Sum of displayed fields', this.isGlobalView);
            }
        }
    },

    renderFieldSummary(categories, totalFields) {
        const container = document.getElementById('resultsFieldSummary');
        if (!container) return;

        const labels = {
            matched: { label: 'Match', cls: 'match' },
            improved: { label: 'Impr', cls: 'improved' },
            unmatched: { label: 'Issue', cls: 'unmatched' },
            uncertain: { label: 'Uncer', cls: 'uncertain' },
            pending: { label: 'Pend', cls: 'pending' },
            dismissed: { label: 'Dism', cls: 'dismissed' }
        };

        container.innerHTML = Object.entries(labels).map(([status, info]) => {
            const count = categories[status].size;
            const isActive = this.activeTableFilter === status;
            const activeStyle = isActive ? 'border: 2px solid var(--primary-color, #2563eb); background-color: rgba(37, 99, 235, 0.1);' : '';
            return `
                <div class="summary-chip" data-status="${status}" style="cursor: pointer; ${activeStyle}">
                    <span class="stat-chip stat-${info.cls}">${info.label}</span>
                    <span class="summary-count">${count}<small>/${totalFields}</small></span>
                </div>
            `;
        }).join('');

        // Attach click listener for filtering
        container.onclick = (e) => {
            const chip = e.target.closest('.summary-chip');
            if (chip) {
                const status = chip.dataset.status;
                this.toggleTableFilter(status);
            }
        };
    },

    toggleTableFilter(status) {
        if (this.activeTableFilter === status) {
            this.activeTableFilter = null;
        } else {
            this.activeTableFilter = status;
        }
        // Re-render summary to update active UI
        this.renderFieldSummary(this.cachedStats.byFieldCategory, this.allFields.length);
        // Re-render table with filter
        this.renderResultsTables(this.cachedStats, this.cachedPatientIds);
    },

    createStatRowHtml(label, s, tooltip = '', isAverage = false) {
        const displayLabel = label || '<span style="color:var(--gray-400)">(No ID)</span>';

        const formatNum = (n) => {
            if (isAverage && n % 1 !== 0) return n.toFixed(1);
            return n;
        };

        const pill = (count, type, title = '') => {
            const displayCount = formatNum(count);
            return `<div class="stat-pill ${count > 0 ? 'stat-' + type : 'zero'}" title="${title}">${displayCount}</div>`;
        };

        return `
            <tr>
                <td class="col-identifier" title="${tooltip}">${displayLabel}</td>
                <td class="col-stat">${pill(s.matched, 'match', 'Matched')}</td>
                <td class="col-stat">${pill(s.improved, 'improved', `Improved:
Correction: ${formatNum(s.improved_sub.correction)}
Filled Blank: ${formatNum(s.improved_sub.filled_blank)}
Standardized: ${formatNum(s.improved_sub.standardized)}
Comment: ${formatNum(s.improved_sub.improved_comment)}`)}</td>
                <td class="col-stat">${pill(s.unmatched, 'unmatched', `Unmatched:
Missing Docs: ${formatNum(s.unmatched_sub.missing_docs)}
Contradictions: ${formatNum(s.unmatched_sub.contradictions)}
Ambiguous: ${formatNum(s.unmatched_sub.ambiguous)}
Structural: ${formatNum(s.unmatched_sub.structural)}`)}</td>
                <td class="col-stat">${pill(s.uncertain, 'uncertain', 'Uncertain')}</td>
                <td class="col-stat">${pill(s.pending, 'pending', 'Pending')}</td>
                <td class="col-stat">${pill(s.dismissed, 'dismissed', 'Dismissed')}</td>
                <td class="col-stat col-total">${formatNum(s.total)}</td>
            </tr>
        `;
    },

    syncResultsHeights() {
        const sections = document.querySelectorAll('.results-section');
        if (sections.length < 2) return;

        const patientSection = sections[0];
        const fieldSection = sections[1];

        // 1. Reset heights to let them find natural layout
        patientSection.style.height = 'auto';
        fieldSection.style.height = 'auto';

        // 2. We use a micro-task to wait for the browser to recalculate the auto height
        requestAnimationFrame(() => {
            // Measure the patient section - this is our "limitant" master
            const targetHeight = patientSection.offsetHeight;

            if (targetHeight > 0) {
                // Apply this fixed height to the Field section
                fieldSection.style.height = targetHeight + 'px';
                // Also set it on patientSection to keep them perfectly level visually
                patientSection.style.height = targetHeight + 'px';
            }
        });
    }
});
