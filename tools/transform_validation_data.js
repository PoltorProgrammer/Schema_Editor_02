const fs = require('fs');
const path = require('path');

// Paths
const inputFilePath = path.join(__dirname, '..', 'docs', 'validation_data.txt');
const outputDir = path.join(__dirname, '..', 'docs');

// Read the input file
fs.readFile(inputFilePath, 'utf8', (err, data) => {
    if (err) {
        console.error('Error reading file:', err);
        return;
    }

    // Split into lines and handle potential Windows line endings
    const lines = data.trim().split(/\r?\n/);

    if (lines.length < 2) {
        console.error('File appears to be empty or missing data rows.');
        return;
    }

    // Parse headers (first line)
    const headers = lines[0].split('\t').map(h => h.trim());

    // Process data rows
    let patientCount = 0;

    // Start from index 1 (headers is 0)
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue; // Skip empty lines

        const values = line.split('\t');

        // Create JSON object structure
        const patientData = {};

        headers.forEach((header, index) => {
            // Use the value if present, otherwise empty string (handling potential undefined if row is short)
            // Also trim values just in case
            patientData[header] = values[index] ? values[index].trim() : "";
        });

        // Determine patient identifier for the filename and internal field
        // Determine patient identifier for the filename and internal field
        patientCount++;
        const patientNumber = String(patientCount).padStart(2, '0');
        const patientId = `Patient_${patientNumber}`;
        const recordId = patientData['record_id'];

        // Add the extra "Patient" field matching the observed structure
        patientData["Patient"] = patientId;

        // Construct filename: [Patient_NN]-0000[record_id]-bern-validation_data.json
        const filename = `${patientId}-0000${recordId}-bern-validation_data.json`;
        const outputFilePath = path.join(outputDir, filename);

        fs.writeFile(outputFilePath, JSON.stringify(patientData, null, 2), (writeErr) => {
            if (writeErr) {
                console.error(`Error writing ${filename}:`, writeErr);
            } else {
                console.log(`Created ${outputFilePath}`);
            }
        });
    }
});
