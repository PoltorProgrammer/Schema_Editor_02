/**
 * Results Page Export Mixin
 * Handles exporting charts to images and downloading as ZIP
 */
Object.assign(SchemaEditor.prototype, {

    openExportModal() {
        const modal = document.getElementById('exportModal');
        const list = document.getElementById('exportList');
        if (!modal || !list) return;

        list.innerHTML = '';

        // Define all potential graphics we can export
        const graphics = [
            {
                id: 'current_overview',
                label: `Current View: Global Performance Overview (${this.overviewMode === 'variables' ? 'Variables' : 'Outputs'})`,
                type: 'current',
                chartInstance: this.overviewChartInstance
            },
            {
                id: 'current_patient',
                label: `Current View: Patient Analysis (${this.patientAnalysisMode === 'variables' ? 'Variables' : 'Outputs'})`,
                type: 'current',
                chartInstance: this.patientAnalysisChartInstance
            },
            {
                id: 'current_improved',
                label: 'Current View: Improvements Breakdown',
                type: 'current',
                chartInstance: this.improvedChartInstance
            },
            {
                id: 'current_issued',
                label: 'Current View: Issues Breakdown',
                type: 'current',
                chartInstance: this.issuedChartInstance
            },
            {
                id: 'current_mx_perf',
                label: 'Current View: MediXtract Performance',
                type: 'current',
                chartInstance: this.medixtractPerfChartInstance
            },
            {
                id: 'current_human_perf',
                label: 'Current View: Human Performance',
                type: 'current',
                chartInstance: this.humanPerfChartInstance
            },
            // "Original" (Full/Clean) Versions
            {
                id: 'orig_overview_vars',
                label: 'Original: Global Performance Overview (Variables)',
                type: 'original',
                chartKey: 'overview',
                mode: 'variables'
            },
            {
                id: 'orig_overview_outs',
                label: 'Original: Global Performance Overview (Outputs)',
                type: 'original',
                chartKey: 'overview',
                mode: 'outputs'
            },
            {
                id: 'orig_patient_vars',
                label: 'Original: Patient Analysis (Variables)',
                type: 'original',
                chartKey: 'patient',
                mode: 'variables'
            },
            {
                id: 'orig_patient_outs',
                label: 'Original: Patient Analysis (Outputs)',
                type: 'original',
                chartKey: 'patient',
                mode: 'outputs'
            },
            {
                id: 'orig_improved',
                label: 'Original: Improvements Breakdown',
                type: 'original',
                chartKey: 'improved'
            },
            {
                id: 'orig_issued',
                label: 'Original: Issues Breakdown',
                type: 'original',
                chartKey: 'issued'
            },
            {
                id: 'orig_mx_perf',
                label: 'Original: MediXtract Performance',
                type: 'original',
                chartKey: 'mx_perf'
            },
            {
                id: 'orig_human_perf',
                label: 'Original: Human Performance',
                type: 'original',
                chartKey: 'human_perf'
            }
        ];

        // Restore previous selection if available (check localStorage first for persistence across reloads)
        let savedSelection = [];
        try {
            const stored = localStorage.getItem('lastExportSelection');
            if (stored) savedSelection = JSON.parse(stored);
        } catch (e) { }

        // Fallback to session variable or default all
        let lastSelection;
        if (savedSelection.length > 0) {
            lastSelection = new Set(savedSelection);
        } else if (this.lastExportSelection) {
            lastSelection = this.lastExportSelection;
        } else {
            lastSelection = new Set(graphics.map(g => g.id));
        }

        graphics.forEach(g => {
            // Only show 'Current' options if the chart actually exists
            if (g.type === 'current' && !g.chartInstance) return;

            const item = document.createElement('div');
            item.className = 'export-item';
            item.style.display = 'flex';
            item.style.alignItems = 'center';
            item.style.padding = '8px';
            item.style.borderBottom = '1px solid var(--gray-100)';

            const isChecked = lastSelection.has(g.id);

            item.innerHTML = `
                <input type="checkbox" id="export_${g.id}" ${isChecked ? 'checked' : ''} style="margin-right: 10px; width: 16px; height: 16px;">
                <label for="export_${g.id}" style="cursor: pointer; flex: 1;">${g.label}</label>
            `;

            // Store data on the input for retrieval
            const checkbox = item.querySelector('input');
            const metaInfo = { ...g };
            delete metaInfo.chartInstance; // Avoid circular structure
            checkbox.dataset.meta = JSON.stringify(metaInfo);
            checkbox.dataset.id = g.id;

            list.appendChild(item);
        });

        modal.style.display = 'flex';
    },

    closeExportModal() {
        document.getElementById('exportModal').style.display = 'none';

        // Cleanup offscreen canvas if any
        const offscreen = document.getElementById('offscreen-render-container');
        if (offscreen) offscreen.remove();
    },

    async generateAndDownloadZip() {
        if (!window.JSZip) {
            alert('JSZip library not loaded. Please refresh the page.');
            return;
        }

        const btn = document.getElementById('confirmExportBtn');
        const originalText = btn.innerText;
        btn.innerText = 'Generating...';
        btn.disabled = true;

        const zip = new JSZip();
        const list = document.getElementById('exportList');
        const inputs = list.querySelectorAll('input[type="checkbox"]:checked');

        // Save Selection for next time (both session and localStorage)
        this.lastExportSelection = new Set();
        inputs.forEach(inp => this.lastExportSelection.add(inp.dataset.id));

        try {
            localStorage.setItem('lastExportSelection', JSON.stringify(Array.from(this.lastExportSelection)));
        } catch (e) { }

        const now = new Date().toISOString().replace(/[:.]/g, '-');
        const folder = zip.folder(`MediXtract_Graphics_${now}`);

        try {
            for (const input of inputs) {
                const meta = JSON.parse(input.dataset.meta);
                let base64 = '';

                if (meta.type === 'current') {
                    // Re-acquire instance from this object
                    let chartInstance;
                    if (meta.id === 'current_overview') chartInstance = this.overviewChartInstance;
                    else if (meta.id === 'current_patient') chartInstance = this.patientAnalysisChartInstance;
                    else if (meta.id === 'current_improved') chartInstance = this.improvedChartInstance;
                    else if (meta.id === 'current_issued') chartInstance = this.issuedChartInstance;
                    else if (meta.id === 'current_mx_perf') chartInstance = this.medixtractPerfChartInstance;
                    else if (meta.id === 'current_human_perf') chartInstance = this.humanPerfChartInstance;

                    if (chartInstance) {
                        try {
                            base64 = chartInstance.toBase64Image();
                        } catch (err) {
                            console.warn('Failed to capture current chart', meta.id);
                        }
                    }
                } else {
                    // Original/Offscreen rendering
                    base64 = await this.renderOffscreenChart(meta.chartKey, meta.mode);
                }

                if (base64) {
                    // Remove header -> "data:image/png;base64,"
                    const data = base64.split(',')[1];
                    let fileName = meta.label.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.png';
                    folder.file(fileName, data, { base64: true });
                }
            }

            const content = await zip.generateAsync({ type: 'blob' });

            // Trigger download
            const a = document.createElement('a');
            a.href = URL.createObjectURL(content);
            a.download = `MediXtract_Graphics_${now}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            this.closeExportModal();

        } catch (e) {
            console.error('Export failed:', e);
            alert('Failed to generate export: ' + e.message);
        } finally {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    },

    // Helper to create a temp chart, render it, and get image
    async renderOffscreenChart(key, mode) {
        // Create hidden container
        let container = document.getElementById('offscreen-render-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'offscreen-render-container';
            container.style.position = 'absolute';
            container.style.left = '-9999px';
            container.style.width = '1200px'; // Larger for better quality
            container.style.height = '1000px';
            document.body.appendChild(container); // Must be in DOM for some chart features or fonts
        }

        // Clean container
        container.innerHTML = '<canvas id="offscreenCanvas"></canvas>';
        const ctx = document.getElementById('offscreenCanvas');

        if (!this.cachedStats) return null;

        const stats = this.cachedStats;
        const config = this.getChartConfig(key, mode, stats);

        if (!config) return null;

        return new Promise((resolve) => {
            const chart = new Chart(ctx, {
                ...config,
                options: {
                    ...config.options,
                    animation: false, // Disable animation for instant capture
                    responsive: true,
                    maintainAspectRatio: false,
                    devicePixelRatio: 2 // High res
                },
                plugins: [ChartDataLabels]
            });

            // Wait for a tick to ensure render and plugin execution
            setTimeout(() => {
                const base64 = chart.toBase64Image();
                chart.destroy();
                resolve(base64);
            }, 300);
        });
    },

    getChartConfig(key, mode, stats) {
        if (!stats) return null;

        // Ensure variableStats is available
        const variableStats = this.cachedVariableStats || this.calculateVariableStats(stats.byField);
        const globalStats = stats.global;
        const personalStats = stats.personal;

        // Match the "Current View" aesthetic: No legend, rely on Curved Text (for Radial)
        const commonOptions = {
            plugins: {
                legend: {
                    display: false // Hide standard legend to match "Current View"
                },
                datalabels: {
                    display: function (context) {
                        return context.chart.config.type === 'bar' && context.dataset.data[context.dataIndex] > 0;
                    },
                    color: '#fff',
                    font: { weight: 'bold' }
                }
            }
        };

        if (key === 'overview') {
            const data = this.getOverviewData(mode, globalStats, personalStats, variableStats);
            return {
                type: 'doughnut',
                data: data,
                options: { ...commonOptions, cutout: '35%' }
            };
        }

        if (key === 'patient') {
            const data = this.getPatientAnalysisData(mode, stats.byPatient, stats.byPatientVariable);
            // Patient analysis is a BAR chart, so it DOES need a legend usually,
            // BUT "Current View" has a custom HTML legend?
            // Wait, Patient Analysis (Stacked Bar) has `legend: { display: true }` in ResultsCharts.js
            // So we SHOULD enable legend for this one.
            const barOptions = { ...commonOptions };
            barOptions.plugins.legend = {
                display: true,
                position: 'top',
                align: 'center',
                labels: {
                    usePointStyle: true,
                    padding: 20,
                    font: { size: 12, weight: '500' }
                }
            };

            return {
                type: 'bar',
                data: data,
                options: {
                    ...barOptions,
                    indexAxis: 'y',
                    scales: {
                        x: { stacked: true },
                        y: { stacked: true }
                    }
                }
            };
        }

        if (key === 'improved') {
            const data = this.getImprovedData(globalStats);
            return {
                type: 'doughnut',
                data: data,
                options: { ...commonOptions, cutout: '50%' }
            };
        }

        if (key === 'issued') {
            const data = this.getIssuedData(globalStats);
            return {
                type: 'doughnut',
                data: data,
                options: { ...commonOptions, cutout: '50%' }
            };
        }

        if (key === 'mx_perf') {
            const data = this.getPerfData('mx', globalStats);
            return {
                type: 'doughnut',
                data: data,
                options: { ...commonOptions, cutout: '50%' }
            };
        }

        if (key === 'human_perf') {
            const data = this.getPerfData('human', globalStats);
            return {
                type: 'doughnut',
                data: data,
                options: { ...commonOptions, cutout: '50%' }
            };
        }

        return null;
    }
});
