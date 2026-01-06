
/**
 * Mock Merge Manager Logic for Testing
 */
class MergeManager {
    static merge(base, local, remote, currentUser, forceRemoteWin = false) {
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
                        // Clean merge
                    } else {
                        const winner = forceRemoteWin ? (remote.last_updated_by || 'Other User') : currentUser;
                        const winnerVal = forceRemoteWin ? remoteVal : localVal;

                        const conflictInfo = {
                            variable_id: key,
                            winner: winner,
                            remote_user: remote.last_updated_by || 'Other User'
                        };

                        conflicts.push(conflictInfo);
                        if (!forceRemoteWin) {
                            overrodeOthers.push({
                                variable_id: key,
                                remote_user: remote.last_updated_by || 'Other User',
                                ...conflictInfo
                            });
                        }
                        mergedProps[key] = winnerVal;
                    }
                }
            }
        });

        return { merged, conflicts, overrodeOthers };
    }
}

// TEST CASE
const base = {
    properties: {
        "var1": { "description": "Original Description" },
        "var2": { "description": "Original Description 2" }
    }
};

const local = {
    properties: {
        "var1": { "description": "My New Description" }, // I changed this
        "var2": { "description": "Original Description 2" }
    }
};

const remote = {
    last_updated_by: "OtherUser",
    properties: {
        "var1": { "description": "Their Description" }, // They changed this too -> CONFLICT
        "var2": { "description": "Original Description 2" }
    }
};

const currentUser = "Me";

console.log("--- TEST RUN: Local Save (I should win) ---");
const result = MergeManager.merge(base, local, remote, currentUser, false);

console.log("Conflicts:", result.conflicts.length);
console.log("Overrode Others:", result.overrodeOthers.length);
console.log("Result:", JSON.stringify(result, null, 2));

if (result.overrodeOthers.length === 1 && result.overrodeOthers[0].variable_id === "var1") {
    console.log("SUCCESS: Conflict correctly identified as overriding other user.");
} else {
    console.error("FAILURE: Did not identify conflict override correctly.");
}
