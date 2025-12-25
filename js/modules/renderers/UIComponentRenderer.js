/**
 * Reusable UI Component Rendering Mixin for SchemaEditor
 */
Object.assign(SchemaEditor.prototype, {
    createFormSection(title, collapsible = false, isOpen = false) {
        const sec = document.createElement('div');
        sec.className = `form-section${collapsible ? ' collapsible' : ''}`;
        if (collapsible) {
            sec.innerHTML = `
                <div class="form-section-header" onclick="app.toggleFormSection('${title}', event)">
                    <h4>${title}</h4>
                    <svg class="collapse-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="${isOpen ? 'transform: rotate(180deg);' : ''}">
                        <path d="M7,10L12,15L17,10H7Z"/>
                    </svg>
                </div>
                <div class="form-section-content ${isOpen ? '' : 'collapsed'}"></div>`;
        } else {
            sec.innerHTML = `<div class="form-section-header"><h4>${title}</h4></div><div class="form-section-content"></div>`;
        }
        return sec;
    },

    appendToFormSection(sec, content) {
        const target = sec.querySelector('.form-section-content') || sec;
        if (typeof content === 'string') {
            target.insertAdjacentHTML('beforeend', content);
        } else {
            target.appendChild(content);
        }
    },

    generateGroupOptions(curr) {
        let opts = Array.from(this.groupOptions).sort().map(g => `<option value="${g}" ${g === curr ? 'selected' : ''}>${AppUtils.formatGroupName(g)}</option>`).join('');
        return opts + '<option value="__new__">+ Create New Group</option>';
    },

    generateTypeOptions(curr) {
        return ['string', 'number', 'integer', 'boolean', 'enum', 'date', 'comment', 'array', 'object'].map(t => `<option value="${t}" ${t === curr ? 'selected' : ''}>${t}</option>`).join('');
    },

    attachFormEventListeners(container) {
        container.querySelectorAll('input, textarea, select').forEach(el => {
            if (el.classList.contains('schema-json-editor')) return;
            el.onchange = (e) => this.handleFieldPropertyChange(e);
            if (el.tagName === 'TEXTAREA') {
                el.oninput = () => {
                    AppUI.autoResizeTextarea(el);
                    if (['description', 'notes'].includes(el.dataset.property)) {
                        clearTimeout(this.debounceTimer);
                        this.debounceTimer = setTimeout(() => this.handleFieldPropertyChange({ target: el }), 300);
                    }
                };
            }
            if (el.tagName === 'SELECT' || el.type === 'checkbox') el.oninput = (e) => this.handleFieldPropertyChange(e);
        });
    },

    renderFilterOptions(type) {
        const content = document.querySelector(`#${type}Filter .dropdown-content`);
        if (!content) return;
        content.innerHTML = '';
        const options = type === 'type' ? this.typeOptions : (type === 'group' ? this.groupOptions : this.labelOptions);
        Array.from(options).sort().forEach(val => {
            const div = document.createElement('div');
            div.className = 'dropdown-option';
            div.dataset.value = val;
            div.innerHTML = `<div class="dropdown-option-checkbox"></div><span class="option-label">${type === 'group' ? AppUtils.formatGroupName(val) : val}</span>`;
            div.onclick = (e) => this.handleDropdownOptionClick(type, val, e);
            content.appendChild(div);
        });
        this.updateDropdownOptions(type);
    },

    populateFilterOptions() {
        ['type', 'group', 'label'].forEach(t => this.renderFilterOptions(t));
    },

    attachLabelEventListeners() {
        const input = document.getElementById('labelInput');
        if (!input) return;
        input.onkeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const val = input.value.trim();
                if (val) this.addLabel(val);
                input.value = '';
            }
        };
    },

    renderLabels(labels) {
        const container = document.getElementById('labelsContainer');
        if (!container) return;
        container.innerHTML = '';
        labels.forEach(label => {
            const chip = document.createElement('div');
            chip.className = 'chip';
            chip.innerHTML = `<span>${label}</span><button class="chip-remove" onclick="app.removeLabel('${label}', event)">&times;</button>`;
            container.appendChild(chip);
        });
    },

    renderLabelCombobox() {
        return `
            <div class="combobox-container" id="combobox-labels">
                <input type="text" 
                    id="input-labels" 
                    class="combobox-input"
                    placeholder="Search or add labels..." 
                    autocomplete="off"
                    onfocus="app.handleLabelComboboxFocus()"
                    onblur="app.handleLabelComboboxBlur()"
                    oninput="app.handleLabelComboboxInput(this.value)"
                    onkeydown="app.handleLabelComboboxKey(event)">
                <div class="combobox-dropdown" id="comboboxList-labels"></div>
            </div>
        `;
    },

    getSubgroupOptions(level, def) {
        const options = new Set();
        const variables = this.currentSchema.properties || this.currentSchema;
        const targetGroup = def.group_id || 'ungrouped';

        for (const key in variables) {
            const field = variables[key];
            if (!field || typeof field !== 'object') continue;
            const g = field.group_id || 'ungrouped';
            if (g !== targetGroup) continue;

            if (level === 1) {
                if (field.subgroup_01) options.add(field.subgroup_01);
            } else if (level === 2) {
                if (field.subgroup_01 === def.subgroup_01 && field.subgroup_02) {
                    options.add(field.subgroup_02);
                }
            } else if (level === 3) {
                if (field.subgroup_01 === def.subgroup_01 && field.subgroup_02 === def.subgroup_02 && field.subgroup_03) {
                    options.add(field.subgroup_03);
                }
            }
        }
        return Array.from(options).sort();
    },

    renderPropertyCombobox(prop, value, options) {
        const escapedValue = AppUtils.escapeAttr(value);
        return `
            <div class="combobox-container" id="combobox-${prop}">
                <input type="text" 
                    id="input-${prop}" 
                    class="combobox-input"
                    value="${escapedValue}"
                    data-property="${prop}"
                    placeholder="Type to search or create..." 
                    autocomplete="off"
                    onfocus="app.handlePropertyComboboxFocus('${prop}')"
                    onblur="app.handlePropertyComboboxBlur('${prop}')"
                    oninput="app.handlePropertyComboboxInput('${prop}', this.value)"
                    onchange="app.handleFieldPropertyChange(event)"
                    onkeydown="app.handlePropertyComboboxKey('${prop}', event)">
                <div class="combobox-dropdown" id="comboboxList-${prop}"></div>
            </div>
        `;
    },

    renderPropertyComboboxOptions(prop, filter = '') {
        const container = document.getElementById(`comboboxList-${prop}`);
        if (!container) return;

        const def = this.currentSchema.properties[this.selectedField];
        let options = [];
        if (prop === 'group_id') {
            options = Array.from(this.groupOptions);
        } else {
            let level = prop.endsWith('01') ? 1 : (prop.endsWith('02') ? 2 : (prop.endsWith('03') ? 3 : 0));
            options = level > 0 ? this.getSubgroupOptions(level, def) : [];
        }

        const containerWrap = document.getElementById(`combobox-${prop}`);

        const filtered = options.filter(o =>
            String(o).toLowerCase().includes(filter.toLowerCase())
        );

        if (filtered.length === 0 && filter === '') {
            container.innerHTML = '<div class="combobox-option no-results">No existing options</div>';
        } else {
            if (containerWrap) containerWrap.classList.add('open');
            let html = filtered.map(o => `
                <div class="combobox-option" data-value="${String(o).replace(/'/g, "\\'")}" onmousedown="app.selectPropertyComboboxOption('${prop}', '${String(o).replace(/'/g, "\\'")}', event)">
                    <span class="option-label">${o}</span>
                </div>
            `).join('');

            // Add "Create New" if matching option doesn't exist
            if (filter && !options.includes(filter)) {
                html += `
                    <div class="combobox-option create-new" data-value="${String(filter).replace(/'/g, "\\'")}" onmousedown="app.selectPropertyComboboxOption('${prop}', '${String(filter).replace(/'/g, "\\'")}', event)">
                        <div class="option-content" style="display: flex; flex-direction: column;">
                            <span class="option-label">Create: <strong>${filter}</strong></span>
                            <span class="option-hint">Press Enter to add this new subgroup</span>
                        </div>
                    </div>
                `;
            }
            container.innerHTML = html;
        }
    },

    renderLabelComboboxOptions(filter = '') {
        const container = document.getElementById('comboboxList-labels');
        if (!container) return;

        const options = Array.from(this.labelOptions);
        const containerWrap = document.getElementById('combobox-labels');

        const filtered = options.filter(o =>
            String(o).toLowerCase().includes(filter.toLowerCase())
        );

        if (filtered.length === 0 && filter === '') {
            container.innerHTML = '<div class="combobox-option no-results">No existing labels</div>';
        } else {
            if (containerWrap) containerWrap.classList.add('open');
            let html = filtered.map(o => `
                <div class="combobox-option" data-value="${String(o).replace(/'/g, "\\'")}" onmousedown="app.selectLabelComboboxOption('${String(o).replace(/'/g, "\\'")}', event)">
                    <span class="option-label">${o}</span>
                </div>
            `).join('');

            if (filter && !options.includes(filter)) {
                html += `
                    <div class="combobox-option create-new" data-value="${String(filter).replace(/'/g, "\\'")}" onmousedown="app.selectLabelComboboxOption('${String(filter).replace(/'/g, "\\'")}', event)">
                        <div class="option-content" style="display: flex; flex-direction: column;">
                            <span class="option-label">Add: <strong>${filter}</strong></span>
                            <span class="option-hint">Press Enter to add this new label</span>
                        </div>
                    </div>
                `;
            }
            container.innerHTML = html;
        }
    }
});
