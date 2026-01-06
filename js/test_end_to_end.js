
const MergeManager = {
    merge(base, local, remote, currentUser, forceRemoteWin = false) {
        const merged = JSON.parse(JSON.stringify(remote));
        const conflicts = [];
        const overrodeOthers = [];
        const normalize = (val) => JSON.stringify(val);

        const allKeys = new Set([
            ...Object.keys(base.properties || base),
            ...Object.keys(local.properties || local),
            ...Object.keys(remote.properties || remote)
        ]);

        const baseProps = base.properties || base;
        const localProps = local.properties || local;
        const mergedProps = merged.properties || merged;

        allKeys.forEach(key => {
            const baseVal = baseProps[key];
            const localVal = localProps[key];
            const remoteVal = mergedProps[key];

            const localChanged = normalize(localVal) !== normalize(baseVal);
            const remoteChanged = normalize(remoteVal) !== normalize(baseVal);

            if (localChanged) {
                if (!remoteChanged) {
                    mergedProps[key] = localVal;
                } else {
                    if (normalize(localVal) === normalize(remoteVal)) {
                        // Same edit, no conflict
                    } else {
                        const winner = forceRemoteWin ? (remote.last_updated_by || 'Other User') : currentUser;
                        const winnerVal = forceRemoteWin ? remoteVal : localVal;

                        const conflictInfo = { variable_id: key, winner, remote_user: remote.last_updated_by || 'Other User' };
                        conflicts.push(conflictInfo);
                        if (!forceRemoteWin) {
                            overrodeOthers.push({ variable_id: key, remote_user: remote.last_updated_by || 'Other User', ...conflictInfo });
                        }
                        mergedProps[key] = winnerVal;
                    }
                }
            }
        });
        return { merged, conflicts, overrodeOthers };
    }
};

async function runDetailedTest() {
    console.log("--- End-to-End Conflict Detection Test ---");

    // 1. Initial Load (Version 1)
    let baseSchema = { last_updated_by: "System", properties: { "var1": "V1" } };
    let currentSchema = JSON.parse(JSON.stringify(baseSchema));
    console.log("1. Loaded project. Base value of var1:", baseSchema.properties.var1);

    // 2. User starts editing (Local Change)
    currentSchema.properties.var1 = "V1-Local";
    console.log("2. User modified var1 to:", currentSchema.properties.var1);

    // 3. Someone else saves (Remote Change on disk)
    let remoteSchema = { last_updated_by: "RemoteUser", properties: { "var1": "V1-Remote" } };
    console.log("3. Remote user saved var1 as:", remoteSchema.properties.var1);

    // 4. Polling triggers checkForExternalUpdates
    // It sees remoteSchema is newer than our base.
    console.log("4. Polling detected remote change. Performing proactive merge (forceRemoteWin=true)...");
    let pollResult = MergeManager.merge(baseSchema, currentSchema, remoteSchema, "LocalUser", true);

    // According to current logic in Loser block:
    if (pollResult.conflicts.length > 0) {
        console.log("   [POLL] Conflict detected (Loser Modal would show). Updating current and base to sync.");
        currentSchema = pollResult.merged;
        baseSchema = JSON.parse(JSON.stringify(remoteSchema)); // THIS IS THE CULPRIT IF IT UPDATES BASE
    }

    console.log("   New local value after poll sync:", currentSchema.properties.var1);
    console.log("   New base value after poll sync:", baseSchema.properties.var1);

    // 5. User says "Wait, I want my change!" and edits again
    currentSchema.properties.var1 = "V1-Local-Final";
    console.log("5. User re-modifies var1 to:", currentSchema.properties.var1);

    // 6. User Saves
    console.log("6. User clicks Save. Reading latest from disk...");
    // remoteSchema is still what's on disk
    let saveResult = MergeManager.merge(baseSchema, currentSchema, remoteSchema, "LocalUser", false);

    console.log("7. Save Merge Result Analysis:");
    console.log("   Conflicts count:", saveResult.conflicts.length);
    console.log("   overrodeOthers count:", saveResult.overrodeOthers.length);

    if (saveResult.overrodeOthers.length > 0) {
        console.log(">>> SUCCESS: Winner conflict triggered!");
    } else {
        console.log(">>> FAILURE: Generic 'Project Saved' would show.");
    }
    console.log("------------------------------------------");
}

runDetailedTest();
