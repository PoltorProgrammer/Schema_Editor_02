const fs = require('fs');
const path = require('path');

const filePath = 'c:\\MediXtract\\SchemaEditor02\\docs\\testing_000-analysis_data.json';

try {
    if (!fs.existsSync(filePath)) {
        console.error('File not found:', filePath);
        process.exit(1);
    }

    const rawData = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(rawData);

    let updateCount = 0;

    if (data.properties) {
        Object.keys(data.properties).forEach(propId => {
            const def = data.properties[propId];
            let modified = false;

            // 1. Handle "notes" -> "medixtract_notes"
            if (Object.prototype.hasOwnProperty.call(def, 'notes')) {
                const oldNotes = def.notes;
                if (!def.medixtract_notes) {
                    def.medixtract_notes = oldNotes;
                }
                delete def.notes;
                modified = true;
            }

            // 2. Fallback: if medixtract_notes doesn't exist, initialize it
            if (def.medixtract_notes === undefined) {
                // Check if "comment" was used as notes (based on DataManager logic)
                if (def.comment !== undefined && def.type !== 'comment') {
                    def.medixtract_notes = def.comment;
                    delete def.comment;
                } else {
                    def.medixtract_notes = "";
                }
                modified = true;
            }

            // 3. Handle "reviewer_notes" -> ensure it's an array
            if (!Array.isArray(def.reviewer_notes)) {
                const existingValue = def.reviewer_notes;
                if (typeof existingValue === 'string' && existingValue.trim() !== '') {
                    def.reviewer_notes = [{
                        user: 'Legacy',
                        note: existingValue,
                        timestamp: new Date().toISOString()
                    }];
                } else {
                    def.reviewer_notes = [];
                }
                modified = true;
            }

            if (modified) {
                updateCount++;
            }
        });
    }

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`Successfully migrated ${updateCount} variables in the schema.`);

} catch (err) {
    console.error('Migration failed:', err);
}
