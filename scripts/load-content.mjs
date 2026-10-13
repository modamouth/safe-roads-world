// Reads the Learning Lab content from disk (Node). Shared by the check and status scripts and the tests.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const json = p => JSON.parse(readFileSync(p, 'utf8'));

export function loadContent(root = ROOT) {
  const dir = join(root, 'content', 'learning-lab');
  const experiences = [];
  if (existsSync(dir)) {
    for (const slug of readdirSync(dir, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name).sort()) {
      for (const f of readdirSync(join(dir, slug)).filter(f => f.endsWith('.json')).sort()) {
        experiences.push({ file: 'content/learning-lab/' + slug + '/' + f, data: json(join(dir, slug, f)) });
      }
    }
  }
  return {
    experiences,
    register: json(join(root, 'content', 'register.json')),
    denylist: json(join(root, 'content', 'nsw-denylist.json'))
  };
}
