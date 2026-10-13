// Rewrites each experience's sources[] to exactly the claims its scenes use.
// Run after editing content:  npm run content:sync
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadContent, ROOT } from './load-content.mjs';
import { experienceClaims } from '../src/lab/core/walk.js';

const { experiences } = loadContent();
let changed = 0;
for (const { file, data } of experiences) {
  const used = experienceClaims(data).sort();
  if (JSON.stringify(used) !== JSON.stringify(data.sources)) {
    data.sources = used;
    writeFileSync(join(ROOT, file), JSON.stringify(data, null, 2) + '\n');
    changed++;
    console.log('updated ' + file + ' (' + used.length + ' claims)');
  }
}
console.log(changed ? changed + ' file(s) updated.' : 'All sources[] lists are up to date.');
