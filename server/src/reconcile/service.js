import { config } from '../config.js';
import { ConfirmationStore, FIELD_KEYS } from './confirmations.js';
import {
  loadExcelRows,
  normalizeHamlet,
  normalizeText,
  parseDbDate,
} from './excel.js';

const SEX_LABEL = { M: 'Nam', F: 'Nữ' };
const DAY_MS = 24 * 60 * 60 * 1000;

export const STATUS_LABELS = {
  ok: 'Khớp',
  name: 'Sai tên',
  sex: 'Sai giới tính',
  dob: 'Lệch năm sinh',
  address: 'Lệch địa chỉ',
  'cccd-diff': 'Khác số CCCD',
  'not-inserted': 'Chưa chèn CCCD',
  'not-found': 'Không thấy trong CSDL',
};

function buildFullName(row) {
  return `${row.lastName ?? ''} ${row.firstName ?? ''}`.trim();
}

function toSex(value) {
  const text = normalizeText(value);
  if (text === 'nam' || text === 'm' || text === 'male' || text === '0') return 'M';
  if (text === 'nu' || text === 'f' || text === 'female' || text === '1') return 'F';
  return null;
}

function decoratePerson(row) {
  const dob = parseDbDate(row.dateOfBirth);
  return {
    personalId: row.personalId,
    fullName: row.fullName || buildFullName(row),
    nameKey: normalizeText(row.fullName || buildFullName(row)),
    lastName: row.lastName ?? '',
    firstName: row.firstName ?? '',
    sex: toSex(row.sexId),
    dob: dob ? dob.iso : null,
    dobDisplay: dob ? dob.display : null,
    dobParts: dob,
    cccd: row.cccd ?? null,
    cccdOld: row.cccdOld ?? null,
    cccdMapped: Boolean(row.cccdMapped),
    personStatus: row.personStatus ?? null,
    relationCode: row.relationCode ?? null,
    relationName: row.relationName ?? null,
    houseHoldId: row.houseHoldId,
    houseHoldCode: row.houseHoldCode,
    houseHoldNumber: row.houseHoldNumber ?? null,
    houseHoldStatus: row.houseHoldStatus ?? null,
    addressId: row.addressId ?? null,
    addressName: row.addressName ?? null,
    fullAddress: row.fullAddress ?? null,
    regionId: row.regionId ?? null,
    regionName: row.regionName ?? null,
    hamletKey: normalizeHamlet(row.addressName),
    isHead: row.relationCode === '0',
    headName: null,
  };
}

function buildPersons(rawRows) {
  const persons = rawRows.map(decoratePerson);
  const householdHeads = new Map();

  for (const person of persons) {
    if (person.relationCode === '0' && !householdHeads.has(person.houseHoldId)) {
      householdHeads.set(person.houseHoldId, person.fullName);
    }
  }

  for (const person of persons) {
    person.headName = householdHeads.get(person.houseHoldId) ?? null;
  }

  return persons;
}

function tokenSimilarity(left, right) {
  const a = new Set(left.split(' ').filter(Boolean));
  const b = new Set(right.split(' ').filter(Boolean));
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const token of a) if (b.has(token)) shared += 1;
  return shared / (a.size + b.size - shared);
}

function dateDiff(excelParts, dbParts) {
  if (!excelParts || !dbParts) {
    return {
      issue: false,
      missing: true,
      sameDate: null,
      dayDiff: null,
      yearDiff: null,
      label: 'Thiếu ngày sinh',
    };
  }

  const dayDiff = Math.round((dbParts.time - excelParts.time) / DAY_MS);
  const yearDiff = dbParts.y - excelParts.y;
  const sameDate = dayDiff === 0;

  let label = 'Khớp ngày sinh';
  if (!sameDate) {
    if (yearDiff !== 0) {
      const years = Math.abs(yearDiff);
      label = `Lệch ${years} năm`;
    } else {
      label = `Lệch ${Math.abs(dayDiff)} ngày`;
    }
  }

  return { issue: !sameDate, missing: false, sameDate, dayDiff, yearDiff, label };
}

function compareFields(excel, person) {
  const issues = [];

  const nameSame = Boolean(person) && person.nameKey === excel.nameKey;
  if (person && !nameSame) issues.push('name');

  const dob = person ? dateDiff(excel.dobParts, person.dobParts) : null;
  if (dob?.issue) issues.push('dob');

  const addressSame = Boolean(person) && excel.hamletKey === person.hamletKey;
  const addressMissing = !excel.hamletKey || !person?.hamletKey;
  if (person && !addressSame && !addressMissing) issues.push('address');

  const sexSame = Boolean(person) && (!excel.sex || !person.sex || excel.sex === person.sex);
  if (person && !sexSame) issues.push('sex');

  return {
    issues,
    name: {
      same: nameSame,
      excel: excel.fullName,
      db: person?.fullName ?? null,
    },
    dob: person ? dob : null,
    address: {
      same: addressSame,
      missing: addressMissing,
      excel: excel.hamlet,
      db: person?.addressName ?? null,
    },
    sex: {
      same: sexSame,
      excel: SEX_LABEL[excel.sex] ?? null,
      db: SEX_LABEL[person?.sex] ?? null,
    },
  };
}

