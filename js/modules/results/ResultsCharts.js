/**
 * Results Page Charts Mixin
 * Handles Chart.js integration and chart rendering for the Results Page
 */
Object.assign(SchemaEditor.prototype, {
    registerCurvedTextPlugin() {
        if (this.curvedTextPluginRegistered) return;

        Chart.register({
            id: 'curvedText',
            afterDatasetsDraw(chart) {
                if (chart.config.type !== 'doughnut' && chart.config.type !== 'pie') return;

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

                        const percentVal = total > 0 ? (value / total) * 100 : 0;
                        const percentage = percentVal.toFixed(0);

                        const midAngle = (startAngle + endAngle) / 2;
                        const midRadius = (innerRadius + outerRadius) / 2;

                        // Calculate scale factor relative to a standard view (e.g., 400px min dimension)
                        // This ensures that for high-res exports (e.g. 1000px), the text scales up proportionally
                        const minDim = Math.min(chart.width, chart.height);
                        const scale = Math.max(1, minDim / 400);

                        // Dynamic Sizing scaled
                        const percentFactor = Math.min(32, Math.max(11, 10 + (percentVal / 3.5)));
                        const fontSize = percentFactor * scale;

                        // Calculate offsets to center the text block around midRadius
                        // We want a constant visual gap between the label and the stats
                        const gap = 4 * scale;
                        const statsFontSize = 10 * scale;

                        // Line 1 (Label) is shifted 'up' (visually) by half of Line 2's height + half gap
                        const radiusOffsetLabel = (statsFontSize + gap) / 2;

                        // Line 2 (Stats) is shifted 'down' (visually) by half of Line 1's height + half gap
                        const radiusOffsetStats = (fontSize + gap) / 2;

                        const line1 = label;
                        const line2 = `${value} (${percentage}%)`;

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

                        // Draw Line 1 (Label) - shifted "inwards/up"
                        drawCurvedLine(line1, midRadius - radiusOffsetLabel, fontSize, true);

                        // Draw Line 2 (Stats) - shifted "outwards/down"
                        drawCurvedLine(line2, midRadius + radiusOffsetStats, statsFontSize, false);

                        ctx.restore();
                    });
                });
            }
        });

        this.curvedTextPluginRegistered = true;
    },

    getOverviewData(mode, globalStats, personalStats, variableStats) {
        const colorPurple = '#8b5cf6';
        const colorGreen = '#22c55e';
        const colorOrange = '#f97316';
        const colorBlue = '#3b82f6';

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
                'Match': (personalStats.matched || 0) + (personalStats.dismissed || 0),
                'Improved': personalStats.improved || 0,
                'Issue': personalStats.unmatched || 0,
                'Uncert.': personalStats.uncertain || 0,
                'Manual': personalStats.pending || 0
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

        return {
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
            ],
            structure: structure // Return structure for legend usage
        };
    },

    getPatientAnalysisData(pMode, byPatientStats, byPatientVariableStats) {
        if (!byPatientStats) return null;
        const pIds = Object.keys(byPatientStats).sort();
        let datasets = [];

        if (pMode === 'variables') {
            datasets = [
                { label: 'Correct', data: [], backgroundColor: '#22c55e', borderRadius: 4 },
                { label: 'Attention Required', data: [], backgroundColor: '#f97316', borderRadius: 4 },
                { label: 'Personal Data', data: [], backgroundColor: '#8b5cf6', borderRadius: 4 }
            ];
            pIds.forEach(pid => {
                const s = byPatientVariableStats[pid];
                datasets[0].data.push(s.correct.match + s.correct.dismissed + s.correct.improved + s.correct.missing + s.manual);
                datasets[1].data.push(s.attention.mixed + s.attention.uncertain);
                datasets[2].data.push(s.personal);
            });
        } else {
            datasets = [
                { label: 'Match', data: [], backgroundColor: '#3b82f6', borderRadius: 4 },
                { label: 'Improves', data: [], backgroundColor: '#22c55e', borderRadius: 4 },
                { label: 'Attention Required', data: [], backgroundColor: '#f97316', borderRadius: 4 },
                { label: 'Personal Data', data: [], backgroundColor: '#8b5cf6', borderRadius: 4 }
            ];
            pIds.forEach(pid => {
                const s = byPatientStats[pid];
                datasets[0].data.push(s.matched + s.dismissed);
                datasets[1].data.push(s.improved_sub.filled_blank + s.improved_sub.correction + s.improved_sub.standardized + s.improved_sub.improved_comment + s.unmatched_sub.missing_docs);
                datasets[2].data.push(s.unmatched_sub.contradictions + s.unmatched_sub.ambiguous + s.unmatched_sub.structural + s.uncertain);
                datasets[3].data.push(s.pending);
            });
        }
        return { labels: pIds, datasets };
    },

    getImprovedData(globalStats) {
        const data = globalStats.improved_sub;
        const labelsMap = {
            correction: 'Correction',
            filled_blank: 'Filled Blank',
            standardized: 'Standardized',
            improved_comment: 'Comment'
        };
        return {
            labels: Object.keys(labelsMap).map(key => labelsMap[key]),
            datasets: [{
                data: Object.keys(labelsMap).map(key => data[key]),
                backgroundColor: ['#4ade80', '#22c55e', '#16a34a', '#15803d'],
                borderWidth: 2,
                borderColor: '#ffffff',
                hoverOffset: 10
            }],
            raw_data: data
        };
    },

    getIssuedData(globalStats) {
        const data = globalStats.unmatched_sub;
        const labelsMap = {
            missing_docs: 'Missing Docs',
            contradictions: 'Contradictions',
            ambiguous: 'Ambiguous',
            structural: 'Structural'
        };
        return {
            labels: Object.keys(labelsMap).map(key => labelsMap[key]),
            datasets: [{
                data: Object.keys(labelsMap).map(key => data[key]),
                backgroundColor: ['#f87171', '#ef4444', '#dc2626', '#b91c1c'],
                borderWidth: 2,
                borderColor: '#ffffff',
                hoverOffset: 10
            }],
            raw_data: data
        };
    },

    getPerfData(type, globalStats) {
        // Base Gray Area (Source/Data logic issues)
        const baseGray = globalStats.unmatched_sub.missing_docs +
            globalStats.unmatched_sub.contradictions +
            globalStats.unmatched_sub.ambiguous +
            globalStats.uncertain;

        let data;
        if (type === 'mx') {
            data = {
                correct: globalStats.matched + globalStats.dismissed + globalStats.improved,
                error: globalStats.unmatched_sub.structural,
                gray: baseGray
            };
        } else {
            data = {
                correct: globalStats.matched + globalStats.dismissed + globalStats.unmatched_sub.structural,
                error: globalStats.improved,
                gray: baseGray
            };
        }

        const pLabelsMap = { correct: 'Correct', error: 'Error', gray: 'Gray Area' };
        const pColors = ['#22c55e', '#ef4444', '#94a3b8'];

        return {
            labels: Object.values(pLabelsMap),
            datasets: [{
                data: Object.values(data),
                backgroundColor: pColors,
                borderWidth: 2,
                borderColor: '#ffffff',
                hoverOffset: 10
            }],
            raw_data: data
        };
    },

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
                    'Match': (personalStats.matched || 0) + (personalStats.dismissed || 0),
                    'Improved': personalStats.improved || 0,
                    'Issue': personalStats.unmatched || 0,
                    'Uncert.': personalStats.uncertain || 0,
                    'Manual': personalStats.pending || 0
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

            const overviewData = {
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
            };

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

            let datasets = [];
            if (pMode === 'variables') {
                datasets = [
                    { label: 'Correct', data: [], backgroundColor: '#22c55e', borderRadius: 4 },
                    { label: 'Attention Required', data: [], backgroundColor: '#f97316', borderRadius: 4 },
                    { label: 'Personal Data', data: [], backgroundColor: '#8b5cf6', borderRadius: 4 }
                ];
                pIds.forEach(pid => {
                    const s = byPatientVariableStats[pid];
                    datasets[0].data.push(s.correct.match + s.correct.dismissed + s.correct.improved + s.correct.missing + s.manual);
                    datasets[1].data.push(s.attention.mixed + s.attention.uncertain);
                    datasets[2].data.push(s.personal);
                });
            } else {
                datasets = [
                    { label: 'Match', data: [], backgroundColor: '#3b82f6', borderRadius: 4 },
                    { label: 'Improves', data: [], backgroundColor: '#22c55e', borderRadius: 4 },
                    { label: 'Attention Required', data: [], backgroundColor: '#f97316', borderRadius: 4 },
                    { label: 'Personal Data', data: [], backgroundColor: '#8b5cf6', borderRadius: 4 }
                ];
                pIds.forEach(pid => {
                    const s = byPatientStats[pid];
                    datasets[0].data.push(s.matched + s.dismissed);
                    datasets[1].data.push(s.improved_sub.filled_blank + s.improved_sub.correction + s.improved_sub.standardized + s.improved_sub.improved_comment + s.unmatched_sub.missing_docs);
                    datasets[2].data.push(s.unmatched_sub.contradictions + s.unmatched_sub.ambiguous + s.unmatched_sub.structural + s.uncertain);
                    datasets[3].data.push(s.pending);
                });
            }

            // Adjust container height based on number of patients
            const wrapper = patientCtx.closest('.patient-analysis-wrapper');
            if (wrapper) {
                const calculatedHeight = Math.max(400, pIds.length * 45 + 100);
                wrapper.style.height = calculatedHeight + 'px';
            }

            if (this.patientAnalysisChartInstance) {
                this.patientAnalysisChartInstance.data.labels = pIds;
                this.patientAnalysisChartInstance.data.datasets = datasets;
                this.patientAnalysisChartInstance.update();
            } else {
                this.patientAnalysisChartInstance = new Chart(patientCtx, {
                    type: 'bar',
                    data: {
                        labels: pIds,
                        datasets: datasets
                    },
                    plugins: [ChartDataLabels],
                    options: {
                        indexAxis: 'y',
                        responsive: true,
                        maintainAspectRatio: false,
                        animation: {
                            duration: 750,
                            easing: 'easeInOutQuart'
                        },
                        scales: {
                            x: {
                                stacked: true,
                                beginAtZero: true,
                                ticks: {
                                    callback: function (value) { return value; }
                                }
                            },
                            y: {
                                stacked: true,
                                ticks: {
                                    color: '#475569',
                                    font: { weight: '600' }
                                }
                            }
                        },
                        plugins: {
                            ...commonOptions.plugins,
                            legend: {
                                display: true,
                                position: 'top',
                                align: 'center',
                                labels: {
                                    usePointStyle: true,
                                    padding: 20,
                                    font: { size: 12, weight: '500' }
                                }
                            }
                        }
                    }
                });
            }
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
            const improvedData = {
                labels: Object.keys(labelsMap).map(key => labelsMap[key]),
                datasets: [{
                    data: Object.keys(labelsMap).map(key => data[key]),
                    backgroundColor: ['#4ade80', '#22c55e', '#16a34a', '#15803d'],
                    borderWidth: 2,
                    borderColor: '#ffffff',
                    hoverOffset: 10
                }]
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
            const issuedData = {
                labels: Object.keys(labelsMap).map(key => labelsMap[key]),
                datasets: [{
                    data: Object.keys(labelsMap).map(key => data[key]),
                    backgroundColor: ['#f87171', '#ef4444', '#dc2626', '#b91c1c'],
                    borderWidth: 2,
                    borderColor: '#ffffff',
                    hoverOffset: 10
                }]
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
            renderBreakdownLegend(this.issuedChartInstance, 'issuedLegend', data, labelsMap);
        }

        // 4. MediXtract vs Human Comparison (Output-level breakdown)
        const mxPerfCtx = document.getElementById('medixtractPerfChart');
        const hmPerfCtx = document.getElementById('humanPerfChart');

        if (mxPerfCtx && hmPerfCtx) {
            // Base Gray Area (Source/Data logic issues)
            const baseGray = globalStats.unmatched_sub.missing_docs +
                globalStats.unmatched_sub.contradictions +
                globalStats.unmatched_sub.ambiguous +
                globalStats.uncertain;

            // MediXtract binning
            const mxData = {
                correct: globalStats.matched + globalStats.dismissed + globalStats.improved,
                error: globalStats.unmatched_sub.structural,
                gray: baseGray
            };

            // Human binning
            const hmData = {
                correct: globalStats.matched + globalStats.dismissed + globalStats.unmatched_sub.structural,
                error: globalStats.improved,
                gray: baseGray
            };

            const pLabelsMap = { correct: 'Correct', error: 'Error', gray: 'Gray Area' };
            const pColors = ['#22c55e', '#ef4444', '#94a3b8']; // Green, Red, Gray

            const mxChartData = {
                labels: Object.values(pLabelsMap),
                datasets: [{
                    data: Object.values(mxData),
                    backgroundColor: pColors,
                    borderWidth: 2,
                    borderColor: '#ffffff',
                    hoverOffset: 10
                }]
            };

            const hmChartData = {
                labels: Object.values(pLabelsMap),
                datasets: [{
                    data: Object.values(hmData),
                    backgroundColor: pColors,
                    borderWidth: 2,
                    borderColor: '#ffffff',
                    hoverOffset: 10
                }]
            };

            if (this.medixtractPerfChartInstance) {
                this.medixtractPerfChartInstance.data = mxChartData;
                this.medixtractPerfChartInstance.update();
            } else {
                this.medixtractPerfChartInstance = new Chart(mxPerfCtx, {
                    type: 'doughnut',
                    data: mxChartData,
                    options: { ...commonOptions, cutout: '50%' }
                });
            }
            renderBreakdownLegend(this.medixtractPerfChartInstance, 'medixtractPerfLegend', mxData, pLabelsMap, 'Outputs', 'Variables', totals.fields);

            if (this.humanPerfChartInstance) {
                this.humanPerfChartInstance.data = hmChartData;
                this.humanPerfChartInstance.update();
            } else {
                this.humanPerfChartInstance = new Chart(hmPerfCtx, {
                    type: 'doughnut',
                    data: hmChartData,
                    options: { ...commonOptions, cutout: '50%' }
                });
            }
            renderBreakdownLegend(this.humanPerfChartInstance, 'humanPerfLegend', hmData, pLabelsMap, 'Outputs', 'Variables', totals.fields);
        }
    }
});
