# MediXtract Schema Editor

[![Open App](https://img.shields.io/badge/Open-Live%20Demo-blue?style=for-the-badge&logo=googlechrome)](https://poltorprogrammer.github.io/Schema_Editor_02/index.html)

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
1.  Double-click **`Generate Shortcut.bat`**.
2.  The script will automatically check for Node.js. If missing, it will offer to install it for you (via Windows Package Manager).
3.  Launch the **"Schema Editor"** icon from your Desktop.

### 🔄 Keeping the Program Updated
To get the latest features and bug fixes:
*   **Windows**: Double-click **`Update Program.bat`** in the root folder.
*   **Safety**: The script will safely update your installation while preserving all your work in the `projects/` folder.

### 🍎 Mac / 🐧 Linux
1.  Run the following in your terminal:
    ```bash
    chmod +x "Generate Shortcut.sh" tools/*.sh
    ./"Generate Shortcut.sh"
    ```
2.  The script will verify if Node.js is installed and guide you if it's missing.
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

> **Security Note:** Both the `projects/` folder and the `js/projects-config.js` metadata are excluded from Git. This ensuring your project names and data remain private. The configuration is automatically re-generated every time you run the app locally.

---

## 🛠️ Tech Stack & Deployment

*   **Architecture**: Node.js Discovery Engine + Vanilla JavaScript (ES6+).
*   **Styling**: Custom CSS3 Variable-based Design System (Dark Mode optimized).
*   **Local Server**: Powered by `serve` for high-concurrency static delivery.

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