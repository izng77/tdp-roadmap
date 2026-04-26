import json

def categorize(name):
    name_lower = name.lower()
    
    # Tier 3: Deepen (Excellence, Top tier)
    if any(k in name_lower for k in ["olympiad", "h3", "research programme", "competition", "winner", "league", "challenge", "sistemic", "award"]):
        return 3
    
    # Tier 2: Develop (Active engagement, Selected groups)
    if any(k in name_lower for k in ["exco", "facilitator", "organising committee", "mentor", "finalists", "slead", "committee member", "activist", "leaders"]):
        return 2
    
    # Tier 1: Awareness (Broad exposure, All students)
    if any(k in name_lower for k in ["assembly", "talks", "fortnight", "festival", "orientation", "open house", "carnival", "showcase", "awareness", "participants", "symposium"]):
        return 1
    
    # Default to 1 for generic items
    return 1

with open('extracted_opportunities.json', 'r') as f:
    ops = json.load(f)

catalog = []
for op in ops:
    # Skip noise
    if op.startswith("http") or len(op) < 5 or "@" in op or op.startswith("Tier"):
        continue
        
    catalog.append({
        "id": op.lower().replace(" ", "_").replace("(", "").replace(")", "").replace("/", "_"),
        "name": op,
        "tier": categorize(op),
        "domain": "General" # Could be refined further
    })

# Refine domain based on keywords
for item in catalog:
    n = item["name"].lower()
    if any(k in n for k in ["math", "science", "biology", "chemistry", "physics"]):
        item["domain"] = "Academic (STEM)"
    elif any(k in n for k in ["english", "humanities", "geog", "history", "literature", "econs"]):
        item["domain"] = "Academic (Huma)"
    elif any(k in n for k in ["mother tongue", "chinese", "malay", "tamil"]):
        item["domain"] = "Mother Tongue"
    elif any(k in n for k in ["service learning", "community"]):
        item["domain"] = "Service Learning"
    elif any(k in n for k in ["leadership", "exco", "slead", "leaders"]):
        item["domain"] = "Leadership"
    elif any(k in n for k in ["career", "work shadowing", "attachment", "university"]):
        item["domain"] = "ECG (Career/Uni)"

with open('opportunities_catalog.json', 'w') as f:
    json.dump(catalog, f, indent=2)

print(f"Generated catalog with {len(catalog)} items.")
