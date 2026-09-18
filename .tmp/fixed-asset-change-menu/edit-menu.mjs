import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const workbookPath = 'D:/项目AI协作/4、PMS业财一体化/inputs/excel/menu/menu-simple.xlsx';
const input = await FileBlob.load(workbookPath);
const workbook = await SpreadsheetFile.importXlsx(input);
const sheet = workbook.worksheets.getItem('菜单明细');
const used = sheet.getUsedRange(true);
const values = used.values;
const header = values[0].map((value) => String(value ?? '').trim());
const moduleColumn = header.indexOf('一级菜单');
const pageColumn = header.indexOf('二级菜单');
if (moduleColumn < 0 || pageColumn < 0) throw new Error('菜单明细缺少一级菜单或二级菜单列');

const matchedRows = [];
for (let rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
  if (String(values[rowIndex][moduleColumn] ?? '').trim() === '固资管理' && String(values[rowIndex][pageColumn] ?? '').trim() === '固资退还') matchedRows.push(rowIndex);
}
if (matchedRows.length !== 1) throw new Error(`固资退还菜单匹配数量异常：${matchedRows.length}`);

sheet.getCell(matchedRows[0], pageColumn).values = [['固资变更']];
workbook.recalculate();
const check = await workbook.inspect({ kind: 'table', range: `菜单明细!A${matchedRows[0] + 1}:D${matchedRows[0] + 1}`, include: 'values,formulas', tableMaxRows: 5, tableMaxCols: 6 });
if (!check.ndjson.includes('固资变更')) throw new Error('菜单工作簿校验失败：未写入固资变更');
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(workbookPath);
console.log(check.ndjson);
