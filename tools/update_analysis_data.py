import json
import os
import glob
from datetime import datetime
from collections import Counter
import pandas as pd

# Excel date conversion helper (still useful for Human ground truth from Excel)
def excel_date_to_str(serial):
    if pd.isna(serial) or not isinstance(serial, (int, float)):
        return str(serial) if not pd.isna(serial) else ""
    try:
        if serial < 1000:
            return str(int(serial)) if serial == int(serial) else str(serial)
        dt = pd.to_datetime(serial, unit='D', origin='1899-12-30')
        return dt.strftime('%Y-%m-%d')
    except:
        return str(serial)

DATE_COLUMNS = [
    'p_date_of_birth', 'p_date_of_admission', 'm_pda_surg_date', 
    'm_nec_onset_date', 'perf_date', 'm_feeding_full_date', 
    'm_surgery_sip_date1', 'm_nec_surgery1_date', 'm_nec_surgery2_date', 
    'm_nec_surgery3_date', 'm_nec_surgery4_date', 'm_nec_surgery5_date', 
    'histo1_date', 'm_dx_date2', 'm_day_of_death', 'm_date_of_discharge'
]

def get_human_value(row, key):
    if key not in row:
        return None
    val = row[key]
    if pd.isna(val):
        return ""
    if key in DATE_COLUMNS:
        return excel_date_to_str(val)
    if isinstance(val, (int, float)):
        return str(int(val)) if val == int(val) else str(val)
    return str(val)

def update_analysis_data():
    project_dir = "c:/MediXtract/SchemaEditor02/projects/munchen-project"
    analysis_path = os.path.join(project_dir, "analysis_data/munchen-analysis_data.json")
    med_dir = os.path.join(project_dir, "medixtract_output")
    excel_path = "c:/MediXtract/SchemaEditor02/docs/Data_to_convert.xlsx"
    
    # Load Master Analysis Data
    with open(analysis_path, 'r', encoding='utf-8') as f:
        analysis_data = json.load(f)
    
    # Load Human Ground Truth from Excel
    df = pd.read_excel(excel_path)
    
    # 1. Map all MediXtract output files to patients
    # patient_[letter]-[id]-munchen-medixtract_output.json
    med_files = glob.glob(os.path.join(med_dir, "patient_*-*-munchen-medixtract_output.json"))
    patient_med_data = {} # patient_id -> list of file_contents
    
    for fpath in med_files:
        filename = os.path.basename(fpath)
        # Extract patient ID (e.g., patient_A)
        # Format: patient_A-[0001]-munchen-medixtract_output.json
        parts = filename.split('-')
        p_id = parts[0] # patient_A
        
        with open(fpath, 'r', encoding='utf-8') as f:
            data = json.load(f)
            if p_id not in patient_med_data:
                patient_med_data[p_id] = []
            patient_med_data[p_id].append(data)

    now_iso = datetime.utcnow().isoformat() + "Z"
    properties = analysis_data.get('properties', {})
    
    for key, prop_data in properties.items():
        new_performance = {}
        
        # We iterate over all patients that have at least one MediXtract output file
        for p_id, list_of_extractions in patient_med_data.items():
            # Get values for this key across all extractions
            med_values = []
            for extraction in list_of_extractions:
                if key in extraction:
                    v_list = extraction[key]
                    if v_list and len(v_list) > 0:
                        med_values.append(v_list[0])
            
            if not med_values:
                continue

            # Aggregate counts
            counts = Counter(med_values)
            output_list = [{"value": v, "count": c} for v, c in counts.items()]
            
            # Find Human ground truth for this patient
            # Patient ID in Excel is just the letter (A, D, etc.)
            p_letter = p_id.replace("patient_", "")
            human_row = df[(df['Patient'] == p_letter) & (df['Output'] == 'Human')]
            human_val = get_human_value(human_row.iloc[0].to_dict(), key) if not human_row.empty else None
            
            perf_entry = {
                "pending": True,
                "severity": 1,
                "comment": "",
                "last_updated": now_iso,
                "output": output_list
            }
            
            if human_val is not None:
                # Matched only if ALL outputs match human_val
                all_match = all(v == human_val for v in med_values)
                if all_match:
                    perf_entry["matched"] = True
                    perf_entry["pending"] = False
                else:
                    perf_entry["unmatched"] = {
                        "missing_docs": False,
                        "contradictions": False,
                        "ambiguous": False,
                        "structural": False,
                        "filled_blank": False,
                        "correction": False,
                        "standardized": False,
                        "improved_comment": False
                    }
                    perf_entry["pending"] = True
            else:
                perf_entry["pending"] = True
            
            new_performance[p_id] = perf_entry
            
        prop_data['performance'] = new_performance

    with open(analysis_path, 'w', encoding='utf-8') as f:
        json.dump(analysis_data, f, indent=2)
    print(f"Successfully updated aggregation from {len(med_files)} MediXtract files across {len(patient_med_data)} patients.")

if __name__ == "__main__":
    update_analysis_data()
