/**
 * Enum and Schema Editor Mixin for SchemaEditor
 */
Object.assign(SchemaEditor.prototype, {
    createEnumEditor(def) {
        const div = document.createElement('div');
        const list = document.createElement('div');
        list.className = 'enum-list';

        const isOptions = (def.options && Array.isArray(def.options));
        if (isOptions) {
            def.options.forEach(opt => list.appendChild(this.createEnumItem(opt.value, opt.label)));
        } else {
            let vals = (def.enum && Array.isArray(def.enum)) ? def.enum : (def.anyOf?.find(t => t.enum)?.enum || []);
            vals.forEach(v => list.appendChild(this.createEnumItem(v)));
        }

        const add = document.createElement('button');
        add.className = 'btn btn-ghost btn-sm';
        add.style.marginTop = '0.5rem';
        add.textContent = '+ Add Option';
        add.onclick = () => {
            list.appendChild(this.createEnumItem('', isOptions ? '' : undefined));
            this.updateEnumValues();
        };
        div.append(list, add);
        return div;
    },

    createEnumItem(val, label) {
        const div = document.createElement('div'); div.className = 'enum-item';
        div.style.display = 'flex';
        div.style.gap = '8px';
        div.style.marginBottom = '8px';

        const valInp = document.createElement('input');
        valInp.type = 'text';
        valInp.value = val;
        valInp.className = 'enum-input';
        valInp.placeholder = 'Value';
        valInp.style.flex = '1';
        valInp.onchange = () => this.updateEnumValues();
        div.appendChild(valInp);

        if (label !== undefined) {
            const labInp = document.createElement('input');
            labInp.type = 'text';
            labInp.value = label;
            labInp.className = 'enum-label-input';
            labInp.placeholder = 'Label';
            labInp.style.flex = '1';
            labInp.onchange = () => this.updateEnumValues();
            div.appendChild(labInp);
        }

        const rem = document.createElement('button');
        rem.className = 'btn-remove-sm';
        rem.innerHTML = '&times;';
        rem.onclick = () => { div.remove(); this.updateEnumValues(); };
        div.appendChild(rem);

        return div;
    },

    updateEnumValues() {
        const items = Array.from(document.querySelectorAll('.enum-item'));
        const variables = this.currentSchema.properties || this.currentSchema;
        const def = variables[this.selectedField];

        if (def.options && Array.isArray(def.options)) {
            def.options = items.map(div => {
                const inputs = div.querySelectorAll('input');
                return { value: inputs[0].value.trim(), label: inputs[1]?.value.trim() || '' };
            }).filter(o => o.value !== '');
        } else {
            const vals = items.map(div => div.querySelector('input').value.trim()).filter(v => v !== '');
            if (def.anyOf) {
                const t = def.anyOf.find(t => t.type && t.type !== 'null');
                if (t) { if (vals.length) t.enum = vals; else delete t.enum; }
            } else { if (vals.length) def.enum = vals; else delete def.enum; }
        }
        this.updateTableRow(this.selectedField);
    },

    createSchemaEditor(def) {
        const div = document.createElement('div'); div.className = 'schema-editor-container';
        const txt = document.createElement('textarea'); txt.className = 'schema-json-editor';
        txt.value = JSON.stringify({ [this.selectedField]: def }, null, 2);
        txt.readOnly = true;
        div.append(txt);
        setTimeout(() => AppUI.autoResizeTextarea(txt), 0);
        return div;
    },

    validateJson(txt) {
        const msg = txt.parentElement.querySelector('.schema-validation-message');
        try { JSON.parse(txt.value); if (msg) msg.style.display = 'none'; txt.classList.remove('error'); return true; }
        catch (e) { if (msg) msg.textContent = `JSON Error: ${e.message}`; if (msg) msg.style.display = 'block'; txt.classList.add('error'); return false; }
    },

    handleJsonChange(txt) {
        if (this.validateJson(txt)) {
            const newDef = JSON.parse(txt.value)[this.selectedField];
            this.currentSchema.properties[this.selectedField] = newDef;
            this.refreshFieldData(this.selectedField);
            this.renderFieldDetailsForm(newDef);
        }
    }
});
