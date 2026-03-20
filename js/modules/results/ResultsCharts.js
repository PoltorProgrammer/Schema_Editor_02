/**
 * Results Page Charts Mixin
 * Main rendering logic and UI orchestration for charts on the Results Page
 */
Object.assign(SchemaEditor.prototype, {
    renderResultsCharts(globalStats, personalStats, totals, variableStats, byPatientStats, byPatientVariableStats) {
        const mode = this.overviewMode || 'variables';
        const pMode = this.patientAnalysisMode || 'outputs';

        const commonOptions = {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 750,
                easing: 'easeInOutQuart'
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    enabled: true,
                    callbacks: {
                        label: function (context) {
                            const dataset = context.dataset;
                            const isBar = context.chart.config.type === 'bar';
                            const label = isBar ? dataset.label : (dataset.labels ? dataset.labels[context.dataIndex] : context.chart.data.labels[context.dataIndex]);
                            const value = context.raw || 0;

                            const chart = context.chart;
                            let total = 0;

                            if (isBar) {
                                // For stacked bar, total is sum of all datasets at this index
                                total = chart.data.datasets.reduce((sum, ds) => sum + ds.data[context.dataIndex], 0);
                            } else {
                                const meta = chart.getDatasetMeta(context.datasetIndex);
                                total = dataset.data.reduce((sum, val, idx) => {
                                    const segmentMeta = meta.data[idx];
                                    const isVisible = (!segmentMeta || !segmentMeta.hidden) && chart.getDataVisibility(idx);
                                    return isVisible ? sum + val : sum;
                                }, 0);
                            }

                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                },
                datalabels: {
                    display: function (context) {
                        return context.chart.config.type === 'bar' && context.dataset.data[context.dataIndex] > 0;
                    },
                    formatter: function (value, context) {
                        const dataset = context.dataset;
                        const total = context.chart.data.datasets.reduce((sum, ds) => sum + ds.data[context.dataIndex], 0);
                        const perc = total > 0 ? ((value / total) * 100).toFixed(0) : 0;
                        if (context.chart.config.type === 'bar') {
                            if (context.dataIndex === 0 && perc > 12) {
                                return `${dataset.label}: ${value} (${perc}%)`;
                            }
                            return perc > 8 ? `${value} (${perc}%)` : (perc > 3 ? value : '');
                        }
                        return value;
                    },
                    color: '#fff',
                    font: {
                        weight: 'bold',
                        size: 11
                    }
                }
            }
        };

        // Helper to update center text with a quick fade
        const updateCenterText = (id, html) => {
            const el = document.getElementById(id);
            if (!el) return;
            if (el.innerHTML === html) return;

            el.style.opacity = '0';
            setTimeout(() => {
                el.innerHTML = html;
                el.style.opacity = '1';
            }, 150);
        };

        // Shared helper for breakdown legends
        const renderBreakdownLegend = (chart, containerId, dataObj, labelsMap, itemLabel = 'Outputs', subLabel = 'Patients', subValue = totals.patients) => {
            const legendEl = document.getElementById(containerId);
            if (!legendEl) return;
            legendEl.innerHTML = '';

            const visibleTotal = chart.data.datasets[0].data.reduce((sum, val, idx) => {
                return chart.getDataVisibility(idx) ? sum + val : sum;
            }, 0);

            const centerId = containerId.replace('Legend', 'CenterText');
            updateCenterText(centerId, `
                <div class="label">${itemLabel}</div>
                <div class="value">${visibleTotal}</div>
                <div class="label">${subLabel}</div>
                <div class="value">${subValue}</div>
            `);

            const groupDiv = document.createElement('div');
            groupDiv.className = 'legend-group';

            Object.keys(labelsMap).forEach((key, i) => {
                const label = labelsMap[key];
                const val = dataObj[key];
                if (val === 0) return;

                const isVisible = chart.getDataVisibility(i);
                const perc = visibleTotal > 0 ? ((val / visibleTotal) * 100).toFixed(1) : 0;

                const itemEl = document.createElement('div');
                itemEl.className = `legend-item ${isVisible ? '' : 'hidden'}`;
                itemEl.innerHTML = `
                    <span class="legend-color" style="background: ${chart.data.datasets[0].backgroundColor[i]}"></span>
                    <span class="legend-text">${label}: ${val} (${perc}%)</span>
                `;
                itemEl.onclick = () => {
                    chart.toggleDataVisibility(i);
                    chart.update();
                    renderBreakdownLegend(chart, containerId, dataObj, labelsMap, itemLabel, subLabel, subValue);
                };
                groupDiv.appendChild(itemEl);
            });
            legendEl.appendChild(groupDiv);
        };

        // Switcher Logic (Global)
        const switcher = document.getElementById('overviewModeSwitcher');
        if (switcher) {
            switcher.querySelectorAll('.switcher-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.mode === mode);
                btn.onclick = () => {
                    this.overviewMode = btn.dataset.mode;
                    this.renderResultsCharts(globalStats, personalStats, totals, variableStats, byPatientStats, byPatientVariableStats);
                };
            });
        }

        // Switcher Logic (Patient Analysis)
        const pSwitcher = document.getElementById('patientAnalysisModeSwitcher');
        if (pSwitcher) {
            pSwitcher.querySelectorAll('.switcher-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.mode === pMode);
                btn.onclick = () => {
                    this.patientAnalysisMode = btn.dataset.mode;
                    this.renderResultsCharts(globalStats, personalStats, totals, variableStats, byPatientStats, byPatientVariableStats);
                };
            });
        }

        // 1. Overview Chart (Multi-level Sunburst)
        const overviewCtx = document.getElementById('overviewChart');
        if (overviewCtx) {
            const overviewData = this.getOverviewData(mode, globalStats, personalStats, variableStats);
            const structure = overviewData.structure;

            if (this.overviewChartInstance) {
                this.overviewChartInstance.data = overviewData;
                this.overviewChartInstance.options.cutout = '35%';
                this.overviewChartInstance.update();
            } else {
                this.overviewChartInstance = new Chart(overviewCtx, {
                    type: 'doughnut',
                    data: overviewData,
                    options: { ...commonOptions, cutout: '35%' }
                });
            }

            const renderLegend = () => {
                const legendEl = document.getElementById('overviewLegend');
                if (!legendEl) return;
                legendEl.innerHTML = '';
                const chart = this.overviewChartInstance;

                // Calculate Global Total (Sum of all visible inner segments)
                const globalTotal = chart.data.datasets[1].data.reduce((sum, val, idx) => {
                    const meta = chart.getDatasetMeta(1).data[idx];
                    return (meta && !meta.hidden) ? sum + val : sum;
                }, 0);

                // Update Center Text
                updateCenterText('overviewCenterText', `
                    <div class="label">${mode === 'variables' ? 'Variables' : 'Outputs'}</div>
                    <div class="value">${globalTotal}</div>
                    <div class="label">Patients</div>
                    <div class="value">${totals.patients}</div>
                `);

                structure.forEach((group, gIdx) => {
                    const groupTotal = Object.values(group.children).reduce((a, b) => a + b, 0);
                    if (groupTotal === 0) return;

                    const innerIdx = chart.data.datasets[1].labels.indexOf(group.label);
                    const isParentVisible = innerIdx !== -1 && !chart.getDatasetMeta(1).data[innerIdx].hidden;

                    const currentParentVal = chart.data.datasets[1].data[innerIdx];
                    const parentPerc = globalTotal > 0 ? ((currentParentVal / globalTotal) * 100).toFixed(1) : 0;

                    const groupDiv = document.createElement('div');
                    groupDiv.className = 'legend-group';

                    const parentEl = document.createElement('div');
                    parentEl.className = `legend-parent ${isParentVisible ? '' : 'hidden'}`;
                    parentEl.innerHTML = `<span class="legend-color" style="background: ${group.color}"></span><span class="legend-text">${group.label}: ${currentParentVal} (${parentPerc}%)</span>`;
                    parentEl.onclick = () => {
                        const meta = chart.getDatasetMeta(1);
                        const isHidden = meta.data[innerIdx].hidden;
                        meta.data[innerIdx].hidden = !isHidden;
                        Object.keys(group.children).forEach(label => {
                            const outerIdx = chart.data.datasets[0].labels.indexOf(label);
                            if (outerIdx !== -1) chart.getDatasetMeta(0).data[outerIdx].hidden = !isHidden;
                        });
                        chart.update();
                        renderLegend();
                    };

                    const childrenDiv = document.createElement('div');
                    childrenDiv.className = 'legend-children';
                    Object.entries(group.children).forEach(([label, val], cIdx) => {
                        const outerIdx = chart.data.datasets[0].labels.indexOf(label);
                        if (outerIdx === -1) return;
                        const isChildVisible = !chart.getDatasetMeta(0).data[outerIdx].hidden;
                        const childPerc = globalTotal > 0 ? ((val / globalTotal) * 100).toFixed(1) : 0;

                        const itemEl = document.createElement('div');
                        itemEl.className = `legend-item ${isChildVisible ? '' : 'hidden'}`;
                        itemEl.innerHTML = `<span class="legend-color" style="background: ${group.subColors[cIdx] || group.color}"></span><span class="legend-text">${label}: ${val} (${childPerc}%)</span>`;
                        itemEl.onclick = () => {
                            const meta = chart.getDatasetMeta(0);
                            meta.data[outerIdx].hidden = !meta.data[outerIdx].hidden;
                            let nTotal = 0;
                            Object.keys(group.children).forEach(l => {
                                const idx = chart.data.datasets[0].labels.indexOf(l);
                                if (!chart.getDatasetMeta(0).data[idx].hidden) nTotal += group.children[l];
                            });
                            chart.data.datasets[1].data[innerIdx] = nTotal;
                            chart.getDatasetMeta(1).data[innerIdx].hidden = (nTotal === 0);
                            chart.update();
                            renderLegend();
                        };
                        childrenDiv.appendChild(itemEl);
                    });
                    groupDiv.appendChild(parentEl);
                    groupDiv.appendChild(childrenDiv);
                    legendEl.appendChild(groupDiv);
                });
            };
            renderLegend();
        }

        // 1b. Patient Analysis (Stacked Bar Chart)
        const patientCtx = document.getElementById('patientAnalysisChart');
        if (patientCtx && byPatientStats) {
            const pIds = Object.keys(byPatientStats).sort();
            const patientData = this.getPatientAnalysisData(pMode, byPatientStats, byPatientVariableStats);

            // Adjust container height based on number of patients
            const wrapper = patientCtx.closest('.patient-analysis-wrapper');
            if (wrapper) {
                const calculatedHeight = Math.max(400, pIds.length * 45 + 100);
                wrapper.style.height = calculatedHeight + 'px';
            }

            if (this.patientAnalysisChartInstance) {
                this.patientAnalysisChartInstance.data = patientData;
                this.patientAnalysisChartInstance.update();
            } else {
                this.patientAnalysisChartInstance = new Chart(patientCtx, {
                    type: 'bar',
                    data: patientData,
                    options: {
                        ...commonOptions,
                        indexAxis: 'y',
                        scales: {
                            x: { stacked: true, max: totals.fields, title: { display: true, text: 'Number of Fields' } },
                            y: { stacked: true }
                        },
                        plugins: {
                            ...commonOptions.plugins,
                            legend: {
                                display: true,
                                position: 'bottom',
                                labels: { boxWidth: 12, usePointStyle: true, pointStyle: 'rectRounded' }
                            },
                        }
                    },
                    plugins: [ChartDataLabels]
                });
            }
        }

        // 2. Improvements Chart
        const improvedCtx = document.getElementById('improvedChart');
        if (improvedCtx) {
            const improvedData = this.getImprovedData(globalStats);
            const pLabelsMap = {
                correction: 'Correction',
                filled_blank: 'Filled Blank',
                standardized: 'Standardized',
                improved_comment: 'Comment'
            };

            if (this.improvedChartInstance) {
                this.improvedChartInstance.data = improvedData;
                this.improvedChartInstance.update();
            } else {
                this.improvedChartInstance = new Chart(improvedCtx, {
                    type: 'doughnut',
                    data: improvedData,
                    options: { ...commonOptions, cutout: '50%' }
                });
            }
            renderBreakdownLegend(this.improvedChartInstance, 'improvedLegend', improvedData.raw_data, pLabelsMap, 'Improved', 'Patients', totals.patients);
        }

        // 3. Issued/Attention Required Chart
        const issuedCtx = document.getElementById('issuedChart');
        if (issuedCtx) {
            const issuedData = this.getIssuedData(globalStats);
            const pLabelsMap = {
                missing_docs: 'Missing Docs',
                contradictions: 'Contradictions',
                ambiguous: 'Ambiguous',
                structural: 'Structural'
            };

            if (this.issuedChartInstance) {
                this.issuedChartInstance.data = issuedData;
                this.issuedChartInstance.update();
            } else {
                this.issuedChartInstance = new Chart(issuedCtx, {
                    type: 'doughnut',
                    data: issuedData,
                    options: { ...commonOptions, cutout: '50%' }
                });
            }
            renderBreakdownLegend(this.issuedChartInstance, 'issuedLegend', issuedData.raw_data, pLabelsMap, 'Issues', 'Patients', totals.patients);
        }

        // 4. MediXTract Performance vs Human
        const medixtractPerfCtx = document.getElementById('medixtractPerfChart');
        if (medixtractPerfCtx) {
            const mxData = this.getPerfData('mx', globalStats);
            const pLabelsMap = { correct: 'Correct', error: 'Error', gray: 'Gray Area' };

            if (this.medixtractPerfChartInstance) {
                this.medixtractPerfChartInstance.data = mxData;
                this.medixtractPerfChartInstance.update();
            } else {
                this.medixtractPerfChartInstance = new Chart(medixtractPerfCtx, {
                    type: 'doughnut',
                    data: mxData,
                    options: { ...commonOptions, cutout: '50%' }
                });
            }
            renderBreakdownLegend(this.medixtractPerfChartInstance, 'medixtractPerfLegend', mxData.raw_data, pLabelsMap, 'Outputs', 'Variables', totals.fields);
        }

        const humanPerfCtx = document.getElementById('humanPerfChart');
        if (humanPerfCtx) {
            const hmData = this.getPerfData('human', globalStats);
            const pLabelsMap = { correct: 'Correct', error: 'Error', gray: 'Gray Area' };

            if (this.humanPerfChartInstance) {
                this.humanPerfChartInstance.data = hmData;
                this.humanPerfChartInstance.update();
            } else {
                this.humanPerfChartInstance = new Chart(humanPerfCtx, {
                    type: 'doughnut',
                    data: hmData,
                    options: { ...commonOptions, cutout: '50%' }
                });
            }
            renderBreakdownLegend(this.humanPerfChartInstance, 'humanPerfLegend', hmData.raw_data, pLabelsMap, 'Outputs', 'Variables', totals.fields);
        }
    }
});
