// Paste this code snippet into your browser's Developer Console (F12 -> Console)
// while on the Results page to download a JSON containing statistical datasets.

(function () {
    // Ensure the app instance and stats exist
    if (typeof app === 'undefined' || !app.cachedStats) {
        console.error("Stats not loaded. Please ensure you have loaded a project and opened the Results page.");
        return;
    }

    const global = app.cachedStats.global;
    if (!global) return;

    // 1. Calculate the denominator (Total Evaluated Variables)
    const exclusions = global.pending + global.dismissed + global.uncertain;
    const totalEvaluated = global.total - exclusions;

    // 2. Perform KPI Math
    const overallSuccess = global.matched + global.improved;
    const overallAccuracy = totalEvaluated > 0 ? (overallSuccess / totalEvaluated) * 100 : 0;

    const valueAddRate = totalEvaluated > 0 ? (global.improved / totalEvaluated) * 100 : 0;

    const criticalFailures = global.unmatched_sub.contradictions + global.unmatched_sub.ambiguous;
    const criticalFailureRate = totalEvaluated > 0 ? (criticalFailures / totalEvaluated) * 100 : 0;

    // 3. Structure the Statistical Data Object
    const exportData = {
        meta: {
            timestamp: new Date().toISOString(),
            description: "Statistical Analysis Datapoints for Validation Testing"
        },
        primary_kpis: {
            overall_accuracy_percentage: overallAccuracy,
            value_add_rate_percentage: valueAddRate,
            critical_error_rate_percentage: criticalFailureRate
        },
        binary_mapping_cohens_kappa: {
            description: "Binary data required for Cohen's Kappa.",
            success_agreement: global.matched + global.improved,
            failure_disagreement: global.unmatched,
            excluded: exclusions
        },
        raw_platform_metrics: {
            total_variables: global.total,
            matched: global.matched,
            improved: global.improved,
            unmatched: global.unmatched,
            uncertain: global.uncertain,
            pending: global.pending,
            dismissed: global.dismissed
        },
        sub_metrics_goodness_of_fit: {
            improvements: global.improved_sub,
            errors: global.unmatched_sub
        },
        categorical_analysis_chi_square: {} // To be populated
    };

    // 4. Generate Categorical Distribution (For Chi-Square)
    app.allFields.forEach(field => {
        const group = field.group || (field.definition && field.definition.group) || 'unknown';
        const stats = app.cachedStats.byField[field.id];
        if (!stats) return;

        if (!exportData.categorical_analysis_chi_square[group]) {
            exportData.categorical_analysis_chi_square[group] = {
                success: 0,
                failure: 0,
                excluded: 0
            };
        }

        exportData.categorical_analysis_chi_square[group].success += (stats.matched + stats.improved);
        exportData.categorical_analysis_chi_square[group].failure += stats.unmatched;
        exportData.categorical_analysis_chi_square[group].excluded += (stats.pending + stats.uncertain + stats.dismissed);
    });

    // 5. Trigger JSON File Download
    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `medixtract_statistical_data_${new Date().getTime()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log("Statistical JSON extracted and downloaded successfully!", exportData);
})();