function scoreCandidate(excel, person) {
  let score = 0;
  if (excel.dobParts && person.dobParts) {
    if (excel.dobParts.time === person.dobParts.time) score += 8;
    else if (excel.dobParts.y === person.dobParts.y) score += 5;
  }
  if (excel.hamletKey && excel.hamletKey === person.hamletKey) score += 4;
  if (excel.sex && person.sex && excel.sex === person.sex) score += 2;
  if (person.personStatus == null || !['D', 'G', 'R'].includes(person.personStatus)) score += 1;
  if (!person.cccd) score += 1;
  return score;
}

function publicPerson(person) {
  return {
    personalId: person.personalId,
    fullName: person.fullName,
    sex: person.sex,
    sexLabel: SEX_LABEL[person.sex] ?? null,
    dob: person.dob,
    dobDisplay: person.dobDisplay,
    cccd: person.cccd,
    cccdOld: person.cccdOld,
    cccdMapped: person.cccdMapped,
    personStatus: person.personStatus,
    relationCode: person.relationCode,
    relationName: person.relationName,
    houseHoldId: person.houseHoldId,
    houseHoldCode: person.houseHoldCode,
    houseHoldNumber: person.houseHoldNumber,
    houseHoldStatus: person.houseHoldStatus,
    addressName: person.addressName,
    fullAddress: person.fullAddress,
    regionName: person.regionName,
    isHead: person.isHead,
    headName: person.headName,
  };
}

function publicCandidate(person, score) {
  return { ...publicPerson(person), score: Math.round(score) };
}

function buildIndexes(persons) {
  const byCccd = new Map();
  const byName = new Map();
  const byEdge = new Map();

  for (const person of persons) {
    for (const code of [person.cccd, person.cccdOld]) {
      if (!code) continue;
      const list = byCccd.get(code) ?? [];
      list.push(person);
      byCccd.set(code, list);
    }

    if (person.nameKey) {
      const list = byName.get(person.nameKey) ?? [];
      list.push(person);
      byName.set(person.nameKey, list);
    }

    const tokens = person.nameKey.split(' ').filter(Boolean);
    if (tokens.length >= 2) {
      const edge = `${tokens[0]}|${tokens[tokens.length - 1]}`;
      const list = byEdge.get(edge) ?? [];
      list.push(person);
      byEdge.set(edge, list);
    }
  }

  return { byCccd, byName, byEdge };
}

function chooseBest(excel, people) {
  if (!people?.length) return null;
  return [...people].sort((left, right) => {
    const delta = scoreCandidate(excel, right) - scoreCandidate(excel, left);
    if (delta !== 0) return delta;
    return left.personalId - right.personalId;
  })[0];
}

function collectCandidates(excel, indexes, limit = 5) {
  const exact = (indexes.byName.get(excel.nameKey) ?? []).map((person) => ({
    person,
    score: scoreCandidate(excel, person) + 10,
  }));

  const seen = new Set(exact.map((item) => item.person.personalId));
  const tokens = excel.nameKey.split(' ').filter(Boolean);
  const fuzzy = [];

  if (tokens.length >= 2) {
    const edge = `${tokens[0]}|${tokens[tokens.length - 1]}`;
    for (const person of indexes.byEdge.get(edge) ?? []) {
      if (seen.has(person.personalId)) continue;
      const similarity = tokenSimilarity(excel.nameKey, person.nameKey);
      if (similarity < 0.5) continue;
      fuzzy.push({ person, score: scoreCandidate(excel, person) + similarity * 6 });
    }
  }

  return [...exact, ...fuzzy]
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map((item) => publicCandidate(item.person, item.score));
}

