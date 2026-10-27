import fs from 'node:fs';
import path from 'node:path';
import XLSX from 'xlsx';

const FILE_CANDIDATES = ['Xã Nhơn Ái DS.xlsx', 'Xa Nhon Ai DS.xlsx'];

/**
 * Bỏ dấu tiếng Việt + chuẩn hóa khoảng trắng/ký tự để so sánh tên, địa chỉ.
 * Lưu ý: normalize('NFD') không tách được 'đ' nên phải thay riêng.
 */
export function normalizeText(value) {
  return String(value ?? '')
    .replace(/đ/gi, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

const HAMLET_PREFIX = /^(ap|tt|thi tran|thi tu|thi xa)\s+/;
const ROMAN_TOKENS = { i: '1', ii: '2', iii: '3', iv: '4' };

/**
 * Chuẩn hóa tên ấp để so sánh Excel với Address_Name trong CSDL:
 * - bỏ tiền tố "Ấp"/"TT"/"Thị trấn"/"Thị tứ" (kể cả lặp nhiều lần);
 * - đổi số La Mã ở cuối (I, II, III) sang số Ả Rập.
 */
export function normalizeHamlet(value) {
  let text = normalizeText(value)
    .split(' ')
    .map((token) => ROMAN_TOKENS[token] ?? token)
    .join(' ')
    .trim();

  while (HAMLET_PREFIX.test(text)) text = text.replace(HAMLET_PREFIX, '');
  return text.trim();
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

function parseDateParts(value, cell) {
  if (value === null || value === undefined || value === '') return null;

  if (typeof value === 'number' || (cell && cell.t === 'n')) {
    const serial = Number(value);
    if (!Number.isFinite(serial) || serial <= 0) return null;
    const parsed = XLSX.SSF.parse_date_code(serial);
    if (!parsed || !parsed.y) return null;
    return { y: parsed.y, m: parsed.m, d: parsed.d };
  }

  const text = String(value).trim();
  if (!text) return null;

  let match = text.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (match) {
    return { d: Number(match[1]), m: Number(match[2]), y: Number(match[3]) };
  }

  match = text.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/);
  if (match) {
    return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
  }

  // Một số ô bị Excel lưu dạng chuỗi số serial.
  if (/^\d{5}(\.\d+)?$/.test(text)) {
    const parsed = XLSX.SSF.parse_date_code(Number(text));
    if (parsed && parsed.y) return { y: parsed.y, m: parsed.m, d: parsed.d };
  }

  return null;
}

export function normalizeDate(value, cell) {
  const parts = parseDateParts(value, cell);
  if (!parts) return null;
  const { y, m, d } = parts;
  if (!y || !m || !d || m > 12 || d > 31) return null;
  const iso = `${y}-${pad2(m)}-${pad2(d)}`;
  return {
    iso,
    display: `${pad2(d)}/${pad2(m)}/${y}`,
    y,
    m,
    d,
    time: Date.UTC(y, m - 1, d),
  };
}

/** Đọc ngày sinh dạng chuỗi 'dd/mm/yyyy' của bảng Personal. */
export function parseDbDate(value) {
  return normalizeDate(value);
}

function pickHeaderIndexes(header) {
  const index = {};
  header.forEach((cell, position) => {
    const key = normalizeText(cell);
    if (key === 'stt') index.stt = position;
    else if (key === 'ho va ten') index.fullName = position;
    else if (key === 'gioi tinh') index.sex = position;
    else if (key === 'ngay sinh' || key === 'ngay thang nam sinh') index.dob = position;
    else if (key === 'ap' || key === 'ten ap') index.hamlet = position;
    else if (key === 'xa' || key === 'phuong') index.ward = position;
    else if (key === 'thanh pho' || key === 'tinh') index.city = position;
    else if (key.startsWith('so cmnd') || key === 'cccd' || key === 'so cccd') {
      index.cccd = position;
    }
  });
  return index;
}

function cellText(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') {
    // CCCD lưu dạng số: tránh ký hiệu mũ và đuôi .0
    return Number.isInteger(value) ? value.toFixed(0) : String(value);
  }
  return String(value).trim();
}

function cellTextKeepingLeadingZeros(value, cell) {
  if (cell && cell.w && /^0\d+$/.test(String(cell.w).trim())) return String(cell.w).trim();
  return cellText(value);
}

function sexCode(value) {
  const text = normalizeText(value);
  if (!text) return null;
  if (text === 'nam' || text === 'm' || text === 'male') return 'M';
  if (text === 'nu' || text === 'f' || text === 'female') return 'F';
  return null;
}

export function resolveExcelFile(configuredPath) {
  if (configuredPath && fs.existsSync(configuredPath)) return configuredPath;

  if (configuredPath) {
    const dir = path.dirname(configuredPath);
    for (const candidate of FILE_CANDIDATES) {
      const full = path.join(dir, candidate);
      if (fs.existsSync(full)) return full;
    }
  }

  return null;
}

let cache = null;

/**
 * Đọc file Excel và trả về danh sách dòng đã chuẩn hóa.
 * Cache theo mtime/size để không phải parse 33k dòng mỗi request.
 */
export function loadExcelRows(configuredPath, { sheetName = '', force = false } = {}) {
  const filePath = resolveExcelFile(configuredPath);
  if (!filePath) {
    const error = new Error(
      `Không tìm thấy file Excel rà soát: ${configuredPath || FILE_CANDIDATES.join(' / ')}`,
    );
    error.status = 404;
    throw error;
  }

  const stat = fs.statSync(filePath);

  if (!force && cache && cache.filePath === filePath && cache.mtimeMs === stat.mtimeMs) {
    return cache.result;
  }

  const workbook = XLSX.readFile(filePath, { cellDates: false });
  const selectedSheet = sheetName && workbook.SheetNames.includes(sheetName)
    ? sheetName
    : workbook.SheetNames[0];

  if (!selectedSheet) {
    const error = new Error('File Excel không có sheet dữ liệu');
    error.status = 422;
    throw error;
  }

  const worksheet = workbook.Sheets[selectedSheet];
  const rows = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    raw: true,
    defval: '',
    blankrows: false,
  });

  if (!rows.length) {
    const error = new Error('Sheet dữ liệu rỗng');
    error.status = 422;
    throw error;
  }

  const indexes = pickHeaderIndexes(rows[0]);
  if (indexes.fullName === undefined || indexes.cccd === undefined) {
    const error = new Error(
      'Không nhận diện được cột "Họ và tên" / "Số CMND/CCCD" trong file Excel',
    );
    error.status = 422;
    throw error;
  }

  const items = [];
  const cccdCounts = new Map();

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const fullName = cellText(row[indexes.fullName]);
    const cccd = cellTextKeepingLeadingZeros(
      indexes.cccd === undefined ? '' : row[indexes.cccd],
      worksheet[XLSX.utils.encode_cell({ r: rowIndex, c: indexes.cccd })],
    ).replace(/\s+/g, '');

    if (!fullName && !cccd) continue;

    const sttRaw = cellText(row[indexes.stt]);
    const stt = Number.parseInt(sttRaw, 10);
    const dob = normalizeDate(
      indexes.dob === undefined ? '' : row[indexes.dob],
      worksheet[XLSX.utils.encode_cell({ r: rowIndex, c: indexes.dob })],
    );

    const item = {
      rowNumber: rowIndex + 1,
      stt: Number.isFinite(stt) ? stt : rowIndex,
      fullName,
      nameKey: normalizeText(fullName),
      sex: sexCode(row[indexes.sex]),
      dob: dob ? dob.iso : null,
      dobDisplay: dob ? dob.display : null,
      dobParts: dob,
      hamlet: cellText(row[indexes.hamlet]),
      hamletKey: normalizeHamlet(row[indexes.hamlet]),
      ward: cellText(row[indexes.ward]),
      city: cellText(row[indexes.city]),
      cccd,
    };

    items.push(item);
    if (cccd) cccdCounts.set(cccd, (cccdCounts.get(cccd) ?? 0) + 1);
  }

  for (const item of items) {
    item.duplicateInExcel = item.cccd ? (cccdCounts.get(item.cccd) ?? 0) > 1 : false;
    item.duplicateCount = item.cccd ? (cccdCounts.get(item.cccd) ?? 0) : 0;
  }

  const result = {
    filePath,
    fileName: path.basename(filePath),
    mtimeMs: stat.mtimeMs,
    modifiedAt: new Date(stat.mtimeMs).toISOString(),
    sheetName: selectedSheet,
    rowCount: items.length,
    items,
  };

  cache = { filePath, mtimeMs: stat.mtimeMs, result };
  return result;
}

export function clearExcelCache() {
  cache = null;
}
