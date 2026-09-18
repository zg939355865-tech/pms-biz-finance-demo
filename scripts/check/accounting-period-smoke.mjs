import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '../lib/playwright-smoke.mjs';

const htmlPath = process.argv[2] || 'pages/master-data/accounting-period.html';
const absolutePath = path.resolve(htmlPath);
const reportDir = path.resolve('outputs/reports/visual');
fs.mkdirSync(reportDir, { recursive: true });

const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
page.setDefaultTimeout(20000);
const errors = [];
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
const expect = (condition, message) => { if (!condition) errors.push(message); };
const same = (actual, expected, message) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) errors.push(`${message}: ${JSON.stringify(actual)}`);
};

const schema = JSON.parse(fs.readFileSync('schemas/pages/master-data/accounting-period.json', 'utf8'));
expect(schema.pageType === 'list', '会计期间必须为纯列表页');
expect(schema.businessDateControl?.rangeBoundary === 'inclusive', '业务日期控制未声明闭区间');
expect(schema.accountingPeriodConfig?.generationMode === 'calendar-year-monthly-12', '未声明年度生成12期');
expect(schema.accountingPeriodConfig?.openStrategy === 'auto-close-current-and-open-selected', '未声明自动关旧开新');

await page.goto(pathToFileURL(absolutePath).href, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(250);

const list = page.locator('[data-page-view="list"]');
const table = list.locator('#accounting-period-table');
expect(await list.isVisible(), '会计期间列表未显示');
expect(await page.locator('[data-page-view="detail"]').count() === 0, '会计期间不应生成详情页');
const runtimeContract = await page.evaluate(() => window.PMS_PAGE_SCHEMA || null);
expect(runtimeContract?.businessDateControl?.rangeBoundary === 'inclusive', '页面未暴露业务日期闭区间契约');
expect(runtimeContract?.accountingPeriodConfig?.singleStartedPeriod === true, '页面未暴露单一启动期契约');
expect(await table.locator('tbody > tr[data-row-value]').count() === 7, '2026年度应有会计期间1至7');
expect(await table.locator('tbody > tr[data-row-value]:visible').count() === 5, '首屏必须固定显示5条');
const initialVisiblePeriods = await table.locator('tbody > tr[data-row-value]:visible [data-column="accountingPeriod"]').allTextContents();
same(initialVisiblePeriods.map((value) => value.trim()), ['7', '6', '5', '4', '3'], '会计期间未按开始日期倒序显示');
expect(await table.locator('thead [data-column="startDate"],thead th:has([data-sort-code="startDate"])').getAttribute('aria-sort') === 'descending', '开始日期表头未标识默认倒序');
same(await list.locator('#accounting-period-search .form-item:has([data-field])').evaluateAll((items) => items.map((item) => item.querySelector('.form-label')?.textContent?.trim() || '')), ['年度', '会计期间', '是否启动'], '查询字段顺序不匹配');
expect(await list.locator('#accounting-period-search [data-field="accountingPeriod"]').evaluate((control) => control.tagName === 'SELECT'), '会计期间查询条件未使用下拉选择');
same(await list.locator('#accounting-period-search [data-field="accountingPeriod"] option').evaluateAll((options) => options.slice(1).map((option) => option.value)), ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'], '会计期间下拉选项不完整');
same((await table.locator('thead th').allTextContents()).map((label) => label.trim()).filter(Boolean), ['年度', '会计期间', '开始日期', '结束日期', '是否启动', '操作'], '列表字段顺序不匹配');
expect(await list.locator('[data-act="batch-delete"]').count() === 0, '右上角仍存在批量删除');
expect(await list.locator('[data-act="close-period"]').count() === 0, '右上角仍存在关闭期间');
expect(await list.locator('[data-act="open-period"]').count() === 1, '缺少开启会计期间');
expect(await list.locator('[data-act="create"]').count() === 1, '缺少新增会计期间');

const firstCheckbox = table.locator('tbody > tr[data-row-value]').nth(0).locator('[data-row-select]');
const secondCheckbox = table.locator('tbody > tr[data-row-value]').nth(1).locator('[data-row-select]');
expect(await firstCheckbox.getAttribute('type') === 'checkbox', '列表选择器未使用通用复选框');
const checkboxBox = await firstCheckbox.boundingBox();
expect(Math.round(checkboxBox?.width || 0) === 16 && Math.round(checkboxBox?.height || 0) === 16, '通用复选框尺寸不是16×16');
const yearLabelBox = await list.locator('#accounting-period-search .form-item:has([data-field="year"]) .form-label').boundingBox();
expect(Math.abs((yearLabelBox?.x || 0) - (checkboxBox?.x || 0)) <= 4, '查询区年度标签与列表复选框左边界未对齐');
const yearSelectBox = await list.locator('#accounting-period-search [data-field="year"]').boundingBox();
expect((yearSelectBox?.x || 0) - ((yearLabelBox?.x || 0) + (yearLabelBox?.width || 0)) <= 12, '查询区年度标签与控件间距过大');
const yearCell = table.locator('tbody > tr[data-row-value]').nth(0).locator('[data-column="year"]');
const yearTextBox = await yearCell.evaluate((cell) => {
  const range = document.createRange();
  range.selectNodeContents(cell);
  const box = range.getBoundingClientRect();
  return { x: box.x, width: box.width };
});
expect(yearTextBox.x - ((checkboxBox?.x || 0) + (checkboxBox?.width || 0)) <= 40, '复选框与年度数据之间留白过大');
await firstCheckbox.check();
await secondCheckbox.check();
expect(!await firstCheckbox.isChecked() && await secondCheckbox.isChecked(), '复选框未保持单选语义');
await secondCheckbox.uncheck();
expect(await list.locator('[data-act="open-period"]').isDisabled(), '未选择期间时开启按钮应禁用');
await page.screenshot({ path: path.join(reportDir, 'accounting-period-list.png'), fullPage: true });

const periodSevenRow = table.locator('tbody > tr[data-row-value*="period-202607"]');
await periodSevenRow.locator('[data-act="edit-row"]').click();
expect(!await periodSevenRow.locator('[data-field="startDate"]').isDisabled(), '编辑后开始日期不可修改');
expect(!await periodSevenRow.locator('[data-field="endDate"]').isDisabled(), '编辑后结束日期不可修改');
expect(await periodSevenRow.locator('[data-act="save-row"]').count() === 1 && await periodSevenRow.locator('[data-act="cancel-row"]').count() === 1, '编辑行未显示保存、取消');
await periodSevenRow.locator('[data-field="startDate"]').fill('2026-07-31');
await periodSevenRow.locator('[data-field="endDate"]').fill('2026-07-01');
await periodSevenRow.locator('[data-act="save-row"]').click();
expect(await periodSevenRow.locator('[data-act="save-row"]').count() === 1, '结束日期早于开始日期时仍保存成功');
await periodSevenRow.locator('[data-field="startDate"]').fill('2026-07-01');
await periodSevenRow.locator('[data-field="endDate"]').fill('2026-07-30');
await page.screenshot({ path: path.join(reportDir, 'accounting-period-inline-edit.png'), fullPage: true });
await periodSevenRow.locator('[data-act="save-row"]').click();
expect(await periodSevenRow.locator('[data-act="edit-row"]').count() === 1, '合法日期保存后未恢复编辑按钮');
const periodSevenValue = JSON.parse(await periodSevenRow.getAttribute('data-row-value'));
expect(periodSevenValue.year === '2026' && periodSevenValue.accountingPeriod === '7' && periodSevenValue.endDate === '2026-07-30', '列表内保存丢失只读字段或日期值');
console.log('Accounting period inline edit passed.');

const oldStartedRow = table.locator('tbody > tr[data-row-value*="period-202607"]');
const periodSixRow = table.locator('tbody > tr[data-row-value*="period-202606"]');
await periodSixRow.locator('[data-row-select]').check();
expect(!await list.locator('[data-act="open-period"]').isDisabled(), '选择未启动期间后开启按钮未启用');
await list.locator('[data-act="open-period"]').click();
const openModal = page.locator('[data-overlay="open-period-modal"]');
expect(await openModal.isVisible(), '开启会计期间弹窗未显示');
const openDescription = (await openModal.textContent()) || '';
expect(openDescription.includes('自动关闭当前期间') && openDescription.includes('业务日期只能选择'), '开启弹窗未说明自动关旧开新及业务日期影响');
await page.screenshot({ path: path.join(reportDir, 'accounting-period-open-modal.png') });
await openModal.locator('[data-act="confirm-open-period"]').click();
expect((await oldStartedRow.locator('[data-column="isStarted"]').textContent())?.trim() === '否', '原启动期间未自动关闭');
expect((await periodSixRow.locator('[data-column="isStarted"]').textContent())?.trim() === '是', '所选期间未成功开启');
expect(await table.locator('[data-column="isStarted"] .tag:text-is("是")').count() === 1, '开启后不是唯一启动期间');
console.log('Accounting period auto switch passed.');

await list.locator('[data-act="create"]').click();
const createModal = page.locator('[data-overlay="create-period-modal"]');
expect(await createModal.isVisible(), '新增会计期间弹窗未显示');
expect(await createModal.locator('.form-item:has([data-field])').count() === 1, '新增弹窗应仅包含年度字段');
expect(((await createModal.textContent()) || '').includes('自动生成12个会计期间'), '新增弹窗未说明自动生成12期');
expect(await createModal.locator('[data-field="year"] option[value="2026"]').count() === 0, '已生成会计期间的2026年度仍显示在新增候选项中');
await page.screenshot({ path: path.join(reportDir, 'accounting-period-create-modal.png') });
await createModal.locator('[data-field="year"]').selectOption('2027');
await createModal.locator('[data-act="confirm-generate-periods"]').click();
expect(await table.locator('tbody > tr[data-row-value]').count() === 19, '选择2027后未新增12个期间');
const generatedPeriods = await table.locator('tbody > tr[data-row-value]').evaluateAll((rows) => rows.filter((row) => row.dataset.rowValue?.includes('"year":"2027"')).map((row) => JSON.parse(row.dataset.rowValue || '{}')));
expect(generatedPeriods.length === 12 && generatedPeriods.some((value) => value.accountingPeriod === '2' && value.endDate === '2027-02-28'), '新增年度未按期号生成或2027年2月月末错误');
expect(await table.locator('.pagination [data-act="page-goto"]').count() === 4, '新增12期后分页未扩展为4页');
same((await table.locator('tbody > tr[data-row-value]:visible [data-column="accountingPeriod"]').allTextContents()).map((value) => value.trim()), ['12', '11', '10', '9', '8'], '新增年度后未继续按开始日期倒序');
await list.locator('[data-act="create"]').click();
expect(await createModal.locator('[data-field="year"] option[value="2027"]').count() === 0, '刚生成的2027年度仍显示在新增候选项中');
await createModal.getByRole('button', { name: '取消', exact: true }).click();
console.log('Accounting period yearly generation passed.');

await page.setViewportSize({ width: 2048, height: 1100 });
await page.screenshot({ path: path.join(reportDir, 'accounting-period-list-wide.png'), fullPage: true, timeout: 15000 });
for (const width of [1440, 2048]) {
  await page.setViewportSize({ width, height: 1000 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(!overflow, `${width}px视口出现页面级横向滚动`);
}

const failed = errors.length > 0;
if (failed) console.error(errors.join('\n'));
else console.log('Accounting period smoke passed.');
await Promise.race([
  browser.close(),
  new Promise((resolve) => setTimeout(resolve, 3000))
]);
process.exit(failed ? 1 : 0);
