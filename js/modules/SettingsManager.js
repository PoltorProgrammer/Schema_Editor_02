/**
 * Settings and View Manager Mixin for SchemaEditor
 */
Object.assign(SchemaEditor.prototype, {
    loadSettings() {
        try {
            const s = localStorage.getItem('schemaEditorSettings');
            if (s) {
                const saved = JSON.parse(s);
                this.settings = {
                    ...DEFAULT_SETTINGS,
                    ...saved,
                    columnVisibility: { ...DEFAULT_SETTINGS.columnVisibility, ...(saved.columnVisibility || {}) },
                    columnWidths: { ...DEFAULT_SETTINGS.columnWidths, ...(saved.columnWidths || {}) }
                };
            }
        } catch { }
    },

    saveSettingsToStorage() { localStorage.setItem('schemaEditorSettings', JSON.stringify(this.settings)); },

    initializeTheme() { document.documentElement.setAttribute('data-theme', this.settings.theme); },

    openSettings() {
        this.originalSettings = JSON.parse(JSON.stringify(this.settings));
        document.getElementById('settingsModal').style.display = 'flex';
        this.updateThemeButtons();
        this.updateFilterVisibilityDisplay();
        this.updateColumnOrderDisplay();
        this.initializeColumnDragDrop();
        this.closeAllDropdowns();

        // Populate Nickname
        const nicknameInput = document.getElementById('settingsNickname');
        if (nicknameInput) {
            nicknameInput.value = this.settings.username || '';
        }
    },

    cancelSettings() {
        if (document.getElementById('settingsModal').style.display === 'flex') {
            this.settings = this.originalSettings;
            document.documentElement.setAttribute('data-theme', this.settings.theme);
            if (this.currentSchema) { this.applyColumnOrder(); this.renderFieldsTable(); }
            document.getElementById('settingsModal').style.display = 'none';
        }
    },

    selectTheme(t) {
        this.settings.theme = t;
        this.updateThemeButtons();
        document.documentElement.setAttribute('data-theme', t);
    },

    updateThemeButtons() {
        ['light', 'dark', 'joan'].forEach(t => {
            const btn = document.getElementById(`${t}ThemeBtn`);
            if (btn) btn.classList.toggle('active', this.settings.theme === t);
        });
    },

    updateColumnOrderDisplay() {
        const container = document.getElementById('columnOrderList');
        if (!container) return;
        container.innerHTML = '';
        const labels = { name: 'Field Name', type: 'Type', group: 'Group', description: 'Description', comments: 'Notes', options: 'Options', indicators: 'Labels', match: 'Status', ai_value: 'MediXtract', human_value: 'Human' };

        this.settings.columnOrder.forEach(id => {
            const item = document.createElement('div');
            item.className = 'column-item';
            item.dataset.column = id;
            const vis = this.settings.columnVisibility[id] !== undefined ? this.settings.columnVisibility[id] : false;
            const isPx = ['indicators', 'match'].includes(id);
            const w = this.settings.columnWidths[id] || (isPx ? 100 : 1);
            const eye = vis ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z"/></svg>` : `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M11.83,9L15,12.16C15,12.11 15,12.05 15,12A3,3 0 0,0 12,9C11.94,9 11.89,9 11.83,9M7.53,9.8L9.08,11.35C9.03,11.56 9,11.77 9,12A3,3 0 0,0 12,15C12.22,15 12.44,14.97 12.65,14.92L14.2,16.47C13.53,16.8 12.79,17 12,17A5,5 0 0,1 7,12C7,11.21 7.2,10.47 7.53,9.8M2,4.27L4.28,6.55L4.73,7C3.08,8.3 1.78,10 1,12C2.73,16.39 7,19.5 12,19.5C13.55,19.5 15.03,19.2 16.38,18.66L16.81,19.09L19.73,22L21,20.73L3.27,3M12,7A5,5 0 0,1 17,12C17,12.64 16.87,13.26 16.64,13.82L19.57,16.75C21.07,15.5 22.27,13.86 23,12C21.27,7.61 17,4.5 12,4.5C10.6,4.5 9.26,4.75 8,5.2L10.17,7.35C10.76,7.13 11.38,7 12,7Z"/></svg>`;

            item.innerHTML = `<div class="column-drag-handle" style="display: flex; align-items: center; gap: 0.75rem; flex: 1; cursor: move;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="drag-handle"><path d="M9,3H11V5H9V3M13,3H15V5H13V3M9,7H11V9H9V7M13,7H15V9H13V7M9,11H11V13H9V11M13,11H15V13H13V11M9,15H11V17H9V15M13,15H15V17H13V15M9,19H11V21H9V19M13,19H15V21H13V19Z"/></svg>
                    <span class="column-label">${labels[id] || id}</span>
                </div>
                <div class="column-width-adjuster"><input type="range" class="width-slider" min="${isPx ? 40 : 0.5}" max="${isPx ? 300 : 5}" step="${isPx ? 10 : 0.1}" value="${w}" data-column="${id}"><span class="width-display">${w}${isPx ? 'px' : 'fr'}</span></div>
                <button class="column-visibility-toggle ${vis ? 'visible' : 'hidden'}" data-column="${id}">${eye}</button>`;

            item.querySelector('.column-visibility-toggle').onclick = () => this.toggleColumnVisibility(id);
            item.querySelector('.width-slider').oninput = (e) => this.handleColumnWidthChange(id, parseFloat(e.target.value));
            container.appendChild(item);
        });
    },

    initializeColumnDragDrop() {
        const container = document.getElementById('columnOrderList');
        if (!container) return;

        container.onmousedown = (e) => {
            const item = e.target.closest('.column-item');
            if (item && e.target.closest('.column-drag-handle')) {
                item.draggable = true;
            } else if (item) {
                item.draggable = false;
            }
        };

        container.ondragstart = (e) => {
            if (!e.target.draggable) {
                e.preventDefault();
                return;
            }
            e.target.classList.add('dragging');
            e.dataTransfer.setData('text/plain', e.target.dataset.column);
        };
        container.ondragend = (e) => {
            e.target.classList.remove('dragging');
            e.target.draggable = false;
        };
        container.ondragover = (e) => {
            e.preventDefault();
            const dragging = container.querySelector('.dragging');
            if (!dragging) return;
            const sibs = [...container.querySelectorAll('.column-item:not(.dragging)')];
            const next = sibs.find(s => e.clientY <= s.getBoundingClientRect().top + s.offsetHeight / 2);
            container.insertBefore(dragging, next);
        };
        container.ondrop = (e) => {
            e.preventDefault();
            this.updateColumnOrderFromDOM();
        };
    },

    updateColumnOrderFromDOM() { this.settings.columnOrder = Array.from(document.querySelectorAll('#columnOrderList .column-item')).map(i => i.dataset.column); },

    handleColumnWidthChange(id, w) {
        if (!this.settings.columnWidths) this.settings.columnWidths = {};
        this.settings.columnWidths[id] = w;
        const disp = document.querySelector(`[data-column="${id}"] .width-display`);
        const isPx = ['indicators', 'match'].includes(id);
        if (disp) disp.textContent = `${w}${isPx ? 'px' : 'fr'}`;
        if (this.currentSchema) { this.applyColumnOrder(); this.renderFieldsTable(); }
    },

    toggleColumnVisibility(id) {
        this.settings.columnVisibility[id] = !this.settings.columnVisibility[id];
        this.updateColumnOrderDisplay();
        if (this.currentSchema) { this.applyColumnOrder(); this.renderFieldsTable(); }
    },

    saveSettings() {
        document.documentElement.setAttribute('data-theme', this.settings.theme);
        this.applyFilterVisibility();
        this.applyColumnOrder();
        this.saveSettingsToStorage();
        if (this.currentSchema) this.renderFieldsTable();

        // Save Nickname
        const nicknameInput = document.getElementById('settingsNickname');
        if (nicknameInput) {
            this.settings.username = nicknameInput.value.trim();
        }
        this.saveSettingsToStorage();

        document.getElementById('settingsModal').style.display = 'none';
    },

    updateFilterVisibilityDisplay() {
        const container = document.getElementById('filterVisibilityList');
        if (!container) return;
        container.innerHTML = '';
        const filters = {
            type: 'Type Filter',
            group: 'Group Filter',
            label: 'Label Filter',
            status: 'Status Filter',
            reviewed: 'Reviewed Filter',
            severity: 'Severity Filter'
        };

        const eyeOpen = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z"/></svg>`;
        const eyeClosed = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M11.83,9L15,12.16C15,12.11 15,12.05 15,12A3,3 0 0,0 12,9C11.94,9 11.89,9 11.83,9M7.53,9.8L9.08,11.35C9.03,11.56 9,11.77 9,12A3,3 0 0,0 12,15C12.22,15 12.44,14.97 12.65,14.92L14.2,16.47C13.53,16.8 12.79,17 12,17A5,5 0 0,1 7,12C7,11.21 7.2,10.47 7.53,9.8M2,4.27L4.28,6.55L4.73,7C3.08,8.3 1.78,10 1,12C2.73,16.39 7,19.5 12,19.5C13.55,19.5 15.03,19.2 16.38,18.66L16.81,19.09L19.73,22L21,20.73L3.27,3M12,7A5,5 0 0,1 17,12C17,12.64 16.87,13.26 16.64,13.82L19.57,16.75C21.07,15.5 22.27,13.86 23,12C21.27,7.61 17,4.5 12,4.5C10.6,4.5 9.26,4.75 8,5.2L10.17,7.35C10.76,7.13 11.38,7 12,7Z"/></svg>`;

        Object.entries(filters).forEach(([id, label]) => {
            const item = document.createElement('div');
            item.className = 'checkbox-item';
            const isVisible = this.settings.filterVisibility[id] !== false;

            item.innerHTML = `
                <span class="column-label" style="flex: 1;">${label}</span>
                <button class="column-visibility-toggle ${isVisible ? 'visible' : 'hidden'}" data-filter="${id}">
                    ${isVisible ? eyeOpen : eyeClosed}
                </button>
            `;

            item.querySelector('button').onclick = () => {
                this.settings.filterVisibility[id] = !this.settings.filterVisibility[id];
                this.updateFilterVisibilityDisplay();
                this.applyFilterVisibility();
            };
            container.appendChild(item);
        });
    },

    applyFilterVisibility() {
        if (!this.settings.filterVisibility) return;
        Object.entries(this.settings.filterVisibility).forEach(([id, isVisible]) => {
            const el = document.getElementById(`${id}Filter`);
            if (el) el.style.display = isVisible ? 'flex' : 'none';
        });
    },

    applyColumnOrder() {
        const vis = this.settings.columnOrder.filter(c => this.settings.columnVisibility[c]);
        const tmpl = vis.map(c => ['indicators', 'match'].includes(c) ? `${this.settings.columnWidths[c]}px` : `${this.settings.columnWidths[c]}fr`).join(' ');
        const header = document.querySelector('.table-header');
        if (header) header.style.gridTemplateColumns = tmpl;
        document.querySelectorAll('.field-row').forEach(r => r.style.gridTemplateColumns = tmpl);
        this.reorderHeaderColumns(vis);
    },

    reorderHeaderColumns(vis) {
        const h = document.querySelector('.table-header');
        if (!h) return;
        const labs = { match: 'Status', name: 'Field Name', group: 'Group', ai_value: 'MediXtract', human_value: 'Human', description: 'Description', comments: 'Notes', type: 'Type', indicators: 'Labels', options: 'Options' };
        h.innerHTML = vis.map(id => `<div class="th field-${id}">${labs[id] || id}</div>`).join('');
    }
});
