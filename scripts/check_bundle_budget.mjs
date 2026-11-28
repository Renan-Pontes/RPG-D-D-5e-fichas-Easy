import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

const ROOT = resolve(import.meta.dirname, '..');
const argPath = process.argv[2] ? resolve(process.argv[2]) : join(ROOT, 'frontend', 'dist');
const DIST = argPath.endsWith('assets') ? argPath : join(argPath, 'assets');
const ENTRY_GZIP_BUDGET_KB = 250;

const files = readdirSync(DIST)
  .filter(f => f.endsWith('.js'))
  .map(f => {
    const raw = readFileSync(join(DIST, f));
    const rawKb = statSync(join(DIST, f)).size / 1024;
    const gzKb = gzipSync(raw).length / 1024;
    return { name: f, rawKb, gzKb };
  })
  .sort((a, b) => b.gzKb - a.gzKb);

const entry = files.find(f => /^app-|^index-/.test(f.name));
console.log('Top JS Chunks (gzip):');
for (const f of files.slice(0, 12)) {
  console.log(`  ${f.name.padEnd(36)} ${f.rawKb.toFixed(1).padStart(8)} kB  (${f.gzKb.toFixed(1).padStart(6)} kB gz)`);
}
if (!entry) {
  console.error('ERROR: No app/index entry chunk found in dist/assets');
  process.exit(1);
}
if (entry.gzKb > ENTRY_GZIP_BUDGET_KB) {
  console.error(`FAIL: Entry chunk ${entry.name} (${entry.gzKb.toFixed(1)} kB gz) exceeds ${ENTRY_GZIP_BUDGET_KB} kB budget`);
  process.exit(1);
}
console.log(`PASS: Entry chunk ${entry.name} is ${entry.gzKb.toFixed(1)} kB gz (budget <= ${ENTRY_GZIP_BUDGET_KB} kB)`);
