// ---------------------------------------------------------------------------
// Content checks for the Learning Lab (scripts and tests only).
//
// checkContent() returns { errors, warnings, stats }. Errors always fail the
// build. In release mode, extra rules apply: every claim used by an approved
// experience must itself be approved, and copy must not contain bare numbers.
// Experiences that aren't approved are left out of a release build.
// ---------------------------------------------------------------------------
import { experienceSchema, registerSchema, denylistSchema } from './schema.js';
import { resolveParams, withUnit, TOKEN_RE } from './format.js';
import { proseStrings, experienceClaims, NAME_NUMBERS } from './walk.js';
import { SERIES } from './derive.js';

export { proseStrings, sceneClaims, experienceClaims } from './walk.js';

const norm = s => s.toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, ' ');

function zodIssues(res, where) {
  return res.success ? [] : res.error.issues.map(i => where + ': ' + (i.path.join('.') || '(root)') + ': ' + i.message);
}

/** Numeric arrays a scene shows: prediction options, chart values (quoted or derived). */
export function sceneValueSets(scene, claim) {
  const sets = [];
  if (scene.type === 'prediction' && scene.format === 'numeric') sets.push({ what: 'options', values: scene.options });
  if (scene.type === 'chart') {
    if (scene.points) {
      const vals = scene.points.map(p => claim(p.claim)).filter(Boolean).map(c => c.value).filter(v => typeof v === 'number');
      if (vals.length >= 2) sets.push({ what: 'chart values', values: vals });
    }
    if (scene.derive && SERIES[scene.derive.fn]) {
      const p = resolveParams(scene.derive.params, claim);
      if (Object.values(p).every(v => v != null)) {
        try { sets.push({ what: 'derived chart values', values: SERIES[scene.derive.fn](p).map(d => Math.round(d.value)) }); } catch (e) { /* reported elsewhere */ }
      }
    }
  }
  return sets;
}

const sameSet = (a, b) => a.length === b.length && a.slice().sort((x, y) => x - y).every((v, i) => Math.abs(v - b.slice().sort((x, y) => x - y)[i]) < 1e-9);

