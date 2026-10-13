// Checks Learning Lab content: schema, register, NSW denylist, and (with --release) the release gate.
//   node scripts/check-content.mjs            pilot/preview build: errors fail, unverified figures warn
//   node scripts/check-content.mjs --release  production: approved experiences may only use approved claims
import { loadContent } from './load-content.mjs';
import { checkContent } from '../src/lab/core/check.js';

const release = process.argv.includes('--release') || process.env.VITE_RELEASE === '1';
const quiet = process.argv.includes('--quiet');
const { errors, warnings, stats } = checkContent({ ...loadContent(), release });

if (!quiet) warnings.forEach(w => console.warn('warn  ' + w));
errors.forEach(e => console.error('ERROR ' + e));

const rows = Object.entries(stats).map(([slug, s]) =>
  `${slug.padEnd(16)} ${s.status.padEnd(10)} claims ${String(s.claims).padStart(3)}  approved ${String(s.approved).padStart(3)}  verified ${String(s.verified).padStart(3)}  needs source ${String(s.NEEDS_SOURCE).padStart(3)}${release && !s.ships ? '  (not shipped)' : ''}`);
if (rows.length) console.log('\n' + rows.join('\n'));
console.log(`\n${release ? 'Release' : 'Content'} check: ${errors.length} error(s), ${warnings.length} warning(s).`);
process.exit(errors.length ? 1 : 0);
