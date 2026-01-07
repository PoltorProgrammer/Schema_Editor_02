/**
 * Merge Manager for SchemaEditor
 * Handles 3-way merging, conflict resolution (Last-In-Wins), and conflict logging.
 */
class MergeManager {
    /**
     * Performs a 3-way merge: Base vs Local vs Remote
     * @param {Object} base - The version of the project when loaded/last saved
     * @param {Object} local - The current in-memory version with user's edits
     * @param {Object} remote - The latest version found on disk
     * @param {String} currentUser - The nickname of the current user
     * @param {Boolean} forceRemoteWin - If true, Remote wins conflicts (used during polling)
     * @returns {Object} result - { merged: Object, conflicts: Array, overrodeOthers: Array }
     */
    static merge(base, local, remote, currentUser, forceRemoteWin = false) {
        // Deep clone remote to start as our foundation (since it has others' edits)
        const merged = JSON.parse(JSON.stringify(remote));
        const conflicts = [];
        const overrodeOthers = []; // Tracks fields where we "won" a conflict

        // Helper to normalize data for comparison
        const normalize = (val) => MergeManager.canonicalize(val);

        // Get all unique variable keys from all three versions
        const allKeys = new Set([
            ...Object.keys(base.properties || base),
            ...Object.keys(local.properties || local),
            ...Object.keys(remote.properties || remote)
        ]);

        const baseProps = base.properties || base;
        const localProps = local.properties || local;
        const mergedProps = merged.properties || merged;

        // Extract remote user from project root
        const remoteUser = remote.last_updated_by || 'Other User';

        console.log(`[Merge] Starting merge for ${allKeys.size} keys. forceRemoteWin: ${forceRemoteWin}`);

        allKeys.forEach(key => {
            // Skip metadata keys
            if (['last_updated_at', 'last_updated_by', 'version', 'note'].includes(key)) return;

            const baseVal = baseProps[key];
            const localVal = localProps[key];
            const remoteVal = mergedProps[key];

            // 1. Check if Local/Remote changed it from Base
            const localChanged = normalize(localVal) !== normalize(baseVal);
            const remoteChanged = normalize(remoteVal) !== normalize(baseVal);

            if (localChanged) {
                if (!remoteChanged) {
                    // SAFE MERGE: Only local changed it. Apply local change.
                    mergedProps[key] = localVal;
                } else {
                    // Both changed it. Check for "Deep Merge" opportunity (Patient data)
                    const deepMerge = this.deepMergeVariable(baseVal, localVal, remoteVal, forceRemoteWin, currentUser, key, remoteUser);

                    if (deepMerge.isSafe) {
                        // CLEAN MERGE: They changed different things (e.g. different patients)
                        mergedProps[key] = deepMerge.merged;
                        console.log(`[Merge] Deep-merged variable ${key} (No conflicts)`);
                    } else {
                        // CONFLICT(S): Some overlap found
                        mergedProps[key] = deepMerge.merged;

                        deepMerge.conflicts.forEach(c => {
                            conflicts.push(c);
                            if (!forceRemoteWin) {
                                overrodeOthers.push({
                                    variable_id: key,
                                    remote_user: remoteUser,
                                    ...c
                                });
                            }
                        });
                        console.warn(`[Merge] Deep-merged variable ${key} with ${deepMerge.conflicts.length} inner conflicts.`);
                    }
                }
            } else if (remoteChanged) {
                // If local didn't change it, but remote did, we accept the remote version.
                // mergedProps[key] is already remoteVal because we started with a clone of remote.
                console.log(`[Merge] Auto-syncing remote change for ${key}`);
            }
        });

        if (conflicts.length > 0) {
            console.table(conflicts.map(c => ({
                Variable: c.variable_id,
                Patient: c.patient_id || 'Metadata',
                Base: normalize(c.base).slice(0, 30),
                Remote: normalize(c.remote).slice(0, 30),
                Local: normalize(c.local).slice(0, 30),
                Action: c.action
            })));
        }

        return {
            merged,
            conflicts,
            overrodeOthers
        };
    }

