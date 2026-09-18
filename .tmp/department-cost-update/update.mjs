import fs from 'node:fs';
const file = 'schemas/pages/cost/department-cost-analysis.json';
const s = JSON.parse(fs.readFileSync(file, 'utf8'));
const project = JSON.parse(fs.readFileSync('schemas/pages/cost/project-cost-analysis.json', 'utf8'));
const chart = s.regions[1], table = s.regions[2];
chart.title = '部门成本趋势';
Object.assign(chart, {searchId: 'department-cost-search', seriesField: 'departmentName', periodField: 'accountingPeriodRange', categoryField: 'costCategory'});
const fields = {'服务采购':'serviceCost','物资消耗':'materialCost','费用报销':'expenseCost','人工成本':'laborCost','折旧摊销':'depreciationCost','间接费用':'indirectCost','成本调整':'adjustmentAmount'};
const total = table.rows.reduce((sum, row) => sum + row.collectedCost, 0);
chart.series = table.rows.map((row, index) => ({
  key: row.departmentName, label: row.departmentName, color: project.regions[1].series[index].color,
  points: chart.data.map((point, monthIndex) => {
    const ratio = monthIndex === chart.data.length - 1 ? 1 : point.value / total;
    const categories = Object.fromEntries(Object.entries(fields).map(([label, code]) => [label, +(row[code] * ratio).toFixed(2)]));
    return {period: `2026-${String(monthIndex + 4).padStart(2, '0')}`, value: +Object.values(categories).reduce((sum, amount) => sum + amount, 0).toFixed(2), categories};
  })
}));
table.title = '部门成本列表';
table.actions = [{code:'export',label:'导出',icon:'download'}];
let offset = 0;
table.columns.slice(0, 3).forEach(column => {column.fixed = 'left'; column.fixedOffset = offset; offset += column.width;});
fs.writeFileSync(file, JSON.stringify(s, null, 2) + '\n');
const blueprint = 'inputs/md/pages/cost/department-cost-analysis.md';
let text = fs.readFileSync(blueprint, 'utf8').replaceAll('会计月成本趋势', '部门成本趋势').replaceAll('部门成本汇总列表', '部门成本列表').replaceAll('部门成本汇总去除说明', '部门成本列表去除说明');
text = text.replace('部门成本趋势折线图独占整行展示。', '部门成本趋势折线图独占整行展示；每个选中部门对应一条曲线，图例显示部门名称，未选择部门时展示全部部门。查询和重置同步更新图表，期间无数据时显示空状态。');
text = text.replace('| 1 | 年度-会计期间 | 文本 | 左 | `YYYY-MM`，如 `2026-09` |', '| 1 | 年度-会计期间 | 文本 | 左 | `YYYY-MM`，如 `2026-09`；固定在最左侧 |');
text = text.replace('| 3 | 部门名称 | 文本 | 左 | 成本归集部门名称 |', '| 3 | 部门名称 | 文本 | 左 | 成本归集部门名称；固定在部门编码右侧 |');
text = text.replace('| 查看部门成本明细 | 部门编码 |', '| 导出 | 部门成本列表标题右侧 | 始终可用 | 本次增加导出按钮 | 否 |\n| 查看部门成本明细 | 部门编码 |');
text += '\n### 2026-09-10 部门成本局部优化\n\n- 部门保持下拉多选；每个选中部门对应一条趋势线，标题为“部门成本趋势”。\n- 列表标题为“部门成本列表”，年度-会计期间、部门编码、部门名称依次固定在左侧，横向滚动时保持位置。\n- 列表标题区增加“导出”按钮。\n- 趋势为静态演示数据：9月各部门金额与列表一致；4至8月按原趋势总额和部门成本占比分配，仅用于多曲线交互演示。\n';
fs.writeFileSync(blueprint, text);
