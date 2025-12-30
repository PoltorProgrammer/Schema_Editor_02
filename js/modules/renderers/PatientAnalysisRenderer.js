/**
 * Patient Analysis Rendering Mixin for SchemaEditor
 */
Object.assign(SchemaEditor.prototype, {
    createPatientCollapsible(patientId, def) {
        const valRaw = this.validationData[patientId]?.[this.selectedField];
        const humanValue = AppUtils.normalizeValue((Array.isArray(valRaw) ? valRaw[0] : valRaw) ?? null);
        const perf = def.performance?.[patientId] || { pending: true, output: [] };
        const outputs = perf.output || [];

        const container = document.createElement('div');
        container.className = `patient-collapsible ${perf.reviewed ? 'is-reviewed' : 'is-pending-review'}`;
        container.dataset.patientId = patientId;
        let statusClass = 'pending';
        let statusLabel = 'Pending';
        if (perf.matched) {
            statusClass = 'matched';
            statusLabel = 'Matched';
        } else if (perf.dismissed) {
            statusClass = 'dismissed';
            statusLabel = 'Dismissed';
        } else if (perf.unmatched) {
            const isImprovement = (perf.unmatched.filled_blank || perf.unmatched.correction || perf.unmatched.standardized || perf.unmatched.improved_comment);
            statusClass = isImprovement ? 'improved' : 'unmatched';
            statusLabel = isImprovement ? 'Improved' : 'Issued';
        } else if (perf.pending) {
            statusClass = 'pending';
            statusLabel = 'Pending';
        }

        container.innerHTML = `
            <div class="patient-header" onclick="app.togglePatientSection('${patientId}', event)">
                <h5>Patient: ${patientId}</h5>
                <div style="display: flex; align-items: center; gap: 0.625rem;">
                    ${!perf.reviewed ? '<span style="color: var(--warning); font-weight: 900; font-size: 1.1rem; line-height: 1;">!</span>' : ''}
                    <span class="analysis-indicator ${statusClass}">
                        ${statusLabel}
                    </span>
                </div>
            </div>
            <div class="patient-content">
                <div class="variable-reference-section" style="margin-bottom: 1.5rem; padding: 1rem; background: var(--gray-50); border: 1px solid var(--gray-200); border-radius: var(--radius);">
                    <div style="margin-bottom: 0.75rem;">
                        <label style="font-size: 0.75rem; color: var(--gray-500); font-weight: 600; text-transform: uppercase; display: block; margin-bottom: 0.25rem;">Description</label>
                        <div style="font-size: 0.875rem; color: var(--gray-700); line-height: 1.5;">${def.description || 'No description provided.'}</div>
                    </div>
                    ${def.options && def.options.length > 0 ? `
                    <div>
                        <label style="font-size: 0.75rem; color: var(--gray-500); font-weight: 600; text-transform: uppercase; display: block; margin-bottom: 0.5rem;">Available Options</label>
                        <div class="chips-container" style="border: none; padding: 0; background: transparent; min-height: auto; gap: 0.375rem;">
                            ${def.options.map(o => `
                                <span class="chip" style="background: var(--white); color: var(--gray-700); border: 1px solid var(--gray-200); padding: 0.25rem 0.625rem; border-radius: 6px; font-weight: 400; font-size: 0.8125rem;">
                                    <span style="font-weight: 600; color: var(--primary);">${o.value}</span>
                                    <span style="margin: 0 0.25rem; opacity: 0.3;">•</span>
                                    <span>${o.label}</span>
                                </span>
                            `).join('')}
                        </div>
                    </div>
                    ` : ''}
                </div>
                <div class="patient-validation-section" style="margin-bottom: 1.5rem; display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem;">
                    <div class="form-field">
                        <label>MediXtract Output</label>
                        ${(() => {
                const summary = this.calculatePatientSummaryState(patientId, outputs, humanValue);
                return `<div class="${summary.className}" id="summaryOutput-${patientId}" style="${summary.style}">${summary.displayVal}</div>
                                     <div id="validationMsg-${patientId}" style="font-size: 0.75rem; color: var(--gray-500); margin-top: 0.25rem; display: ${summary.msgDisplay};">No human validation value introduced</div>`;
            })()}
                    </div>
                    <div class="form-field">
                        <label>Human Output</label>
                        ${(() => {
                const displayVal = AppUtils.formatValueWithLabel(humanValue, def);
                return `<div class="output-display-box human-output" data-patient="${patientId}" data-perf-prop="human_val">${displayVal}</div>`;
            })()}
                    </div>
                </div>



                <div class="status-section-container" style="margin-bottom: 1.5rem;">
                    <div class="status-section-header" style="margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center;">
                        <label style="font-size: 0.75rem; color: var(--gray-500); font-weight: 600; text-transform: uppercase;">Review Status</label>
                        <div style="display: ${perf.matched ? 'none' : 'flex'}; align-items: center; gap: 0.5rem; opacity: ${perf.pending ? '0.5' : '1'}; pointer-events: ${perf.pending ? 'none' : 'auto'}; cursor: ${perf.pending ? 'not-allowed' : 'default'};">
                            <span style="font-size: 0.75rem; color: var(--gray-500); font-weight: 600; text-transform: uppercase;">Reviewed</span>
                            <label class="switch">
                                <input type="checkbox" 
                                    id="rev-check-${patientId}"
                                    ${(perf.reviewed && !perf.pending) ? 'checked' : ''} 
                                    ${perf.pending ? 'disabled' : ''}
                                    onclick="event.stopPropagation(); app.setReviewedStatus('${patientId}', this.checked)">
                                <span class="slider"></span>
                            </label>
                        </div>
                    </div>
                    <div class="status-section">
                        <div class="status-main-row" style="display: flex; gap: 0.5rem;">
                            <button class="status-btn ${perf.pending ? 'active pending' : ''}" onclick="app.setReviewStatus('${patientId}', 'pending')">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M16.2,16.2L11,13V7H12.5V12.2L17,14.9L16.2,16.2Z"/></svg>
                                Pending
                            </button>
                            <button class="status-btn ${perf.matched ? 'active matched' : ''}" onclick="app.setReviewStatus('${patientId}', 'matched')">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/></svg>
                                Matched
                            </button>
                            <button class="status-btn ${perf.dismissed ? 'active dismissed' : ''}" onclick="app.setReviewStatus('${patientId}', 'dismissed')">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/></svg>
                                Dismissed
                            </button>
                        </div>

                        <div class="unmatched-reasons-section" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; border-top: 1px solid var(--gray-200); padding-top: 1rem; margin-top: 1rem;">
                            <div>
                                <div class="reasons-title" style="margin-bottom: 0.5rem;">Improvements</div>
                                <div class="reasons-grid" style="display: grid; grid-template-columns: 1fr; gap: 0.5rem;">
                                    ${['filled_blank', 'correction', 'standardized', 'improved_comment'].map(reason => this.createUnmatchedButton(patientId, reason, perf)).join('')}
                                </div>
                            </div>
                            <div>
                                <div class="reasons-title" style="margin-bottom: 0.5rem;">Issues</div>
                                <div class="reasons-grid" style="display: grid; grid-template-columns: 1fr; gap: 0.5rem;">
                                    ${['missing_docs', 'contradictions', 'ambiguous', 'structural'].map(reason => this.createUnmatchedButton(patientId, reason, perf)).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="bottom-section" style="display: flex; flex-direction: column; gap: 1.25rem;">
                    <div class="form-field full-width">
                        <label>Explanation / Comment</label>
                        <textarea class="no-dropdown-icon" data-patient="${patientId}" data-perf-prop="comment" placeholder="Explain the discrepancy or result...">${perf.comment || (Array.isArray(valRaw) ? valRaw[1] : '') || ''}</textarea>
                    </div>
                    <div class="form-field full-width">
                        <label>Severity (1-5)</label>
                        <div class="severity-scale" style="display: flex; gap: 4px; align-items: center; height: 36px;">
                            ${[1, 2, 3, 4, 5].map(lvl => {
                const isActive = perf.severity >= lvl;
                const opacity = isActive ? '1' : '0.2';

                return `
                                    <button type="button" class="severity-btn" 
                                        onclick="app.setSeverity('${patientId}', ${lvl})" 
                                        title="Severity ${lvl}"
                                        style="background: transparent; border: none; cursor: pointer; padding: 2px; font-size: 1.5rem; opacity: ${opacity}; transition: opacity 0.2s;">
                                        ⚠️
                                    </button>
                                `;
            }).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;

        return container;
    },

    togglePatientSection(patientId, e) {
        if (e) e.stopPropagation();
        const header = e.currentTarget;
        const content = header.nextElementSibling;
        const isOpen = content.classList.toggle('open');
        if (isOpen) {
            content.querySelectorAll('textarea').forEach(t => AppUI.autoResizeTextarea(t));
        }
        this.capturePanelState();
    },

    createUnmatchedButton(patientId, reason, perf) {
        const labels = {
            filled_blank: 'Filled Blank', correction: 'Correction', standardized: 'Standardized', improved_comment: 'Improved Comment',
            missing_docs: 'Missing Docs', contradictions: 'Contradictions', ambiguous: 'Ambiguous', structural: 'Structural'
        };
        const isActive = perf.unmatched && perf.unmatched[reason];
        const isImprovement = ['filled_blank', 'correction', 'standardized', 'improved_comment'].includes(reason);

        return `<button 
            onclick="app.setReviewStatus('${patientId}', 'unmatched', '${reason}')"
            class="reason-btn ${isActive ? 'active' : ''} ${isImprovement ? 'improvement' : 'issue'}"
            title="${labels[reason]}">
            <span class="reason-dot"></span>
            ${labels[reason]}
        </button>`;
    },



    calculatePatientSummaryState(patientId, outputs, humanValStr) {
        if (!outputs) {
            const variables = this.currentSchema.properties || this.currentSchema;
            const def = variables[this.selectedField];
            outputs = def.performance?.[patientId]?.output || [];
        }

        const totalCount = outputs.reduce((sum, o) => sum + (Number(o.count) || 0), 0);
        const outputStats = outputs.map(o => {
            const c = Number(o.count) || 0;
            const p = totalCount > 0 ? Math.round((c / totalCount) * 100) : 0;
            return { value: o.value, count: c, percentage: p };
        }).sort((a, b) => b.count - a.count);

        const variables = this.currentSchema.properties || this.currentSchema;
        const fieldDef = variables[this.selectedField];
        const isComment = fieldDef.type === 'comment';

        const seenValues = new Set();
        const displayVal = outputStats.map(s => {
            const valStr = AppUtils.normalizeValue(s.value);
            // Basic HTML escape to prevent injection and layout issues
            const safeVal = valStr.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

            if (isComment) {
                if (seenValues.has(valStr)) return null;
                seenValues.add(valStr);
                return `<span style="display: inline-block; background: var(--white); color: var(--gray-700); border: 1px solid var(--gray-300); padding: 3px 8px; border-radius: 12px; margin: 2px; font-size: 0.8125rem;">${safeVal}</span>`;
            }

            let label = '';
            if (fieldDef.options) {
                const opt = fieldDef.options.find(o => String(o.value) === String(s.value));
                if (opt) label = opt.label;
            }

            const valuePrefix = `(${safeVal})`;
            const labelPart = label ? ` ${label}` : '';
            return `${valuePrefix}${labelPart} - ${s.percentage}% (${s.count}/${totalCount})`;
        }).filter(v => v !== null).join(isComment ? '' : '\n').trim();

        let bgColor = '';
        let borderColor = '';
        let msgDisplay = 'none';

        if (!humanValStr) {
            msgDisplay = 'block';
            if (totalCount === 0) {
                bgColor = 'var(--gray-200, #e5e7eb)';
                borderColor = 'var(--gray-400, #9ca3af)';
            }
        } else {
            msgDisplay = 'none';
            if (totalCount === 0) {
                bgColor = 'var(--gray-200, #e5e7eb)';
                borderColor = 'var(--gray-400, #9ca3af)';
            } else if (isComment) {
                bgColor = 'var(--white)';
                borderColor = 'var(--gray-300)';
            } else {
                let cleanHumanVal = humanValStr;
                const match = humanValStr.match(/\(([^)]+)\)$/);
                if (match) cleanHumanVal = match[1];

                const matchingStat = outputStats.find(s => AppUtils.normalizeValue(s.value) === AppUtils.normalizeValue(cleanHumanVal));
                const matchPercentage = matchingStat ? matchingStat.percentage : 0;

                if (matchPercentage >= 90) {
                    bgColor = '#DCFCE7';
                    borderColor = '#22C55E';
                } else if (matchPercentage >= 80) {
                    bgColor = '#FEF9C3';
                    borderColor = '#EAB308';
                } else if (matchPercentage >= 70) {
                    bgColor = '#FFEDD5';
                    borderColor = '#F97316';
                } else {
                    bgColor = '#FEE2E2';
                    borderColor = '#EF4444';
                }
            }
        }

        let baseStyle = "";
        if (bgColor) {
            baseStyle += `background-color: ${bgColor}; border-color: ${borderColor}; color: var(--gray-900);`;
        } else {
            baseStyle += `background-color: var(--white); border-color: var(--gray-300); color: var(--gray-700);`;
        }
        const className = `output-display-box medixtract-output ${isComment ? 'is-comment' : ''}`;

        return { displayVal, bgColor, borderColor, msgDisplay, style: baseStyle, className };
    },

    updatePatientSummary(patientId, outputs) {
        let humanValStr = '';

        // Try getting from DOM first (for live edits)
        const humanInput = document.querySelector(`textarea[data-patient="${patientId}"][data-perf-prop="human_val"]`) ||
            document.querySelector(`input[data-patient="${patientId}"][data-perf-prop="human_val"]`) ||
            document.querySelector(`select[data-patient="${patientId}"][data-perf-prop="human_val"]`);

        if (humanInput) {
            humanValStr = humanInput.value.trim();
        }

        // Fallback to stored data if DOM is empty (and possibly just not rendered/found) or not found, 
        // to ensure we always have the correct baseline comparison
        if (!humanValStr && this.validationData && this.validationData[patientId] && this.selectedField) {
            const stored = this.validationData[patientId][this.selectedField];
            if (stored !== undefined && stored !== null) {
                humanValStr = Array.isArray(stored) ? (stored[0] || '') : stored;
            }
        }

        const summary = this.calculatePatientSummaryState(patientId, outputs, humanValStr);
        const input = document.getElementById(`summaryOutput-${patientId}`);
        const msgEl = document.getElementById(`validationMsg-${patientId}`);

        if (input) {
            input.innerHTML = summary.displayVal;
            input.className = summary.className;
            if (summary.style) input.style.cssText = summary.style;
        }
        if (msgEl) msgEl.style.display = summary.msgDisplay;
    },





});
