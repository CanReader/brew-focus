// Checks the three version sources agree. With --base <git ref> it also checks
// that a version bump comes with a dated CHANGELOG entry for that version.
// Used on staging -> main PRs so a release can't go out half-bumped.
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

const read = (f) => readFileSync(f, 'utf8');
const cargoVersion = (src) => /^version\s*=\s*"([^"]+)"/m.exec(src)?.[1];

const versions = {
  'package.json': JSON.parse(read('package.json')).version,
  'src-tauri/tauri.conf.json': JSON.parse(read('src-tauri/tauri.conf.json')).version,
  'src-tauri/Cargo.toml': cargoVersion(read('src-tauri/Cargo.toml')),
};

const errors = [];
const version = versions['package.json'];
for (const [file, v] of Object.entries(versions)) {
  if (v !== version) errors.push(`${file} is ${v}, package.json is ${version}`);
}

const baseIdx = process.argv.indexOf('--base');
if (baseIdx !== -1 && errors.length === 0) {
  const base = process.argv[baseIdx + 1];
  let baseVersion;
  try {
    baseVersion = JSON.parse(execSync(`git show ${base}:package.json`, { encoding: 'utf8' })).version;
  } catch {
    errors.push(`couldn't read package.json from ${base}, is fetch-depth 0?`);
  }
  if (baseVersion && baseVersion !== version) {
    const escaped = version.replace(/\./g, '\\.');
    const heading = new RegExp(`^## \\[${escaped}\\] - (.+)$`, 'm').exec(read('CHANGELOG.md'));
    if (!heading) {
      errors.push(`version went ${baseVersion} -> ${version} but CHANGELOG.md has no "## [${version}] - <date>" heading`);
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(heading[1].trim())) {
      errors.push(`CHANGELOG.md heading for ${version} has "${heading[1].trim()}" instead of a real date`);
    }
  } else if (baseVersion) {
    console.log(`version unchanged (${version}), skipping changelog check`);
  }
}

if (errors.length) {
  for (const e of errors) console.error(`::error::${e}`);
  process.exit(1);
}
console.log(`version ok: ${version}`);
