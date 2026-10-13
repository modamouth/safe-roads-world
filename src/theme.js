// ---------------------------------------------------------------------------
// Design tokens shared by every Learning Lab experience, so the twelve feel
// like one product. See docs/learning-lab/STYLE.md for how to use them.
// Colours come from config.COLORS; text colours here pass WCAG AA (4.5:1) on
// the navy panels and dusk background.
// ---------------------------------------------------------------------------
import { COLORS as C } from './config.js';

export const TYPE = { display: 40, h1: 32, h2: 25, lead: 21, body: 19, small: 16, tiny: 14 };

export const INK = {
  strong: '#FFFFFF',   // headings
  body: '#E6EDF5',     // body copy
  muted: '#B9C6D6',    // secondary copy
  faint: '#9AA6B5',    // footnotes (on navy only)
  accent: '#FFCB2B',   // yellow: selection and key figures
  link: '#5FD0E0',     // teal: links and labels
  dark: '#0B1B2E'      // text on yellow
};

export const SPACE = { gutter: 28, gap: 16, panelPad: 24, radius: 18 };

// Layout bands in the 540x960 design space.
export const BAND = { chrome: 88, artTop: 100, artBottom: 520, primaryY: 856, footY: 940 };

// Verdicts never rely on colour alone: each has a symbol and a word.
export const VERDICT = {
  good: { color: C.green, hex: '#4ED18A', symbol: '✓', word: 'good' },
  ok: { color: 0xFFB020, hex: '#FFB54A', symbol: '!', word: 'okay' },
  bad: { color: C.red, hex: '#FF7A7E', symbol: '✕', word: 'bad' }
};

// Hotspot marks: colour plus a symbol and a pattern-free label in the legend.
export const MARK = {
  sel: { color: 0xFFFFFF, symbol: '●' },
  ok: { color: C.green, symbol: '✓' },
  wrong: { color: C.red, symbol: '✕' },
  missed: { color: 0xFF8A1F, symbol: '!' }
};

// Chart series colours (distinct in lightness as well as hue) and their dash styles.
export const SERIES_STYLE = [
  { color: C.yellow, dash: null },
  { color: C.teal, dash: [8, 6] },
  { color: 0xF2F2F2, dash: [3, 5] }
];
