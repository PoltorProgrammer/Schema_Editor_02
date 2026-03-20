# Comprehensive Statistical Analysis Plan for MediXtract Validation

This document details the rigorous statistical methodologies proposed for validating the AI data extraction within the MediXtract platform. Given the specific categorizations outputted by the `ResultsLogic.js` module (`matched`, `improved`, `unmatched`, `uncertain`, `dismissed`), this plan translates those custom UI states into formal mathematical comparisons.

---

## 1. Defining the Core Data Structure for Analysis

To apply standard statistical tests, our highly granular platform statuses must be mapped into standardized binary or ordinal statistical categories. 

### The Primary Binary Mapping (Success vs. Failure)
For most reliability and comparative tests, we compress the granular statuses:
*   **Success (Agreement):** `matched` + `improved`
    *   *Rationale:* Both indicate the AI successfully identified the correct information, either matching the human GT exactly or surpassing it (fixing typos, filling blanks).
*   **Failure (Disagreement/Error):** `unmatched`
    *   *Rationale:* The AI extracted incorrect data, hallucinated, or failed to extract existing data.
*   **Exclusions (Neutral/Manual):** `pending`, `uncertain`, `dismissed`
    *   *Rationale:* These involve manual human intervention overrides or variables explicitly thrown out, which should generally be excluded from raw AI capability testing to prevent skewing.

---

## 2. Fundamental KPIs & Descriptive Metrics

Before running complex tests, we establish baseline descriptive statistics.

### A. Overall Extraction Accuracy
*   **What is it:** The raw percentage of times the AI was fundamentally correct.
*   **How to calculate:** `(Matched + Improved) / (Total - Pending - Dismissed - Uncertain)`
*   **Why use it:** This is the headline metric for broad communication. It provides a simple, easily digestible summary of the system's reliability.

### B. AI Value-Add Rate (Correction Rate)
*   **What is it:** The frequency with which the AI *outperforms* the human Ground Truth (GT).
*   **How to calculate:** `Improved / (Total - Pending - Dismissed - Uncertain)`
    *   *Sub-analysis:* Breakdown by `improved_sub.filled_blank`, `correction`, `standardized`.
*   **Why use it:** A unique selling point of MediXtract. It proves the tool is not just an OCR extractor, but an active data-cleansing agent.

### C. Critical Hallucination / Error Rate
*   **What is it:** The subset of failures that are actively dangerous (hallucinations or contradictions), isolating them from benign failures like "missing docs".
*   **How to calculate:** `(unmatched_sub.contradictions + unmatched_sub.ambiguous) / Total Evaluated Variables`
*   **Why use it:** Essential for risk mitigation in medical contexts. A system might have 90% accuracy but a 5% critical hallucination rate, which is often unacceptable compared to a 10% "missing data" rate.

---

## 3. Core Statistical Tests: The Validation Suite

### A. Cohen's Kappa ($\kappa$) - Inter-Rater Reliability
*   **What we are comparing:** The degree of agreement between rater 1 (The AI Engine) and rater 2 (The Human Ground Truth Validator).
*   **How it works:** We use the *Primary Binary Mapping* (Success=Agree, Failure=Disagree). Cohen's Kappa calculates the observed agreement and subtracts the probability of the AI and Human agreeing purely by random statistical chance.
*   **Why it is optimal:** It is the scientific "gold standard" for validating medical grading and extraction systems. An overall accuracy of 90% might sound good, but if the dataset is overwhelmingly negative (e.g., 90% of variables are "absent"), the AI could achieve 90% just by guessing "absent" every time. Kappa mathematically proves the AI actually understands the task.
*   **Target:** A Kappa score $> 0.80$ is generally required for "almost perfect agreement" in formal medical literature.