function matchRow(excel, indexes) {
  const cccdMatches = excel.cccd
    ? indexes.byCccd.get(excel.cccd) ?? []
    : [];

  let matchedByCccd = null;
  let matchedField = null;

  if (cccdMatches.length) {
    matchedByCccd = chooseBest(excel, cccdMatches);
    matchedField = matchedByCccd.cccd === excel.cccd ? 'new' : 'old';
  }

  if (matchedByCccd) {
    const comparison = compareFields(excel, matchedByCccd);
    let status = 'ok';
    if (comparison.issues.includes('name')) status = 'name';
    else if (comparison.issues.includes('dob')) status = 'dob';
    else if (comparison.issues.includes('address')) status = 'address';
    else if (comparison.issues.includes('sex')) status = 'sex';

    return {
      status,
      db: publicPerson(matchedByCccd),
      candidates: [],
      issues: comparison.issues,
      comparison,
      matchedBy: matchedByCccd.cccd === excel.cccd ? 'cccd' : 'cccd-old',
      cccdInDb: matchedByCccd.cccd,
      cccdDuplicateCount: cccdMatches.length,
    };
  }

  const exactPeople = indexes.byName.get(excel.nameKey) ?? [];
  const candidatePerson = chooseBest(excel, exactPeople);
  const candidates = collectCandidates(excel, indexes);

  if (candidatePerson) {
    const comparison = compareFields(excel, candidatePerson);
    const status = candidatePerson.cccd ? 'cccd-diff' : 'not-inserted';

    return {
      status,
      db: publicPerson(candidatePerson),
      candidates,
      issues: comparison.issues,
      comparison,
      matchedBy: 'name',
      cccdInDb: candidatePerson.cccd,
      cccdDuplicateCount: 0,
    };
  }

  return {
    status: 'not-found',
    db: null,
    candidates,
    issues: [],
    comparison: null,
    matchedBy: null,
    cccdInDb: null,
    cccdDuplicateCount: 0,
  };
}

function emptyTotals() {
  return {
    rows: 0,
    matched: 0,
    ok: 0,
    name: 0,
    sex: 0,
    dob: 0,
    address: 0,
    'cccd-diff': 0,
    'not-inserted': 0,
    'not-found': 0,
    withDobIssue: 0,
    withAddressIssue: 0,
    withNameIssue: 0,
    duplicates: 0,
    confirmed: 0,
  };
}

function addToTotals(totals, row) {
  totals.rows += 1;
  if (row.db) totals.matched += 1;
  totals[row.status] += 1;
  if (row.issues.includes('dob')) totals.withDobIssue += 1;
  if (row.issues.includes('address')) totals.withAddressIssue += 1;
  if (row.issues.includes('name')) totals.withNameIssue += 1;
  if (row.duplicateInExcel) totals.duplicates += 1;
}

function itemToRow(excel, matched) {
  return {
    key: String(excel.stt),
    stt: excel.stt,
    rowNumber: excel.rowNumber,
    duplicateInExcel: excel.duplicateInExcel,
    duplicateCount: excel.duplicateCount,
    status: matched.status,
    statusLabel: STATUS_LABELS[matched.status] ?? matched.status,
    issues: matched.issues,
    matchedBy: matched.matchedBy,
    cccdInDb: matched.cccdInDb,
    cccdDuplicateCount: matched.cccdDuplicateCount,
    excel: {
      stt: excel.stt,
      fullName: excel.fullName,
      sex: excel.sex,
      sexLabel: SEX_LABEL[excel.sex] ?? null,
      dob: excel.dob,
      dobDisplay: excel.dobDisplay,
      hamlet: excel.hamlet,
      ward: excel.ward,
      city: excel.city,
      cccd: excel.cccd,
    },
    db: matched.db,
    candidates: matched.candidates,
    comparison: matched.comparison,
    confirmation: null,
  };
}

function confirmationSources(record) {
  const sources = {};
  const raw = record?.sources;
  if (raw && typeof raw === 'object') {
    for (const key of FIELD_KEYS) {
      if (raw[key] === 'excel' || raw[key] === 'db') sources[key] = raw[key];
    }
  }
  // Hồ sơ cũ chỉ có cờ "chấp nhận lệch": hiểu là giữ nguyên giá trị trong CSDL.
  if (!sources.dob && record?.acceptDobDiff) sources.dob = 'db';
  if (!sources.address && record?.acceptAddressDiff) sources.address = 'db';
  return sources;
}

function matchesIssue(row, issue, confirmation) {
  if (!issue || issue === 'all') return true;
  if (issue === 'confirmed') return Boolean(confirmation?.confirmed);
  if (issue === 'unconfirmed') return !confirmation?.confirmed;
  if (issue === 'duplicates') return row.duplicateInExcel;
  if (issue === 'ok') return row.status === 'ok';
  if (issue === 'dob' || issue === 'address' || issue === 'name' || issue === 'sex') {
    return row.issues.includes(issue);
  }
  return row.status === issue;
}

export class ReconcileService {
  constructor(repository) {
    this.repository = repository;
    this.store = new ConfirmationStore(config.reconcile.dataDir);
    this.dbCache = { regionId: null, at: 0, rows: null, promise: null };
    this.snapshot = null;
    this.snapshotPromise = null;
  }

