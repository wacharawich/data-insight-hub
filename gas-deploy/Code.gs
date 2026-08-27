const SHEET_ID = '1UtSyrAUOXdtRiztXbN4ntobPeS0fMErUrAIeK4NRxcw';
const SHEET_NAME = 'sheet99';

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('CL69 — ทะเบียนคุมแผนจัดซื้อจัดจ้าง โรงพยาบาลนางรอง')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function getSheetData() {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      return JSON.stringify({ error: 'Sheet "' + SHEET_NAME + '" not found.' });
    }
    const range = sheet.getDataRange();
    const values = range.getValues();
    if (values.length <= 1) {
      return JSON.stringify({ data: [] });
    }
    // Skip header row
    const data = values.slice(1).map(function(row) {
      return {
        regNo: String(row[0] || ''),
        month: String(row[1] || ''),
        missionGroup: String(row[2] || ''),
        workGroup: String(row[3] || ''),
        department: String(row[4] || ''),
        item: String(row[5] || ''),
        category: String(row[6] || ''),
        type: String(row[7] || ''),
        price: Number(row[8]) || 0,
        planType: String(row[9] || '')
      };
    });
    return JSON.stringify({ data: data });
  } catch (e) {
    return JSON.stringify({ error: e.message });
  }
}
