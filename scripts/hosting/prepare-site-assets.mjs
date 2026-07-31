import fs from 'node:fs';
import path from 'node:path';

const workspaceRoot = process.cwd();
const publicRoot = path.resolve(workspaceRoot, 'public');
const relativePublic = path.relative(workspaceRoot, publicRoot);

if (!relativePublic || relativePublic.startsWith('..') || path.isAbsolute(relativePublic)) {
  throw new Error(`Invalid public directory: ${publicRoot}`);
}

fs.rmSync(publicRoot, { recursive: true, force: true });
fs.mkdirSync(publicRoot, { recursive: true });

function copyDirectory(sourceRoot, targetRoot) {
  fs.mkdirSync(targetRoot, { recursive: true });
  for (const entry of fs.readdirSync(sourceRoot, { withFileTypes: true })) {
    const sourcePath = path.join(sourceRoot, entry.name);
    const targetPath = path.join(targetRoot, entry.name);
    if (entry.isDirectory()) {
      copyDirectory(sourcePath, targetPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

for (const directory of [
  'menu',
  'pages',
  'assets',
  'artifact-resources',
  'prototype-resources',
]) {
  const source = path.resolve(workspaceRoot, directory);
  if (!fs.existsSync(source)) continue;
  copyDirectory(source, path.join(publicRoot, directory));
}

console.log('Sites static assets prepared in public/');
