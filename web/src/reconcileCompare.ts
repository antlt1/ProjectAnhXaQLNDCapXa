import type {
  ReconcileComparison,
  ReconcileDobDiff,
  ReconcileExcelRow,
  ReconcileIssue,
  ReconcilePerson,
} from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

function normalizeText(value: string | null | undefined): string {
  return String(value ?? '')
    .replace(/đ/gi, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function normalizeHamlet(value: string | null | undefined): string {
  const roman: Record<string, string> = { i: '1', ii: '2', iii: '3', iv: '4' };
  let text = normalizeText(value)
    .split(' ')
    .map((token) => roman[token] ?? token)
    .join(' ')
    .trim();

  const prefix = /^(ap|tt|thi tran|thi tu|thi xa)\s+/;
  while (prefix.test(text)) text = text.replace(prefix, '');
  return text.trim();
}

function dateParts(iso: string | null | undefined) {
  if (!iso) return null;
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (!y || !m || !d) return null;
  return { y, m, d, time: Date.UTC(y, m - 1, d) };
}

function compareDob(excel: ReconcileExcelRow, person: ReconcilePerson): ReconcileDobDiff {
  const left = dateParts(excel.dob);
  const right = dateParts(person.dob);

  if (!left || !right) {
    return {
      issue: false,
      missing: true,
      sameDate: null,
      dayDiff: null,
      yearDiff: null,
      label: 'Thiếu ngày sinh',
    };
  }

  const dayDiff = Math.round((right.time - left.time) / DAY_MS);
  const yearDiff = right.y - left.y;
  const sameDate = dayDiff === 0;

  let label = 'Khớp ngày sinh';
  if (!sameDate) {
    label =
      yearDiff !== 0
        ? `Lệch ${Math.abs(yearDiff)} năm`
        : `Lệch ${Math.abs(dayDiff)} ngày`;
  }

  return { issue: !sameDate, missing: false, sameDate, dayDiff, yearDiff, label };
}

export function compareReconcile(
  excel: ReconcileExcelRow,
  person: ReconcilePerson | null,
): ReconcileComparison | null {
  if (!person) return null;

  const issues: ReconcileIssue[] = [];
  const nameKey = normalizeText(excel.fullName);
  const personNameKey = normalizeText(person.fullName);
  const nameSame = nameKey === personNameKey;
  if (!nameSame) issues.push('name');

  const dob = compareDob(excel, person);
  if (dob.issue) issues.push('dob');

  const excelHamlet = normalizeHamlet(excel.hamlet);
  const dbHamlet = normalizeHamlet(person.addressName);
  const addressSame = Boolean(excelHamlet && dbHamlet && excelHamlet === dbHamlet);
  const addressMissing = !excelHamlet || !dbHamlet;
  if (!addressSame && !addressMissing) issues.push('address');

  const sexSame =
    !excel.sex || !person.sex || excel.sex === person.sex;
  if (!sexSame) issues.push('sex');

  return {
    issues,
    name: { same: nameSame, excel: excel.fullName, db: person.fullName },
    dob,
    address: {
      same: addressSame,
      missing: addressMissing,
      excel: excel.hamlet,
      db: person.addressName,
    },
    sex: {
      same: sexSame,
      excel: excel.sexLabel,
      db: person.sexLabel,
    },
  };
}

export { normalizeHamlet, normalizeText };
