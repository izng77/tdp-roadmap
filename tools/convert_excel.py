import pandas as pd
import json
import sys

def excel_to_json(file_path):
    try:
        # Try to read all sheets
        all_sheets = pd.read_excel(file_path, sheet_name=None)
        data = {}
        for sheet_name, df in all_sheets.items():
            # Convert to list of dicts, handling NaN
            data[sheet_name] = json.loads(df.to_json(orient='records'))
        return data
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    files = [
        "Talent Development for ALL @ SAJC_Students_Heatmap.xlsx",
        "Talent Development for ALL @ SAJC_Teachers_Heatmap.xlsx"
    ]
    results = {}
    for f in files:
        results[f] = excel_to_json(f)
    
    print(json.dumps(results, indent=2))
