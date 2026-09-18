import { spawnSync } from 'node:child_process';
import { readJson } from '../lib/file-utils.mjs';

const schemaPath = process.argv[2];
if (!schemaPath) throw new Error('Usage: node scripts/generate/prototype-from-schema.mjs <schemas/pages/{domain}/page.json>');
const schema = readJson(schemaPath);

run('scripts/check/policy-defaults-check.mjs');
run('scripts/check/schema-check.mjs', schemaPath);
run('scripts/generate/page-from-schema.mjs', schemaPath);
run('scripts/check/policy-check.mjs', schemaPath);
run('scripts/check/page-check.mjs', schemaPath);
console.log(`Prototype pipeline passed: ${schema.outputPath}`);

function run(script, input) {
  const args = [script];
  if (input) args.push(input);
  const result = spawnSync(process.execPath, args, { stdio: 'inherit', shell: false });
  if (result.status !== 0) process.exit(result.status || 1);
}
