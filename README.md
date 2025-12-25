# MediXtract Schema Editor

<p align="center">
  <a href="https://poltorprogrammer.github.io/Schema_Editor_02/index.html">
    <img src="https://img.shields.io/badge/Open-Live%20Demo-blue?style=for-the-badge&logo=googlechrome" alt="Open App">
  </a>
</p>

**A premium, high-performance interface for validating and managing MediXtract data schemas.**

The **MediXtract Schema Editor** is designed to transform complex JSON validation workflows into a seamless, visual experience. It offers a sophisticated environment where data engineers can discover, audit, and refine medical schemas with zero friction.

---

## ✨ The User Experience (UX)

This tool is built with a "User-First" philosophy, focusing on clarity, speed, and aesthetic excellence:

*   **Zero-Config Dashboard**: Upon launch, the engine automatically scans your local folders. You don't need to import files manually; your projects are simply *there*, ready for inspection.
*   **Intuitive Hierarchy**: Navigating through projects, analysis data, and validation ground truths feels natural, thanks to a breadcrumb-style interface and clear visual separation.
*   **Real-time Validation Feedback**: As you move through the schema, the UI provides immediate visual cues. Identify discrepancies between analysis and validation data at a glance through color-coded status indicators.
*   **Premium Aesthetics**: Using a modern "Glassmorphism" design language, the interface remains clean and professional even when handling dense data sets. Transition animations and micro-interactions ensure the app feels alive and responsive.
*   **Desktop-Native Feel**: With the included auto-generators, the web app feels like a local powerhouse. One click from your desktop, and you are straight into your workflow.

---

## 🚀 Quick Start

### 🪟 Windows
1.  Ensure [Node.js](https://nodejs.org/) is installed.
2.  Double-click **`Generate Shortcut.bat`**.
3.  Launch the **"Schema Editor"** icon from your Desktop.

### 🍎 Mac / 🐧 Linux
1.  Ensure [Node.js](https://nodejs.org/) is installed.
2.  Run the following in your terminal:
    ```bash
    chmod +x "Generate Shortcut.sh" tools/*.sh
    ./"Generate Shortcut.sh"
    ```
3.  Launch the **"Schema Editor"** app from your Desktop.

---

## 📁 Data Structure & Auto-Discovery

The editor looks for a specific architecture inside the `projects/` directory. Consistency here ensures a perfect sync with the UI:

```text
projects/
└── [project_name]_project/        <-- Folder MUST end in _project
    ├── analysis_data/
    │   └── data_set_01.json       <-- The data you are auditing
    └── validation_data/
        └── ground_truth_01.json   <-- The reference for comparison
```

> **Note:** The `projects/` folder is listed in `.gitignore` to protect your sensitive local data from being uploaded to public clouds.

---

## 🛠️ Tech Stack & Deployment

*   **Architecture**: Node.js Discovery Engine + Vanilla JavaScript (ES6+).
*   **Styling**: Custom CSS3 Variable-based Design System (Dark Mode optimized).
*   **Local Server**: Powered by `serve` for high-concurrency static delivery.

---

## � Author

**Tomás González Bartomeu**  
*Known as **PoltorProgrammer***

[![Email](https://img.shields.io/badge/Email-poltorprogrammer%40gmail.com-red?logo=gmail&labelColor=lightgrey)](mailto:poltorprogrammer@gmail.com)

---
*Developed for the MediXtract Ecosystem. Designed for precision, built for speed.*
