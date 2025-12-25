# MediXtract Schema Editor: User Experience & Workflow Guide

This document provides a detailed overview of the user experience (UX) and operational workflow for the MediXtract Schema Editor. It covers project lifecycle management, variable analysis, and the per-patient performance tracking system.

---

## 1. Project Management & Dashboard

The application utilizes a project-centric approach to organize clinical data analysis. Upon launch, the system enters the **Project Selection Dashboard**.

### 1.1 Loading Existing Projects
- **Automatic Scanning**: The editor scans the `\projects` directory for subdirectories.
- **Naming Convention**: Projects are identified by their folder names. To maintain a clean UI, the suffix `_project` is automatically stripped from the displayed title (e.g., a folder named `munchen_project` appears as **Munchen**).
- **Navigation Shortcut**:
    - If only **one project** exists in the directory, the system bypasses the dashboard and opens that project automatically.
    - Profiles/Projects can be manually accessed via the Dashboard icon in the header.

### 1.2 Creating a New Project
- **Initialization**: When creating a new project, the application prompts for elevated permissions to manage the file system.
- **Directory Selection**: Users are directed to the `\projects` folder by default. 
- **Setup Requirements**: Before a project is finalized and saved, the user must provide:
    1. A valid **Analyzer Schema** (JSON format defining metadata and extraction rules).
    2. Valid **Validation Data** (JSON format containing ground-truth values for comparative analysis).
- **Storage**: Once configured, the project is saved in a new folder adhering to the `[project_name]_project` naming standard.

---

## 2. Variable Overview & Navigation

The primary workspace provides a high-level overview of all clinical variables defined within the project.

### 2.1 Display Customization
The variable table is highly configurable. Users can adjust column visibility, order, and width to suit their specific research needs.

### 2.2 Advanced Filtering (Inclusive & Exclusive)
The system supports complex filtering logic to isolate specific sets of data:
- **Combinatorial Logic**: Filters for **Groups**, **Labels**, and **Status Indicators** (Comments, Errors, Changes, Improvements) can be combined.
- **Inclusive Filters**: Selecting multiple values within a category (e.g., Group A OR Group B).
- **Exclusive Filters**: Refining search results to only show variables that meet multiple criteria across categories (e.g., Group A AND has Errors).

---

## 3. Variable Editing & Detailed Analysis

Clicking on any variable row triggers a **Variable Details Panel** on the right side of the screen.

### 3.1 Metadata & Properties
The panel allows for direct editing of the core variable definition:
- **Basic Info**: Edit `ID`, `Group ID`, `Type`, `Description`, and `Default Value`.
- **Labels (Chip System)**: Labels are managed through an interactive chip interface. Users can type to create new labels and click an 'X' button on any chip to remove it.
- **Notes**: A dedicated markdown-supported field for detailed researcher comments.

### 3.2 Schema Structure Preview
For advanced users, a raw JSON preview of the variable's schema structure is available, allowing for direct modification of complex objects like `options` (enumerations) or `anyOf` constraints.

---

## 4. Per-Patient Performance Tracking (Validation)

A critical component of the editor is the ability to compare MediXtract’s automated outputs against human-validated ground truth.

### 4.1 Patient-Specific Collapsibles
The details panel contains a list of all patients associated with the variable. Each patient is represented by a collapsible dropdown section containing:
- **Comparison Data**: Side-by-side view of the **MediXtract Output** vs. the **Human Validation Value**.
- **Contextual Fields**: Edit patient-specific `severity` ratings (1–10) and detailed `comment` explanations.

### 4.2 Status & Reason Tracking
Users must assign a mutually exclusive status to each patient entry:
- **`Matched`**: Confirms AI/Human agreement.
- **`Pending`**: Indicates the entry is awaiting review.
- **`Dismissed`**: Marks the variable as non-evaluable for that specific patient.
- **`Unmatched`**: When AI and Human data differ. Upon selecting "Unmatched," a sub-menu of **Reason Flags** appears:

| Category | Reason Flags |
| :--- | :--- |
| **Improvements** | `filled_blank`, `correction`, `standardized`, `improved_comment` |
| **Issues** | `missing_docs`, `contradictions`, `ambiguous`, `structural` |

### 4.3 Variable Resolution (`was_solved`)
If a systematic issue with the variable itself is identified and resolved (e.g., a definition change that fixes multiple patient errors), it can be marked as `was_solved`. This requires:
- Selecting a resolution flag (`was_missing_docs`, `was_questioned`, `was_personal_data`).
- A mandatory resolution `comment`.
- Automatic recording of the `changed_at` timestamp.