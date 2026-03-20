/**
 * Results Chart Configurations Mixin
 * Data preparation and configuration for Chart.js instances
 */
Object.assign(SchemaEditor.prototype, {
    getOverviewData(mode, globalStats, personalStats, variableStats) {
        const colors = this.getChartPalette();

        let structure = [];
        if (mode === 'variables') {
            const manualData = { 'Manual': variableStats.manual };
            const correctData = {
                'Improved': variableStats.correct.improved,
                'Match': variableStats.correct.match + variableStats.correct.dismissed
            };
            const attentionData = {
                'Miss. Doc': variableStats.attention.missing,
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
                'Comment': globalStats.improved_sub.improved_comment
            };
            const attentionData = {
                'Miss. Doc': globalStats.unmatched_sub.missing_docs,
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

    getPatientAnalysisData(pMode, byPatientStats, byPatientVariableStats, totals) {
        if (!byPatientStats) return null;
        const pIds = Object.keys(byPatientStats).sort();
        const colors = this.getChartPalette();
        
        // Define 4 categories as requested: matched, improves, error, gray area
        const datasets = [
            { label: 'Matched', data: [], backgroundColor: (colors.correct.main === '#013476' ? colors.correct.main : colors.personal.main), borderRadius: 4 },
            { label: 'Improves', data: [], backgroundColor: (colors.correct.main === '#013476' ? '#FFC000' : colors.correct.main), borderRadius: 4 },
            { label: 'Gray Area', data: [], backgroundColor: colors.comparison.gray, borderRadius: 4 },
            { label: 'Error', data: [], backgroundColor: colors.attention.main, borderRadius: 4 }
        ];

        pIds.forEach(pid => {
            let s;
            if (pMode === 'variables') {
                const vs = byPatientVariableStats[pid];
                // Map variableStats to these 4 categories
                datasets[0].data.push(vs.correct.match + vs.correct.dismissed);
                datasets[1].data.push(vs.correct.improved);
                datasets[2].data.push(vs.attention.mixed + vs.attention.uncertain + vs.attention.missing + vs.manual + vs.personal);
                datasets[3].data.push(0); // Error not explicitly split in variableStats currently, but could be structural
            } else {
                s = byPatientStats[pid];
                datasets[0].data.push(s.matched + s.dismissed);
                datasets[1].data.push(s.improved);
                datasets[2].data.push(
                    s.unmatched_sub.missing_docs + 
                    s.unmatched_sub.contradictions + 
                    s.unmatched_sub.ambiguous + 
                    s.uncertain + 
                    s.pending
                );
                datasets[3].data.push(s.unmatched_sub.structural);
            }
        });

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
                backgroundColor: this.getChartPalette().improvements,
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
                backgroundColor: this.getChartPalette().issues,
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
        const colors = this.getChartPalette();
        const pColors = [colors.comparison.correct, colors.comparison.error, colors.comparison.gray];

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
    }
});
