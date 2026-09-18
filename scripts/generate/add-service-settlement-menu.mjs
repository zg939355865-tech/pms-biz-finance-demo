import XLSX from 'xlsx';

const workbookPath = 'inputs/excel/menu/menu-simple.xlsx';
const workbook = XLSX.readFile(workbookPath);
const sheet = workbook.Sheets['菜单明细'];
if (!sheet) throw new Error('菜单 Excel 缺少“菜单明细”工作表');

const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
const existing = rows.find((row) => row['一级菜单'] === '采购管理' && row['二级菜单'] === '服务结算');
if (!existing) {
  rows.push({ '一级菜单': '采购管理', '二级菜单': '服务结算', '排序': 195, '启用状态': '是' });
  rows.sort((left, right) => Number(left['排序']) - Number(right['排序']));
  workbook.Sheets['菜单明细'] = XLSX.utils.json_to_sheet(rows, { header: ['一级菜单', '二级菜单', '排序', '启用状态'] });
  XLSX.writeFile(workbook, workbookPath);
  console.log('服务结算菜单已写入采购入库下方。');
} else {
  console.log('服务结算菜单已存在，未重复写入。');
}