### B. McNemar's Test - A/B Testing Prompts & Models (Paired Data)
*   **What we are comparing:** The performance of Prompt V1 vs. Prompt V2 (or Gemini 1.5 vs Gemini 2.0) on the *exact same* set of patients and variables.
*   **How it works:** It uses a 2x2 contingency table focusing specifically on the variables where the two versions *disagreed*. 
    *   Cell B: V1 Failed, V2 Succeeded (Improvement).
    *   Cell C: V1 Succeeded, V2 Failed (Regression).
*   **Why it is optimal:** Since we are testing the *same* variables, the data is "paired" and highly correlated. Standard tests like Chi-Square will incorrectly assume the datasets are independent. McNemar's specifically isolates whether a prompt update caused a *statistically significant* improvement, or if a +2% accuracy bump was just random noise.

### C. Chi-Square Test of Independence ($\chi^2$) - Identifying Systemic Biases
*   **What we are comparing:** Categorical metadata (e.g., Variable Group: "Vitals" vs "History" vs "Labs") against the AI's binary Outcome Status (Success vs Failure).
*   **How it works:** It calculates the "expected" number of errors for each category if errors were distributed perfectly evenly. It then compares this to the *actual* observed errors. 
*   **Why it is optimal:** It mathematically proves whether the AI struggles disproportionately with certain data types. For example, if we see 40 errors in "History" and 10 in "Labs", Chi-Square will tell us if "History" is fundamentally harder for the AI to parse, or if there were simply more "History" variables in the dataset to begin with. 
*   *Application:* This tells engineering exactly where to focus prompt engineering efforts.

### D. Mann-Whitney U Test - Comparing Independent Group Scores
*   **What we are comparing:** The aggregated accuracy scores (continuous percentage values) between two completely independent distinct groups. 
    *   *Example 1:* Accuracy of Hospital A documents vs Hospital B documents.
    *   *Example 2:* Accuracy on Short Documents (< 5 pages) vs Long Documents (> 50 pages).
*   **How it works:** It ranks all accuracy scores from lowest to highest across both groups and compares the mean ranks, rather than comparing the raw percentage means.
*   **Why it is optimal:** Accuracy percentages are almost never perfectly "normally distributed" (a bell curve); they usually cluster heavily near 95-100% with a long tail of failures. Using a standard T-Test on non-normal distributions yields mathematically invalid p-values. Mann-Whitney U is the non-parametric alternative built specifically for skewed data.

---

## 4. Advanced "Sub-Status" Analysis

To extract maximum value from the specific `unmatched_sub` granularities, we conduct categorical proportion tests.

### Analyzing the Typology of Failure
When the AI fails (`unmatched`), we want to know *why* it fails. We can use a **Goodness-of-Fit test** across the specific error subtypes (`missing_docs`, `contradictions`, `ambiguous`, `structural`).
*   **What are we checking:** Is the distribution of error types random, or is the AI systematically biased toward a specific type of hallucination?
*   **Example Outcome:** "Statistical consensus shows that when the AI fails, it is significantly more likely ($p < .01$) to fail due to 'Missing Docs' rather than inventing 'Contradictions'." This is a highly favorable characteristic for a medical AI, demonstrating a "fail-safe" tendency to admit ignorance rather than hallucinate.

---

## 5. Execution Summary: The Optimal Pathway

When preparing a whitepaper, dataset validation report, or deciding to deploy a new model within MediXtract, the optimal statistical pipeline is:

1.  **Run Descriptive KPIs:** Extract top-line Accuracy and Value-Add rates to establish the baseline commercial narrative.
2.  **Calculate Cohen's Kappa:** Generate the foundational scientific validity metric to prove robust AI-Human agreement beyond chance.
3.  **Perform Chi-Square Categorical Checks:** Run tests across variable Groups and Types to isolate exactly which clinical areas require further R&D or UI warnings.
4.  **Continuous Tracking (McNemar's):** For every major system or prompt architectural update, run McNemar's test on a standardized Golden Dataset to ensure updates represent mathematically significant progress and to prevent regressions.
