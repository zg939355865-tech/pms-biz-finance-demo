import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';
import fs from 'node:fs/promises';

const sourcePath = 'inputs/excel/menu/menu-simple.xlsx';
const input = await FileBlob.load(sourcePath);
const workbook = await SpreadsheetFile.importXlsx(input);
const sheet = workbook.worksheets.getItem('菜单明细');

if (sheet.getRange('B51').values[0][0] !== '期末结账') {
  throw new Error('菜单明细!B51 不再是预期的“期末结账”，已停止写入。');
}

sheet.getRange('B51').values = [['期末结算']];

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(sourcePath);

const verification = await workbook.inspect({
  kind: 'table',
  range: '菜单明细!A49:D53',
  include: 'values,formulas',
  tableMaxRows: 5,
  tableMaxCols: 4,
});
console.log(verification.ndjson);

const preview = await workbook.render({
  sheetName: '菜单明细',
  range: 'A49:D53',
  scale: 2,
  format: 'png',
});
await fs.writeFile('.tmp/menu-label-preview.png', new Uint8Array(await preview.arrayBuffer()));
