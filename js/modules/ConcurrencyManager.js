/**
 * Concurrency & Conflict Manager
 * Handles 3-way diffing, merging, and conflict reporting.
 */

class ConcurrencyManager {
    constructor() { }

    /**
     * Compare revisions to detect conflicts or merge changes.
     * @param {Object} base - The original version both users started from.
     * @param {Object} currentDisk - The version currently on disk (User1).
     * @param {Object} myVersion - The version the current user wants to save (User2).
     * @returns {Object} { status: 'clean'|'mergeable'|'conflict', merged: Object|null, diffs: Object }
     */
    static analyze(base, currentDisk, myVersion) {
        // Deep Diff
        const changesTheir = this.getChanges(base, currentDisk);
        const changesMine = this.getChanges(base, myVersion);

        const conflicts = [];
        const merged = JSON.parse(JSON.stringify(base));

        // Apply Their Changes
        for (const change of changesTheir) {
            this.applyChange(merged, change);
        }

        // Apply My Changes (checking for overlap)
        for (const change of changesMine) {
            const conflicting = changesTheir.find(c => c.path === change.path);
            if (conflicting) {
                // If both changed the same field to the same value, it's fine
                if (JSON.stringify(conflicting.value) === JSON.stringify(change.value)) {
                    continue; // meaningful no-op
                }
                conflicts.push({
                    path: change.path,
                    base: this.getValue(base, change.path),
                    theirs: conflicting.value,
                    mine: change.value
                });
            } else {
                this.applyChange(merged, change);
            }
        }

        if (conflicts.length > 0) {
            return { status: 'conflict', conflicts, changesTheir, changesMine };
        }

        if (changesTheir.length > 0) {
            return { status: 'mergeable', merged, changesTheir, changesMine };
        }

        return { status: 'clean' };
    }

    static getChanges(base, target, path = '') {
        let changes = [];
        const baseKeys = Object.keys(base || {});
        const targetKeys = Object.keys(target || {});
        const allKeys = new Set([...baseKeys, ...targetKeys]);

        for (const key of allKeys) {
            const currentPath = path ? `${path}.${key}` : key;
            const distinctBase = base ? base[key] : undefined;
            const distinctTarget = target ? target[key] : undefined;

            if (JSON.stringify(distinctBase) !== JSON.stringify(distinctTarget)) {
                if (typeof distinctBase === 'object' && distinctBase !== null &&
                    typeof distinctTarget === 'object' && distinctTarget !== null) {
                    // Deep recurse
                    changes = changes.concat(this.getChanges(distinctBase, distinctTarget, currentPath));
                } else {
                    changes.push({
                        path: currentPath,
                        type: 'modification', // or add/delete generic
                        value: distinctTarget
                    });
                }
            }
        }
        return changes;
    }

    static applyChange(obj, change) {
        const parts = change.path.split('.');
        let current = obj;
        for (let i = 0; i < parts.length - 1; i++) {
            if (!current[parts[i]]) current[parts[i]] = {};
            current = current[parts[i]];
        }
        current[parts[parts.length - 1]] = change.value;
    }

    static getValue(obj, path) {
        const parts = path.split('.');
        let current = obj;
        for (const part of parts) {
            if (current === undefined || current === null) return undefined;
            current = current[part];
        }
        return current;
    }

    static generateReport(base, theirs, mine, conflicts) {
        return {
            timestamp: new Date().toISOString(),
            users: {
                base: base.last_updated_by || 'Unknown',
                theirs: theirs.last_updated_by || 'Unknown',
                mine: mine.last_updated_by || 'Unknown'
            },
            summary: conflicts.length > 0 ? "CONFLICT" : "MERGED",
            details: conflicts.map(c => ({
                field: c.path,
                base_value: c.base,
                [theirs.last_updated_by || 'User1']: c.theirs,
                [mine.last_updated_by || 'User2']: c.mine
            }))
        };
    }
}
