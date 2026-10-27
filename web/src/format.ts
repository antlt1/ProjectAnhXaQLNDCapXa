import type { ReconcileIssue, ReconcileStatus } from './types';

const dateTimeFormatter = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const numberFormatter = new Intl.NumberFormat('vi-VN');

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return dateTimeFormatter.format(date);
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return numberFormatter.format(value);
}

export function initials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
  return `${first}${last}`.toUpperCase();
}

export interface StatusMeta {
  label: string;
  tone: 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'violet';
}

export function personStatusMeta(status: string | null | undefined): StatusMeta {
  // Quy ước của ứng dụng nguồn: bỏ qua 'G', 'D', 'R' khi tính nhân khẩu đang theo dõi.
  switch (status) {
    case 'D':
      return { label: 'Không còn hoạt động (D)', tone: 'warning' };
    case 'G':
      return { label: 'Không còn hoạt động (G)', tone: 'neutral' };
    case 'R':
      return { label: 'Đã xóa (R)', tone: 'neutral' };
    case 'N':
      return { label: 'Biến động (N)', tone: 'info' };
    case 'S':
      return { label: 'Biến động (S)', tone: 'info' };
    case 'M':
      return { label: 'Biến động (M)', tone: 'info' };
    default:
      return { label: 'Đang sinh sống', tone: 'success' };
  }
}

export function householdStatusMeta(status: string | null | undefined): StatusMeta {
  switch (status) {
    case 'D':
      return { label: 'Hộ đã chuyển đi', tone: 'warning' };
    case 'G':
      return { label: 'Ngừng theo dõi', tone: 'neutral' };
    default:
      return { label: 'Đang hoạt động', tone: 'success' };
  }
}

export function mappingLabel(mapped: boolean | null | undefined): StatusMeta {
  if (mapped === true) return { label: 'Đã ánh xạ', tone: 'success' };
  if (mapped === false) return { label: 'Chưa ánh xạ', tone: 'danger' };
  return { label: 'Chưa xác định', tone: 'neutral' };
}

export function coverageSummary(input: {
  memberCount: number;
  cccdCount: number;
  missingCccdCount: number;
}): StatusMeta {
  if (input.memberCount === 0) return { label: 'Không có nhân khẩu', tone: 'neutral' };
  if (input.cccdCount === 0) return { label: 'Chưa có CCCD', tone: 'danger' };
  if (input.missingCccdCount > 0) {
    return { label: `Thiếu ${input.missingCccdCount} người`, tone: 'warning' };
  }
  return { label: 'Đủ CCCD', tone: 'success' };
}

export function reconcileStatusMeta(status: ReconcileStatus): StatusMeta {
  switch (status) {
    case 'ok':
      return { label: 'Khớp', tone: 'success' };
    case 'dob':
      return { label: 'Lệch năm sinh', tone: 'warning' };
    case 'address':
      return { label: 'Lệch địa chỉ', tone: 'warning' };
    case 'sex':
      return { label: 'Sai giới tính', tone: 'warning' };
    case 'name':
      return { label: 'Sai tên', tone: 'danger' };
    case 'cccd-diff':
      return { label: 'Khác số CCCD', tone: 'violet' };
    case 'not-inserted':
      return { label: 'Chưa chèn CCCD', tone: 'danger' };
    default:
      return { label: 'Không thấy trong CSDL', tone: 'neutral' };
  }
}

export function reconcileIssueLabel(issue: ReconcileIssue): string {
  switch (issue) {
    case 'dob':
      return 'Lệch năm sinh';
    case 'address':
      return 'Lệch địa chỉ';
    case 'sex':
      return 'Sai giới tính';
    default:
      return 'Sai tên';
  }
}

export function prettyJson(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}
