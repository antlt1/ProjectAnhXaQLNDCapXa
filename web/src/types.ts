export type CccdFilter = 'all' | 'has' | 'none' | 'partial' | 'unmapped';

export type TabKey = 'households' | 'reconcile' | 'logs';

export interface Stats {
  totalHouseholds: number;
  householdsWithCccd: number;
  householdsWithoutCccd: number;
  householdsPartial: number;
  totalMembers: number;
  membersWithoutCccd: number;
  membersUnmapped: number;
}

export interface HouseholdSummary {
  houseHoldId: number;
  houseHoldCode: string;
  houseHoldNumber: string | null;
  houseHoldStatus: string | null;
  regionId: string;
  regionName: string | null;
  addressId: number | null;
  addressName: string | null;
  fullAddress: string | null;
  isBigHouseHold: boolean | null;
  notes: string | null;
  headPersonalId: number | null;
  headName: string | null;
  headRelationCode: string | null;
  headRelationName: string | null;
  headCccd: string | null;
  headCccdMapped: boolean | null;
  memberCount: number;
  cccdCount: number;
  mappedCount: number;
  missingCccdCount: number;
}

export interface Member {
  personalId: number;
  fullName: string;
  lastName: string;
  firstName: string;
  relationCode: string | null;
  relationName: string | null;
  sexId: string | null;
  sexName: string | null;
  dateOfBirth: string | null;
  personStatus: string | null;
  invalidCode: string | null;
  invalidName: string | null;
  cccd: string | null;
  cccdOld: string | null;
  cccdMapped: boolean;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  motherId: number | null;
  motherName: string | null;
  updatedById: number | null;
  updatedByName: string | null;
}

export interface HouseholdDetail extends HouseholdSummary {
  members: Member[];
}

export interface MapLog {
  id: string;
  batchId: string;
  tempId: string;
  personalTable: string;
  personalKey: string;
  oldCccd: string | null;
  newCccd: string | null;
  oldBhyt: string | null;
  newBhyt: string | null;
  cccdChanged: boolean;
  bhytChanged: boolean;
  changedAt: string;
  changedBy: string;
  detailsJson: string | null;
  fileName: string | null;
  sheetName: string | null;
  importedBy: string | null;
  importedAt: string | null;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface HouseholdListResponse extends Paged<HouseholdSummary> {
  q: string;
  cccd: CccdFilter;
  includeInactive: boolean;
}

export interface PersonalLogsResponse extends Paged<MapLog> {
  person: {
    personalId: number;
    fullName: string;
    cccd: string | null;
    cccdOld: string | null;
    cccdMapped: boolean;
    houseHoldId: number;
  };
}

export interface LogsResponse extends Paged<MapLog> {
  q: string;
}

export interface HealthResponse {
  ok: boolean;
  demoMode: boolean;
  database?: string;
  login?: string | null;
  server?: string;
  serverTime?: string;
  error?: { message: string };
}

/* ------------------------------------------------------------------------- */
/* Rà soát chèn CCCD từ Excel                                                */
/* ------------------------------------------------------------------------- */

export type ReconcileIssue = 'name' | 'dob' | 'address' | 'sex';

export type ReconcileStatus =
  | 'ok'
  | 'name'
  | 'sex'
  | 'dob'
  | 'address'
  | 'cccd-diff'
  | 'not-inserted'
  | 'not-found';

export type ReconcileFilter =
  | 'all'
  | 'ok'
  | 'name'
  | 'sex'
  | 'dob'
  | 'address'
  | 'cccd-diff'
  | 'not-inserted'
  | 'not-found'
  | 'confirmed'
  | 'unconfirmed'
  | 'duplicates';

export interface ReconcilePerson {
  personalId: number;
  fullName: string;
  sex: string | null;
  sexLabel: string | null;
  dob: string | null;
  dobDisplay: string | null;
  cccd: string | null;
  cccdOld: string | null;
  cccdMapped: boolean;
  personStatus: string | null;
  relationCode: string | null;
  relationName: string | null;
  houseHoldId: number;
  houseHoldCode: string;
  houseHoldNumber: string | null;
  houseHoldStatus: string | null;
  addressName: string | null;
  fullAddress: string | null;
  regionName: string | null;
  isHead: boolean;
  headName: string | null;
}

export interface ReconcileCandidate extends ReconcilePerson {
  score: number;
}

export interface ReconcileDobDiff {
  issue: boolean;
  missing: boolean;
  sameDate: boolean | null;
  dayDiff: number | null;
  yearDiff: number | null;
  label: string;
}

export interface ReconcileComparison {
  issues: ReconcileIssue[];
  name: { same: boolean; excel: string; db: string | null };
  dob: ReconcileDobDiff | null;
  address: { same: boolean; missing: boolean; excel: string; db: string | null };
  sex: { same: boolean; excel: string | null; db: string | null };
}

export interface ReconcileExcelRow {
  stt: number;
  fullName: string;
  sex: string | null;
  sexLabel: string | null;
  dob: string | null;
  dobDisplay: string | null;
  hamlet: string;
  ward: string;
  city: string;
  cccd: string;
}

export type ReconcileFieldKey = 'name' | 'dob' | 'sex' | 'cccd' | 'address';

export type ReconcileSource = 'excel' | 'db';

export interface ReconcileConfirmation {
  confirmed: boolean;
  acceptDobDiff: boolean;
  acceptAddressDiff: boolean;
  sources: Partial<Record<ReconcileFieldKey, ReconcileSource>>;
  personalId: number | null;
  note: string;
  updatedAt: string | null;
}

export interface ReconcileItem {
  key: string;
  stt: number;
  rowNumber: number;
  duplicateInExcel: boolean;
  duplicateCount: number;
  status: ReconcileStatus;
  statusLabel: string;
  issues: ReconcileIssue[];
  matchedBy: 'cccd' | 'cccd-old' | 'name' | null;
  cccdInDb: string | null;
  cccdDuplicateCount: number;
  excel: ReconcileExcelRow;
  db: ReconcilePerson | null;
  candidates: ReconcileCandidate[];
  comparison: ReconcileComparison | null;
  confirmation: ReconcileConfirmation | null;
}

export interface ReconcileTotals {
  rows: number;
  matched: number;
  ok: number;
  name: number;
  sex: number;
  dob: number;
  address: number;
  'cccd-diff': number;
  'not-inserted': number;
  'not-found': number;
  withDobIssue: number;
  withAddressIssue: number;
  withNameIssue: number;
  duplicates: number;
  confirmed: number;
}

export interface ReconcileResponse extends Paged<ReconcileItem> {
  file: {
    name: string;
    sheetName: string;
    modifiedAt: string;
    rowCount: number;
  };
  region: { regionId: string; regionName: string | null };
  builtAt: string;
  totals: ReconcileTotals;
  q: string;
  issue: ReconcileFilter;
}

export interface ReconcileConfirmResponse {
  ok: boolean;
  record: ReconcileConfirmation & { stt: number; cccd: string } | null;
}
