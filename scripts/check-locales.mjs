// Fails if any locale has keys missing from (or extra to) en. Nested keys are
// compared by their dotted path. Run in CI so a missed translation shows up in
// the PR instead of silently falling back to English.
import { readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'locales');

function keys(obj, prefix = '') {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v) ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]
  );
}

const load = (lang, ns) => {
  try {
    return new Set(keys(JSON.parse(readFileSync(join(root, lang, ns), 'utf8'))));
  } catch {
    return null;
  }
};

const namespaces = readdirSync(join(root, 'en')).filter((f) => f.endsWith('.json'));
const langs = readdirSync(root).filter((l) => l !== 'en');
let problems = 0;

for (const ns of namespaces) {
  const base = load('en', ns);
  for (const lang of langs) {
    const other = load(lang, ns);
    if (!other) {
      console.error(`${lang}/${ns}: file missing or invalid JSON`);
      problems++;
      continue;
    }
    for (const k of base) if (!other.has(k)) { console.error(`${lang}/${ns}: missing "${k}"`); problems++; }
    for (const k of other) if (!base.has(k)) { console.error(`${lang}/${ns}: extra "${k}" (not in en)`); problems++; }
  }
}

if (problems) {
  console.error(`\n${problems} locale key problem(s)`);
  process.exit(1);
}
console.log(`locales ok (${langs.length} languages, ${namespaces.length} namespaces)`);
