/**
 * Results Page Mixin for SchemaEditor
 */
Object.assign(SchemaEditor.prototype, {
    showResultsPage() {
        // Hide other views
        document.getElementById('projectSelection').style.display = 'none';
        document.getElementById('schemaEditor').style.display = 'none';
        document.getElementById('settingsModal').style.display = 'none';

        // Hide original buttons if visible
        const hideEl = (id) => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        };

        hideEl('addPatientBtn');
        hideEl('addOutputBtn');
        hideEl('downloadFilteredBtn');
        hideEl('saveBtn');
        hideEl('downloadProgressBtn');
        hideEl('headerMoreFilter');

        // Ensure navigation buttons are correct
        document.getElementById('projectDashboardBtn').style.display = 'flex';
        document.getElementById('resultsPageBtn').style.display = 'none';
        document.getElementById('backToTableBtn').style.display = 'flex';

        // Show project info (Name, stats, last edit)
        const schemaInfo = document.querySelector('.schema-info');
        if (schemaInfo) schemaInfo.style.display = 'flex';
        this.updateHeaderMetadata();

        // Remember current view
        localStorage.setItem('lastActivePage', 'results');

        // Show Results Page
        let resultsPage = document.getElementById('resultsPage');
        if (!resultsPage) {
            console.error('Results Page container not found in DOM');
            return;
        }
        resultsPage.style.display = 'flex';

        this.calculateAndRenderResults();

        // Update Scroll Top Visibility
        if (this.updateScrollTopVisibility) {
            this.updateScrollTopVisibility();
        }

        // Add resize listener for results
        if (!this.resultsResizeBound) {
            this.resultsResizeBound = this.syncResultsHeights.bind(this);
            window.addEventListener('resize', this.resultsResizeBound);
        }
    },

    calculateAndRenderResults() {
        if (!this.allFields || !this.validationData) return;

        const patientIds = Object.keys(this.validationData).sort();
        const stats = {
            byPatient: {},
            byField: {},
            global: this.createEmptyStatObject(),
            personal: this.createEmptyStatObject(),
            byFieldCategory: {
                matched: new Set(),
                improved: new Set(),
                unmatched: new Set(),
                uncertain: new Set(),
                pending: new Set(),
                dismissed: new Set()
            },
            totals: {
                fields: this.allFields.length,
                patients: patientIds.length
            }
        };

        // Initialize Patient Stats
        patientIds.forEach(pid => {
            stats.byPatient[pid] = this.createEmptyStatObject();
        });

        // Initialize Field Stats
        this.allFields.forEach(f => {
            stats.byField[f.id] = this.createEmptyStatObject();
        });

        // Iterate and Count
        this.allFields.forEach(field => {
            patientIds.forEach(pid => {
                const perf = field.definition.performance ? field.definition.performance[pid] : null;
                const status = this.resolveStatusForStats(perf);
                const subStatus = this.resolveSubStatusForStats(perf, status);

                // Update Patient Stats
                this.incrementStat(stats.byPatient[pid], status, subStatus);

                // Update Field Stats
                this.incrementStat(stats.byField[field.id], status, subStatus);

                // Update Global vs Personal Stats
                const isPersonal = field.group === 'personal_data' || field.definition.group_id === 'personal_data' || field.definition.group === 'personal_data';

                if (isPersonal) {
                    this.incrementStat(stats.personal, status, subStatus);
                } else {
                    this.incrementStat(stats.global, status, subStatus);
                }

                // Update Field Category Stats (Unique fields per status)
                if (stats.byFieldCategory[status]) {
                    stats.byFieldCategory[status].add(field.id);
                }
            });
        });

        const variableStats = this.calculateVariableStats(stats.byField);
        this.renderFieldSummary(stats.byFieldCategory, this.allFields.length);
        this.registerCurvedTextPlugin();
        this.renderResultsCharts(stats.global, stats.personal, stats.totals, variableStats);
        this.renderResultsTables(stats, patientIds);

        // Sync heights so Field table scrolls to match Patient table length
        setTimeout(() => this.syncResultsHeights(), 0);
    },

    calculateVariableStats(byField) {
        const vStats = {
            manual: 0,
            correct: {
                improved: 0,
                match: 0,
                missing: 0,
                dismissed: 0
            },
            attention: {
                mixed: 0,
                uncertain: 0
            },
            personal: 0
        };

        this.allFields.forEach(field => {
            const isPersonal = field.group === 'personal_data' || field.definition.group_id === 'personal_data' || field.definition.group === 'personal_data';
            if (isPersonal) {
                vStats.personal++;
                return;
            }

            const fPerf = byField[field.id];
            if (!fPerf) return;

            // 1. Attention Required (Mixed) - Priority 1
            const hasCritical = fPerf.unmatched_sub.contradictions > 0 ||
                fPerf.unmatched_sub.ambiguous > 0 ||
                fPerf.unmatched_sub.structural > 0;

            if (hasCritical) {
                vStats.attention.mixed++;
                return;
            }

            // 2. Attention Required (Uncertain) - Priority 2
            if (fPerf.uncertain > 0) {
                vStats.attention.uncertain++;
                return;
            }

            // 3. Correct sub-categories - Priority based on prominence
            if (fPerf.improved > 0) {
                vStats.correct.improved++;
            } else if (fPerf.unmatched_sub.missing_docs > 0) {
                vStats.correct.missing++;
            } else if (fPerf.dismissed > 0) {
                vStats.correct.dismissed++;
            } else if (fPerf.matched > 0) {
                vStats.correct.match++;
            } else if (fPerf.pending > 0) {
                vStats.manual++;
            }
        });

        return vStats;
    },

    registerCurvedTextPlugin() {
        if (this.curvedTextPluginRegistered) return;

        Chart.register({
            id: 'curvedText',
            afterDatasetsDraw(chart) {
                const { ctx, data } = chart;
                chart.data.datasets.forEach((dataset, i) => {
                    const meta = chart.getDatasetMeta(i);
                    meta.data.forEach((element, index) => {
                        const { x, y, startAngle, endAngle, innerRadius, outerRadius } = element;
                        const label = (dataset.labels && dataset.labels[index]) || data.labels[index];
                        const value = dataset.data[index];

                        const isHidden = (meta.data[index] && meta.data[index].hidden) || !chart.getDataVisibility(index);

                        if (value === 0 || isHidden) return;

                        // Calculate total of ONLY visible segments in this dataset
                        const total = dataset.data.reduce((sum, val, idx) => {
                            const segmentMeta = meta.data[idx];
                            const isVisible = (!segmentMeta || !segmentMeta.hidden) && chart.getDataVisibility(idx);
                            if (isVisible) return sum + val;
                            return sum;
                        }, 0);
                        const percentage = total > 0 ? ((value / total) * 100).toFixed(0) : 0;

                        const line1 = label;
                        const line2 = `${value} (${percentage}%)`;

                        const midAngle = (startAngle + endAngle) / 2;
                        const midRadius = (innerRadius + outerRadius) / 2;
                        const lineSpacing = 8;

                        // Normalize angle to 0-2PI to detect bottom half
                        const normalizedAngle = ((midAngle % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2);
                        const isBottomHalf = normalizedAngle > 0 && normalizedAngle < Math.PI;

                        ctx.save();
                        ctx.translate(x, y);
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillStyle = '#ffffff';

                        const drawCurvedLine = (text, radius, fontSize, isBold) => {
                            ctx.font = `${isBold ? 'bold' : 'normal'} ${fontSize}px Inter, system-ui, sans-serif`;

                            const angleRange = endAngle - startAngle;
                            const arcLength = radius * angleRange;

                            if (arcLength > ctx.measureText(text).width * 0.85) {
                                let chars = text.split('');
                                const totalTextAngle = ctx.measureText(text).width / radius;

                                if (isBottomHalf) {
                                    // Draw CCW (from left to right for the viewer) - Do NOT reverse the string
                                    let currentAngle = midAngle + (totalTextAngle / 2);

                                    chars.forEach((char) => {
                                        const charAngle = ctx.measureText(char).width / radius;
                                        const angle = currentAngle - charAngle / 2;

                                        ctx.save();
                                        ctx.rotate(angle);
                                        ctx.translate(radius, 0);
                                        ctx.rotate(-Math.PI / 2); // Flip character upright (facing center)
                                        ctx.fillText(char, 0, 0);
                                        ctx.restore();

                                        currentAngle -= charAngle;
                                    });
                                } else {
                                    // Standard orientation for top half (CW)
                                    let currentAngle = midAngle - (totalTextAngle / 2);

                                    chars.forEach((char) => {
                                        const charAngle = ctx.measureText(char).width / radius;
                                        const angle = currentAngle + charAngle / 2;

                                        ctx.save();
                                        ctx.rotate(angle);
                                        ctx.translate(radius, 0);
                                        ctx.rotate(Math.PI / 2); // Face outward
                                        ctx.fillText(char, 0, 0);
                                        ctx.restore();

                                        currentAngle += charAngle;
                                    });
                                }
                                return true;
                            }
                            return false;
                        };

                        // Draw Line 1 (Label)
                        drawCurvedLine(line1, midRadius - lineSpacing, 11, true);

                        // Draw Line 2 (Stats)
                        drawCurvedLine(line2, midRadius + lineSpacing, 10, false);

                        ctx.restore();
                    });
                });
            }
        });

        this.curvedTextPluginRegistered = true;
    },

    renderResultsCharts(globalStats, personalStats, totals, variableStats) {
        // Destroy existing charts if they exist
        if (this.overviewChartInstance) this.overviewChartInstance.destroy();
        if (this.improvedChartInstance) this.improvedChartInstance.destroy();
        if (this.issuedChartInstance) this.issuedChartInstance.destroy();

        const mode = this.overviewMode || 'outputs';

        const commonOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    enabled: true,
                    callbacks: {
                        label: function (context) {
                            const dataset = context.dataset;
                            const labels = dataset.labels || [];
                            const label = labels[context.dataIndex] || '';
                            const value = context.raw || 0;

                            const chart = context.chart;
                            const meta = chart.getDatasetMeta(context.datasetIndex);
                            const total = dataset.data.reduce((sum, val, idx) => {
                                const segmentMeta = meta.data[idx];
                                const isVisible = (!segmentMeta || !segmentMeta.hidden) && chart.getDataVisibility(idx);
                                return isVisible ? sum + val : sum;
                            }, 0);

                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                },
                datalabels: { display: false }
            }
        };

        // Shared helper for breakdown legends
        const renderBreakdownLegend = (chart, containerId, dataObj, labelsMap) => {
            const legendEl = document.getElementById(containerId);
            if (!legendEl) return;
            legendEl.innerHTML = '';

            const visibleTotal = chart.data.datasets[0].data.reduce((sum, val, idx) => {
                return chart.getDataVisibility(idx) ? sum + val : sum;
            }, 0);

            const centerId = containerId.replace('Legend', 'CenterText');
            const centerEl = document.getElementById(centerId);
            if (centerEl) {
                centerEl.innerHTML = `
                    <div class="label">Outputs</div>
                    <div class="value">${visibleTotal}</div>
                    <div class="label">Patients</div>
                    <div class="value">${totals.patients}</div>
                `;
            }

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
                    renderBreakdownLegend(chart, containerId, dataObj, labelsMap);
                };
                groupDiv.appendChild(itemEl);
            });
            legendEl.appendChild(groupDiv);
        };

        // Switcher Logic
        const switcher = document.getElementById('overviewModeSwitcher');
        if (switcher) {
            // Update active states
            switcher.querySelectorAll('.switcher-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.mode === mode);
                if (!btn.hasListener) {
                    btn.onclick = () => {
                        this.overviewMode = btn.dataset.mode;
                        this.renderResultsCharts(globalStats, personalStats, totals, variableStats);
                    };
                    btn.hasListener = true;
                }
            });
        }

        // 1. Overview Chart (Multi-level Sunburst)
        const overviewCtx = document.getElementById('overviewChart');
        if (overviewCtx) {
            const colorPurple = '#8b5cf6'; // manual
            const colorGreen = '#22c55e';  // correct
            const colorOrange = '#f97316'; // attention
            const colorBlue = '#3b82f6';   // personal data

            const colors = {
                manual: { main: colorPurple, sub: ['#7c3aed'] },
                correct: { main: colorGreen, sub: ['#4ade80', '#22c55e', '#16a34a', '#15803d', '#10b981', '#059669', '#047857'] },
                attention: { main: colorOrange, sub: ['#fb923c', '#f97316', '#ea580c', '#c2410c'] },
                personal: { main: colorBlue, sub: ['#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a'] }
            };

            let structure = [];
            if (mode === 'variables') {
                const manualData = { 'Manual': variableStats.manual };
                const correctData = {
                    'Improved': variableStats.correct.improved,
                    'Match': variableStats.correct.match + variableStats.correct.dismissed,
                    'Miss. Doc': variableStats.correct.missing
                };
                const attentionData = {
                    'Mixed Perf.': variableStats.attention.mixed,
                    'Uncertain': variableStats.attention.uncertain
                };
                const personalData = {
                    'Personal Data': variableStats.personal
                };

                structure = [
                    { id: 'manual', label: 'Manual Entry', color: colors.manual.main, children: manualData, subColors: colors.manual.sub },
                    { id: 'correct', label: 'Correct', color: colors.correct.main, children: correctData, subColors: colors.correct.sub },
                    { id: 'attention', label: 'Attention Required', color: colors.attention.main, children: attentionData, subColors: colors.attention.sub },
                    { id: 'personal', label: 'Personal Data', color: colors.personal.main, children: personalData, subColors: colors.personal.sub }
                ];
            } else {
                const manualData = { 'Manual': globalStats.pending };
                const correctData = {
                    'Match': globalStats.matched + globalStats.dismissed,
                    'Correction': globalStats.improved_sub.correction,
                    'F. Blank': globalStats.improved_sub.filled_blank,
                    'Standard.': globalStats.improved_sub.standardized,
                    'Comment': globalStats.improved_sub.improved_comment,
                    'Miss. Doc': globalStats.unmatched_sub.missing_docs
                };
                const attentionData = {
                    'Contrad.': globalStats.unmatched_sub.contradictions,
                    'Ambigu.': globalStats.unmatched_sub.ambiguous,
                    'Struct.': globalStats.unmatched_sub.structural,
                    'Uncert.': globalStats.uncertain
                };

                const personalData = {
                    'Match': personalStats.matched + personalStats.dismissed,
                    'Improved': personalStats.improved,
                    'Issue': personalStats.unmatched,
                    'Uncert.': personalStats.uncertain,
                    'Manual': personalStats.pending
                };

                structure = [
                    { id: 'manual', label: 'Manual Entry', color: colors.manual.main, children: manualData, subColors: colors.manual.sub },
                    { id: 'correct', label: 'Correct', color: colors.correct.main, children: correctData, subColors: colors.correct.sub },
                    { id: 'attention', label: 'Attention Required', color: colors.attention.main, children: attentionData, subColors: colors.attention.sub },
                    { id: 'personal', label: 'Personal Data', color: colors.personal.main, children: personalData, subColors: colors.personal.sub }
                ];
            }

            const outerDataArray = [];
            const outerColorArray = [];
            const outerLabelArray = [];
            const innerDataArray = [];
            const innerColorArray = [];
            const innerLabelArray = [];

            structure.forEach(group => {
                const groupTotal = Object.values(group.children).reduce((a, b) => a + b, 0);
                if (groupTotal === 0) return;
                innerDataArray.push(groupTotal);
                innerColorArray.push(group.color);
                innerLabelArray.push(group.label);
                Object.entries(group.children).forEach(([label, val], idx) => {
                    outerDataArray.push(val);
                    outerLabelArray.push(label);
                    outerColorArray.push(group.subColors[idx] || group.color);
                });
            });

            this.overviewChartInstance = new Chart(overviewCtx, {
                type: 'doughnut',
                data: {
                    datasets: [
                        { // OUTER RING
                            data: [...outerDataArray],
                            backgroundColor: [...outerColorArray],
                            labels: [...outerLabelArray],
                            weight: 1.8,
                            borderColor: '#ffffff',
                            borderWidth: 1.5
                        },
                        { // INNER RING
                            data: [...innerDataArray],
                            backgroundColor: [...innerColorArray],
                            labels: [...innerLabelArray],
                            weight: 1,
                            borderColor: '#ffffff',
                            borderWidth: 2
                        }
                    ]
                },
                options: { ...commonOptions, cutout: '35%' }
            });

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
                const centerEl = document.getElementById('overviewCenterText');
                if (centerEl) {
                    centerEl.innerHTML = `
                        <div class="label">${mode === 'variables' ? 'Variables' : 'Outputs'}</div>
                        <div class="value">${globalTotal}</div>
                        <div class="label">Patients</div>
                        <div class="value">${totals.patients}</div>
                    `;
                }

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

        // 2. Improvements Chart
        const improvedCtx = document.getElementById('improvedChart');
        if (improvedCtx) {
            const data = globalStats.improved_sub;
            const labelsMap = {
                correction: 'Correction',
                filled_blank: 'Filled Blank',
                standardized: 'Standardized',
                improved_comment: 'Comment'
            };
            this.improvedChartInstance = new Chart(improvedCtx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(labelsMap).map(key => labelsMap[key]),
                    datasets: [{
                        data: Object.keys(labelsMap).map(key => data[key]),
                        backgroundColor: ['#4ade80', '#22c55e', '#16a34a', '#15803d'],
                        borderWidth: 2,
                        borderColor: '#ffffff',
                        hoverOffset: 10
                    }]
                },
                options: { ...commonOptions, cutout: '50%' }
            });
            renderBreakdownLegend(this.improvedChartInstance, 'improvedLegend', data, labelsMap);
        }

        // 3. Issues Chart
        const issuedCtx = document.getElementById('issuedChart');
        if (issuedCtx) {
            const data = globalStats.unmatched_sub;
            const labelsMap = {
                missing_docs: 'Missing Docs',
                contradictions: 'Contradictions',
                ambiguous: 'Ambiguous',
                structural: 'Structural'
            };
            this.issuedChartInstance = new Chart(issuedCtx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(labelsMap).map(key => labelsMap[key]),
                    datasets: [{
                        data: Object.keys(labelsMap).map(key => data[key]),
                        backgroundColor: ['#f87171', '#ef4444', '#dc2626', '#b91c1c'],
                        borderWidth: 2,
                        borderColor: '#ffffff',
                        hoverOffset: 10
                    }]
                },
                options: { ...commonOptions, cutout: '50%' }
            });
            renderBreakdownLegend(this.issuedChartInstance, 'issuedLegend', data, labelsMap);
        }
    },

    renderFieldSummary(categories, totalFields) {
        const container = document.getElementById('resultsFieldSummary');
        if (!container) return;

        const labels = {
            matched: { label: 'Match', cls: 'match' },
            improved: { label: 'Impr', cls: 'improved' },
            unmatched: { label: 'Issue', cls: 'unmatched' },
            uncertain: { label: 'Uncer', cls: 'uncertain' },
            pending: { label: 'Pend', cls: 'pending' },
            dismissed: { label: 'Dism', cls: 'dismissed' }
        };

        container.innerHTML = Object.entries(labels).map(([status, info]) => {
            const count = categories[status].size;
            return `
                <div class="summary-chip">
                    <span class="stat-chip stat-${info.cls}">${info.label}</span>
                    <span class="summary-count">${count}<small>/${totalFields}</small></span>
                </div>
            `;
        }).join('');
    },

    syncResultsHeights() {
        const sections = document.querySelectorAll('.results-section');
        if (sections.length < 2) return;

        const patientSection = sections[0];
        const fieldSection = sections[1];

        // 1. Reset heights to let them find natural layout
        patientSection.style.height = 'auto';
        fieldSection.style.height = 'auto';

        // 2. We use a micro-task to wait for the browser to recalculate the auto height
        requestAnimationFrame(() => {
            // Measure the patient section - this is our "limitant" master
            const targetHeight = patientSection.offsetHeight;

            if (targetHeight > 0) {
                // Apply this fixed height to the Field section
                fieldSection.style.height = targetHeight + 'px';
                // Also set it on patientSection to keep them perfectly level visually
                patientSection.style.height = targetHeight + 'px';
            }
        });
    },

    createEmptyStatObject() {
        return {
            total: 0,
            matched: 0,
            pending: 0,
            uncertain: 0,
            dismissed: 0,
            improved: 0,
            improved_sub: {
                filled_blank: 0,
                correction: 0,
                standardized: 0,
                improved_comment: 0
            },
            unmatched: 0,
            unmatched_sub: {
                missing_docs: 0,
                contradictions: 0,
                ambiguous: 0,
                structural: 0
            }
        };
    },

    resolveStatusForStats(perf) {
        if (!perf) return 'pending';
        // Priority must match getPatientPerformanceStatus logic
        if (perf.pending) return 'pending';
        if (perf.uncertain) return 'uncertain';
        if (perf.unmatched) {
            const u = perf.unmatched;
            const isImprovement = u.filled_blank || u.correction || u.standardized || u.improved_comment;
            return isImprovement ? 'improved' : 'unmatched';
        }
        if (perf.matched) return 'matched';
        if (perf.dismissed) return 'dismissed';
        return 'pending';
    },

    resolveSubStatusForStats(perf, status) {
        if (!perf || !perf.unmatched) return null;
        if (status === 'improved') {
            if (perf.unmatched.filled_blank) return 'filled_blank';
            if (perf.unmatched.correction) return 'correction';
            if (perf.unmatched.standardized) return 'standardized';
            if (perf.unmatched.improved_comment) return 'improved_comment';
        }
        if (status === 'unmatched') {
            if (perf.unmatched.missing_docs) return 'missing_docs';
            if (perf.unmatched.contradictions) return 'contradictions';
            if (perf.unmatched.ambiguous) return 'ambiguous';
            if (perf.unmatched.structural) return 'structural';
            return null;
        }
        return null;
    },

    incrementStat(obj, status, subStatus) {
        obj.total++;
        if (obj.hasOwnProperty(status)) {
            obj[status]++;
        }

        if (status === 'improved' && subStatus && obj.improved_sub.hasOwnProperty(subStatus)) {
            obj.improved_sub[subStatus]++;
        }
        if (status === 'unmatched' && subStatus && obj.unmatched_sub.hasOwnProperty(subStatus)) {
            obj.unmatched_sub[subStatus]++;
        }
    },

    renderResultsTables(stats, patientIds) {
        // Render Patient Stats Table
        const patientTbody = document.getElementById('resultsPatientTbody');
        const patientTfoot = document.getElementById('resultsPatientTfoot');
        if (patientTbody) {
            patientTbody.innerHTML = patientIds.map(pid => {
                const s = stats.byPatient[pid];
                const label = patientIds.length > 1 ? pid.replace(/^Patient[_\s]?/i, 'P') : pid;
                return this.createStatRowHtml(label, s, pid);
            }).join('');

            // Calculate Patient Totals
            const patientTotal = this.createEmptyStatObject();
            patientIds.forEach(pid => {
                const s = stats.byPatient[pid];
                this.addStats(patientTotal, s);
            });
            if (patientTfoot) {
                patientTfoot.innerHTML = this.createStatRowHtml('TOTAL', patientTotal, 'Sum of all patients');
            }
        }

        // Render Field Stats Table
        const fieldTbody = document.getElementById('resultsFieldTbody');
        const fieldTfoot = document.getElementById('resultsFieldTfoot');
        if (fieldTbody) {
            fieldTbody.innerHTML = this.allFields.map(f => {
                const s = stats.byField[f.id];
                return this.createStatRowHtml(f.id, s, f.description);
            }).join('');

            // Calculate Field Totals
            const fieldTotal = this.createEmptyStatObject();
            this.allFields.forEach(f => {
                const s = stats.byField[f.id];
                this.addStats(fieldTotal, s);
            });
            if (fieldTfoot) {
                fieldTfoot.innerHTML = this.createStatRowHtml('TOTAL', fieldTotal, 'Sum of all fields');
            }
        }
    },

    addStats(target, source) {
        target.total += source.total;
        target.matched += source.matched;
        target.pending += source.pending;
        target.uncertain += source.uncertain;
        target.dismissed += source.dismissed;
        target.improved += source.improved;
        target.unmatched += source.unmatched;

        // Add sub-stats
        Object.keys(target.improved_sub).forEach(k => {
            target.improved_sub[k] += source.improved_sub[k];
        });
        Object.keys(target.unmatched_sub).forEach(k => {
            target.unmatched_sub[k] += source.unmatched_sub[k];
        });
    },

    createStatRowHtml(label, s, tooltip = '') {
        const displayLabel = label || '<span style="color:var(--gray-400)">(No ID)</span>';
        const pill = (count, type, title = '') =>
            `<div class="stat-pill ${count > 0 ? 'stat-' + type : 'zero'}" title="${title}">${count}</div>`;

        return `
            <tr>
                <td class="col-identifier" title="${tooltip}">${displayLabel}</td>
                <td class="col-stat">${pill(s.matched, 'match', 'Matched')}</td>
                <td class="col-stat">${pill(s.improved, 'improved', `Improved:
Correction: ${s.improved_sub.correction}
Filled Blank: ${s.improved_sub.filled_blank}
Standardized: ${s.improved_sub.standardized}
Comment: ${s.improved_sub.improved_comment}`)}</td>
                <td class="col-stat">${pill(s.unmatched, 'unmatched', `Unmatched:
Missing Docs: ${s.unmatched_sub.missing_docs}
Contradictions: ${s.unmatched_sub.contradictions}
Ambiguous: ${s.unmatched_sub.ambiguous}
Structural: ${s.unmatched_sub.structural}`)}</td>
                <td class="col-stat">${pill(s.uncertain, 'uncertain', 'Uncertain')}</td>
                <td class="col-stat">${pill(s.pending, 'pending', 'Pending')}</td>
                <td class="col-stat">${pill(s.dismissed, 'dismissed', 'Dismissed')}</td>
                <td class="col-stat col-total">${s.total}</td>
            </tr>
        `;
    }
});
