/**
 * Panel Interactions Mixin
 * Handles side panel resizing, internal search, and patient-specific navigation.
 */
Object.assign(SchemaEditor.prototype, {
    setupPanelResizer() {
        const panel = document.getElementById('fieldDetailsPanel');
        const resizer = document.getElementById('panelResizer');
        if (!panel || !resizer) return;

        // Apply saved width
        if (this.settings && this.settings.panelWidth) {
            let savedWidth = this.settings.panelWidth;
            if (savedWidth.endsWith('px')) {
                let widthPx = parseFloat(savedWidth);
                const minWidth = window.innerWidth / 3;
                const maxWidth = (window.innerWidth * 4) / 5;
                if (widthPx < minWidth) widthPx = minWidth;
                if (widthPx > maxWidth) widthPx = maxWidth;
                panel.style.width = `${widthPx}px`;
            } else {
                panel.style.width = savedWidth;
            }
        }

        let isResizing = false;

        resizer.addEventListener('mousedown', (e) => {
            isResizing = true;
            panel.classList.add('is-resizing');
            resizer.classList.add('active');
            document.body.style.cursor = 'col-resize';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;

            // Calculate new width: viewport width - mouse X position
            // Since the panel is fixed to the right (right: 0), width = screenWidth - mouseX
            let newWidth = window.innerWidth - e.clientX;

            // Constraints: 1/3 (33.3vw) to 4/5 (80vw)
            const minWidth = window.innerWidth / 3;
            const maxWidth = (window.innerWidth * 4) / 5;

            if (newWidth < minWidth) newWidth = minWidth;
            if (newWidth > maxWidth) newWidth = maxWidth;

            panel.style.width = `${newWidth}px`;
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                panel.classList.remove('is-resizing');
                resizer.classList.remove('active');
                document.body.style.cursor = '';

                // Save width
                if (this.settings) {
                    this.settings.panelWidth = panel.style.width;
                    this.saveSettingsToStorage();
                }
            }
        });
    },

    togglePanelSearch() {
        const panel = document.getElementById('fieldDetailsPanel');
        if (!panel) return;

        let searchBar = document.getElementById('panelSearchBar');
        if (!searchBar) {
            searchBar = document.createElement('div');
            searchBar.id = 'panelSearchBar';
            searchBar.className = 'panel-search-bar';

            searchBar.style.cssText = `
                position: absolute;
                top: 70px;
                right: 24px;
                background: var(--white);
                border: 1px solid var(--gray-200);
                border-radius: var(--radius-lg);
                box-shadow: var(--shadow-xl);
                padding: 10px 14px;
                display: flex;
                gap: 12px;
                z-index: 1000;
                align-items: center;
                animation: slideDown 0.25s cubic-bezier(0.16, 1, 0.3, 1);
            `;

            searchBar.innerHTML = `
                <div style="position: relative; display: flex; align-items: center;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" stroke-width="2.5" style="position: absolute; left: 10px;">
                        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
                    </svg>
                    <input type="text" id="panelSearchInput" placeholder="Find in panel..." 
                        style="border: 1px solid var(--gray-200); padding: 7px 12px 7px 32px; border-radius: 6px; font-size: 13px; width: 220px; outline: none; transition: border-color 0.2s; background: var(--gray-50);">
                </div>
                <div style="display: flex; align-items: center; gap: 4px; border-left: 1px solid var(--gray-100); padding-left: 8px;">
                    <span id="panelSearchCount" style="font-size: 12px; font-weight: 600; color: var(--gray-500); min-width: 45px; text-align: center; font-variant-numeric: tabular-nums;"></span>
                    <button id="panelSearchPrev" class="btn btn-ghost btn-sm" style="padding: 4px; height: 28px; width: 28px; display: flex; align-items: center; justify-content: center; color: var(--primary);" title="Previous match">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m18 15-6-6-6 6"/></svg>
                    </button>
                    <button id="panelSearchNext" class="btn btn-ghost btn-sm" style="padding: 4px; height: 28px; width: 28px; display: flex; align-items: center; justify-content: center; color: var(--primary);" title="Next match">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
                    </button>
                    <button id="panelSearchClose" class="btn btn-ghost btn-sm" style="padding: 4px; height: 28px; width: 28px; display: flex; align-items: center; justify-content: center; color: var(--gray-400);" title="Close search (Esc)">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                    </button>
                </div>
            `;
            panel.appendChild(searchBar);

            const input = searchBar.querySelector('#panelSearchInput');
            const prev = searchBar.querySelector('#panelSearchPrev');
            const next = searchBar.querySelector('#panelSearchNext');
            const close = searchBar.querySelector('#panelSearchClose');
            const count = searchBar.querySelector('#panelSearchCount');

            input.onfocus = () => input.style.borderColor = 'var(--primary)';
            input.onblur = () => input.style.borderColor = 'var(--gray-200)';

            let matches = [];
            let currentIdx = -1;

            const executeSearch = () => {
                // Clear previous highlights
                CSS.highlights.clear();
                matches = [];
                currentIdx = -1;
                count.textContent = '';

                const query = input.value.trim().toLowerCase();
                if (!query) return;

                const walker = document.createTreeWalker(document.getElementById('fieldDetailsContent'), NodeFilter.SHOW_TEXT, null, false);
                const ranges = [];
                let node;
                while (node = walker.nextNode()) {
                    const text = node.textContent.toLowerCase();
                    let index = text.indexOf(query);
                    while (index !== -1) {
                        const range = new Range();
                        range.setStart(node, index);
                        range.setEnd(node, index + query.length);
                        ranges.push(range);
                        matches.push(range);
                        index = text.indexOf(query, index + 1);
                    }
                }

                if (ranges.length > 0) {
                    const highlight = new Highlight(...ranges);
                    CSS.highlights.set('search-results', highlight);
                    currentIdx = 0;
                    updateCurrentMatch();
                } else {
                    count.textContent = '0/0';
                }
            };

            const updateCurrentMatch = () => {
                if (matches.length === 0) return;
                count.textContent = `${currentIdx + 1}/${matches.length}`;

                const range = matches[currentIdx];
                const el = range.startContainer.parentElement;

                this.ensureMatchVisibility(el);

                el.scrollIntoView({ behavior: 'smooth', block: 'center' });

                // Create a "current" highlight
                const currentHighlight = new Highlight(range);
                CSS.highlights.set('search-current', currentHighlight);
            };

            input.addEventListener('input', executeSearch);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    if (e.shiftKey) prev.click();
                    else next.click();
                } else if (e.key === 'Escape') {
                    this.clearPanelSearch();
                }
            });

            next.addEventListener('click', () => {
                if (matches.length === 0) return;
                currentIdx = (currentIdx + 1) % matches.length;
                updateCurrentMatch();
            });

            prev.addEventListener('click', () => {
                if (matches.length === 0) return;
                currentIdx = (currentIdx - 1 + matches.length) % matches.length;
                updateCurrentMatch();
            });

            close.addEventListener('click', () => this.clearPanelSearch());
        }

        searchBar.style.display = 'flex';
        const inp = searchBar.querySelector('input');
        inp.value = '';
        inp.focus();
    },

    ensureMatchVisibility(element) {
        let current = element;
        while (current && current !== document.getElementById('fieldDetailsContent')) {
            if (current.classList.contains('patient-content') && !current.classList.contains('open')) {
                const header = current.previousElementSibling;
                if (header && header.classList.contains('patient-header')) {
                    this.togglePatientSection(current.parentElement.dataset.patientId, { currentTarget: header, stopPropagation: () => { } });
                }
            }
            if (current.classList.contains('form-section-content') && current.classList.contains('collapsed')) {
                const header = current.previousElementSibling;
                if (header && header.classList.contains('form-section-header')) {
                    this.toggleFormSection(header.querySelector('h4')?.textContent, { currentTarget: header, stopPropagation: () => { } });
                }
            }
            current = current.parentElement;
        }
    },

    clearPanelSearch() {
        const searchBar = document.getElementById('panelSearchBar');
        if (searchBar) {
            searchBar.style.display = 'none';
            CSS.highlights.clear();
        }
    },

    openPatientDetails(fieldId, patientId, event) {
        if (event) event.stopPropagation();
        this.selectField(fieldId);

        if (this.panelStates && this.panelStates[fieldId]) {
            const state = this.panelStates[fieldId];

            // 1. Update Internal State
            state.openSections.add('Per Patient Analysis');

            // Exclusive expansion: Close other patients in state
            const toRemove = [];
            state.openSections.forEach(section => {
                if (section.startsWith('Patient: ') && section !== `Patient: ${patientId}`) {
                    toRemove.push(section);
                }
            });
            toRemove.forEach(s => state.openSections.delete(s));

            // Add target patient to state
            state.openSections.add(`Patient: ${patientId}`);

            // 2. Trigger standard state restoration (handles parents, etc.)
            // Pass false to skip auto-restore scrolling
            this.restorePanelState(false);

            // 3. Force Visual Expansion & Scroll (The "Hammer" fix)
            setTimeout(() => {
                const panel = document.getElementById('fieldDetailsContent');
                if (!panel) return;

                const targetCollapsible = panel.querySelector(`.patient-collapsible[data-patient-id="${patientId}"]`);
                if (targetCollapsible) {
                    targetCollapsible.classList.add('expanded');
                    const content = targetCollapsible.querySelector('.patient-content');
                    if (content) {
                        content.classList.add('open');
                        content.querySelectorAll('textarea').forEach(t => AppUI.autoResizeTextarea(t));
                    }

                    const containerRect = targetCollapsible.getBoundingClientRect();
                    const panelRect = panel.getBoundingClientRect();
                    const targetScroll = panel.scrollTop + (containerRect.top - panelRect.top) - 10;
                    panel.scrollTo({ top: targetScroll, behavior: 'smooth' });
                }
            }, 50);
        }
    },

    openPatientComment(fieldId, patientId, event) {
        this.openPatientDetails(fieldId, patientId, event);

        setTimeout(() => {
            const textarea = document.getElementById(`medixtract-comment-${patientId}`);
            if (textarea) {
                textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
                textarea.focus();
                textarea.style.transition = 'box-shadow 0.3s';
                const originalShadow = textarea.style.boxShadow;
                textarea.style.boxShadow = '0 0 0 3px var(--primary-light)';
                setTimeout(() => {
                    textarea.style.boxShadow = originalShadow;
                }, 1000);
            }
        }, 200);
    }
});
