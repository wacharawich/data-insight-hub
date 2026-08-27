/**
 * CL69 — ทะเบียนคุมแผนจัดซื้อจัดจ้าง โรงพยาบาลนางรอง
 * Google Apps Script Web App
 *
 * Sheet ID: 1UtSyrAUOXdtRiztXbN4ntobPeS0fMErUrAIeK4NRxcw
 * Sheet name: sheet99
 *
 * Columns:
 *   A: เลขทะเบียนคุม
 *   B: เดือน
 *   C: กลุ่มภารกิจ
 *   D: กลุ่มงาน
 *   E: หน่วยงาน
 *   F: รายการ
 *   G: หมวด
 *   H: ประเภท
 *   I: ราคาเสนอ
 *   J: ประเภทแผน
 */

const SHEET_ID = '1UtSyrAUOXdtRiztXbN4ntobPeS0fMErUrAIeK4NRxcw';
const SHEET_NAME = 'sheet99';

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('CL69 — ทะเบียนคุมแผนจัดซื้อจัดจ้าง โรงพยาบาลนางรอง')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Read all data from the Google Sheet and return as JSON array.
 * Called from the client side via google.script.run.
 */
function getSheetData() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) return [];

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  // Read all data at once for performance
  const range = sheet.getRange(2, 1, lastRow - 1, 10); // A2:J
  const values = range.getValues();

  const months = {
    'มกราคม': 0, 'กุมภาพันธ์': 1, 'มีนาคม': 2, 'เมษายน': 3,
    'พฤษภาคม': 4, 'มิถุนายน': 5, 'กรกฎาคม': 6, 'สิงหาคม': 7,
    'กันยายน': 8, 'ตุลาคม': 9, 'พฤศจิกายน': 10, 'ธันวาคม': 11,
    'ม.ค.': 0, 'ก.พ.': 1, 'มี.ค.': 2, 'เม.ย.': 3,
    'พ.ค.': 4, 'มิ.ย.': 5, 'ก.ค.': 6, 'ส.ค.': 7,
    'ก.ย.': 8, 'ต.ค.': 9, 'พ.ย.': 10, 'ธ.ค.': 11,
  };

  const monthNames = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ];

  function parseMonth(val) {
    const s = String(val).trim();
    const match = s.match(/([ก-๙a-zA-Z\.]+)\s*(\d{4})/);
    if (match) {
      const monthStr = match[1];
      let year = parseInt(match[2], 10);
      const monthIdx = months[monthStr] !== undefined ? months[monthStr] : 0;
      if (year < 2000) year = year - 543;
      const beYear = year + 543;
      return monthNames[monthIdx] + ' ' + beYear;
    }
    return s;
  }

  function toBuddhistYear(val) {
    const s = String(val).trim();
    const m = s.match(/(.*?)(\d{4})(.*)/);
    if (m) {
      const y = parseInt(m[2], 10);
      if (y >= 2000 && y <= 2100) return m[1] + (y + 543) + m[3];
    }
    return s;
  }

  const data = [];
  for (const row of values) {
    const reg = String(row[0] || '').trim();
    const rawMonth = String(row[1] || '').trim();
    const group = toBuddhistYear(row[2]);
    const workGroup = toBuddhistYear(row[3]);
    const dept = toBuddhistYear(row[4]);
    const item = toBuddhistYear(row[5]);
    const category = String(row[6] || '').trim();
    const type = String(row[7] || '').trim();
    const price = parseFloat(String(row[8]).replace(/[, ]/g, '')) || 0;
    const planType = String(row[9] || '').trim();

    if (!reg && !group && !dept) continue;

    data.push({
      'เลขทะเบียนคุม': reg,
      'เดือน': parseMonth(rawMonth),
      'กลุ่มภารกิจ': group,
      'กลุ่มงาน': workGroup,
      'หน่วยงาน': dept,
      'รายการ': item,
      'หมวด': category,
      'ประเภท': type,
      'ราคาเสนอ': price,
      'ประเภทแผน': planType,
      '_rawMonth': rawMonth,
    });
  }

  return data;
}
