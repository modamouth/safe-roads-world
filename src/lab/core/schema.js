// ---------------------------------------------------------------------------
// Content schema (Zod). Used by scripts/check-content.mjs and the tests only;
// the game itself never imports this file, so Zod stays out of the bundle.
// ---------------------------------------------------------------------------
import { z } from 'zod';
import { ART_KINDS } from '../art/kinds.js';

const str = z.string().min(1);
const id = z.string().regex(/^[a-z0-9][a-z0-9-]*$/, 'lower-case id: letters, digits, hyphens');
const claimId = z.string().regex(/^[a-z0-9][a-z0-9._-]*$/, 'claim id');
const params = z.record(z.any()).optional();
// alt: a short description of the illustration for screen readers.
const art = z.object({ kind: z.enum(ART_KINDS), params, alt: z.string().min(1) }).strict();

const base = {
  id,
  sensitive: z.boolean().optional(),   // skipped when the player opts out on the content notice
  claims: z.array(claimId).optional()  // extra claims a scene relies on (beyond tokens in its text)
};

const option = z.object({ id, label: str }).strict();

const prediction = z.object({
  ...base, type: z.literal('prediction'),
  question: str,
  format: z.enum(['numeric', 'truefalse', 'choice']),
  options: z.union([z.array(z.number()).min(2), z.array(option).min(2)]),
  unit: z.string().optional(),
  answer: z.union([z.string(), z.number()]).optional(),  // option id for truefalse/choice; numeric answers come from answerClaim
  answerClaim: claimId,                                   // the register item that makes the answer true
  note: z.string().optional()
}).strict();

const story = z.object({ ...base, type: z.literal('story'), lines: z.array(str).min(1), art: art.optional(), button: z.string().optional() }).strict();

const choiceOption = z.object({
  id, label: str,
  value: z.union([z.string(), z.number()]).optional(),
  verdict: z.enum(['good', 'ok', 'bad']).optional(),
  title: z.string().optional(),
  reason: z.string().optional(),
  play: z.boolean().optional()  // ask the art to animate this outcome before the verdict
}).strict();

const choice = z.object({
  ...base, type: z.literal('choice'),
  prompt: str, art: art.optional(),
  options: z.array(choiceOption).min(2),
  retry: z.boolean().optional(),   // a 'bad' answer offers "Try another"
  record: z.string().optional(),   // save the chosen option's value as {var:<record>}
  layout: z.enum(['list', 'row']).optional()
}).strict();

const toggleLab = z.object({
  ...base, type: z.literal('toggle-lab'),
  prompt: str, art,
  states: z.array(z.object({ id, label: str, caption: z.string().optional(), params }).strict()).min(2).max(4),
  requireAll: z.boolean().optional(),
  initial: z.string().optional()   // a state id, or "$var:name" to start on a chosen value
}).strict();

const question = z.object({
  id, kind: z.enum(['truefalse', 'choice', 'multi']),
  line: z.string().optional(),     // narrated scenario line before the question
  prompt: str,
  options: z.array(z.object({ id, label: str, correct: z.boolean().optional() }).strict()).min(2),
  reason: str,
  art: art.optional()
}).strict();

const quizLadder = z.object({
  ...base, type: z.literal('quiz-ladder'),
  intro: z.string().optional(),
  questions: z.array(question).min(1),
  score: z.object({ bands: z.array(z.object({ min: z.number().min(0).max(1), title: str, body: str }).strict()).min(1) }).strict().optional()
}).strict();

const tapHotspots = z.object({
  ...base, type: z.literal('tap-hotspots'),
  prompt: str, art,
  items: z.array(z.object({
    id, label: str, x: z.number(), y: z.number(), w: z.number().optional(), h: z.number().optional(),
    kind: z.string().optional(), color: z.string().optional(), correct: z.boolean()
  }).strict()).min(2),
  feedback: z.object({ green: str, orange: str, red: str }).strict(),
  retry: z.boolean().optional()
}).strict();

const resultCopy = z.object({ tone: z.enum(['good', 'ok', 'bad']), title: str, body: str, retry: z.boolean().optional() }).strict();
const placeOnRoad = z.object({
  ...base, type: z.literal('place-on-road'),
  prompt: str, art,
  start: z.number(), range: z.tuple([z.number(), z.number()]), step: z.number().positive(),
  zones: z.array(z.object({ from: z.number(), to: z.number(), result: id }).strict()).min(1),
  fallback: id,
  results: z.record(resultCopy)
}).strict();

