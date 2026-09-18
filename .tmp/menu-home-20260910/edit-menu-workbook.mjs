import fs from 'node:fs/promises';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const inputPath = 'inputs/excel/menu/menu-simple.xlsx';
const outputDir = 'outputs/menu-home-20260910';
const outputPath = `${outputDir}/menu-simple.xlsx`;
const previewPath = `${outputDir}/menu-simple-preview.png`;

const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(inputPath));
const menuSheet = workbook.worksheets.getItem('菜单明细');

menuSheet.getRange('A2:D2').values = [['首页', null, 10, '是']];
menuSheet.getRange('D64').values = [['否']];

workbook.recalculate();

console.log((await workbook.inspect({
  kind: 'table',
  sheetId: '菜单明细',
  range: 'A1:D64',
  include: 'values,formulas',
  tableMaxRows: 70,
  tableMaxCols: 4,
  maxChars: 16000,
})).ndjson);

console.log((await workbook.inspect({
  kind: 'match',
  searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',
  options: { useRegex: true, maxResults: 100 },
  summary: 'final formula error scan',
})).ndjson);

await fs.mkdir(outputDir, { recursive: true });
const preview = await workbook.render({ sheetName: '菜单明细', autoCrop: 'all', scale: 1.5, format: 'png' });
await fs.writeFile(previewPath, new Uint8Array(await preview.arrayBuffer()));

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
await fs.copyFile(outputPath, inputPath);

const savedWorkbook = await SpreadsheetFile.importXlsx(await FileBlob.load(inputPath));
console.log((await savedWorkbook.inspect({
  kind: 'table',
  sheetId: '菜单明细',
  range: 'A1:D64',
  include: 'values,formulas',
  tableMaxRows: 70,
  tableMaxCols: 4,
  maxChars: 16000,
})).ndjson);
