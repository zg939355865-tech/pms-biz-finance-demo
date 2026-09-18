import { spawnSync } from 'node:child_process';
import { listFilesRecursive } from '../lib/file-utils.mjs';

const schemas = listFilesRecursive('schemas/pages', (filePath) => filePath.endsWith('.json')).sort();
const failures = [];

for (const schemaPath of schemas) {
  console.log(`\n[Harness] ${schemaPath}`);
  const result = spawnSync(process.execPath, ['scripts/generate/prototype-from-schema.mjs', schemaPath], {
    stdio: 'inherit',
    shell: false
  });
  if (result.status !== 0) failures.push(schemaPath);
}

if (failures.length) {
  console.error(`\nHarness check failed (${failures.length}/${schemas.length}):`);
  failures.forEach((filePath) => console.error(`- ${filePath}`));
  spawnSync(process.execPath, ['scripts/check/report-summary.mjs', '--failed'], { stdio: 'inherit', shell: false });
  process.exit(1);
}

for (const script of [
  'scripts/check/policy-defaults-check.mjs',
  'scripts/check/business-list-standard-smoke.mjs',
  'scripts/check/create-detail-standard-smoke.mjs',
  'scripts/check/public-interaction-standard-smoke.mjs',
  'scripts/check/project-setup-stage-smoke.mjs',
  'scripts/check/project-plan-basic-info-smoke.mjs',
  'scripts/check/component-coverage-check.mjs',
  'scripts/check/resource-center-check.mjs',
  'scripts/check/all-pages-desktop-check.mjs'
]) {
  console.log(`\n[Harness] ${script}`);
  const result = spawnSync(process.execPath, [script], { stdio: 'inherit', shell: false });
  if (result.status !== 0) {
    spawnSync(process.execPath, ['scripts/check/report-summary.mjs', '--failed'], { stdio: 'inherit', shell: false });
    process.exit(result.status || 1);
  }
}

spawnSync(process.execPath, ['scripts/check/report-summary.mjs', '--passed'], { stdio: 'inherit', shell: false });
console.log(`\nHarness check passed: ${schemas.length} schemas plus shared resources.`);
