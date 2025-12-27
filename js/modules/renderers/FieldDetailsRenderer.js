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
                <div class="form-field full-width"><label>Description</label><textarea id="input-description" data-property="description" onchange="app.handleFieldPropertyChange(event)">${def.description || ''}</textarea></div>
                <div class="form-field full-width"><label>Notes (Markdown supported)</label><textarea id="input-notes" data-property="notes" onchange="app.handleFieldPropertyChange(event)">${def.notes || def.comment || ''}</textarea></div>
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
                <div class="form-field"><label>Type</label><select id="input-type" data-property="type" onchange="app.handleFieldPropertyChange(event)">${this.generateTypeOptions(AppUtils.extractTypeValue(def))}</select></div>
                <div class="form-field"><label>Default</label><input id="input-default" type="text" value="${AppUtils.escapeAttr(AppUtils.extractDefaultValue(def))}" data-property="default" onchange="app.handleFieldPropertyChange(event)"></div>
                <div class="form-field">
                    <label>Group ID</label>
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
                    <label>Subgroup 01</label>
                    ${this.renderPropertyCombobox('subgroup_01', def.subgroup_01 || '', this.getSubgroupOptions(1, def))}
                </div>`;
        }
        if (hasSub02) {
            subgroupFields += `
                <div class="form-field">
                    <label>Subgroup 02</label>
                    ${this.renderPropertyCombobox('subgroup_02', def.subgroup_02 || '', this.getSubgroupOptions(2, def))}
                </div>`;
        }
        if (hasSub03) {
            subgroupFields += `
                <div class="form-field">
                    <label>Subgroup 03</label>
                    ${this.renderPropertyCombobox('subgroup_03', def.subgroup_03 || '', this.getSubgroupOptions(3, def))}
                </div>`;
        }

        this.appendToFormSection(propertiesSec, basicFieldsBottom + subgroupFields + '</div>');

        // Labels (Now with combobox and chips on top)
        const hasLabels = (def.labels && def.labels.length > 0) || state.showLabels;
        if (hasLabels) {
            const labelsHtml = `
                <div class="form-field full-width" style="margin-top: 1.5rem; border-top: 1px solid var(--gray-100); padding-top: 1rem;">
                    <label>Labels (Characteristics of the variable)</label>
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
                        <div class="checkbox-item"><input type="checkbox" ${ws.was_missing_docs ? 'checked' : ''} data-solved="was_missing_docs"><label>Was Missing Docs</label></div>
                        <div class="checkbox-item"><input type="checkbox" ${ws.was_questioned ? 'checked' : ''} data-solved="was_questioned"><label>Was Questioned</label></div>
                        <div class="checkbox-item"><input type="checkbox" ${ws.was_personal_data ? 'checked' : ''} data-solved="was_personal_data"><label>Was Personal Data</label></div>
                    </div>
                    <div class="form-field full-width" style="margin-top: 0.5rem;">
                        <label>Resolution Comment</label>
                        <textarea data-solved="comment" placeholder="Describe what was solved...">${ws.comment || ''}</textarea>
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
            btn.className = 'btn btn-ghost btn-sm';
            btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px;"><path d="M12 5v14M5 12h14"/></svg> Add Subgroup';
            btn.onclick = () => { state.showSub01 = true; this.renderFieldDetailsForm(def); };
            actionsRow.appendChild(btn);
            hasAnyBtn = true;
        } else if (!hasSub02) {
            const btn = document.createElement('button');
            btn.className = 'btn btn-ghost btn-sm';
            btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px;"><path d="M12 5v14M5 12h14"/></svg> Add Subgroup 2';
            btn.onclick = () => { state.showSub02 = true; this.renderFieldDetailsForm(def); };
            actionsRow.appendChild(btn);
            hasAnyBtn = true;
        } else if (!hasSub03) {
            const btn = document.createElement('button');
            btn.className = 'btn btn-ghost btn-sm';
            btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px;"><path d="M12 5v14M5 12h14"/></svg> Add Subgroup 3';
            btn.onclick = () => { state.showSub03 = true; this.renderFieldDetailsForm(def); };
            actionsRow.appendChild(btn);
            hasAnyBtn = true;
        }

        if (!hasLabels) {
            const btn = document.createElement('button');
            btn.className = 'btn btn-ghost btn-sm';
            btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px;"><path d="M12 5v14M5 12h14"/></svg> Add Label';
            btn.onclick = () => { state.showLabels = true; this.renderFieldDetailsForm(def); };
            actionsRow.appendChild(btn);
            hasAnyBtn = true;
        }
        if (!hasOptions) {
            const btn = document.createElement('button');
            btn.className = 'btn btn-ghost btn-sm';
            btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px;"><path d="M12 5v14M5 12h14"/></svg> Add Options';
            btn.onclick = () => { state.showOptions = true; this.renderFieldDetailsForm(def); };
            actionsRow.appendChild(btn);
            hasAnyBtn = true;
        }
        if (!hasResolution) {
            const btn = document.createElement('button');
            btn.className = 'btn btn-ghost btn-sm';
            btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px;"><path d="M12 5v14M5 12h14"/></svg> Was Solved?';
            btn.onclick = () => { state.showResolution = true; this.renderFieldDetailsForm(def); };
            actionsRow.appendChild(btn);
            hasAnyBtn = true;
        }
        if (hasAnyBtn) this.appendToFormSection(propertiesSec, actionsRow);

        fragment.appendChild(propertiesSec);

        const performanceSec = this.createFormSection('Per Patient Analysis', true, state.openSections.has('Per Patient Analysis'));
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
