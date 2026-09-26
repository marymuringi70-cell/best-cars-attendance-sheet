function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Attendance');

  if (!sheet) {
    sheet = ss.insertSheet('Attendance');
  }

  const headers = [
    'Timestamp',
    'Employee Name',
    'Employee ID',
    'Action',
    'Date',
    'Time',
    'Latitude',
    'Longitude',
    'Office Latitude',
    'Office Longitude',
    'Distance (m)',
    'Verified',
    'Status'
  ];

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || '{}');
    const sheet = setupSheet();

    const row = [
      payload.timestamp || new Date().toISOString(),
      payload.employeeName || '',
      payload.employeeId || '',
      payload.action || '',
      payload.date || '',
      payload.time || '',
      payload.latitude || '',
      payload.longitude || '',
      payload.officeLatitude || '',
      payload.officeLongitude || '',
      payload.distanceMeters ?? '',
      payload.verified ? 'Yes' : 'No',
      payload.status || ''
    ];

    sheet.appendRow(row);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, message: 'Attendance saved to spreadsheet.' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, message: 'Attendance Apps Script is ready.' }))
    .setMimeType(ContentService.MimeType.JSON);
}
