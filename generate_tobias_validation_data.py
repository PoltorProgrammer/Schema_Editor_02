import json
import os

input_file = r"c:\MediXtract\SchemaEditor02\docs\tobias_output.txt"
output_dir = r"c:\MediXtract\SchemaEditor02\docs"

def generate_json_files():
    print("Starting process...")
    if not os.path.exists(input_file):
        print(f"Error: {input_file} not found.")
        return

    print(f"Reading file: {input_file}")
    with open(input_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    print(f"Found {len(lines)} lines.")

    if not lines:
        print("Error: Input file is empty.")
        return

    # Use first line as header
    # The user updated the first column to "Patient record_id" (separated by space)
    # or it might be tab separated. Let's handle both.
    raw_header = lines[0].strip().split('\t')
    header = []
    for h in raw_header:
        if h == "Patient record_id":
            header.extend(["Patient", "record_id"])
        else:
            header.append(h)
    
    print(f"Header: {header}")
    
    # Process each patient line
    for line in lines[1:]:
        if not line.strip():
            continue
            
        values = []
        raw_values = line.strip('\n').split('\t')
        for v in raw_values:
            # Handle the "Patient_XX record_id" split if they are in the same cell
            if "Patient_" in v and " " in v.strip():
                parts = v.strip().split()
                values.extend(parts)
            else:
                values.append(v)
        
        # Zip header and values into a dictionary
        data_dict = {}
        for i in range(len(header)):
            val = values[i] if i < len(values) else ""
            data_dict[header[i]] = val

        # Special handling for record_id and Patient name
        patient_raw = data_dict.get("Patient", "")
        # Format "Patient_01" -> "patient_01"
        patient_tag = patient_raw.lower() if patient_raw else "unknown"
        
        # record_id is now explicitly in the data
        # data_dict["record_id"] = data_dict.get("record_id", data_dict.get("id_neonet", ""))
        
        # Add the 'Patient' field as per example structure (e.g. "patient_E")
        data_dict["Patient"] = patient_tag.replace("_", "_") 
        
        # Generate filename: patient_01-tobias_bern-validation_data.json
        filename = f"{patient_tag.replace('_', '_')}-tobias_bern-validation_data.json"
        output_path = os.path.join(output_dir, filename)
        
        with open(output_path, 'w', encoding='utf-8') as out_f:
            json.dump(data_dict, out_f, indent=2, ensure_ascii=False)
            
        print(f"Generated: {filename}")

if __name__ == "__main__":
    generate_json_files()
