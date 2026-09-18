import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const sourcePath = 'inputs/excel/menu/menu-simple.xlsx';
const input = await FileBlob.load(sourcePath);
const workbook = await SpreadsheetFile.importXlsx(input);
const overview = await workbook.inspect({
  kind: 'workbook,sheet,table',
  maxChars: 5000,
  tableMaxRows: 40,
  tableMaxCols: 12,
  tableMaxCellChars: 120,
});
console.log(overview.ndjson);
const sheet = workbook.worksheets.getItem('菜单明细');
const menuRows = await workbook.inspect({
  kind: 'match',
  searchTerm: '期末结账|期末结算',
  options: { useRegex: true, maxResults: 20 },
  maxChars: 3000,
  summary: '期末菜单名称定位',
});
console.log(menuRows.ndjson);
const style = await workbook.inspect({
  kind: 'computedStyle',
  sheetId: sheet.name,
  range: 'A1:H40',
  maxChars: 3000,
});
console.log(style.ndjson);
