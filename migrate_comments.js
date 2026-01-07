const fs = require('fs');
const path = require('path');

const filePath = 'c:\\MediXtract\\SchemaEditor02\\docs\\testing_000-analysis_data.json';

try {
    const rawData = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(rawData);

    let updateCount = 0;

    if (data.properties) {
        Object.values(data.properties).forEach(def => {
            if (def.performance) {
                Object.values(def.performance).forEach(perf => {
                    if (typeof perf.reviewer_comment === 'string') {
                        const oldComment = perf.reviewer_comment;
                        if (oldComment) {
                            // Migrate existing comment to legacy user entry
                            perf.reviewer_comment = [{
                                user: 'Legacy',
                                comment: oldComment,
                                timestamp: new Date().toISOString()
                            }];
                        } else {
                            // Empty string becomes empty array
                            perf.reviewer_comment = [];
                        }
                        updateCount++;
                    }
                });
            }
        });
    }

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`Successfully migrated ${updateCount} records.`);

} catch (err) {
    console.error('Migration failed:', err);
}
