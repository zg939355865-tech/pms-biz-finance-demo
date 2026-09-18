#!/usr/bin/env node
/**
 * 批量格式化 Schema 为紧凑格式
 *
 * 用法：node scripts/tools/format-schemas.mjs
 */

import fs from 'node:fs';
import path from 'node:path';

const schemasDir = path.resolve('schemas/pages');

function formatDir(dir) {
  let count = 0;
  let totalBefore = 0;
  let totalAfter = 0;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = formatDir(fullPath);
      count += sub.count;
      totalBefore += sub.before;
      totalAfter += sub.after;
    } else if (entry.name.endsWith('.json')) {
      const before = fs.statSync(fullPath).size;
      const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      fs.writeFileSync(fullPath, `${JSON.stringify(data)}\n`, 'utf8');
      const after = fs.statSync(fullPath).size;
      count++;
      totalBefore += before;
      totalAfter += after;
    }
  }

  return { count, before: totalBefore, after: totalAfter };
}

console.log('格式化 Schema 为紧凑格式...');
const result = formatDir(schemasDir);

console.log(`\n完成：`);
console.log(`  文件数：${result.count}`);
console.log(`  格式化前：${Math.round(result.before / 1024)}KB`);
console.log(`  格式化后：${Math.round(result.after / 1024)}KB`);
console.log(`  减少：${Math.round((1 - result.after / result.before) * 100)}%`);
