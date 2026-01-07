/**
 * Main Table Rendering Mixin for SchemaEditor
 */
Object.assign(SchemaEditor.prototype, {
    renderFieldsTable() {
        const tbody = document.getElementById('fieldsTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';
        this.filteredFields.forEach(f => tbody.appendChild(this.createFieldRow(f)));

        if (this.updateScrollTopVisibility) {
            this.updateScrollTopVisibility();
        }
    },

    createFieldRow(f) {
        const row = document.createElement('div');
        row.className = `field-row match-${f.matchStatus}`;
        row.dataset.fieldId = f.id;
        row.onclick = () => this.selectField(f.id);

        const groupColor = AppUtils.getGroupColor(f.group);
        const perfs = Object.values(f.definition.performance || {});
        // const isDismissed = perfs.length > 0 && perfs.every(p => p.dismissed);

        let statusHtml = '';
        if (f.matchStatus === 'matched') {
            statusHtml = `<span class="analysis-indicator matched indicator-only" title="Matched">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19,13H5V11H19V13M19,9H5V7H19V9Z"/></svg>
            </span>`;
        } else if (f.matchStatus === 'uncertain') {
            statusHtml = `<span class="analysis-indicator uncertain indicator-only" title="Uncertain">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M10,19H13V22H10V19M12,2C17.35,2.22 19.68,7.62 16.5,11.67C15.67,12.67 14.33,13.33 13.67,14.17C13,15 13,16 13,17H10C10,15.33 10,13.9 10.67,12.91C11.34,11.91 12.67,11.33 13.5,10.67C15.92,8.43 15.32,5.26 12,5A3,3 0 0,0 9,8H6A6,6 0 0,1 12,2Z"/></svg>
            </span>`;
        } else if (f.matchStatus === 'improved') {
            statusHtml = `<span class="analysis-indicator improved indicator-only" title="Matched (Improved)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/></svg>
            </span>`;
        } else if (f.matchStatus === 'mixed') {
            statusHtml = `<span class="analysis-indicator mixed indicator-only" title="Mixed Status" style="font-weight:bold; font-size:14px; display: flex; align-items: center; justify-content: center;">
                ≈
            </span>`;
        } else if (f.matchStatus === 'unmatched') {
            statusHtml = `<span class="analysis-indicator unmatched indicator-only" title="Unmatched (Issued)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/></svg>
            </span>`;
        } else if (f.matchStatus === 'dismissed') {
            statusHtml = `<span class="analysis-indicator dismissed indicator-only" title="Dismissed">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/></svg>
            </span>`;
        } else {
            statusHtml = `<span class="analysis-indicator pending indicator-only" title="Pending">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M16.2,16.2L11,13V7H12.5V12.2L17,14.9L16.2,16.2Z"/></svg>
            </span>`;
        }

        const cols = {
            match: `<div class="th-match" style="display:flex; justify-content:center;">${statusHtml}</div>`,
            name: `<div class="field-name"><strong>${f.id}</strong></div>`,
            group: `<div><div class="field-group" style="background:${groupColor.bg};color:${groupColor.text};border-color:${groupColor.border}">${AppUtils.formatGroupName(f.group)}</div></div>`,
            ai_value: `<div class="field-value ai-value" style="gap: 6px;">${f.aiValue.length > 0 ? f.aiValue.map(v => `
                <div class="patient-answer-row" style="display: flex; align-items: center; gap: 4px;">
                    ${(!v.reviewed && v.status !== 'pending') ? `<span class="review-warning-chip" title="Patient ${v.pid}: Not Reviewed" onclick="app.openPatientDetails('${f.id}', '${v.pid}', event)">!</span>` : ''}
                    <div class="value-chip ${v.status}" title="Patient ${v.pid}: ${v.status}" onclick="app.openPatientDetails('${f.id}', '${v.pid}', event)">
                        ${v.label ? `<span class="chip-label">${v.label}:</span>` : ''}
                        <span class="chip-value">${v.value}</span>
                    </div>
                </div>`).join('') : '<div>--</div>'}</div>`,
            human_value: `<div class="field-value human-value" style="gap: 6px;">${f.humanValue.length > 0 ? f.humanValue.map(v => `
                <div class="patient-answer-row" style="display: flex; align-items: center; gap: 4px;">
                    ${(!v.reviewed && v.status !== 'pending') ? `<span class="review-warning-chip" title="Patient ${v.pid}: Not Reviewed" onclick="app.openPatientDetails('${f.id}', '${v.pid}', event)">!</span>` : ''}
                    <div class="value-chip ${v.status}" title="Patient ${v.pid}: ${v.status}" onclick="app.openPatientDetails('${f.id}', '${v.pid}', event)">
                        ${v.label ? `<span class="chip-label">${v.label}:</span>` : ''}
                        <span class="chip-value">${v.value}</span>
                    </div>
                </div>`).join('') : '<div>--</div>'}</div>`,
            patient_comments: `<div class="field-value patient-comments" style="gap: 6px;">${f.patientComments && f.patientComments.length > 0 ? f.patientComments.map(v => {
                const safeVal = (v.value || '').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
                const hasContent = v.hasComment || (v.value && v.value.trim().length > 0);

                if (!hasContent) {
                    // Render invisible placeholder to maintain alignment
                    return `
                    <div class="patient-answer-row" style="display: flex; align-items: center; gap: 4px; visibility: hidden; pointer-events: none;">
                        <div class="value-chip">
                             <span class="chip-value">&nbsp;</span>
                        </div>
                    </div>`;
                }

                return `
                <div class="patient-answer-row" style="display: flex; align-items: center; gap: 4px; width: 100%;">
                    <div class="value-chip ${v.status}" title="Patient ${v.pid}: ${safeVal}" onclick="app.openPatientComment('${f.id}', '${v.pid}', event)" style="max-width: 100%; display: flex; align-items: center;">
                        ${v.label ? `<span class="chip-label" style="flex-shrink: 0;">${v.label}:</span>` : ''}
                        <span class="chip-value" style="display: inline-block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: bottom; flex: 1; min-width: 0;">${safeVal}</span>
                    </div>
                </div>`;
            }).join('') : '<div></div>'}</div>`,
            reviewer_comments: `<div class="field-value reviewer-comments" style="gap: 6px;">${f.reviewer_comments && f.reviewer_comments.length > 0 ? f.reviewer_comments.map(v => {
                const safeVal = (v.value || '').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
                const hasContent = v.hasComment || (v.value && v.value.trim().length > 0);

                if (!hasContent) {
                    return `
                    <div class="patient-answer-row" style="display: flex; align-items: center; gap: 4px; visibility: hidden; pointer-events: none;">
                        <div class="value-chip">
                             <span class="chip-value">&nbsp;</span>
                        </div>
                    </div>`;
                }

                return `
                <div class="patient-answer-row" style="display: flex; align-items: center; gap: 4px; width: 100%;">
                    <div class="value-chip ${v.status}" title="Patient ${v.pid}: ${safeVal}" onclick="app.openPatientComment('${f.id}', '${v.pid}', event)" style="max-width: 100%; display: flex; align-items: center;">
                        ${v.label ? `<span class="chip-label" style="flex-shrink: 0;">${v.label}:</span>` : ''}
                        <span class="chip-value" style="display: inline-block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: bottom; flex: 1; min-width: 0;">${safeVal}</span>
                    </div>
                </div>`;
            }).join('') : '<div></div>'}</div>`,
            description: `<div class="field-description"><div class="text-truncate-container">${f.description}</div></div>`,
            comments: `<div class="field-notes"><div class="text-truncate-container">${f.comments}</div></div>`,
            reviewer_notes: `<div class="field-notes reviewer-notes"><div class="text-truncate-container">${f.reviewer_notes}</div></div>`,
            type: `<div><div class="field-type">${f.type}</div></div>`,
            options: `<div class="field-options">${(f.definition.options || f.definition.enum || []).map(o => typeof o === 'object' ? o.label : o).join(' | ')}</div>`,
            indicators: `<div class="field-indicators" style="display:flex; flex-wrap:wrap; gap:4px;">
                ${(f.labels || []).map(l => `<span class="chip" style="font-size:0.75rem; padding:2px 6px; border-radius:12px; background:var(--gray-200); color:var(--gray-800); border:1px solid var(--gray-300);" title="Label: ${l}">${l}</span>`).join('')}
            </div>`
        };

        const visible = this.settings.columnOrder.filter(c => this.settings.columnVisibility[c]);
        row.innerHTML = visible.map(c => cols[c]).join('');

        const gridTemplate = visible.map(c => {
            const w = this.settings.columnWidths[c];
            if (['match', 'indicators'].includes(c)) return `${w}px`;
            return `${w}fr`;
        }).join(' ');

        row.style.gridTemplateColumns = gridTemplate;
        const patientCount = Math.max(f.aiValue?.length || 0, f.humanValue?.length || 0, 1);
        row.style.setProperty('--patient-count', patientCount);

        if (this.selectedField === f.id) row.classList.add('selected');
        return row;
    },

    updateTableRow(id) {
        const row = document.querySelector(`.field-row[data-field-id="${id}"]`);
        if (!row) return;
        const field = this.allFields.find(f => f.id === id);
        if (!field) return;
        const newRow = this.createFieldRow(field);
        row.replaceWith(newRow);
    },

    updateFieldStats() {
        const el = document.getElementById('fieldStats');
        if (el) el.textContent = `${this.allFields.length} fields`;
    },

    updateResultsCount() {
        const c = this.filteredFields.length;
        const t = this.allFields.length;
        const el = document.getElementById('resultsCount');
        if (el) el.textContent = c === t ? `${t} fields` : `${c}/${t} fields`;
    }
});
