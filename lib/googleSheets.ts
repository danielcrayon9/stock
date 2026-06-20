import { google } from "googleapis";
import { SHEET_COLUMNS } from "@/config/sheets";
import { OPTIONAL_ENV_KEYS, REQUIRED_ENV_KEYS } from "./constants";
import type { EnvStatus } from "./types";

type SheetRow = Record<string, string | number | boolean | null | undefined>;

const SHEET_RANGE_COLUMNS = "A:BZ";

export class GoogleSheetsConfigError extends Error {
  constructor(message = "Google Sheets 환경변수가 설정되지 않았습니다.") {
    super(message);
    this.name = "GoogleSheetsConfigError";
  }
}

export function getEnvStatus(): EnvStatus[] {
  return [...REQUIRED_ENV_KEYS, ...OPTIONAL_ENV_KEYS].map((key) => ({
    key,
    configured: Boolean(process.env[key]?.trim()),
  }));
}

export function hasGoogleSheetsConfig() {
  return Boolean(
    process.env.GOOGLE_CLIENT_EMAIL?.trim() &&
      process.env.GOOGLE_PRIVATE_KEY?.trim() &&
      process.env.GOOGLE_SHEET_ID?.trim(),
  );
}

function getGoogleSheetsConfig() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.trim().replace(/\\n/g, "\n");
  const spreadsheetId = process.env.GOOGLE_SHEET_ID?.trim();

  if (!clientEmail || !privateKey || !spreadsheetId) {
    throw new GoogleSheetsConfigError(
      "Google Sheets 연결 정보가 없습니다. GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_SHEET_ID를 .env.local 또는 Vercel 환경변수에 설정하세요.",
    );
  }

  return { clientEmail, privateKey, spreadsheetId };
}

async function getSheetsClient() {
  const { clientEmail, privateKey } = getGoogleSheetsConfig();
  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({ version: "v4", auth });
}

function normalizeCell(value: unknown) {
  if (value == null) return "";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  return String(value);
}

function parseCell(value: unknown) {
  if (value === "TRUE") return true;
  if (value === "FALSE") return false;
  return value == null ? "" : String(value);
}

function rowToObject(headers: string[], row: unknown[]) {
  return headers.reduce<Record<string, string | boolean>>((acc, header, index) => {
    acc[header] = parseCell(row[index]);
    return acc;
  }, {});
}

async function getSheetId(sheetName: string) {
  const { spreadsheetId } = getGoogleSheetsConfig();
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = response.data.sheets?.find((item) => item.properties?.title === sheetName);

  if (sheet?.properties?.sheetId == null) {
    throw new Error(`Google Sheets에서 '${sheetName}' 시트를 찾을 수 없습니다.`);
  }

  return sheet.properties.sheetId;
}

async function ensureSheetExists(sheetName: string) {
  const { spreadsheetId } = getGoogleSheetsConfig();
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = response.data.sheets?.find((item) => item.properties?.title === sheetName);

  if (sheet?.properties?.sheetId != null) {
    return sheet.properties.sheetId;
  }

  const created = await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          addSheet: {
            properties: {
              title: sheetName,
            },
          },
        },
      ],
    },
  });

  const sheetId = created.data.replies?.[0]?.addSheet?.properties?.sheetId;
  if (sheetId == null) {
    throw new Error(`Google Sheets에서 '${sheetName}' 시트를 생성하지 못했습니다.`);
  }

  return sheetId;
}

async function findRowNumberById(sheetName: string, id: string) {
  const rows = await getRawRows(sheetName);
  const headers = rows[0] ?? [];
  const idIndex = headers.indexOf("id");

  if (idIndex === -1) {
    throw new Error(`'${sheetName}' 시트에 id 컬럼이 없습니다.`);
  }

  const rowIndex = rows.findIndex((row, index) => index > 0 && row[idIndex] === id);
  return rowIndex === -1 ? null : rowIndex + 1;
}

