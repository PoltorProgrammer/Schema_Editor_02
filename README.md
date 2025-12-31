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
- [🏥 MediXtract Ecosystem](#-medixtract-ecosystem)

---

## ✨ Key Features

*   **Google Drive Integration**: Seamlessly synchronize with your team using **Google Drive for Desktop**.
*   **Local-First & Secure**: Uses the browser's **File System Access API** to read and write directly to your local mirrors (G: drive). Your data never leaves your environment.
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

---

## 📁 Project Structure

For the editor to function, your folders should follow this directory structure. When using Google Drive, select the parent `projects/` folder in the app dashboard.

```text
projects/
└── [project_name]-project/                 
    ├── analysis_data/
    │   └── [name]-analysis_data.json       <-- The Schema Definition
    ├── validation_data/
    │   ├── patient_A-validation_data.json  <-- Human Verified Data
    │   └── patient_B-validation_data.json
    └── medixtract_output/
        ├── patient_A-output.json           <-- AI Extracted Data
        └── patient_B-output.json
```

---

### Status Definitions

| Status | Icon Color | Definition |
| :--- | :--- | :--- |
| **Pending** | 🟣 Purple | Comparison not yet analyzed. Default state. |
| **Matched** | ⚪ White | AI Output matches Human Validation (>90% confidence). |
| **Improved** | 🟢 Blue | AI found valid data that was missing or incorrect in Human Validation. |
| **Issued** | 🔴 Red | AI Output is incorrect or contradictory. |
| **Dismissed** | ⚪ Grey | Field is not relevant for the current analysis context. |

---

## 🛠️ Technical Architecture

The application is built as a **Single Page Application (SPA)** using modern ES6+ JavaScript.

*   **View Layer**: High-performance Direct DOM manipulation for large datasets.
*   **State Management**: `DataManager.js` acts as the central store.
*   **Persistence**: Uses `IndexedDB` to store file handles, allowing the app to "remember" your Google Drive folder between reloads.
*   **Sync**: Relies on the **Drive for Desktop** client for background synchronization.

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
