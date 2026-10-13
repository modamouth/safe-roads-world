// ---------------------------------------------------------------------------
// Learning Lab content at runtime: experiences, the content register and UI
// strings, all bundled from /content as JSON.
//
// Release builds (VITE_RELEASE=1) only offer approved experiences; the rest
// show as "Coming soon". Draft builds mark figures that still need a source
// with a dagger (†) and a footnote.
// ---------------------------------------------------------------------------
import register from '../../content/register.json';
import ui from '../../content/locales/en.json';
import { fill, withUnit } from './core/format.js';

export const RELEASE = import.meta.env.VITE_RELEASE === '1';
export const LOCALE = 'en';
export const DAGGER = '†';

const files = import.meta.glob('../../content/learning-lab/*/en.json', { eager: true, import: 'default' });
const ALL = Object.values(files).sort((a, b) => a.order - b.order);
const CLAIMS = new Map(register.items.map(it => [it.id, it]));

export const allExperiences = () => ALL;
export const isOpen = exp => !RELEASE || exp.status === 'approved';
export const experience = slug => ALL.find(e => e.slug === slug) || null;
export const claim = id => CLAIMS.get(id);

/** Unverified figures get a dagger in draft builds. */
const mark = item => (!RELEASE && item.status === 'NEEDS_SOURCE' ? DAGGER : '');

/** Fill {claim:...} and {var:...} tokens in a content string. */
export const text = (str, vars) => fill(str, { claim, vars, mark });

/** A claim's value with its unit ("60 km/h"), marked if unverified. */
export const claimLabel = id => { const c = claim(id); return c && c.value != null ? withUnit(c.value, c.unit) + mark(c) : '[' + id + ']'; };

/** Does a string refer to any figure that still needs a source? */
export function hasUnverified(str) {
  return typeof str === 'string' && /\{claim:([^}|]+)/.test(str) && [...str.matchAll(/\{claim:([^}|]+)/g)].some(m => { const c = claim(m[1]); return !c || c.status === 'NEEDS_SOURCE'; });
}

/** UI string by dotted key, with {name} placeholders. Missing keys show the key. */
export function t(key, vars) {
  const s = key.split('.').reduce((o, k) => (o && o[k] != null ? o[k] : null), ui);
  if (typeof s !== 'string') return key;
  return vars ? s.replace(/\{(\w+)\}/g, (a, k) => (vars[k] != null ? String(vars[k]) : a)) : s;
}

/** "Source: Publisher, Title (date)" for a set of claims (deduplicated by source). */
export function sourceLine(ids) {
  const seen = new Set(), parts = [];
  let pending = false;
  ids.forEach(id => {
    const c = claim(id);
    if (!c || !c.source) { pending = true; return; }
    const k = c.source.publisher + '|' + c.source.title;
    if (seen.has(k)) return;
    seen.add(k);
    parts.push(c.source.publisher + ', ' + c.source.title + (c.source.date ? ' (' + c.source.date + ')' : ''));
  });
  if (!parts.length) return pending && !RELEASE ? t('lab.sourcePending') : '';
  return t('lab.source', { list: parts.join('; ') }) + (pending && !RELEASE ? ' ' + t('lab.sourcePartly') : '');
}

/**
 * City Safety Run checkpoints: quiz questions from topics marked `checkpoint`,
 * so the mission can reuse the Road rules questions instead of copying them.
 * Each item is { experience, topic, question, scene } with copy already filled in.
 */
export function checkpointQuestions() {
  const out = [];
  ALL.filter(isOpen).forEach(e => e.topics.filter(tp => tp.checkpoint).forEach(tp => tp.scenes
    .filter(s => s.type === 'quiz-ladder')
    .forEach(s => s.questions.forEach(q => out.push({
      experience: e.slug, topic: tp.id, scene: s.id,
      question: { ...q, line: q.line && text(q.line), prompt: text(q.prompt), reason: text(q.reason), options: q.options.map(o => ({ ...o, label: text(o.label) })) }
    })))));
  return out;
}
