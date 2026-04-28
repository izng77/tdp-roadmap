# Project Constitution: TD Roadmap

## 🎯 North Star
High-fidelity prototype for JC1 pilot (Term 2 2026) for Workgroup review. The objective is to demonstrate the deterministic logic and UX before scaling to the full 1,400 student cohort in 2027.

## 📜 Behavioral Rules
1. **Deterministic Logic**: All talent development tiering and growth calculations must be deterministic.
2. **Data-First**: No new tools shall be built without a defined schema in this document.
3. **Symmetry & UX**: All UI outputs must adhere to the high-density "Pro-Tool" aesthetic.
4. **Progression-Based Tiering (Hard Guardrail)**: The system must enforce foundational growth. A student cannot "Plan" a Tier 3 opportunity unless they have already completed or planned at least one Tier 1 or Tier 2 opportunity in the same domain. Tier 3 items in the catalog should be visually flagged as "Locked" or "Advanced" until prerequisites are met.

## 🏗️ Architectural Invariants
- **Layer 1**: All SOPs in `architecture/` are the Source of Truth for logic.
- **Layer 3**: All execution scripts in `tools/` must be atomic and testable.
- **Persistence**: Final data resides in Google Sheets; local state managed in `localStorage` for the prototype.

## 📊 Data Schemas

### Google Sheets Catalog (`Opportunities`)
| Column | Type | Description |
| :--- | :--- | :--- |
| `ID` | String | Unique slug (e.g., `math_olympiad_2026`) |
| `Name` | String | Display name |
| `Tier` | Integer | 1 (Awareness), 2 (Develop), 3 (Deepen) |
| `Domain` | String | Academic, Leadership, Service, etc. |
| `Description`| String | Detailed info for the student |
| `Level` | String | JC1, JC2, or both |

## 📝 Maintenance Log
- **2026-04-24**: Initialized project under B.L.A.S.T. protocol.
- **2026-04-24**: Updated North Star and added Google Sheets schema based on Pilot requirements.
