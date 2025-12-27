const fs = require('fs');
const path = require('path');

const PROJECTS_DIR = 'projects';
const CONFIG_FILE = 'js/projects-config.js';

function discoverProjects() {
    const projects = [];

    if (!fs.existsSync(PROJECTS_DIR)) {
        console.error(`Projects directory '${PROJECTS_DIR}' not found.`);
        return;
    }

    const folders = fs.readdirSync(PROJECTS_DIR);

    for (const folder of folders) {
        // Skip hidden files/folders
        if (folder.startsWith('.')) continue;

        // Check if naming convention matches (ends with _project)
        if (!folder.endsWith('_project')) continue;

        const projectPath = path.join(PROJECTS_DIR, folder);

        // Ensure it is a directory
        if (!fs.lstatSync(projectPath).isDirectory()) continue;

        const analysisDir = path.join(projectPath, 'analysis_data');
        const validationDir = path.join(projectPath, 'validation_data');

        // Check essential subdirectories existence
        if (!fs.existsSync(analysisDir) || !fs.existsSync(validationDir)) {
            console.warn(`Skipping '${folder}': Missing analysis_data or validation_data directory.`);
            continue;
        }

        // Validate Validation Data
        let validationFiles = [];
        try {
            const vFiles = fs.readdirSync(validationDir).filter(f => f.endsWith('.json'));

            for (const vFile of vFiles) {
                const vFilePath = path.join(validationDir, vFile);
                try {
                    const content = fs.readFileSync(vFilePath, 'utf8');
                    JSON.parse(content);

                    const patientId = vFile.split('-')[0];

                    validationFiles.push({
                        name: vFile,
                        patientId: patientId
                    });
                } catch (e) {
                    console.warn(`Warning in '${folder}': '${vFile}' is not valid JSON. Ignoring.`);
                }
            }

            if (validationFiles.length === 0) {
                console.warn(`Skipping '${folder}': No valid JSON files in validation_data.`);
                continue;
            }

        } catch (e) {
            console.warn(`Error reading validation_data for '${folder}':`, e);
            continue;
        }

        // Validate MediXtract Output Data
        let medixtractOutputFiles = [];
        const medixtractDir = path.join(projectPath, 'medixtract_output');
        if (fs.existsSync(medixtractDir)) {
            try {
                const mFiles = fs.readdirSync(medixtractDir).filter(f => f.endsWith('.json'));
                for (const mFile of mFiles) {
                    const mFilePath = path.join(medixtractDir, mFile);
                    try {
                        const content = fs.readFileSync(mFilePath, 'utf8');
                        JSON.parse(content);

                        const patientId = mFile.split('-')[0];

                        medixtractOutputFiles.push({
                            name: mFile,
                            patientId: patientId
                        });
                    } catch (e) { }
                }
            } catch (e) { }
        }

        // Validate Analysis Data (at least one valid JSON)
        let hasValidAnalysis = false;
        try {
            const aFiles = fs.readdirSync(analysisDir).filter(f => f.endsWith('.json'));
            for (const aFile of aFiles) {
                try {
                    const content = fs.readFileSync(path.join(analysisDir, aFile), 'utf8');
                    const json = JSON.parse(content);
                    if (json && typeof json === 'object') {
                        hasValidAnalysis = true;
                        break;
                    }
                } catch (e) { }
            }
        } catch (e) {
            console.warn(`Error reading analysis_data for '${folder}':`, e);
            continue;
        }

        if (!hasValidAnalysis) {
            console.warn(`Skipping '${folder}': No valid analysis JSON file found.`);
            continue;
        }

        // If all checks pass
        projects.push({
            name: folder,
            path: `projects/${folder}`,
            validationFiles,
            medixtractOutputFiles
        });
    }

    const content = `const PRE_DISCOVERED_PROJECTS = ${JSON.stringify(projects, null, 2)};`;

    try {
        fs.writeFileSync(CONFIG_FILE, content);
        console.log(`✅ Update successful! Discovered ${projects.length} valid projects.`);
        console.log(`   Config written to ${CONFIG_FILE}`);
    } catch (e) {
        console.error(`Error writing config file:`, e);
    }
}

discoverProjects();
