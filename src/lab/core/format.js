// ---------------------------------------------------------------------------
// String tokens and claim formatting (pure, no Phaser; shared with scripts).
//
// Content strings never contain facts or figures directly. They reference the
// content register with tokens, which are filled in at runtime:
//   {claim:id}        value with its unit, e.g. "60 km/h", "N$ 4 000", "45%"
//   {claim:id|value}  value only, e.g. "60"
//   {claim:id|text}   the register item's plain-language text
//   {var:name}        a runtime value set by a scene (e.g. the speed you picked)
//   {n:80 km/h}       a scenario number that is not a fact (a speed to try, a
//                     year in a sentence). Marking it keeps the checker happy and
//                     makes authors decide, every time, that a number isn't a claim.
// ---------------------------------------------------------------------------

export const TOKEN_RE = /\{(claim|var|n):([^}|]+)(?:\|(value|text|unit))?\}/g;

// Units written straight after the number, with no space.
const TIGHT = new Set(['%', 'x', '×', '°']);
// Units written before the number.
const PREFIX = new Set(['N$']);

/** Format a number for English (Namibia): thin grouping for thousands, up to 2 decimals. */
export function fmtNum(v) {
  if (typeof v !== 'number' || !isFinite(v)) return String(v);
  const r = Math.round(v * 100) / 100;
  const [i, d] = String(Math.abs(r)).split('.');
  const grouped = i.length > 4 ? i.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : i;
  return (r < 0 ? '-' : '') + grouped + (d ? '.' + d : '');
}

/** "60 km/h", "45%", "2x", "N$ 2 000" */
export function withUnit(value, unit) {
  const n = typeof value === 'number' ? fmtNum(value) : String(value);
  if (!unit) return n;
  if (PREFIX.has(unit)) return unit + ' ' + n;
  if (TIGHT.has(unit)) return n + unit;
  return n + ' ' + unit;
}

/** Every claim id a string refers to. */
export function claimRefs(str) {
  const out = [];
  if (typeof str !== 'string') return out;
  for (const m of str.matchAll(TOKEN_RE)) if (m[1] === 'claim') out.push(m[2]);
  return out;
}

/**
 * Replace tokens in `str`.
 * lookup.claim(id) returns a register item (or undefined); lookup.vars is a plain object.
 * lookup.mark(item) may return a suffix for unverified items (e.g. a dagger in draft builds).
 */
export function fill(str, lookup) {
  if (typeof str !== 'string') return str;
  return str.replace(TOKEN_RE, (all, kind, key, part) => {
    if (kind === 'n') return key;
    if (kind === 'var') {
      const v = lookup.vars ? lookup.vars[key] : undefined;
      return v == null ? '…' : typeof v === 'number' ? fmtNum(v) : String(v);
    }
    const item = lookup.claim ? lookup.claim(key) : undefined;
    if (!item) return '[' + key + ']';
    const mark = lookup.mark ? lookup.mark(item) : '';
    if (part === 'text') return item.text + mark;
    if (part === 'unit') return item.unit || '';
    if (item.value == null) return '[' + key + ']';
    return (part === 'value' ? (typeof item.value === 'number' ? fmtNum(item.value) : String(item.value)) : withUnit(item.value, item.unit)) + mark;
  });
}

/** Resolve "$claim:id" parameter strings (used in art and chart params) to the claim's value. */
export function resolveParams(obj, claim) {
  if (typeof obj === 'string') {
    const m = /^\$claim:(.+)$/.exec(obj);
    if (!m) return obj;
    const item = claim(m[1]);
    return item ? item.value : undefined;
  }
  if (Array.isArray(obj)) return obj.map(v => resolveParams(v, claim));
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const k of Object.keys(obj)) out[k] = resolveParams(obj[k], claim);
    return out;
  }
  return obj;
}

/** Every "$claim:id" parameter reference inside a value. */
export function paramRefs(obj, out = []) {
  if (typeof obj === 'string') { const m = /^\$claim:(.+)$/.exec(obj); if (m) out.push(m[1]); }
  else if (Array.isArray(obj)) obj.forEach(v => paramRefs(v, out));
  else if (obj && typeof obj === 'object') Object.values(obj).forEach(v => paramRefs(v, out));
  return out;
}
