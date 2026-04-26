# SOP: Student Portal Record Import

## Goal
To allow students to manually import their official school records (exported from the Saints Portal) into the roadmap application for visualization and planning.

## Workflow
1. **Input**: Student uploads a CSV or JSON file exported from the Saints Portal.
2. **Parsing**: A deterministic parser matches the export strings against the `Opportunities` catalog.
3. **Merging**: The parsed records are merged with the `completedOpportunities` array in the student's local state.

## Logic Constraints
- **Fuzzy Matching**: If the portal name doesn't match the catalog ID exactly, use a similarity score threshold (0.8+) to suggest a match.
- **Deduplication**: Prevent duplicate entries if a student uploads the same record multiple times.

## Data Persistence
- **Local**: Store in `localStorage` for the pilot.
- **Future**: Push to a dedicated `StudentRecords` sheet via the GAS bridge for long-term tracking.
