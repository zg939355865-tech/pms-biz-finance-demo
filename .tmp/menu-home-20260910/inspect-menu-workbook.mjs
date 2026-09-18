import fs from 'node:fs/promises';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const inputPath = 'inputs/excel/menu/menu-simple.xlsx';
const outputDir = '.tmp/menu-home-20260910/previews';
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(inputPath));

console.log((await workbook.inspect({
  kind: 'workbook,sheet,table',
  maxChars: 12000,
  tableMaxRows: 80,
  tableMaxCols: 10,
  tableMaxCellChars: 120,
})).ndjson);

await fs.mkdir(outputDir, { recursive: true });
for (const sheetName of ['系统信息', '菜单明细']) {
  const range = sheetName === '菜单明细' ? 'A1:D64' : 'A1:A2';
  const preview = await workbook.render({ sheetName, range, scale: 1.5, format: 'png' });
  await fs.writeFile(`${outputDir}/${sheetName}.png`, new Uint8Array(await preview.arrayBuffer()));
}
