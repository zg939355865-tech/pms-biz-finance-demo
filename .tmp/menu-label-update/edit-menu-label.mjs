import fs from 'node:fs/promises';
import path from 'node:path';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const [mode, sourcePath, outputDir] = process.argv.slice(2);
if (!mode || !sourcePath || !outputDir) throw new Error('Usage: edit-menu-label.mjs <inspect|edit> <source.xlsx> <output-dir>');

const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(sourcePath));
const matches = [];
for (const sheet of workbook.worksheets.items) {
  const used = sheet.getUsedRange(true);
  const values = used?.values || [];
  values.forEach((row, rowIndex) => row.forEach((value, columnIndex) => {
    if (value === '即时物资' || value === '即时汇总库存') matches.push({ sheet, rowIndex, columnIndex, value });
  }));
}

await fs.mkdir(outputDir, { recursive: true });
if (mode === 'inspect') {
  console.log(JSON.stringify(matches.map(({ sheet, rowIndex, columnIndex, value }) => ({ sheet: sheet.name, row: rowIndex + 1, column: columnIndex + 1, value }))));
  for (const sheet of [...new Set(matches.map((item) => item.sheet))]) {
    const preview = await workbook.render({ sheetName: sheet.name, autoCrop: 'all', scale: 1, format: 'png' });
    await fs.writeFile(path.join(outputDir, `${sheet.name}-before.png`), new Uint8Array(await preview.arrayBuffer()));
  }
  process.exit(0);
}

const oldMatches = matches.filter((item) => item.value === '即时物资');
if (oldMatches.length !== 1) throw new Error(`Expected exactly one 即时物资 cell, found ${oldMatches.length}`);
const target = oldMatches[0];
target.sheet.getCell(target.rowIndex, target.columnIndex).values = [['即时汇总库存']];
const exported = await SpreadsheetFile.exportXlsx(workbook);
const outputPath = path.join(outputDir, 'menu-simple.xlsx');
await exported.save(outputPath);
await fs.copyFile(outputPath, sourcePath);

const verification = await SpreadsheetFile.importXlsx(await FileBlob.load(sourcePath));
const check = await verification.inspect({ kind: 'match', searchTerm: '即时物资|即时汇总库存', options: { useRegex: true, maxResults: 20 }, maxChars: 3000 });
const formulaErrors = await verification.inspect({ kind: 'match', searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A', options: { useRegex: true, maxResults: 100 }, maxChars: 3000 });
console.log(check.ndjson);
console.log(formulaErrors.ndjson);
const preview = await verification.render({ sheetName: target.sheet.name, autoCrop: 'all', scale: 1, format: 'png' });
await fs.writeFile(path.join(outputDir, `${target.sheet.name}-after.png`), new Uint8Array(await preview.arrayBuffer()));
