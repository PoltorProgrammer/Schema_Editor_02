import json
import os
from datetime import datetime

input_file = r"c:\MediXtract\SchemaEditor02\docs\tobias_output.txt"
template_file = r"c:\MediXtract\SchemaEditor02\docs\munchen-analysis_data.json"
output_file = r"c:\MediXtract\SchemaEditor02\docs\tobias_bern-analysis_data.json"

def initialize_analysis_data():
    if not os.path.exists(input_file):
        print(f"Error: {input_file} not found.")
        return
    if not os.path.exists(template_file):
        print(f"Error: {template_file} not found.")
        return

    # 1. Get patient list from tobias_output.txt
    patients = []
    with open(input_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        if len(lines) > 1:
            # Handle the "Patient record_id" split logic same as validation script
            raw_header = lines[0].strip().split('\t')
            for line in lines[1:]:
                if not line.strip(): continue
                raw_values = line.strip('\n').split('\t')
                # Patient ID is the first part of the first column or separate
                p_val = raw_values[0].strip()
                if "Patient_" in p_val:
                    # If it's "Patient_01 1000", split it
                    p_id = p_val.split()[0].lower()
                    patients.append(p_id)
                else:
                    patients.append(p_val.lower())

    print(f"Found patients: {patients}")

    # 2. Load template (munchen-analysis_data.json)
    with open(template_file, 'r', encoding='utf-8') as f:
        template_data = json.load(f)

    # 3. Create new structure
    # We keep the 'properties' structure but clear 'performance'
    new_data = {"properties": {}}
    
    timestamp = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.000Z")

    for key, value in template_data.get("properties", {}).items():
        # Clone the property definition
        new_prop = {
            "type": value.get("type"),
            "default": value.get("default"),
            "description": value.get("description", ""),
            "group_id": value.get("group_id"),
            "medixtract_notes": "",
            "reviewer_notes": []
        }
        
        # Add 'options' if they exist (for enums/booleans)
        if "options" in value:
            new_prop["options"] = value["options"]
        if "label" in value:
            new_prop["label"] = value["label"]

        # 4. Initialize performance for each patient
        new_performance = {}
        for p in patients:
            new_performance[p] = {
                "pending": True,
                "severity": 0,
                "last_updated": timestamp,
                "output": [],
                "reviewed": False,
                "matched": False,
                "medixtract_comment": "",
                "reviewer_comment": []
            }
        
        new_prop["performance"] = new_performance
        new_data["properties"][key] = new_prop

    # 5. Save the new analysis data file
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(new_data, f, indent=2, ensure_ascii=False)

    print(f"Successfully initialized: {output_file}")

if __name__ == "__main__":
    initialize_analysis_data()