const pickAPoint = z.object({
  ...base, type: z.literal('pick-a-point'),
  prompt: str, art,
  points: z.array(z.object({
    id, label: str, x: z.number(), y: z.number(),
    verdict: z.enum(['good', 'ok', 'bad']), title: str, reason: str, play: z.boolean().optional()
  }).strict()).min(2),
  until: z.enum(['correct', 'all']).optional()
}).strict();

const stepper = z.object({
  ...base, type: z.literal('stepper'),
  title: str, art: art.optional(),
  steps: z.array(z.object({ title: str, body: str, highlight: z.string().optional() }).strict()).min(2)
}).strict();

const point = z.object({ x: z.union([z.number(), z.string()]), label: z.string().optional(), claim: claimId }).strict();
const chart = z.object({
  ...base, type: z.literal('chart'),
  title: str, kind: z.enum(['line', 'bar', 'stacked', 'pictogram']),
  x: z.object({ label: str, unit: z.string().optional() }).strict().optional(),
  y: z.object({ label: str, unit: z.string().optional(), max: z.number().optional() }).strict().optional(),
  points: z.array(point).optional(),
  derive: z.object({ fn: z.enum(['stopping', 'power', 'distanceAt']), params: z.record(z.any()), claims: z.array(claimId).min(1) }).strict().optional(),
  parts: z.array(str).optional(),  // legend for stacked bars
  // n of `of` icons are filled; with `per` the claim is a rate (e.g. 33 per 100) scaled to `of` icons.
  pictogram: z.object({ of: z.number().int().min(2).max(20), claim: claimId, per: z.number().positive().optional(), icon: z.string().optional() }).strict().optional(),
  highlight: z.union([z.number(), z.string()]).optional(),
  caption: z.string().optional()
}).strict();

const reveal = z.object({ ...base, type: z.literal('reveal'), of: id, explain: str }).strict();
const remember = z.object({ ...base, type: z.literal('always-remember'), lines: z.array(str).length(3) }).strict();

const link = z.object({ name: str, desc: z.string().optional(), url: z.string().url() }).strict();
const stories = z.object({
  ...base, type: z.literal('stories'),
  title: str,
  fictional: z.literal(true),           // real survivor stories are out of scope (see IP-AND-CARE.md)
  label: str,                           // e.g. "A made-up story, based on common situations"
  warning: str,
  paragraphs: z.array(str).min(1),
  signpost: z.object({ text: str, links: z.array(link).min(1) }).strict()
}).strict();

const resources = z.object({ ...base, type: z.literal('resources'), intro: z.string().optional(), items: z.array(link).min(1) }).strict();

export const sceneSchema = z.discriminatedUnion('type', [
  prediction, story, choice, toggleLab, quizLadder, tapHotspots, placeOnRoad, pickAPoint,
  stepper, chart, reveal, remember, stories, resources
]);

const notice = z.object({ text: str }).strict();

export const experienceSchema = z.object({
  slug: id,
  version: z.number().int().min(1),
  status: z.enum(['draft', 'in_review', 'approved']),
  locale: z.string().regex(/^[a-z]{2,3}(-[A-Z]{2})?$/),
  order: z.number().int(),
  label: str,              // short name for menu tiles
  title: str,
  headline: str,
  intro: str,
  icon: str,
  minutes: z.number().int().positive(),
  contentNotice: notice.optional(),
  sources: z.array(claimId),
  topics: z.array(z.object({
    id, title: str, icon: z.string().optional(), blurb: z.string().optional(),
    contentNotice: notice.optional(),
    checkpoint: z.boolean().optional(),   // its quiz questions can be reused as City Safety Run checkpoints
    scenes: z.array(sceneSchema).min(1)
  }).strict()).min(1)
}).strict();

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD');
export const registerItemSchema = z.object({
  id: claimId,
  text: str,
  value: z.union([z.number(), z.string(), z.null()]),
  unit: z.string().optional(),
  source: z.object({ publisher: str, title: str, url: z.string().url(), date: z.string(), locator: z.string().optional() }).strict().nullable(),
  jurisdiction: z.enum(['Namibia', 'International']),
  reviewer: z.string().nullable(),
  approved_on: date.nullable(),
  status: z.enum(['NEEDS_SOURCE', 'verified', 'approved']),
  notes: z.string().optional(),
  denylistOverride: z.string().optional()   // why a figure that matches the NSW denylist is genuinely ours
}).strict();

export const registerSchema = z.object({ version: z.number().int(), items: z.array(registerItemSchema) }).strict();

export const denylistSchema = z.object({
  phrases: z.array(z.object({ text: str, note: z.string().optional() }).strict()),
  patterns: z.array(z.object({ re: str, note: z.string().optional() }).strict()),
  valueSets: z.array(z.object({ values: z.array(z.number()).min(2), note: z.string().optional() }).strict())
}).strict();