  async getRegion() {
    if (typeof this.repository.getRegion !== 'function') return null;
    return this.repository.getRegion(config.reconcile.regionId);
  }

  async getDbRows(refresh) {
    const regionId = config.reconcile.regionId;
    const now = Date.now();
    const cache = this.dbCache;

    if (
      !refresh &&
      cache.rows &&
      cache.regionId === regionId &&
      now - cache.at < config.reconcile.dbCacheTtlMs
    ) {
      return { rows: cache.rows, at: cache.at };
    }

    if (cache.promise) return cache.promise;

    const promise = (async () => {
      try {
        const rows = await this.repository.listReconcilePersons(regionId);
        this.dbCache = {
          regionId,
          at: Date.now(),
          rows,
          promise: null,
        };
        return { rows, at: this.dbCache.at };
      } catch (error) {
        this.dbCache.promise = null;
        const wrapped = new Error(
          `Không tải được dữ liệu nhân khẩu từ SQL Server: ${error.message}`,
        );
        wrapped.status = 503;
        throw wrapped;
      }
    })();

    this.dbCache.promise = promise;
    return promise;
  }

  async buildSnapshot(refresh) {
    const excel = loadExcelRows(config.reconcile.file, {
      sheetName: config.reconcile.sheet,
      force: refresh,
    });

    const { rows: rawRows, at } = await this.getDbRows(refresh);

    if (
      !refresh &&
      this.snapshot &&
      this.snapshot.excelMtimeMs === excel.mtimeMs &&
      this.snapshot.dbAt === at
    ) {
      return this.snapshot;
    }

    const persons = buildPersons(rawRows);
    const indexes = buildIndexes(persons);
    const totals = emptyTotals();
    const items = [];

    for (const excelRow of excel.items) {
      const matched = matchRow(excelRow, indexes);
      const row = itemToRow(excelRow, matched);
      addToTotals(totals, row);
      items.push(row);
    }

    const region = await this.getRegion().catch(() => null);

    this.snapshot = {
      file: {
        name: excel.fileName,
        sheetName: excel.sheetName,
        modifiedAt: excel.modifiedAt,
        rowCount: excel.rowCount,
      },
      region: region
        ? { regionId: region.regionId, regionName: region.regionName }
        : { regionId: config.reconcile.regionId, regionName: null },
      totals,
      items,
      excelMtimeMs: excel.mtimeMs,
      dbAt: at,
      builtAt: new Date().toISOString(),
    };

    return this.snapshot;
  }

  async getSnapshot(refresh) {
    if (this.snapshotPromise) return this.snapshotPromise;

    this.snapshotPromise = this.buildSnapshot(refresh).finally(() => {
      this.snapshotPromise = null;
    });

    return this.snapshotPromise;
  }

  async list({ q, issue, page, pageSize, refresh }) {
    const snapshot = await this.getSnapshot(refresh);
    const confirmations = await this.store.readFile();
    const needle = normalizeText(q);

    let confirmedCount = 0;
    const filtered = [];

    for (const row of snapshot.items) {
      const record = confirmations[row.key] ?? null;
      const confirmation =
        record && (!record.cccd || !row.excel.cccd || record.cccd === row.excel.cccd)
          ? record
          : null;
      if (confirmation?.confirmed) confirmedCount += 1;

      if (needle) {
        const haystack = normalizeText(
          [
            row.stt,
            row.excel.fullName,
            row.excel.cccd,
            row.excel.hamlet,
            row.excel.dobDisplay,
            row.db?.fullName,
            row.db?.cccd,
            row.db?.houseHoldCode,
            row.db?.addressName,
          ]
            .map((value) => (value === null || value === undefined ? '' : String(value)))
            .join(' '),
        );

        if (!haystack.includes(needle)) continue;
      }

      if (!matchesIssue(row, issue, confirmation)) continue;

      filtered.push({
        ...row,
        confirmation: confirmation
          ? {
              confirmed: Boolean(confirmation.confirmed),
              acceptDobDiff: Boolean(confirmation.acceptDobDiff),
              acceptAddressDiff: Boolean(confirmation.acceptAddressDiff),
              sources: confirmationSources(confirmation),
              personalId: confirmation.personalId ?? null,
              note: confirmation.note ?? '',
              updatedAt: confirmation.updatedAt ?? null,
            }
          : null,
      });
    }

    const total = filtered.length;
    const start = (page - 1) * pageSize;

    return {
      file: snapshot.file,
      region: snapshot.region,
      builtAt: snapshot.builtAt,
      totals: { ...snapshot.totals, confirmed: confirmedCount },
      total,
      items: filtered.slice(start, start + pageSize),
      page,
      pageSize,
      q,
      issue,
    };
  }

  async confirm(input) {
    const record = await this.store.save(input);
    return record;
  }
}