export function checkContent({ experiences, register, denylist, release = false }) {
  const errors = [], warnings = [];
  const E = m => errors.push(m), Wn = m => warnings.push(m);

  // --- schemas ---------------------------------------------------------------
  errors.push(...zodIssues(registerSchema.safeParse(register), 'content/register.json'));
  errors.push(...zodIssues(denylistSchema.safeParse(denylist), 'content/nsw-denylist.json'));
  experiences.forEach(({ file, data }) => errors.push(...zodIssues(experienceSchema.safeParse(data), file)));
  if (errors.length) return { errors, warnings, stats: {} };

  // --- register rules --------------------------------------------------------
  const items = new Map();
  register.items.forEach(it => {
    if (items.has(it.id)) E('register: duplicate id ' + it.id);
    items.set(it.id, it);
    if (it.status !== 'NEEDS_SOURCE' && !it.source) E('register: ' + it.id + ' is ' + it.status + ' but has no source');
    if (it.status !== 'NEEDS_SOURCE' && it.value == null) E('register: ' + it.id + ' is ' + it.status + ' but has no value');
    if (it.status === 'approved' && (!it.reviewer || !it.approved_on)) E('register: ' + it.id + ' is approved but has no reviewer or approved_on date');
    if (it.status !== 'approved' && (it.reviewer || it.approved_on)) Wn('register: ' + it.id + ' has a reviewer/approval date but status ' + it.status);
  });
  const claim = id => items.get(id);

  // --- denylist ----------------------------------------------------------------
  const phrases = denylist.phrases.map(p => ({ ...p, n: norm(p.text) }));
  const patterns = denylist.patterns.map(p => ({ ...p, rx: new RegExp(p.re, 'i') }));
  const denyText = (text, where) => {
    const n = norm(text);
    phrases.forEach(p => { if (n.includes(p.n)) E(where + ': NSW phrase "' + p.text + '"' + (p.note ? ' (' + p.note + ')' : '')); });
    // Scenario numbers ({n:...}) stay in, so an NSW figure can't hide inside one.
    const plain = text.replace(TOKEN_RE, (all, kind, key) => (kind === 'n' ? key : ' '));
    patterns.forEach(p => { if (p.rx.test(plain)) E(where + ': NSW figure /' + p.re + '/' + (p.note ? ' (' + p.note + ')' : '')); });
  };
  const denySet = (values, where) => denylist.valueSets.forEach(s => {
    if (sameSet(values, s.values)) E(where + ': matches an NSW set of figures [' + s.values.join(', ') + ']' + (s.note ? ' (' + s.note + ')' : ''));
  });

  // --- experiences -------------------------------------------------------------
  const stats = {};
  const used = new Set();
  const slugs = new Set();
  experiences.forEach(({ file, data: exp }) => {
    if (slugs.has(exp.slug + '/' + exp.locale)) E(file + ': duplicate slug ' + exp.slug);
    slugs.add(exp.slug + '/' + exp.locale);
    const ships = !release || exp.status === 'approved';
    const expClaims = experienceClaims(exp);

    expClaims.forEach(c => {
      used.add(c);
      if (!claim(c)) E(file + ': unknown claim "' + c + '"');
      if (!exp.sources.includes(c)) E(file + ': claim "' + c + '" is used but missing from sources[]');
    });
    exp.sources.forEach(c => { if (!claim(c)) E(file + ': sources[] lists unknown claim "' + c + '"'); });

    proseStrings({ title: exp.title, label: exp.label, headline: exp.headline, intro: exp.intro, contentNotice: exp.contentNotice }).forEach(s => denyText(s.text, file + ':' + s.path));

    exp.topics.forEach(topic => {
      const seen = new Set();
      proseStrings({ title: topic.title, blurb: topic.blurb, contentNotice: topic.contentNotice }).forEach(s => denyText(s.text, file + ':' + topic.id + '.' + s.path));
      topic.scenes.forEach((sc, i) => {
        const where = file + ':' + topic.id + '/' + sc.id;
        if (seen.has(sc.id)) E(where + ': duplicate scene id');
        seen.add(sc.id);

        proseStrings(sc).forEach(s => {
          denyText(s.text, where + '.' + s.path);
          const bare = s.text.replace(TOKEN_RE, '').replace(NAME_NUMBERS, '');
          if (/\d/.test(bare)) (release && ships ? E : Wn)(where + '.' + s.path + ': number written into copy ("' + s.text.slice(0, 60) + '"). Use a {claim:...} token.');
        });
        sceneValueSets(sc, claim).forEach(v => denySet(v.values, where + ' ' + v.what));

        if (sc.type === 'prediction') {
          const ans = claim(sc.answerClaim);
          if (sc.format === 'numeric') {
            if (ans && typeof ans.value === 'number' && !sc.options.includes(ans.value)) E(where + ': answer ' + ans.value + ' (from ' + sc.answerClaim + ') is not one of the options');
            if (ans && ans.value != null && typeof ans.value !== 'number') E(where + ': numeric prediction needs a numeric claim');
          } else {
            if (sc.answer == null) E(where + ': ' + sc.format + ' prediction needs an answer');
            else if (!sc.options.some(o => o.id === sc.answer)) E(where + ': answer "' + sc.answer + '" is not an option id');
          }
        }
        if (sc.type === 'reveal') {
          const j = topic.scenes.findIndex(s => s.id === sc.of);
          if (j < 0 || topic.scenes[j].type !== 'prediction') E(where + ': reveal.of "' + sc.of + '" is not a prediction in this topic');
          else if (j > i) E(where + ': reveal comes before its prediction');
        }
        if (sc.type === 'quiz-ladder') sc.questions.forEach(q => {
          if (!q.options.some(o => o.correct)) E(where + '/' + q.id + ': no correct option');
          if (q.kind !== 'multi' && q.options.filter(o => o.correct).length > 1) E(where + '/' + q.id + ': more than one correct option (use kind "multi")');
        });
        if (sc.type === 'choice' && sc.retry && !sc.options.some(o => o.verdict === 'good')) E(where + ': retry needs at least one "good" option');
        if (sc.type === 'tap-hotspots' && !sc.items.some(it => it.correct)) E(where + ': no correct hotspot');
        if (sc.type === 'pick-a-point' && !sc.points.some(p => p.verdict === 'good')) E(where + ': no "good" point');
        if (sc.type === 'place-on-road') {
          [...sc.zones.map(z => z.result), sc.fallback].forEach(r => { if (!sc.results[r]) E(where + ': no copy for result "' + r + '"'); });
        }
        if (sc.type === 'chart' && !sc.points && !sc.derive && !sc.pictogram) E(where + ': chart needs points, derive or pictogram');
        if (sc.type === 'toggle-lab' && sc.initial && !sc.initial.startsWith('$var:') && !sc.states.some(s => s.id === sc.initial)) E(where + ': initial state "' + sc.initial + '" not found');
      });
    });

    // Release gate: claims behind an approved experience must be approved.
    const counts = { approved: 0, verified: 0, NEEDS_SOURCE: 0 };
    expClaims.forEach(c => { const it = claim(c); if (it) counts[it.status]++; });
    stats[exp.slug] = { status: exp.status, version: exp.version, claims: expClaims.length, ...counts, ships };
    if (release && exp.status === 'approved') {
      expClaims.forEach(c => { const it = claim(c); if (it && it.status !== 'approved') E(file + ': approved experience uses ' + it.status + ' claim "' + c + '"'); });
    }
    if (release && exp.status !== 'approved') Wn(file + ': status ' + exp.status + '; left out of the release build');
    if (!release && counts.NEEDS_SOURCE) Wn(file + ': ' + counts.NEEDS_SOURCE + ' claim(s) still NEEDS_SOURCE');
  });

  // Register items that the content uses are checked against the denylist too.
  register.items.forEach(it => {
    if (!used.has(it.id) || it.denylistOverride) return;
    denyText(it.text + ' ' + (it.value != null ? withUnit(it.value, it.unit) : ''), 'register:' + it.id);
  });

  return { errors, warnings, stats };
}
