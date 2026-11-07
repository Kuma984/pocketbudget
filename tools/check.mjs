import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root = fileURLToPath(new URL('../', import.meta.url));
const all = [];
function walk(dir) { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) { if (['.git', 'node_modules', 'vendor', 'tmp'].includes(entry.name)) continue; const p = path.join(dir, entry.name); if (entry.isDirectory()) walk(p); else all.push(p); } }
walk(root);
let failures = 0;
function fail(message) { console.error(message); failures++; }
for (const file of all) {
  if (/\.(js|mjs)$/.test(file)) {
    const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    if (result.status !== 0) fail(result.stderr);
    const source = fs.readFileSync(file, 'utf8');
    for (const match of source.matchAll(/(?:from\s+|import\s*)['"](\.[^'"]+)['"]/g)) {
      if (!fs.existsSync(path.resolve(path.dirname(file), match[1]))) fail(`Missing import: ${file}: ${match[1]}`);
    }
  }
  if (file.endsWith('.md')) {
    const source = fs.readFileSync(file, 'utf8');
    for (const match of source.matchAll(/\]\(([^)\s]+)\)/g)) {
      if (/^(https?:|#|mailto:)/.test(match[1])) continue;
      const target = match[1].split('#')[0];
      if (target && !fs.existsSync(path.resolve(path.dirname(file), target))) fail(`Missing doc link: ${file}: ${target}`);
    }
  }
}
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'public/manifest.webmanifest'), 'utf8'));
for (const icon of manifest.icons) if (!fs.existsSync(path.resolve(root, 'public', icon.src))) fail(`Missing manifest icon: ${icon.src}`);
const sw = fs.readFileSync(path.join(root, 'public/sw.js'), 'utf8');
const assetBlock = sw.match(/const ASSETS = (\[[\s\S]*?\]);/);
if (!assetBlock) fail('No ASSETS list');
else for (const asset of JSON.parse(assetBlock[1])) if (!fs.existsSync(path.resolve(root, 'public', asset))) fail(`Missing cache asset: ${asset}`);
if (failures) process.exit(1);
console.log('PASS: JS syntax, local imports, docs links, manifest and cache assets. PHP/MySQL/AI not tested by this check.');
