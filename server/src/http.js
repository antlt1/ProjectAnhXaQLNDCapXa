export function asString(value, maxLength = 200) {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === 'string' ? raw.trim().slice(0, maxLength) : '';
}

export function asInt(value, fallback = null) {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function asBool(value) {
  const raw = Array.isArray(value) ? value[0] : value;
  return ['1', 'true', 'yes', 'on'].includes(String(raw ?? '').toLowerCase());
}

export function asEnum(value, allowed, fallback) {
  const raw = asString(value, 50);
  return allowed.includes(raw) ? raw : fallback;
}

export function parsePaging(query) {
  const page = Math.max(1, asInt(query.page, 1));
  const pageSize = Math.min(100, Math.max(1, asInt(query.pageSize, 20)));
  return { page, pageSize };
}
