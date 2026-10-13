// ---------------------------------------------------------------------------
// Grading for the Learning Lab scene types (pure, no Phaser).
// ---------------------------------------------------------------------------

/**
 * Grade a quiz question.
 *   q.kind     'truefalse' | 'choice' (one correct option) | 'multi' (select all that apply)
 *   q.options  [{ id, correct }]
 * Returns { correct, partial, right: ids, wrong: ids, missed: ids }.
 */
export function gradeQuestion(q, selected) {
  const sel = new Set(Array.isArray(selected) ? selected : [selected]);
  const right = [], wrong = [], missed = [];
  q.options.forEach(o => {
    if (sel.has(o.id) && o.correct) right.push(o.id);
    else if (sel.has(o.id)) wrong.push(o.id);
    else if (o.correct) missed.push(o.id);
  });
  const correct = !wrong.length && !missed.length && right.length > 0;
  return { correct, partial: !correct && right.length > 0, right, wrong, missed };
}

/**
 * Tap-all-that-apply verdict.
 *   green  every target found, nothing wrong
 *   orange some targets found (or all found plus extras)
 *   red    no targets found
 * marks[id] is 'ok' | 'wrong' | 'missed' (unmarked items are omitted).
 */
export function gradeHotspots(items, selected) {
  const sel = new Set(selected);
  const marks = {};
  let ok = 0, wrong = 0, missed = 0;
  items.forEach(it => {
    if (sel.has(it.id) && it.correct) { marks[it.id] = 'ok'; ok++; }
    else if (sel.has(it.id)) { marks[it.id] = 'wrong'; wrong++; }
    else if (it.correct) { marks[it.id] = 'missed'; missed++; }
  });
  const verdict = !wrong && !missed && ok ? 'green' : ok ? 'orange' : 'red';
  return { verdict, marks, ok, wrong, missed };
}

/**
 * Place-on-road verdict for a 1-D position. `zones` are [{ from, to, result }]
 * checked in order; the first zone containing the position wins. A position
 * in no zone gets `fallback`.
 */
export function gradePlacement(pos, zones, fallback) {
  const z = zones.find(r => pos >= Math.min(r.from, r.to) && pos <= Math.max(r.from, r.to));
  return z ? z.result : fallback;
}

/** Was a prediction right? Numeric answers match within a small tolerance. */
export function predictionCorrect(answer, guess) {
  if (guess == null || answer == null) return false;
  if (typeof answer === 'number' && typeof guess === 'number') return Math.abs(answer - guess) < 1e-9;
  return String(answer) === String(guess);
}

/** The score band for `score` out of `total`: bands sorted by `min` fraction (0..1), highest match wins. */
export function band(score, total, bands) {
  const f = total ? score / total : 0;
  return bands.slice().sort((a, b) => b.min - a.min).find(b => f >= b.min) || null;
}
