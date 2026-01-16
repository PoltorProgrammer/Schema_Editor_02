import json
import os
from datetime import datetime

output_dir = r"c:\MediXtract\SchemaEditor02\docs"
analysis_data_file = os.path.join(output_dir, "tobias_bern-analysis_data.json")

def merge_outputs():
    if not os.path.exists(analysis_data_file):
        print(f"Error: {analysis_data_file} not found.")
        return

    # 1. Load the analysis data
    with open(analysis_data_file, 'r', encoding='utf-8') as f:
        analysis_data = json.load(f)

    # 2. Process all MediXtract output files
    all_files = os.listdir(output_dir)
    medi_files = [f for f in all_files if "tobias_bern-medixtract_output.json" in f.lower()]
    
    print(f"Found {len(medi_files)} MediXtract output files.")

    timestamp = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.000Z")

    for filename in medi_files:
        file_path = os.path.join(output_dir, filename)
        
        # Determine patient tag, e.g., "patient_05"
        patient_tag = filename.split('-')[0].lower()
        print(f"Processing {patient_tag} from {filename}...")

        # Load MediXtract data
        with open(file_path, 'r', encoding='utf-8') as f:
            medi_data = json.load(f)

        # Ensure "Patient" field is present and lowercase
        updated_medi = False
        if "Patient" not in medi_data or medi_data["Patient"] != patient_tag:
            medi_data["Patient"] = patient_tag
            updated_medi = True

        # Rename file to lowercase if needed (Safe approach for Windows)
        expected_filename = filename.lower()
        if filename != expected_filename:
            new_path = os.path.join(output_dir, expected_filename)
            print(f"  Renaming {filename} -> {expected_filename}")
            # On Windows, we need a middle man to change casing
            temp_path = file_path + ".tmp_rename"
            try:
                os.rename(file_path, temp_path)
                # If new_path already existed (unlikely if we just checked filename != expected), 
                # we handle it by removing it first (safely now that we have temp)
                if os.path.exists(new_path) and new_path.lower() == expected_filename:
                    # In Windows, os.path.exists(new_path) is true if a file with same name diff case exists.
                    # But if filename != expected_filename, it means the ON-DISK casing is different.
                    pass 
                
                if os.path.exists(new_path):
                    os.remove(new_path)
                os.rename(temp_path, new_path)
                file_path = new_path
                updated_medi = True # Force write to new path
            except Exception as e:
                print(f"  Error renaming: {e}")
                if os.path.exists(temp_path):
                    os.rename(temp_path, file_path) # Rollback

        if updated_medi:
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(medi_data, f, indent=2, ensure_ascii=False)
            print(f"  Serialized updated data to {os.path.basename(file_path)}")

        # Try to load corresponding validation data for matching
        validation_file = os.path.join(output_dir, f"{patient_tag}-tobias_bern-validation_data.json")
        valid_data = {}
        if os.path.exists(validation_file):
            with open(validation_file, 'r', encoding='utf-8') as f:
                valid_data = json.load(f)
        else:
            print(f"  Warning: Validation file {validation_file} not found for matching.")

        # 3. Update properties in analysis_data
        for prop_key, prop_val in analysis_data.get("properties", {}).items():
            if patient_tag in prop_val.get("performance", {}):
                m_value = medi_data.get(prop_key, "")
                v_value = valid_data.get(prop_key, "")

                m_str = str(m_value).strip() if m_value is not None else ""
                v_str = str(v_value).strip() if v_value is not None else ""
                is_matched = (m_str == v_str)

                perf = prop_val["performance"][patient_tag]
                perf["pending"] = False
                perf["last_updated"] = timestamp
                perf["output"] = [{"value": m_str, "count": 1}] if m_str else []
                perf["matched"] = is_matched

    # 4. Save updated analysis data
    with open(analysis_data_file, 'w', encoding='utf-8') as f:
        json.dump(analysis_data, f, indent=2, ensure_ascii=False)

    print(f"Successfully updated: {analysis_data_file}")

if __name__ == "__main__":
    merge_outputs()
