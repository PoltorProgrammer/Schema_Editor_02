# Automatic Status Logic Documentation

This document explains the logic used by the Schema Editor to automatically determine variable statuses such as **Matched**, **Pending**, or **Unmatched** (Standardized/Improved).

## 1. Value Normalization
Before any comparison occurs, both AI and Human values are normalized using `AppUtils.normalizeValue`:
- `null` or `undefined` values are converted to the string `"null"`.
- Empty strings or strings with only whitespace are converted to the string `"empty"`.
- All other values are converted to strings and trimmed.

## 2. AI Output Processing
For each patient and variable, the system:
1. Collects all AI outputs (if multiple outputs exist for the same patient).
2. Counts the frequency of each normalized value.
3. Identifies the **Most Common Value (MCV)**.
4. Calculates the **Frequency Percentage** of the MCV relative to the total number of AI outputs.

## 3. Automatic Status Determination (Per Patient)

The system automatically sets the status if certain thresholds are met:

### **A. Automatic Match**
- **Condition**: 
  - Normalized MCV exactly matches the normalized Human Value.
  - **AND** the MCV frequency is **≥ 90%**.
- **Action**: 
  - Status is set to `matched`.
  - The record is automatically marked as `reviewed`.
  - Any previous automatic unmatched reasons are cleared.

### **B. Automatic Standardization (Unmatched)**
- **Condition**: 
  - Normalized MCV is `"null"`.
  - Normalized Human Value is `"empty"`.
  - **AND** the AI frequency is **≥ 90%**.
- **Action**: 
  - Status is set to `unmatched` with the reason `standardized`.
  - The record is **NOT** marked as `reviewed` (requires human validation).

### **C. Automatic Reset to Pending**
- **Condition**: 
  - AI Output exists but results in a discrepancy (doesn't meet the Match or Standardized criteria).
  - **AND** no manual unmatched reasons or dismissals have been set.
- **Action**: 
  - Status is reset to `pending`.
  - `reviewed` is set to `false`.

---

## 4. Overall Variable Status (Multi-Patient)
If a project has multiple patients, the variable's "Overall Status" (shown in the main table) is determined by a priority-based logic across all patients:

| Priority | Status | Condition |
| :--- | :--- | :--- |
| **1 (Highest)** | `pending` | If any patient is in `pending` status. |
| **2** | `uncertain` | If any patient is marked as `uncertain`. |
| **3** | `unmatched` | If any patient has an "Issue" reason (e.g., structural, wrong extraction). |
| **4** | `improved` | If any patient has an "Improvement" reason (e.g., filled blank, standardized). |
| **5** | `matched` | If all patients are `matched` (or a mix of matched and dismissed). |
| **6 (Lowest)** | `dismissed` | If ALL patients are marked as `dismissed`. |

**Note**: "Improved" reasons include: `filled_blank`, `correction`, `standardized`, and `improved_comment`.

---

## 5. Manual Overrides
Manual changes made via the UI (e.g., checking "Matched" or selecting an unmatched reason) always take precedence over automatic logic until the next full data processing cycle, though the system tries to respect manual `unmatched` reasons during re-processing.
