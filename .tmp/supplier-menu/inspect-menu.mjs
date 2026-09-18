import fs from 'node:fs/promises';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const inputPath = 'D:/项目AI协作/4、PMS业财一体化/inputs/excel/menu/menu-simple.xlsx';
const previewPath = 'D:/项目AI协作/4、PMS业财一体化/.tmp/supplier-menu/menu-preview-before.png';
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(inputPath));
const overview = await workbook.inspect({
  kind: 'workbook,sheet,table',
  maxChars: 5000,
  tableMaxRows: 60,
  tableMaxCols: 6,
});
console.log(overview.ndjson);
const styles = await workbook.inspect({
  kind: 'computedStyle',
  sheetId: '菜单明细',
  range: 'A45:D50',
  maxChars: 3000,
});
console.log(styles.ndjson);
const preview = await workbook.render({
  sheetName: '菜单明细',
  range: 'A44:D51',
  scale: 2,
  format: 'png',
});
await fs.writeFile(previewPath, new Uint8Array(await preview.arrayBuffer()));
console.log(`preview=${previewPath}`);
