# MediXtract JSON Schema Summary

The **MediXtract JSON Schema Summary** outlines a standardized structure for defining clinical variables and tracking the per-patient performance of the automated extraction system (**MediXtract**) against human-validated data.

---

## Variable Definition Fields

Each clinical variable is defined by a set of required and optional fields:

| Field             | Requirement | Purpose                                                                                                                          | Key Content / Format                                                            |
| :---------------- | :---------- | :------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------ |
| **`type`**        | Required    | Defines the data type and format.                                                                                                | String, e.g., `"number"`, `"string"`                                            |
| **`default`**     | Required    | The value to use when data is absent.                                                                                            | Typically `null`                                                                |
| **`description`** | Required    | A human-readable definition, extraction rules, and context/units.                                                                | String, e.g., `"Gestational age at birth in completed weeks..."`                |
| **`group_id`**    | Required    | Logical category for grouping variables.                                                                                         | String, e.g., `"group_1"` or `"group_3"`                                        |
| **`options`**     | Required    | Maps enumerated codes to human-readable labels.                                                                                  | Object, e.g., `{"0": "No", "1": "Yes"}`                                         |
| **`subgroup_01`** | Optional    | Logical categoty for grouping variables (group that's indide group_id)                                                                                         | String, e.g., `"subgroup_01_1"` or `"subgroup_01_2"`                            |
| **`subgroup_02`** | Optional    | Logical categoty for grouping variables (group that's indide goup_01 that's inside group_id)                                                                                         | String, e.g., `"subgroup_02_1"` or `"subgroup_02_2"`                            |
| **`subgroup_03`** | Optional    | Logical categoty for grouping variables (group that's indide goup_02 that's inside group_id)                                                                                         | String, e.g., `"subgroup_03_1"` or `"subgroup_03_2"`                            |
| **`labels`**      | Optional    | To point a caracteristic the nature of the variable.                                                                             | List of objects, e.g., `["date", "sepsis"]` or `["personal"]`                   |
| **`notes`**       | Optional    | Additional notes or comments.                                                                                                    | String, e.g., `"Additional notes or comments."`                                 |
| **`was_solved`**  | Optional    | Marks conditions resolved before per-patient review. Must include ≥1 subcategory flag, a `comment`, and `changed_at` (ISO 8601). | Object, e.g., `{"was_questioned": true, "comment": "...", "changed_at": "..."}` |
| **`performance`** | Optional    | Per-patient performance data detailing MediXtract's success against human validation.                                            | Object containing patient-specific status entries                               |

---

## Performance (Per-Patient)

Performance entries track how MediXtract fared for a **patient–variable pair**, using a **mutually exclusive** set of statuses.

### Core Statuses

| Field           | Type       | Meaning / Usage                                                                    |
| :-------------- | :-------   | :--------------------------------------------------------------------------------- |
| **`matched`**   | Boolean    | MediXtract’s extraction agrees with human-validated data.                          |
| **`unmatched`** | Object     | MediXtract differs from human extraction. Must contain one or more *reason flags*. |
| **`pending`**   | Boolean    | Review is still pending for the patient–variable pair.                             |
| **`dismissed`** | Boolean    | For variables that won't be evaluated.                                             |
| **`output`**    | Array      | List of analysis results found for this specific patient. Format: `[{"value": "...", "count": 1}]`. |

---

### Reasons for `unmatched`

The `unmatched` object must contain flags indicating the cause of the discrepancy.

#### 🔹 Improvements (MediXtract Outperformed Human)

* **`filled_blank`**: MediXtract found a value the human missed.
* **`correction`**: MediXtract corrected a human error.
* **`standardized`**: MediXtract applied consistent formatting or calculation.
* **`improved_comment`**: MediXtract produced a better descriptive comment.

#### 🔹 Issues (Documentation or Ambiguity)

* **`missing_docs`**: Missing documentation likely caused the discrepancy.
* **`contradictions`**: Conflicting information exists in the source records.
* **`ambiguous`**: Ambiguous definition or scope requires expert clarification.
* **`structural`**: Structural issues found in that variable (eg. redundant)

---

### Context Fields

These fields provide essential context for all performance entries:

* **`severity`** — Numerical impact rating (1–10)
* **`comment`** — Human-readable explanation or rationale
* **`last_updated`** — Required ISO 8601 UTC timestamp of the latest modification

There the context fields are aplied for the general variable overview as `general_*` (`general_severyty`,`general_comment` or `general_last_updated`) and also to each Patient ()

---

## Was Solved (Variable-Level)

The `was_solved` object indicates that a variable-level condition was resolved prior to per-patient evaluation.
Its presence implies **`was_solved = true`** for the variable.

| Subcategory Flag        | Meaning / Usage                                        |
| :---------------------- | :----------------------------------------------------- |
| **`was_missing_docs`**  | Previously missing documentation was addressed.        |
| **`was_questioned`**    | Prior definition or criteria ambiguity was clarified.  |
| **`was_personal_data`** | Recognized as personal data and handled appropriately. |

**Required fields when present:**

1. At least one subcategory flag must be set to `true`.
2. **`comment`** (string) — Describes what was solved and how.
3. **`changed_at`** (string, ISO 8601) — UTC timestamp of when the variable entered this solved state.