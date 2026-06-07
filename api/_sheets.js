// Google Sheets API 공통 헬퍼 (서비스 계정 사용)
const { google } = require('googleapis');

function getAuth() {
  const key = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
  return new google.auth.GoogleAuth({
    credentials: key,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.file',
    ],
  });
}

async function getSheets() {
  const auth = getAuth();
  return google.sheets({ version: 'v4', auth });
}

async function getDrive() {
  const auth = getAuth();
  return google.drive({ version: 'v3', auth });
}

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

async function sheetsGet(range) {
  const sheets = await getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range,
  });
  return res.data.values || [];
}

async function sheetsAppend(range, values) {
  const sheets = await getSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values },
  });
}

async function sheetsUpdate(range, values) {
  const sheets = await getSheets();
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });
}

module.exports = { sheetsGet, sheetsAppend, sheetsUpdate, getDrive, SPREADSHEET_ID };
