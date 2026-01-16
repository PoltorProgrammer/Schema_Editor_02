/**
 * Results Page Logic Mixin
 * Handles data calculations and stat processing for the Results Page
 */
Object.assign(SchemaEditor.prototype, {
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
    }
});
