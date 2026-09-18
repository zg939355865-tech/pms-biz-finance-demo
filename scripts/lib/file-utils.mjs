import fs from 'node:fs';
import path from 'node:path';

export function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function writeJson(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(data)}\n`, 'utf8');
}

export function writeText(filePath, text) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, text, 'utf8');
}

export function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function slugFromPath(filePath) {
  return path.basename(filePath).replace(/\.[^.]+$/, '');
}

export function toPosix(filePath) {
  return filePath.split(path.sep).join('/');
}

export function relativeDirFromRoot(filePath, rootDir) {
  const normalizedFile = path.normalize(filePath);
  const normalizedRoot = path.normalize(rootDir);
  const relative = path.relative(normalizedRoot, path.dirname(normalizedFile));
  return toPosix(relative).replace(/^\.$/, '');
}

export function listFilesRecursive(dirPath, predicate = () => true) {
  if (!fs.existsSync(dirPath)) return [];
  const result = [];
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      result.push(...listFilesRecursive(fullPath, predicate));
    } else if (predicate(fullPath)) {
      result.push(fullPath);
    }
  }
  return result;
}
