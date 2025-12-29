/**
 * Panel State Management Mixin for SchemaEditor
 */
Object.assign(SchemaEditor.prototype, {
    capturePanelState() {
        if (!this.selectedField) return;
        const panel = document.getElementById('fieldDetailsContent');
        if (!panel) return;

        if (!this.panelStates[this.selectedField]) {
            this.panelStates[this.selectedField] = { scroll: 0, openSections: new Set() };
        }
        const state = this.panelStates[this.selectedField];
        state.scroll = panel.scrollTop;

        // Capture which element has focus and its selection state
        const active = document.activeElement;
        if (active && active.id && panel.contains(active)) {
            state.activeFieldId = active.id;
            if (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA') {
                state.selectionStart = active.selectionStart;
                state.selectionEnd = active.selectionEnd;
            }
        } else {
            state.activeFieldId = null;
        }

        // Capture all open collapsibles
        state.openSections.clear();
        panel.querySelectorAll('.patient-collapsible .patient-content.open').forEach(el => {
            const h5 = el.previousElementSibling.querySelector('h5');
            if (h5) state.openSections.add(h5.textContent.trim());
        });
        panel.querySelectorAll('.form-section.collapsible').forEach(el => {
            if (!el.querySelector('.form-section-content').classList.contains('collapsed')) {
                state.openSections.add(el.querySelector('h4').textContent.trim());
            }
        });
    },

    restorePanelState() {
        if (!this.selectedField || !this.panelStates[this.selectedField]) return;
        const panel = document.getElementById('fieldDetailsContent');
        if (!panel) return;

        const state = this.panelStates[this.selectedField];

        // Restore open sections
        panel.querySelectorAll('.patient-header').forEach(header => {
            const name = header.querySelector('h5')?.textContent.trim();
            if (name && state.openSections.has(name)) {
                header.nextElementSibling.classList.add('open');
            }
        });
        panel.querySelectorAll('.form-section.collapsible').forEach(sec => {
            const name = sec.querySelector('h4')?.textContent.trim();
            if (name && state.openSections.has(name)) {
                sec.querySelector('.form-section-content').classList.remove('collapsed');
                const i = sec.querySelector('.collapse-icon');
                if (i) i.style.transform = 'rotate(180deg)';
            }
        });

        // Resize textareas in newly opened sections
        panel.querySelectorAll('textarea').forEach(t => AppUI.autoResizeTextarea(t));

        // Restore focus and selection
        if (state.activeFieldId) {
            const el = document.getElementById(state.activeFieldId);
            if (el) {
                el.focus();
                if ((el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && state.selectionStart !== undefined) {
                    try {
                        el.setSelectionRange(state.selectionStart, state.selectionEnd);
                    } catch (e) { /* ignore if not supported by type */ }
                }
            }
        }

        // Restore scroll position immediately to prevent jumping
        panel.scrollTop = state.scroll;

        // Secondary safety check in next frame for dynamic content
        requestAnimationFrame(() => {
            if (panel.scrollTop !== state.scroll) {
                panel.scrollTop = state.scroll;
            }
        });
    },

    selectField(id) {
        document.querySelectorAll('.field-row').forEach(r => r.classList.toggle('selected', r.dataset.fieldId === id));
        this.selectedField = id;
        this.showFieldDetails(id);
        if (this.updateScrollTopVisibility) this.updateScrollTopVisibility();
    },

    closeFieldDetails() {
        this.capturePanelState();
        const panel = document.getElementById('fieldDetailsPanel');
        if (panel) panel.classList.remove('open');
        document.querySelectorAll('.field-row').forEach(r => r.classList.remove('selected'));
        this.selectedField = null;
        if (this.updateScrollTopVisibility) this.updateScrollTopVisibility();
    },

    updatePanelHeader(id) {
        const variables = this.currentSchema.properties || this.currentSchema;
        const def = variables[id];
        const group = def.group_id || 'ungrouped';
        const color = AppUtils.getGroupColor(group);
        const badge = document.getElementById('selectedFieldType');
        if (badge) {
            badge.textContent = AppUtils.formatGroupName(group);
            badge.style.cssText = `background:${color.bg};color:${color.text};border-color:${color.border}`;
        }
    },

    showSchemaEditor() {
        document.getElementById('projectSelection').style.display = 'none';
        document.getElementById('schemaEditor').style.display = 'flex';
        document.getElementById('saveBtn').style.display = 'inline-flex';
        document.getElementById('saveBtn').disabled = false;
        document.getElementById('addPatientBtn').style.display = 'flex';
        document.getElementById('addOutputBtn').style.display = 'flex';
        document.getElementById('downloadFilteredBtn').style.display = 'flex';
        document.getElementById('projectDashboardBtn').style.display = 'flex';
        document.getElementById('loadingIndicator').style.display = 'none';
        this.applyColumnOrder();

        if (this.updateScrollTopVisibility) {
            this.updateScrollTopVisibility();
        }
    }
});
