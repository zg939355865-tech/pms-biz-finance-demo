import fs from 'node:fs';
import path from 'node:path';

const workspaceRoot = process.cwd();
const sourceConfig = path.resolve(workspaceRoot, '.openai', 'hosting.json');
const targetDirectory = path.resolve(workspaceRoot, 'dist', '.openai');
const relativeTarget = path.relative(workspaceRoot, targetDirectory);

if (!relativeTarget || relativeTarget.startsWith('..') || path.isAbsolute(relativeTarget)) {
  throw new Error(`Invalid Sites metadata target: ${targetDirectory}`);
}

fs.mkdirSync(targetDirectory, { recursive: true });
fs.copyFileSync(sourceConfig, path.join(targetDirectory, 'hosting.json'));
console.log('Sites metadata copied into dist/.openai/');
