import zipfile
import xml.etree.ElementTree as ET
import json
import os

def read_xlsx(file_path):
    try:
        with zipfile.ZipFile(file_path, 'r') as zip_ref:
            # Get shared strings
            shared_strings = []
            if 'xl/sharedStrings.xml' in zip_ref.namelist():
                with zip_ref.open('xl/sharedStrings.xml') as f:
                    tree = ET.parse(f)
                    for t in tree.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t'):
                        shared_strings.append(t.text)
            
            # Get sheets
            sheets = []
            with zip_ref.open('xl/workbook.xml') as f:
                tree = ET.parse(f)
                for sheet in tree.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}sheet'):
                    sheets.append(sheet.attrib['name'])
            
            result = {}
            for i, sheet_name in enumerate(sheets):
                sheet_file = f'xl/worksheets/sheet{i+1}.xml'
                if sheet_file in zip_ref.namelist():
                    with zip_ref.open(sheet_file) as f:
                        tree = ET.parse(f)
                        rows = []
                        for row_elem in tree.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row'):
                            row_data = []
                            for cell in row_elem.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c'):
                                value_elem = cell.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
                                if value_elem is not None:
                                    val = value_elem.text
                                    if cell.attrib.get('t') == 's':
                                        val = shared_strings[int(val)]
                                    row_data.append(val)
                                else:
                                    row_data.append("")
                            rows.append(row_data)
                        result[sheet_name] = rows
            return result
    except Exception as e:
        return {"error": str(e)}

files = [
    "Talent Development for ALL @ SAJC_Students_Heatmap.xlsx",
    "Talent Development for ALL @ SAJC_Teachers_Heatmap.xlsx"
]

all_data = {}
for f in files:
    all_data[f] = read_xlsx(f)

with open('heatmap_data.json', 'w') as f:
    json.dump(all_data, f, indent=2)

print("Success: Data saved to heatmap_data.json")
