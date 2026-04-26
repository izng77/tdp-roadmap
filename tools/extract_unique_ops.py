import json

def extract_opportunities():
    with open('heatmap_data.json', 'r') as f:
        data = json.load(f)
    
    student_data = data["Talent Development for ALL @ SAJC_Students_Heatmap.xlsx"]["Input"]
    
    # Header is at index 0
    header = student_data[0]
    opportunities = []
    
    # Map headers to indices
    # Based on the previous output, it looks like:
    # 0: Learning Opportunity Name
    # 1: Category/Description
    # 2: Level
    # 3: Term
    # 4: Week
    # 5: Tier
    
    # Actually, the data seems shifted or mixed. Let's look at row 2-20 again.
    # [ "International Mathematics Modelling Competition (IMMC)", "Counter Radicalisation workshop", "CCA Exco ", "9", "Term 2", "Shanghai Texas Instrument Cup", "American Math Competition" ]
    # This doesn't match the header exactly. It might be multiple columns of opportunities?
    
    # Let's just collect all unique strings that look like opportunities
    opportunity_set = set()
    for row in student_data[1:]:
        for cell in row:
            if cell and len(cell) > 3 and "@" not in cell and cell not in ["JC1", "JC2", "JC1 & JC2", "Term 1", "Term 2", "Term 3", "Term 4"]:
                opportunity_set.add(cell.strip())
    
    return sorted(list(opportunity_set))

all_ops = extract_opportunities()
with open('extracted_opportunities.json', 'w') as f:
    json.dump(all_ops, f, indent=2)

print(f"Extracted {len(all_ops)} unique items.")
