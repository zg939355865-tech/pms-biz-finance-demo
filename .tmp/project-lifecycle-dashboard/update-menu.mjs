import fs from 'node:fs/promises';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const inputPath = decodeURIComponent(new URL('../../inputs/excel/menu/menu-simple.xlsx', import.meta.url).pathname.slice(1));
const outputPath = decodeURIComponent(new URL('./menu-simple.updated.xlsx', import.meta.url).pathname.slice(1));
const previewPath = decodeURIComponent(new URL('./menu-updated-preview.png', import.meta.url).pathname.slice(1));

const input = await FileBlob.load(inputPath);
const workbook = await SpreadsheetFile.importXlsx(input);
const sheet = workbook.worksheets.getItem('菜单明细');

sheet.getRange('A64:D64').copyFrom(sheet.getRange('A63:D63'), 'all');
sheet.getRange('A64:D64').values = [[
  '报表管理',
  '项目全生命周期驾驶舱',
  485,
  '是',
]];
sheet.getRange('B1:B64').format.columnWidth = 24;

workbook.recalculate();
const check = await workbook.inspect({
  kind: 'table',
  sheetId: sheet.name,
  range: 'A58:D64',
  include: 'values,formulas',
  tableMaxRows: 10,
  tableMaxCols: 4,
  maxChars: 5000,
});
console.log(check.ndjson);

const errors = await workbook.inspect({
  kind: 'match',
  searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',
  options: { useRegex: true, maxResults: 100 },
  summary: 'final formula error scan',
});
console.log(errors.ndjson);

const preview = await workbook.render({
  sheetName: sheet.name,
  range: 'A55:D64',
  scale: 2,
  format: 'png',
});
await fs.writeFile(previewPath, new Uint8Array(await preview.arrayBuffer()));

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
