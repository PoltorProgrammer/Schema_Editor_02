/**
 * Patient Analysis Rendering Mixin for SchemaEditor
 */
Object.assign(SchemaEditor.prototype, {
    createPatientCollapsible(patientId, def) {
        const patientData = this.validationData[patientId]?.[this.selectedField] || [];
        const humanValue = patientData[0] || '--';
        const perf = def.performance?.[patientId] || { pending: true, output: [] };
        const outputs = perf.output || [];

        const container = document.createElement('div');
        container.className = 'patient-collapsible';
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
                <span class="analysis-indicator ${statusClass}">
                    ${statusLabel}
                </span>
            </div>
            <div class="patient-content">
                <div class="patient-validation-section" style="margin-bottom: 1.5rem; display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem;">
                    <div class="form-field" ${def.type === 'comment' ? 'style="display: none;"' : ''}>
                        <label>Output</label>
                        ${(() => {
                const summary = this.calculatePatientSummaryState(patientId, outputs, humanValue === '--' ? '' : humanValue);
                return `<input type="text" readonly id="summaryOutput-${patientId}" class="no-dropdown-icon" value="${summary.displayVal}" style="${summary.style}">
                                    <div id="validationMsg-${patientId}" style="font-size: 0.75rem; color: var(--gray-500); margin-top: 0.25rem; display: ${summary.msgDisplay};">No human validation value introduced</div>`;
            })()}
                    </div>
                    <div class="form-field">
                        <label>Human Validation</label>
                        ${AppUtils.hasEnumValues(def) ?
                this.renderHumanValidationSelect(patientId, humanValue, def) :
                `
                            <input type="text" value="${humanValue === '--' ? '' : humanValue}" data-patient="${patientId}" data-perf-prop="human_val" oninput="app.updatePatientSummary('${patientId}')">
                            <div id="humanValError-${patientId}" class="schema-validation-message" style="display: none; margin-top: 0.5rem; padding: 0.25rem 0.5rem; font-size: 0.75rem;">
                                Invalid option: Value does not match schema options
                            </div>
                            `
            }
                    </div>
                </div>

                <div class="patient-outputs-section" style="margin-bottom: 1.5rem;">
                    <label style="font-size: 0.75rem; color: var(--gray-500); font-weight: 600; text-transform: uppercase;">MediXtract Analysis Outputs</label>
                    <div id="outputsList-${patientId}" class="output-list">
                        ${this.generateOutputsListHtml(patientId, outputs)}
                    </div>
                    <div style="margin-top: 0.5rem;">
                        <div class="combobox-container" id="combobox-${patientId}">
                            <input type="text" 
                                id="newOutput-${patientId}" 
                                class="combobox-input"
                                placeholder="Type to search and press Enter to add..." 
                                autocomplete="off"
                                onfocus="app.handleComboboxFocus('${patientId}')"
                                onblur="app.handleComboboxBlur('${patientId}')"
                                oninput="app.handleComboboxInput('${patientId}', this.value)"
                                onkeydown="app.handleOutputInputKey('${patientId}', event)">
                            <div class="combobox-dropdown" id="comboboxList-${patientId}"></div>
                        </div>
                    </div>
                </div>

                <div class="status-section-container" style="margin-bottom: 1.5rem;">
                    <label style="font-size: 0.75rem; color: var(--gray-500); font-weight: 600; text-transform: uppercase;">Review Status</label>
                    <div class="status-section" style="margin-top: 0.5rem;">
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
                    <div class="form-field full-width">
                        <label>Explanation / Comment</label>
                        <textarea class="no-dropdown-icon" data-patient="${patientId}" data-perf-prop="comment" placeholder="Explain the discrepancy or result...">${perf.comment || patientData[1] || ''}</textarea>
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

    renderOutputList(patientId, outputs) {
        const container = document.getElementById(`outputsList-${patientId}`);
        if (!container) return;
        container.innerHTML = this.generateOutputsListHtml(patientId, outputs);
        this.updatePatientSummary(patientId, outputs);
    },

    generateOutputsListHtml(patientId, outputs) {
        if (!outputs) return '';
        const def = this.currentSchema.properties[this.selectedField];

        return outputs.map((out, index) => {
            let label = '';
            if (def.options) {
                const opt = def.options.find(o => String(o.value) === String(out.value));
                if (opt) label = opt.label;
            }

            return `
                <div class="output-item">
                    <div class="output-value">
                        <span class="label-val" style="font-weight: 600; color: var(--gray-900);">${label || out.value}</span>
                        ${label ? `<span class="code-val" style="margin-left: 8px; color: var(--gray-500); font-size: 0.75rem;">(${out.value})</span>` : ''}
                    </div>
                    <div class="output-controls">
                        <button class="btn-icon-sm" 
                            onmousedown="app.handleOutputMouseDown('${patientId}', ${index}, -1, event)" 
                            onmouseup="app.handleOutputMouseUp(event)" 
                            onmouseleave="app.handleOutputMouseUp(event)">-</button>
                        <input type="number" class="output-count-input" value="${out.count}" min="1" 
                        <input type="number" class="output-count-input" value="${out.count}" min="1" 
                            onblur="app.setOutputCount('${patientId}', ${index}, this.value)"
                            onkeydown="if(event.key === 'Enter') { this.blur(); }">
                        <button class="btn-icon-sm" 
                            onmousedown="app.handleOutputMouseDown('${patientId}', ${index}, 1, event)" 
                            onmouseup="app.handleOutputMouseUp(event)" 
                            onmouseleave="app.handleOutputMouseUp(event)">+</button>
                    </div>
                    <button class="btn-remove-sm" onclick="app.removeOutput('${patientId}', ${index}, event)">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                        </svg>
                    </button>
                </div>
            `;
        }).join('');
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

        const displayVal = outputStats.map(s => {
            let label = '';
            if (fieldDef.options) {
                const opt = fieldDef.options.find(o => String(o.value) === String(s.value));
                if (opt) label = opt.label;
            }
            const name = label ? `${label} (${s.value})` : s.value;
            return isComment ? name : `${name} (${s.percentage}%)`;
        }).join(isComment ? ' | ' : ', ');

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

                const matchingStat = outputStats.find(s => String(s.value).trim() === String(cleanHumanVal).trim());
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

        const style = bgColor ? `background-color: ${bgColor}; border-color: ${borderColor}; color: var(--gray-900); font-weight: 500;` : '';
        return { displayVal, bgColor, borderColor, msgDisplay, style };
    },

    updatePatientSummary(patientId, outputs) {
        let humanValStr = '';

        // Try getting from DOM first (for live edits)
        const humanInput = document.querySelector(`input[data-patient="${patientId}"][data-perf-prop="human_val"]`) ||
            document.querySelector(`select[data-patient="${patientId}"][data-perf-prop="human_val"]`);

        if (humanInput) {
            humanValStr = humanInput.value.trim();
        }

        // Fallback to stored data if DOM is empty (and possibly just not rendered/found) or not found, 
        // to ensure we always have the correct baseline comparison
        if (!humanValStr && this.validationData && this.validationData[patientId] && this.selectedField) {
            const stored = this.validationData[patientId][this.selectedField];
            if (Array.isArray(stored) && stored[0]) {
                humanValStr = stored[0];
            }
        }

        const summary = this.calculatePatientSummaryState(patientId, outputs, humanValStr);
        const input = document.getElementById(`summaryOutput-${patientId}`);
        const msgEl = document.getElementById(`validationMsg-${patientId}`);

        if (input) {
            input.value = summary.displayVal;
            input.style.removeProperty('background-color');
            input.style.removeProperty('border-color');
            input.style.removeProperty('color');
            if (summary.style) {
                input.style.cssText = summary.style;
            } else {
                input.style.cssText = ''; // Reset if no style
            }
        }
        if (msgEl) msgEl.style.display = summary.msgDisplay;
    },

    renderHumanValidationSelect(patientId, value, def) {
        const options = (def.options || []).concat(def.enum ? def.enum.map(e => ({ value: e, label: '' })) : []);
        const html = options.map(o => {
            const display = o.label ? `${o.label} (${o.value})` : String(o.value);
            return `<option value="${o.value}" ${String(o.value) === String(value) ? 'selected' : ''}>${display}</option>`;
        }).join('');

        return `
            <select data-patient="${patientId}" data-perf-prop="human_val" onchange="app.handleFieldPropertyChange(event)">
                ${html}
            </select>
        `;
    },

    renderComboboxOptions(patientId, filter = '') {
        const container = document.getElementById(`comboboxList-${patientId}`);
        if (!container) return;

        const def = this.currentSchema.properties[this.selectedField];
        let options = [];
        if (def.options && Array.isArray(def.options)) {
            options = def.options.map(o => ({ value: o.value, label: o.label }));
        } else if (def.enum && Array.isArray(def.enum)) {
            options = def.enum.map(e => ({ value: e, label: '' }));
        }

        const containerWrap = document.getElementById(`combobox-${patientId}`);

        if (options.length === 0) {
            if (containerWrap) containerWrap.classList.remove('open');
            container.innerHTML = '';
            return;
        }

        const filtered = options.filter(o =>
            String(o.value).toLowerCase().includes(filter.toLowerCase()) ||
            String(o.label).toLowerCase().includes(filter.toLowerCase())
        );

        if (filtered.length === 0 && filter === '') {
            container.innerHTML = '<div class="combobox-option no-results">No options available</div>';
        } else if (filtered.length === 0) {
            container.innerHTML = '<div class="combobox-option no-results">No matches found</div>';
        } else {
            if (containerWrap) containerWrap.classList.add('open');
            container.innerHTML = filtered.map(o => `
                <div class="combobox-option" data-value="${String(o.value).replace(/'/g, "\\'")}" onmousedown="app.selectComboboxOption('${patientId}', '${String(o.value).replace(/'/g, "\\'")}', event)">
                    <div class="option-content" style="display: flex; flex-direction: column;">
                        <span class="option-label" style="font-weight: 600;">${o.label || o.value}</span>
                        ${o.label ? `<span class="option-hint">Code: ${o.value}</span>` : ''}
                    </div>
                </div>
            `).join('');
        }
    },
    handleOutputMouseDown(patientId, index, delta, e) {
        if (e) {
            // Do NOT prevent default here, so that active input can blur and commit its value
            e.stopPropagation();
        }

        // Initial change
        this.updateOutputCount(patientId, index, delta);

        // Clear any existing
        this.stopOutputChange();

        // Start long press timer
        this._outputChangeTimer = setTimeout(() => {
            this._outputChangeInterval = setInterval(() => {
                this.updateOutputCount(patientId, index, delta);
            }, 80);
        }, 1000);
    },

    handleOutputMouseUp(e) {
        this.stopOutputChange();
        if (e) {
            // Optional: remove focus from button if needed
        }
    },

    stopOutputChange() {
        if (this._outputChangeTimer) clearTimeout(this._outputChangeTimer);
        if (this._outputChangeInterval) clearInterval(this._outputChangeInterval);
        this._outputChangeTimer = null;
        this._outputChangeInterval = null;
    }
});
