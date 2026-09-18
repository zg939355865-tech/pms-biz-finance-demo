import fs from 'node:fs/promises';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const inputPath = decodeURIComponent(new URL('../../inputs/excel/menu/menu-simple.xlsx', import.meta.url).pathname.slice(1));
const previewPath = decodeURIComponent(new URL('./menu-preview.png', import.meta.url).pathname.slice(1));
const input = await FileBlob.load(inputPath);
const workbook = await SpreadsheetFile.importXlsx(input);
const summary = await workbook.inspect({
  kind: 'workbook,sheet,table,region',
  maxChars: 12000,
  tableMaxRows: 40,
  tableMaxCols: 10,
  tableMaxCellChars: 120,
});
console.log(summary.ndjson);
const firstSheet = workbook.worksheets.getItem('菜单明细');
const preview = await workbook.render({
  sheetName: firstSheet.name,
  autoCrop: 'all',
  scale: 1,
  format: 'png',
});
await fs.writeFile(previewPath, new Uint8Array(await preview.arrayBuffer()));
