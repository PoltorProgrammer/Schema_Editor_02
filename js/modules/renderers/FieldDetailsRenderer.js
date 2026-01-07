/**
 * Variable Details Panel Rendering Mixin for SchemaEditor
 */
Object.assign(SchemaEditor.prototype, {
    showFieldDetails(id) {
        const def = this.currentSchema.properties[id];
        const panel = document.getElementById('fieldDetailsPanel');
        const group = def.group_id || 'ungrouped';
        const color = AppUtils.getGroupColor(group);

        document.getElementById('selectedFieldName').textContent = id;
        const badge = document.getElementById('selectedFieldType');
        badge.textContent = AppUtils.formatGroupName(group);
        badge.style.cssText = `background:${color.bg};color:${color.text};border-color:${color.border}`;

        this.renderFieldDetailsForm(def);
        panel.classList.add('open');
        panel.style.display = 'flex';
    },

    renderFieldDetailsForm(def) {
        this.capturePanelState();
        const id = this.selectedField;

        // Ensure panel state exists for flags
        if (!this.panelStates[id]) {
            this.panelStates[id] = { scroll: 0, openSections: new Set(['Variable Properties', 'Per Patient Analysis']) };
        }
        const state = this.panelStates[id];

        // Create a fragment to build the UI off-screen to prevent blinking
        const fragment = document.createDocumentFragment();

        // 1. Variable Properties (Collapsible)
        const propertiesSec = this.createFormSection('Variable Properties', true, state.openSections.has('Variable Properties'));

        const basicFieldsTop = `
            <div class="form-grid">
                <div class="form-field full-width"><label for="input-description">Description</label><textarea id="input-description" data-property="description" onchange="app.handleFieldPropertyChange(event)">${def.description || ''}</textarea></div>
                <div class="form-field full-width">
                    <label for="medixtract-notes">MediXtract Notes</label>
                    ${(() => {
                const canEditMedixtract = ['Joan', 'Tomas', 'Tomás'].some(u => (this.settings?.username || '').includes(u));
                const actualNote = def.medixtract_notes || '';
                const displayNote = (!actualNote && !canEditMedixtract) ? 'No notes provided' : actualNote;
                return `<textarea id="medixtract-notes" data-property="medixtract_notes" onchange="app.handleFieldPropertyChange(event)" placeholder="MediXtract notes..." ${canEditMedixtract ? '' : 'readonly'}>${displayNote}</textarea>`;
            })()}
                </div>
                <div class="form-field full-width">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.25rem;">
                        <label for="reviewer-notes" style="margin-bottom: 0;">Reviewer Notes</label>
                        ${(() => {
                const notes = Array.isArray(def.reviewer_notes) ? def.reviewer_notes : [];
                const currentUser = this.settings?.username || 'Unknown';
                const otherNotes = notes.filter(n => n.user !== currentUser);
                if (otherNotes.length === 0) return '';

                const userList = otherNotes.map(n => n.user);
                const displayLabel = userList.length === 1
                    ? `Note from ${userList[0]}`
                    : `${userList.length} Notes (${userList.join(', ')})`;

                return `
                            <button type="button" class="btn-ghost" 
                                style="padding: 2px 8px; font-size: 0.7rem; display: flex; align-items: center; gap: 4px; border-radius: 4px; background: var(--gray-100); border: 1px solid var(--gray-200); color: var(--gray-600); font-weight: 600; cursor: pointer; transition: all 0.2s;"
                                onclick="const el = document.getElementById('other-notes-${id}'); const isHidden = el.style.display === 'none'; el.style.display = isHidden ? 'block' : 'none'; this.style.background = isHidden ? 'var(--primary-light)' : 'var(--gray-100)'; this.style.color = isHidden ? 'var(--primary)' : 'var(--gray-600)';"
                                title="Click to show/hide other reviewer notes">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M21,15H3A2,2 0 0,1 1,13V3A2,2 0 0,1 3,1H21A2,2 0 0,1 23,3V13A2,2 0 0,1 21,15M3,3V13H21V3H3M21,17V19H3V17H21M21,21V23H3V21H21Z"/></svg>
                                ${displayLabel}
                            </button>`;
            })()}
                    </div>
                    ${(() => {
                const notes = Array.isArray(def.reviewer_notes) ? def.reviewer_notes : [];
                const currentUser = this.settings?.username || 'Unknown';
                const myNoteObj = notes.find(n => n.user === currentUser);
                const myNote = myNoteObj ? myNoteObj.note : '';

                const otherNotes = notes.filter(n => n.user !== currentUser);
                const othersListHtml = otherNotes.map((n, idx) => `
                        <div style="padding: 0.75rem; ${idx !== otherNotes.length - 1 ? 'border-bottom: 1px solid var(--gray-200);' : ''}">
                            <div style="font-size: 0.65rem; color: var(--gray-400); display: flex; justify-content: space-between; margin-bottom: 0.25rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.025em;">
                                <span>${n.user}</span>
                                <span>${new Date(n.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                            </div>
                            <div style="font-size: 0.8125rem; color: var(--gray-700); line-height: 1.4; white-space: pre-wrap;">${n.note}</div>
                        </div>
                    `).join('');

                return `
                        <textarea id="reviewer-notes" data-property="reviewer_notes" onchange="app.handleFieldPropertyChange(event)" placeholder="Add your notes...">${myNote}</textarea>
                        <div id="other-notes-${id}" style="display: none; background: var(--white); border: 1px solid var(--gray-200); border-radius: var(--radius); margin-top: 0.5rem; box-shadow: var(--shadow-sm); max-height: 200px; overflow-y: auto;">
                            ${othersListHtml}
                        </div>
                    `;
            })()}
                </div>
            </div>
        `;
        this.appendToFormSection(propertiesSec, basicFieldsTop);

        // Nested Variable Options (Now after Notes)
        const hasOptions = (def.options && def.options.length > 0) || (def.enum && def.enum.length > 0) || state.showOptions;
        if (hasOptions) {
            const optionsSec = this.createFormSection('Variable Options', true, state.openSections.has('Variable Options'));
            this.appendToFormSection(optionsSec, this.createEnumEditor(def));
            this.appendToFormSection(propertiesSec, optionsSec);
        }

        const basicFieldsBottom = `
            <div class="form-grid" style="margin-top: 1rem;">
                <div class="form-field"><label for="input-type">Type</label><select id="input-type" data-property="type" onchange="app.handleFieldPropertyChange(event)">${this.generateTypeOptions(AppUtils.extractTypeValue(def))}</select></div>
                <div class="form-field"><label for="input-default">Default</label><input id="input-default" type="text" value="${AppUtils.escapeAttr(AppUtils.extractDefaultValue(def))}" data-property="default" onchange="app.handleFieldPropertyChange(event)"></div>
                <div class="form-field">
                    <label for="input-group_id">Group ID</label>
                    ${this.renderPropertyCombobox('group_id', def.group_id || 'ungrouped', Array.from(this.groupOptions))}
                </div>
        `;

        let subgroupFields = '';
        const hasSub01 = (def.subgroup_01) || state.showSub01;
        const hasSub02 = (def.subgroup_02) || state.showSub02;
        const hasSub03 = (def.subgroup_03) || state.showSub03;

        if (hasSub01) {
            subgroupFields += `
                <div class="form-field">
                    <label for="input-subgroup_01">Subgroup 01</label>
                    ${this.renderPropertyCombobox('subgroup_01', def.subgroup_01 || '', this.getSubgroupOptions(1, def))}
                </div>`;
        }
        if (hasSub02) {
            subgroupFields += `
                <div class="form-field">
                    <label for="input-subgroup_02">Subgroup 02</label>
                    ${this.renderPropertyCombobox('subgroup_02', def.subgroup_02 || '', this.getSubgroupOptions(2, def))}
                </div>`;
        }
        if (hasSub03) {
            subgroupFields += `
                <div class="form-field">
                    <label for="input-subgroup_03">Subgroup 03</label>
                    ${this.renderPropertyCombobox('subgroup_03', def.subgroup_03 || '', this.getSubgroupOptions(3, def))}
                </div>`;
        }

        this.appendToFormSection(propertiesSec, basicFieldsBottom + subgroupFields + '</div>');

        // Labels (Now with combobox and chips on top)
        const hasLabels = (def.labels && def.labels.length > 0) || state.showLabels;
        if (hasLabels) {
            const labelsHtml = `
                <div class="form-field full-width" style="margin-top: 1.5rem; border-top: 1px solid var(--gray-100); padding-top: 1rem;">
                    <label for="input-labels">Labels (Characteristics of the variable)</label>
                    <div class="chips-container" id="labelsContainer" style="margin-bottom: 0.75rem; border: none; padding: 0; background: transparent;"></div>
                    ${this.renderLabelCombobox()}
                </div>
            `;
            this.appendToFormSection(propertiesSec, labelsHtml);
        }

        // Resolution Status
        const hasResolution = def.was_solved || state.showResolution;
        if (hasResolution) {
            const ws = def.was_solved || {};
            const solvedHtml = `
                <div class="was-solved-container" style="margin-top: 1.5rem; border-top: 1px solid var(--gray-100); padding-top: 1rem;">
                    <label class="form-sublabel" style="border:none; padding: 0; margin-top: 0;">Resolution Status (was_solved)</label>
                    <div class="checkbox-group grid-2">
                        <div class="checkbox-item"><input type="checkbox" id="check-missing-docs" ${ws.was_missing_docs ? 'checked' : ''} data-solved="was_missing_docs"><label for="check-missing-docs">Was Missing Docs</label></div>
                        <div class="checkbox-item"><input type="checkbox" id="check-was-questioned" ${ws.was_questioned ? 'checked' : ''} data-solved="was_questioned"><label for="check-was-questioned">Was Questioned</label></div>
                        <div class="checkbox-item"><input type="checkbox" id="check-was-personal" ${ws.was_personal_data ? 'checked' : ''} data-solved="was_personal_data"><label for="check-was-personal">Was Personal Data</label></div>
                    </div>
                    <div class="form-field full-width" style="margin-top: 0.5rem;">
                        <label for="solved-comment">Resolution Comment</label>
                        <textarea id="solved-comment" data-solved="comment" placeholder="Describe what was solved...">${ws.comment || ''}</textarea>
                    </div>
                </div>
            `;
            this.appendToFormSection(propertiesSec, solvedHtml);
        }

        // Action Buttons Row (Add Subgroup, Add Label, Add Options, Was Solved)
        const actionsRow = document.createElement('div');
        actionsRow.className = 'actions-row';

        let hasAnyBtn = false;

        // Sequential Subgroup Buttons
        if (!hasSub01) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn btn-ghost btn-sm';
            btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px;"><path d="M12 5v14M5 12h14"/></svg> Add Subgroup';
            btn.onclick = () => { state.showSub01 = true; this.renderFieldDetailsForm(def); };
            actionsRow.appendChild(btn);
            hasAnyBtn = true;
        } else if (!hasSub02) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn btn-ghost btn-sm';
            btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px;"><path d="M12 5v14M5 12h14"/></svg> Add Subgroup 2';
            btn.onclick = () => { state.showSub02 = true; this.renderFieldDetailsForm(def); };
            actionsRow.appendChild(btn);
            hasAnyBtn = true;
        } else if (!hasSub03) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn btn-ghost btn-sm';
            btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px;"><path d="M12 5v14M5 12h14"/></svg> Add Subgroup 3';
            btn.onclick = () => { state.showSub03 = true; this.renderFieldDetailsForm(def); };
            actionsRow.appendChild(btn);
            hasAnyBtn = true;
        }

        if (!hasLabels) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn btn-ghost btn-sm';
            btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px;"><path d="M12 5v14M5 12h14"/></svg> Add Label';
            btn.onclick = () => { state.showLabels = true; this.renderFieldDetailsForm(def); };
            actionsRow.appendChild(btn);
            hasAnyBtn = true;
        }
        if (!hasOptions) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn btn-ghost btn-sm';
            btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px;"><path d="M12 5v14M5 12h14"/></svg> Add Options';
            btn.onclick = () => { state.showOptions = true; this.renderFieldDetailsForm(def); };
            actionsRow.appendChild(btn);
            hasAnyBtn = true;
        }
        if (!hasResolution) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn btn-ghost btn-sm';
            btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px;"><path d="M12 5v14M5 12h14"/></svg> Was Solved?';
            btn.onclick = () => { state.showResolution = true; this.renderFieldDetailsForm(def); };
            actionsRow.appendChild(btn);
            hasAnyBtn = true;
        }
        if (hasAnyBtn) this.appendToFormSection(propertiesSec, actionsRow);

        fragment.appendChild(propertiesSec);

        const performanceSec = this.createFormSection('Per Patient Analysis', true, state.openSections.has('Per Patient Analysis'));
        performanceSec.classList.add('allow-sticky-header');
        const patients = Object.keys(this.validationData || {}).sort();

        patients.forEach(pid => {
            performanceSec.querySelector('.form-section-content').appendChild(this.createPatientCollapsible(pid, def));
        });
        fragment.appendChild(performanceSec);

        // 3. Schema Structure Preview (Collapsible)
        const schemaSec = this.createFormSection('Schema Structure Preview', true, state.openSections.has('Schema Structure Preview'));
        this.appendToFormSection(schemaSec, this.createSchemaEditor(def));
        fragment.appendChild(schemaSec);

        // Single atomic DOM update to prevent flicker
        const content = document.getElementById('fieldDetailsContent');
        content.replaceChildren(fragment);

        if (hasLabels) this.renderLabels(def.labels || []);

        this.attachFormEventListeners(content);
        this.attachLabelEventListeners();
        content.querySelectorAll('textarea').forEach(t => AppUI.autoResizeTextarea(t));
        this.restorePanelState();
    },

    toggleFormSection(title, e) {
        if (e) e.stopPropagation();
        const header = e.currentTarget;
        const sec = header.closest('.form-section');
        const content = sec.querySelector('.form-section-content');
        const icon = header.querySelector('.collapse-icon');
        const isCollapsed = content.classList.toggle('collapsed');
        if (icon) icon.style.transform = isCollapsed ? '' : 'rotate(180deg)';
        if (!isCollapsed) content.querySelectorAll('textarea').forEach(t => AppUI.autoResizeTextarea(t));
        this.capturePanelState();
    }
});
