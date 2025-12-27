# MediXtract Schema Editor

[![Open App](https://img.shields.io/badge/Open-Live%20Demo-blue?style=for-the-badge&logo=googlechrome)](https://poltorprogrammer.github.io/Schema_Editor_02/index.html)
[![Version](https://img.shields.io/badge/Version-2.0-green?style=for-the-badge)](https://github.com/MediXTract/SchemaEditor02)
[![License](https://img.shields.io/badge/License-MIT-orange?style=for-the-badge)](LICENSE)

**A premium, local-first interface for auditing, validating, and refining medical data extraction schemas.**

The **MediXtract Schema Editor** is a sophisticated tool designed to bridge the gap between raw AI extractions and human ground truth. It allows data engineers and medical professionals to visualize discrepancies, validate extraction performance, and refine the underlying JSON schemas in a seamless, high-performance environment.

---

## 📚 Table of Contents
- [✨ Key Features](#-key-features)
- [🚀 Quick Start](#-quick-start)
- [💻 Installation & Setup](#-installation--setup)
- [🔧 Utility Scripts](#-utility-scripts-windows)
- [📁 Project Structure](#-project-structure)
- [📖 Usage Guide](#-usage-guide)
  - [Dashboard & Project Selection](#dashboard--project-selection)
  - [The Schema Editor](#the-schema-editor)
  - [Validation Workflow](#validation-workflow)
  - [Status Definitions](#status-definitions)
- [🛠️ Technical Architecture](#-technical-architecture)
- [⚙️ Configuration](#-configuration)
- [🤝 Contributing](#-contributing)
- [👤 Author](#-author)

---

## ✨ Key Features

*   **Local-First & Secure**: Uses the browser's **File System Access API** to read and write directly to your local hard drive. Your data never leaves your machine.
*   **Auto-Discovery Engine**: Automatically scans your `projects/` directory to instantly load valid projects without manual file picking.
*   **Intelligent Validation**:
    *   Side-by-side comparison of **MediXtract (AI)** output vs **Human (Ground Truth)** validation tables.
    *   Automatic calculation of match percentages.
    *   Smart status detection (Matched, Improved, New Data Found).
*   **Advanced Filtering**: Filter 1000+ fields instantly by:
    *   **Status** (Pending, Matched, Issues, Improvements)
    *   **Review State** (Reviewed vs Unreviewed)
    *   **Severity** (1-5)
    *   **Type, Group, & Labels**
*   **Schema Management**: Edit field properties (Types, Groups, Descriptions) directly within the UI and save changes back to the source JSON.
*   **Premium UI/UX**:
    *   **Glassmorphism Design**: Modern, translucent aesthetics.
    *   **Dark Mode**: Fully supported dark/light themes + "Joan" high-contrast theme.
    *   **Responsive**: Fluid layouts that adapt to data density.

---

## 🚀 Quick Start

### 🪟 Windows Users
1.  **Clone/Download** this repository.
2.  Double-click **`Generate Shortcut.bat`**.
    *   *This will check for Node.js, install it if missing, and create a Desktop Shortcut.*
3.  Launch the **"Schema Editor"** shortcut.

### 🍎 Mac / 🐧 Linux Users
1.  Open your terminal in the project folder.
2.  Run the setup script:
    ```bash
    chmod +x "Generate Shortcut.sh" tools/*.sh
    ./"Generate Shortcut.sh"
    ```
3.  Launch the app or run `npm start` manually.

---

## 💻 Installation & Setup

If you prefer a manual developer setup:

1.  **Prerequisites**: Ensure you have [Node.js](https://nodejs.org/) installed (LTS version recommended).
2.  **Install Dependencies**:
    ```bash
    npm install
    ```
    *Note: The project uses minimal dependencies, primarily for a local development server.*
3.  **Run Locally**:
    ```bash
    npx serve .
    ```
    or use the Python alternative:
    ```bash
    python -m http.server 8000
    ```
4.  Open `http://localhost:3000` (or `8000`) in **Google Chrome**, **Edge**, or **Opera** (Browsers with File System Access API support).

---

## 🔧 Utility Scripts (Windows)

The repository includes helper scripts in the root directory to simplify setup and maintenance.

### `Generate Shortcut.bat`
*   **What it does**: Creates a desktop shortcut named **"Schema Editor"** for easy access.
*   **Node.js Check**: It automatically checks if [Node.js](https://nodejs.org/) is installed. If missing, it can attempt to install it via `winget` or direct you to the download page.
*   **Icon**: Assigns a custom MediXtract icon to the shortcut.

### `Update Program.bat`
*   **What it does**: Updates the application to the latest version from GitHub.
*   **Smart Update**: 
    *   If you cloned via **Git**: It runs `git pull` (via reset/stash) to sync with the repository.
    *   If you downloaded the **ZIP**: It downloads the latest ZIP, extracts it, and updates your files.
*   **Data Preservation**: **CRITICAL** - This script explicitly **protects your `projects/` directory**. It will *never* overwrite or delete your local analysis and validation data during an update.

---

## 📁 Project Structure

For the editor to function primarily, your data must follow a strict directory structure inside the `projects/` folder. This ensures the **Project Manager** can auto-link Analysis files with their corresponding Validation and Output data.

```text
projects/
└── [project_name]_project/                 <-- Folder MUST end in '_project'
    ├── analysis_data/
    │   └── [name]-analysis_data.json       <-- The Schema Definition (Source of Truth)
    ├── validation_data/
    │   ├── patient_A-validation_data.json  <-- Human Verified Data (Ground Truth)
    │   └── patient_B-validation_data.json
    └── medixtract_output/
        ├── patient_A-output.json           <-- AI Extracted Data
        └── patient_B-output.json
```

*   **Analysis Data**: Defines the structure (fields, types, groups).
*   **Validation Data**: The "Correct" answers provided by human reviewers.
*   **MediXtract Output**: The raw output from the extraction engine.

---

## 📖 Usage Guide

### Dashboard & Project Selection
Upon launch, the **Projects Dashboard** displays all detected projects.
*   **Scanning**: Click "Rescan System" to refresh the list from your local disk.
*   **Recent**: Your last edited project is pinned for quick access.
*   **New Project**: Use the "Add New Project" wizard to initialize a new folder structure.

### The Schema Editor
The main view is a high-density data grid.
*   **Search**: Use the top bar to fuzzy-search field names, descriptions, or comments.
*   **Columns**:
    *   **Status**: Color-coded indicator (Green=Matched, Red=Issue, Blue=Improved).
    *   **Field Name**: The unique identifier of the data point.
    *   **Human Output**: The value found in `validation_data`.
    *   **MediXtract Output**: The value found in `medixtract_output`, with frequency counts if multiple outputs exist.
    *   **Review Switch**: A toggle to mark a field as "Reviewed" (independent of its match status).

### Validation Workflow
1.  **Select a Field**: Click any row to open the **Detail Panel**.
2.  **Compare Data**: View the AI's output distribution vs the Human truth.
3.  **Assign Status**:
    *   If the AI is correct manually, mark as **Matched**.
    *   If the AI found new valid data, mark as **Improved → Filled Blank**.
    *   If the AI is wrong, mark as **Issued → Correction**.
4.  **Edit Schema**: If the field definition is wrong, update the **Description** or **Group** directly in the panel.
5.  **Save**: Click "Save Changes" in the header to write the updated statuses back to the `analysis_data.json` file.

### Status Definitions

| Status | Icon Color | Definition |
| :--- | :--- | :--- |
| **Pending** | ⚪ Grey | Comparison not yet analyzed. Default state. |
| **Matched** | 🟢 Green | AI Output matches Human Validation (>90% confidence). |
| **Improved** | 🔵 Blue | AI found valid data that was missing or incorrect in Human Validation. |
| **Issued** | 🔴 Red | AI Output is incorrect or contradictory. |
| **Dismissed** | ⚫ Black | Field is not relevant for the current analysis context. |

*Sub-statuses for Improvements/Issues allow for detailed error categorization (e.g., Structural Error, Formatting Issue, Ambiguous).*

---

## 🛠️ Technical Architecture

The application is built as a **Single Page Application (SPA)** using modern Vanilla JavaScript (ES6+).

*   **View Layer**: No framework (React/Vue). Direct DOM manipulation via `TableRenderer.js` and `UIComponentRenderer.js` for maximum performance with large datasets (1000+ rows).
*   **State Management**: `DataManager.js` acts as the central store, handling data normalization and cross-referencing between the three data sources.
*   **CSS Architecture**:
    *   **BEM Naming Convention**: For maintainable styles.
    *   **Modular CSS**: Located in `css/layouts/` and `css/components/`.
    *   **Variables**: `css/variables.css` defines the theme tokens (colors, spacing) allowing for instant theme switching.
*   **Persistence**: Uses `IndexedDB` to store file handles, allowing the app to "remember" access permissions between reloads.

---

## ⚙️ Configuration

The `js/projects-config.js` file acts as a fallback or pre-configuration map.
*   It is automatically generated by the `ProjectManager.js` when running in a file-system aware context.
*   It allows the app to know where files are located even if the directory scan hasn't run yet (useful for hosted demos).

---

## 🤝 Contributing

1.  **CSS**: When adding styles, do not edit `base.css`. Create or update a specific file in `css/components/` (for buttons, cards) or `css/layouts/` (for page structures).
2.  **Logic**: Core logic resides in `js/modules/`. Always ensure `DataManager.js` changes propagate to the UI modules via the `PanelStateManager`.

---

## 👤 Author

**Tomás González Bartomeu**  
*Known as **PoltorProgrammer***

[![Email](https://img.shields.io/badge/Email-poltorprogrammer%40gmail.com-red?logo=gmail&labelColor=lightgrey)](mailto:poltorprogrammer@gmail.com)

---

## 🏥 MediXtract Ecosystem

This project is a core component of the [MediXtract Ecosystem](https://medixtract.github.io/MediXtract/), dedicated to advancing medical data processing and validation.

[![Website](https://img.shields.io/badge/Visit-MediXtract_Website-blue?style=for-the-badge&logo=googlechrome&logoColor=white)](https://medixtract.github.io/MediXtract/)

[![Email](https://img.shields.io/badge/Email-medixtract.developers%40gmail.com-blue?logo=gmail&labelColor=lightgrey)](mailto:medixtract.developers@gmail.com)

---
*Developed for precision, built for speed.*
