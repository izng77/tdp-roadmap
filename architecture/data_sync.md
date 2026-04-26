# SOP: Google Sheets Data Synchronization

## Goal
To allow teachers to update the talent development catalog in a Google Sheet and have those changes reflected in the student-facing application without code redeployment.

## Workflow
1. **Source**: Google Sheet with `Opportunities` tab.
2. **Bridge**: Google Apps Script (GAS) deployed as a Web App.
3. **Trigger**: App fetches JSON from the GAS URL on initialization.

## Google Apps Script Template
```javascript
function doGet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Opportunities');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  
  const result = rows.map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}
```

## Constraints
- **CORS**: Must use `ContentService` to handle JSON requests from the frontend.
- **Cache**: For the pilot, use a 5-minute client-side cache to reduce script execution overhead.