async function getRawRows(sheetName: string) {
  const { spreadsheetId } = getGoogleSheetsConfig();
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!${SHEET_RANGE_COLUMNS}`,
  });

  return (response.data.values ?? []) as string[][];
}

export async function getRows<T = SheetRow>(sheetName: string): Promise<T[]> {
  await ensureSheetExists(sheetName);
  const rows = await getRawRows(sheetName);
  const headers = rows[0] ?? [];
  const configuredHeaders = SHEET_COLUMNS[sheetName as keyof typeof SHEET_COLUMNS];

  if (headers.length === 0 && configuredHeaders) {
    const { spreadsheetId } = getGoogleSheetsConfig();
    const sheets = await getSheetsClient();
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[...configuredHeaders]] },
    });
    return [];
  }

  if (headers.length === 0) return [];

  return rows.slice(1).filter((row) => row.length > 0).map((row) => rowToObject(headers, row) as T);
}

export async function findRowById<T = SheetRow>(sheetName: string, id: string): Promise<T | null> {
  const rows = await getRows<T>(sheetName);
  return rows.find((row) => (row as { id?: string }).id === id) ?? null;
}

export async function appendRow(sheetName: string, row: SheetRow) {
  const { spreadsheetId } = getGoogleSheetsConfig();
  const sheets = await getSheetsClient();
  await ensureSheetExists(sheetName);
  const rawRows = await getRawRows(sheetName);
  const configuredHeaders = SHEET_COLUMNS[sheetName as keyof typeof SHEET_COLUMNS];
  const headers = rawRows[0] ?? configuredHeaders ?? Object.keys(row);

  if (rawRows.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [headers] },
    });
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetName}!${SHEET_RANGE_COLUMNS}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [headers.map((header) => normalizeCell(row[header]))],
    },
  });

  return row;
}

export async function appendRows(sheetName: string, rows: SheetRow[]) {
  if (rows.length === 0) return [];

  const { spreadsheetId } = getGoogleSheetsConfig();
  const sheets = await getSheetsClient();
  await ensureSheetExists(sheetName);
  const rawRows = await getRawRows(sheetName);
  const configuredHeaders = SHEET_COLUMNS[sheetName as keyof typeof SHEET_COLUMNS];
  const headers = rawRows[0] ?? configuredHeaders ?? Object.keys(rows[0]);

  if (rawRows.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[...headers]] },
    });
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetName}!${SHEET_RANGE_COLUMNS}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: rows.map((row) => headers.map((header) => normalizeCell(row[header]))),
    },
  });

  return rows;
}

export async function overwriteRows(sheetName: string, rows: SheetRow[]) {
  const { spreadsheetId } = getGoogleSheetsConfig();
  const sheets = await getSheetsClient();
  await ensureSheetExists(sheetName);
  const configuredHeaders = SHEET_COLUMNS[sheetName as keyof typeof SHEET_COLUMNS];
  const headers = (configuredHeaders ? [...configuredHeaders] : Object.keys(rows[0] ?? {})) as string[];

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${sheetName}!${SHEET_RANGE_COLUMNS}`,
  });

  const values = [headers, ...rows.map((row) => headers.map((header) => normalizeCell(row[header])))];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values },
  });

  return rows;
}

export async function updateRowById(sheetName: string, id: string, updates: SheetRow) {
  const { spreadsheetId } = getGoogleSheetsConfig();
  const sheets = await getSheetsClient();
  const rawRows = await getRawRows(sheetName);
  const headers = rawRows[0] ?? [];
  const rowNumber = await findRowNumberById(sheetName, id);

  if (!rowNumber) {
    throw new Error(`id '${id}'에 해당하는 행을 찾을 수 없습니다.`);
  }

  const current = rowToObject(headers, rawRows[rowNumber - 1] ?? []);
  const next: SheetRow = { ...current, ...updates, id };

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A${rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [headers.map((header) => normalizeCell(next[header]))],
    },
  });

  return next;
}

export async function deleteRowById(sheetName: string, id: string) {
  const { spreadsheetId } = getGoogleSheetsConfig();
  const sheets = await getSheetsClient();
  const rowNumber = await findRowNumberById(sheetName, id);

  if (!rowNumber) {
    throw new Error(`id '${id}'에 해당하는 행을 찾을 수 없습니다.`);
  }

  const sheetId = await getSheetId(sheetName);
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex: rowNumber - 1,
              endIndex: rowNumber,
            },
          },
        },
      ],
    },
  });

  return { id, deleted: true };
}
