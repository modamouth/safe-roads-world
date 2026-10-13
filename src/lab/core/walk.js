// ---------------------------------------------------------------------------
// Walk content objects: player-facing strings and the claims a scene uses.
// Pure and dependency-free, so both the game and the checker can use it.
// ---------------------------------------------------------------------------
import { claimRefs, paramRefs } from './format.js';

// Keys whose string values are identifiers or settings, not player-facing copy.
const NOT_PROSE = new Set(['id', 'type', 'kind', 'format', 'unit', 'verdict', 'url', 'record', 'initial', 'fn', 'of',
  'highlight', 'tone', 'result', 'fallback', 'icon', 'slug', 'status', 'locale', 'claim', 'answerClaim', 'answer', 'color', 'x']);
const SKIP_SUBTREES = new Set(['claims', 'sources', 'derive']);
// Inside art params only these keys are shown to players (labels, place names).
const PARAM_PROSE = new Set(['label', 'name', 'caption', 'title', 'text']);

function paramStrings(obj, path, out) {
  if (Array.isArray(obj)) obj.forEach((v, i) => paramStrings(v, path + '[' + i + ']', out));
  else if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === 'string') { if (PARAM_PROSE.has(k)) out.push({ path: path + '.' + k, text: v }); }
      else paramStrings(v, path + '.' + k, out);
    }
  }
}

// Digits that are names, not figures: road numbers (B1, C28, M45).
export const NAME_NUMBERS = /\b[A-Z]{1,2}\d{1,4}\b/g;

/** Every player-facing string in an object, with a readable path. */
export function proseStrings(obj, path = '', out = []) {
  if (typeof obj === 'string') { out.push({ path, text: obj }); return out; }
  if (Array.isArray(obj)) { obj.forEach((v, i) => proseStrings(v, path + '[' + i + ']', out)); return out; }
  if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      if (SKIP_SUBTREES.has(k)) continue;
      if (k === 'params') { paramStrings(v, path ? path + '.params' : 'params', out); continue; }
      if (typeof v === 'string' && NOT_PROSE.has(k)) continue;
      proseStrings(v, path ? path + '.' + k : k, out);
    }
  }
  return out;
}

/** Claim ids a scene uses: tokens in its copy, $claim params, and explicit fields. */
export function sceneClaims(scene) {
  const ids = new Set(scene.claims || []);
  proseStrings(scene).forEach(s => claimRefs(s.text).forEach(c => ids.add(c)));
  paramRefs(scene).forEach(c => ids.add(c));
  if (scene.answerClaim) ids.add(scene.answerClaim);
  if (scene.type === 'chart') (scene.points || []).forEach(p => ids.add(p.claim));
  if (scene.pictogram) ids.add(scene.pictogram.claim);
  if (scene.derive) scene.derive.claims.forEach(c => ids.add(c));
  return [...ids];
}

export const experienceClaims = exp => [...new Set(exp.topics.flatMap(t => t.scenes.flatMap(sceneClaims)))];
