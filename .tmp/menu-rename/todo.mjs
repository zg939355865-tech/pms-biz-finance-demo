import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';
const file = 'D:/项目AI协作/4、PMS业财一体化/inputs/excel/menu/menu-simple.xlsx';
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(file));
workbook.worksheets.getItem('菜单明细').getRange('A5:A6').values = [['待办事项'], ['待办事项']];
await (await SpreadsheetFile.exportXlsx(workbook)).save(file);