    /**
     * Attempts to merge a single variable's properties deeply
     * Specifically looks at the 'performance' object which contains patient data.
     */
    static deepMergeVariable(base, local, remote, forceRemoteWin, currentUser, varId, remoteUser) {
        const normalize = (val) => MergeManager.canonicalize(val);
        const result = {
            merged: JSON.parse(JSON.stringify(remote)), // Start with Remote foundation
            conflicts: [],
            isSafe: true
        };

        // 1. Check Metadata Overlap (Everything except 'performance')
        const allKeyKeys = new Set([...Object.keys(base), ...Object.keys(local), ...Object.keys(remote)]);

        allKeyKeys.forEach(k => {
            if (k === 'performance') return;

            const b = base[k];
            const l = local[k];
            const r = remote[k];

            if (normalize(l) !== normalize(b)) {
                if (normalize(r) !== normalize(b) && normalize(l) !== normalize(r)) {
                    // Conflict on Metadata
                    result.isSafe = false;
                    const winnerVal = forceRemoteWin ? r : l;
                    result.merged[k] = winnerVal;
                    result.conflicts.push({
                        variable_id: varId,
                        patient_id: null,
                        field: k,
                        base: b,
                        remote: r,
                        local: l,
                        full_base: base,
                        full_remote: remote,
                        full_local: local,
                        local_user: currentUser,
                        remote_user: remoteUser || 'Other User',
                        action: forceRemoteWin ? 'Remote Win' : 'Local Win'
                    });
                } else {
                    // Safe Metadata merge
                    result.merged[k] = l;
                }
            }
        });

        // 2. Performance (Patient Data) Deep Merge
        const basePerf = base.performance || {};
        const localPerf = local.performance || {};
        const remotePerf = remote.performance || {};
        const mergedPerf = result.merged.performance || {};

        const allPatientIds = new Set([
            ...Object.keys(basePerf),
            ...Object.keys(localPerf),
            ...Object.keys(remotePerf)
        ]);

        allPatientIds.forEach(pid => {
            const b = basePerf[pid];
            const l = localPerf[pid];
            const r = remotePerf[pid];

            const localChanged = normalize(l) !== normalize(b);
            const remoteChanged = normalize(r) !== normalize(b);

            if (localChanged) {
                if (!remoteChanged) {
                    // SILENT MERGE: User edited this patient, no one else did.
                    mergedPerf[pid] = l;
                } else {
                    // REAL PATIENT CONFLICT: Both edited the same patient record
                    const areDifferent = normalize(l) !== normalize(r);
                    if (areDifferent) {
                        result.isSafe = false;
                        const winnerVal = forceRemoteWin ? r : l;
                        mergedPerf[pid] = winnerVal;

                        result.conflicts.push({
                            variable_id: varId,
                            patient_id: pid,
                            base: b,
                            remote: r,
                            local: l,
                            full_base: base,
                            full_remote: remote,
                            full_local: local,
                            local_user: currentUser,
                            remote_user: remoteUser || 'Other User',
                            action: forceRemoteWin ? 'Remote Win' : 'Local Win'
                        });
                    }
                }
            }
        });

        return result;
    }

    /**
     * Generates a conflict log object ready for saving
     */
    static generateConflictLog(project, conflicts) {
        if (!conflicts || conflicts.length === 0) return null;

        // Compile unique participants across all conflicts in this session
        const participants = new Set();
        conflicts.forEach(c => {
            if (c.remote_user) participants.add(c.remote_user);
            if (c.local_user) participants.add(c.local_user);
        });

        return {
            project_name: project.name,
            timestamp: new Date().toISOString(),
            participants: Array.from(participants),
            conflict_count: conflicts.length,
            details: conflicts
        };
    }

    /**
     * canonicalize
     * Returns a JSON string of the object with sorted keys to ensure correct comparison logic
     * regardless of key insertion order.
     */
    static canonicalize(obj) {
        if (obj === undefined) return 'undefined';
        if (obj === null || typeof obj !== 'object') {
            return JSON.stringify(obj);
        }
        if (Array.isArray(obj)) {
            // For arrays, order matters, so we just canonicalize elements
            return '[' + obj.map(item => MergeManager.canonicalize(item)).join(',') + ']';
        }
        // For objects, sort keys
        const keys = Object.keys(obj).sort();
        const parts = keys.map(key => {
            return JSON.stringify(key) + ':' + MergeManager.canonicalize(obj[key]);
        });
        return '{' + parts.join(',') + '}';
    }
}
