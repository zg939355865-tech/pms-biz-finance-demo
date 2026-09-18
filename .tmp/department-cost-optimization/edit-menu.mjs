import fs from 'node:fs/promises';
import path from 'node:path';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const [mode = 'inspect'] = process.argv.slice(2);
const sourcePath = path.resolve('inputs/excel/menu/menu-simple.xlsx');
const outputDir = path.resolve('.tmp/department-cost-optimization');
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(sourcePath));
const sheet = workbook.worksheets.getItem('菜单明细');
const used = sheet.getUsedRange(true);
const values = used?.values || [];
const matches = [];

values.forEach((row, rowIndex) => row.forEach((value, columnIndex) => {
  if (value === '部门成本分析' || value === '部门成本') {
    matches.push({ rowIndex, columnIndex, value });
  }
}));

await fs.mkdir(outputDir, { recursive: true });
console.log(JSON.stringify(matches.map(({ rowIndex, columnIndex, value }) => ({ row: rowIndex + 1, column: columnIndex + 1, value }))));

if (mode === 'inspect') {
  const overview = await workbook.inspect({
    kind: 'table',
    range: '菜单明细!A45:D51',
    include: 'values,formulas',
    tableMaxRows: 7,
    tableMaxCols: 4,
    maxChars: 4000,
  });
  console.log(overview.ndjson);
  const preview = await workbook.render({ sheetName: '菜单明细', range: 'A45:D51', scale: 2, format: 'png' });
  await fs.writeFile(path.join(outputDir, 'menu-before.png'), new Uint8Array(await preview.arrayBuffer()));
  process.exit(0);
}

const oldMatches = matches.filter((item) => item.value === '部门成本分析');
if (oldMatches.length !== 1) throw new Error(`预期唯一“部门成本分析”单元格，实际 ${oldMatches.length} 个，已停止写入。`);
const target = oldMatches[0];
target.sheet = sheet;
sheet.getCell(target.rowIndex, target.columnIndex).values = [['部门成本']];
workbook.recalculate();

const exported = await SpreadsheetFile.exportXlsx(workbook);
const stagedPath = path.join(outputDir, 'menu-simple.xlsx');
await exported.save(stagedPath);
await fs.copyFile(stagedPath, sourcePath);

const verification = await SpreadsheetFile.importXlsx(await FileBlob.load(sourcePath));
const check = await verification.inspect({
  kind: 'table',
  range: '菜单明细!A45:D51',
  include: 'values,formulas',
  tableMaxRows: 7,
  tableMaxCols: 4,
  maxChars: 4000,
});
const formulaErrors = await verification.inspect({
  kind: 'match',
  searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',
  options: { useRegex: true, maxResults: 100 },
  maxChars: 3000,
});
console.log(check.ndjson);
console.log(formulaErrors.ndjson);
const preview = await verification.render({ sheetName: '菜单明细', range: 'A45:D51', scale: 2, format: 'png' });
await fs.writeFile(path.join(outputDir, 'menu-after.png'), new Uint8Array(await preview.arrayBuffer()));
