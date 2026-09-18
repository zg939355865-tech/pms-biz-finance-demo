import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '../lib/playwright-smoke.mjs';

const reportDir = path.resolve('outputs/reports/visual');
fs.mkdirSync(reportDir, { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
const errors = [];
const expect = (condition, message) => { if (!condition) errors.push(message); };
const labels = async (locator) => locator.allTextContents().then((items) => items.map((item) => item.trim()).filter(Boolean));

async function openPage(fileName) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  page.on('pageerror', (error) => errors.push(`${fileName} pageerror: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`${fileName} console: ${message.text()}`); });
  await page.goto(pathToFileURL(path.resolve(`pages/material/${fileName}.html`)).href, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(150);
  return page;
}

const outbound = await openPage('other-outbound');
const outboundList = outbound.locator('[data-page-view="list"]');
const outboundTable = outboundList.locator('#other-outbound-table');
expect(await outboundList.isVisible(), '其他出库列表未显示');
expect((await labels(outboundList.locator('#other-outbound-search .form-label'))).join(',') === '出库单号,状态,出库日期,业务类型,成本归集部门,项目', '其他出库查询字段或顺序错误');
expect(await outboundTable.locator('tbody > tr:not([data-empty-row])').count() === 12, '其他出库列表不是12条样例');
expect(await outboundTable.locator('tbody > tr:visible:not([data-empty-row])').count() === 5, '其他出库首屏不是5条');
expect((await labels(outboundTable.locator('thead th'))).join(',') === '出库单号,状态,出库日期,业务类型,库存地点,成本归集部门,项目,创建人,创建时间,操作', '其他出库列表字段或顺序错误');
const outboundTypes = await outboundTable.locator('tbody > tr:not([data-empty-row])').evaluateAll((rows) => [...new Set(rows.map((row) => JSON.parse(row.dataset.rowValue || '{}').businessType))].sort());
expect(JSON.stringify(outboundTypes) === JSON.stringify(['其他出库', '报废出库', '盘亏出库'].sort()), '其他出库业务类型样例不完整');
await outbound.screenshot({ path: path.join(reportDir, 'other-outbound-list.png'), fullPage: true });

await outboundList.locator('[data-act="create"]').click();
const outboundDetail = outbound.locator('[data-page-view="detail"]');
expect(await outboundDetail.isVisible(), '其他出库新增详情未显示');
expect((await labels(outboundDetail.locator('[data-component="ProTabsDetail"] > .pro-tabs [data-tab]'))).join(',') === '出库信息,附件', '其他出库详情页签错误');
const outboundBasic = outboundDetail.locator('#other-outbound-basic');
expect((await labels(outboundBasic.locator('.form-label'))).join(',') === '出库单号,状态,出库日期,业务类型,库存地点,成本归集部门,项目,创建人,创建时间,审核人,审核时间,所属公司,备注', '其他出库基础信息字段或顺序错误');
const outboundItems = outboundDetail.locator('#other-outbound-items');
expect((await labels(outboundItems.locator('thead th'))).join(',') === '序号,物资类型,物资名称,规格,单位,库位,可出库数量,出库数量,备注,操作', '其他出库明细字段或顺序错误');
const inventoryAction = outboundItems.locator('[data-target="other-inventory-picker"]');
expect(await inventoryAction.isDisabled(), '其他出库未选库存地点时即时库存按钮未禁用');
const outboundProject = outboundBasic.locator('[data-field="projectName"]');
expect(await outboundProject.inputValue() === '通用项目', '其他出库新增项目未默认通用项目');
await outboundBasic.locator('[data-field="warehouse"]').selectOption('武汉中心仓');
await outboundBasic.locator('[data-field="businessType"]').selectOption('盘亏出库');
await outboundBasic.locator('[data-field="responsibilityDepartment"]').selectOption('工程管理部');
expect(await outboundProject.inputValue() === '通用项目', '其他出库成本归集部门变更后未保持通用项目');
await outboundProject.selectOption('沙河市污水厂智能化改造项目');
expect(await outboundProject.inputValue() === '沙河市污水厂智能化改造项目', '其他出库项目不支持编辑');
expect(!await outboundBasic.locator('[data-field="outboundReason"]').evaluate((element) => element.required), '其他出库备注仍为必填');
expect(!await inventoryAction.isDisabled(), '其他出库选择库存地点后即时库存按钮未启用');
await inventoryAction.click();
const picker = outbound.locator('[data-overlay="other-inventory-picker"]');
expect(await picker.isVisible(), '其他出库即时库存弹窗未显示');
expect((await labels(picker.locator('#other-inventory-picker-search .form-label'))).join(',') === '物资类型,物资名称', '其他出库即时库存查询字段错误');
expect((await labels(picker.locator('#other-available-inventory-table thead th'))).join(',') === '物资类型,物资名称,规格,单位,库存余量,库位', '其他出库即时库存列表字段错误');
const pickerRows = await picker.locator('#other-available-inventory-table tbody > tr:visible:not([data-empty-row])').evaluateAll((rows) => rows.map((row) => JSON.parse(row.dataset.rowValue || '{}')));
expect(pickerRows.length === 5 && pickerRows.every((row) => row.warehouse === '武汉中心仓' && Number(row.availableQuantity) > 0), '其他出库即时库存未按地点和正库存过滤');
await outbound.screenshot({ path: path.join(reportDir, 'other-outbound-picker.png'), fullPage: true });
await picker.locator('#other-available-inventory-table tbody > tr:visible:not([data-empty-row]) [data-row-select]').first().check();
await picker.locator('[data-act="confirm-inventory"]').click();
expect(await outboundItems.locator('tbody > tr:not([data-empty-row])').count() === 1, '其他出库库存选择未带入明细');
const outboundQuantity = outboundItems.locator('[data-field="outboundQuantity"]').first();
const availableQuantity = Number(await outboundItems.locator('[data-column="availableQuantity"]').first().textContent());
expect(await outboundQuantity.inputValue() === '', '其他出库选择库存后错误自动填写出库数量');
await outboundQuantity.fill(String(availableQuantity + 1));
expect(!await outboundQuantity.evaluate((input) => input.validity.valid), '其他出库数量超过库存余量时未拦截');
await outboundQuantity.fill('1');
expect(await outboundQuantity.evaluate((input) => input.validity.valid), '其他出库合法数量仍无效');
expect((await outboundItems.locator('[data-footer-summary-column="outboundQuantity"]').textContent()).trim() === '1.00', '其他出库明细未合计出库数量');
await inventoryAction.click();
await picker.locator('#other-available-inventory-table tbody > tr:visible:not([data-empty-row]) [data-row-select]:not(:disabled)').first().check();
await picker.locator('[data-act="confirm-inventory"]').click();
expect(await outboundItems.locator('tbody > tr:not([data-empty-row])').count() === 2, '其他出库再次选择未追加为两条明细');
expect(await outboundItems.locator('[data-sequence-cell]').evaluateAll((cells) => cells.map((cell) => cell.textContent.trim()).join(',')) === '1,2', '其他出库追加后明细序号未重排为1,2');
await outboundDetail.locator('[data-tab="attachments"]').click();
expect(await outboundDetail.locator('[data-tab-panel="attachments"] [data-act="upload"]').count() === 1, '其他出库附件页签缺少上传入口');
await outboundDetail.locator('[data-tab="outbound-info"]').click();
await outbound.screenshot({ path: path.join(reportDir, 'other-outbound-detail.png'), fullPage: true });
expect(await outboundDetail.locator('[data-tab="workflow-activity"],[data-tab="workflow-owner"],[data-tab="workflow-chart"]').count() === 0, '其他出库内容区重复显示流程页签');
await outbound.setViewportSize({ width: 2048, height: 1200 });
expect(!await outbound.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1), '其他出库页面出现页面级横向溢出');

const inbound = await openPage('other-inbound');
const inboundList = inbound.locator('[data-page-view="list"]');
const inboundTable = inboundList.locator('#other-inbound-table');
expect(await inboundList.isVisible(), '其他入库列表未显示');
expect((await labels(inboundList.locator('#other-inbound-search .form-label'))).join(',') === '入库单号,状态,入库日期,业务类型,库存地点', '其他入库查询字段或顺序错误');
expect(JSON.stringify(await inboundList.locator('#other-inbound-search [data-field="businessType"] option').evaluateAll((options) => options.map((option) => option.value).filter(Boolean))) === JSON.stringify(['盘盈入库', '期初补录', '其他入库']), '其他入库查询业务类型选项错误');
expect(await inboundTable.locator('tbody > tr:not([data-empty-row])').count() === 12, '其他入库列表不是12条样例');
expect(await inboundTable.locator('tbody > tr:visible:not([data-empty-row])').count() === 5, '其他入库首屏不是5条');
expect((await labels(inboundTable.locator('thead th'))).join(',') === '入库单号,状态,入库日期,业务类型,库存地点,创建人,创建时间,操作', '其他入库列表字段或顺序错误');
const inboundTypes = await inboundTable.locator('tbody > tr:not([data-empty-row])').evaluateAll((rows) => [...new Set(rows.map((row) => JSON.parse(row.dataset.rowValue || '{}').businessType))].sort());
expect(JSON.stringify(inboundTypes) === JSON.stringify(['盘盈入库', '期初补录', '其他入库'].sort()), '其他入库业务类型样例不完整');
await inbound.screenshot({ path: path.join(reportDir, 'other-inbound-list.png'), fullPage: true });

await inboundList.locator('[data-act="create"]').click();
const inboundDetail = inbound.locator('[data-page-view="detail"]');
expect(await inboundDetail.isVisible(), '其他入库新增详情未显示');
expect((await labels(inboundDetail.locator('[data-component="ProTabsDetail"] > .pro-tabs [data-tab]'))).join(',') === '入库信息,附件', '其他入库详情页签错误');
const inboundBasic = inboundDetail.locator('#other-inbound-basic');
expect((await labels(inboundBasic.locator('.form-label'))).join(',') === '入库单号,状态,入库日期,业务类型,库存地点,创建人,创建时间,审核人,审核时间,所属公司,备注', '其他入库基础信息字段或顺序错误');
expect(JSON.stringify(await inboundBasic.locator('[data-field="businessType"] option').evaluateAll((options) => options.map((option) => option.value).filter(Boolean))) === JSON.stringify(['盘盈入库', '期初补录', '其他入库']), '其他入库详情业务类型选项错误');
expect(await inboundBasic.locator('[data-field="company"]').evaluate((element) => element.readOnly), '其他入库所属公司不是只读字段');
expect(!await inboundBasic.locator('[data-field="inboundReason"]').evaluate((element) => element.required), '其他入库备注仍为必填');
const inboundItems = inboundDetail.locator('#other-inbound-items');
expect((await labels(inboundItems.locator('thead th'))).join(',') === '序号,物资类型,物资名称,规格,单位,库位,入库数量,成本单价,入库成本,备注,操作', '其他入库明细字段或顺序错误');
const addInboundRow = inboundItems.locator('[data-act="add-row"]');
expect(await addInboundRow.isDisabled(), '其他入库未选库存地点时新增明细未禁用');
await inboundBasic.locator('[data-field="businessType"]').selectOption('其他入库');
await inboundBasic.locator('[data-field="warehouse"]').selectOption('武汉中心仓');
expect(!await addInboundRow.isDisabled(), '其他入库选择库存地点后新增明细未启用');
await addInboundRow.click();
const inboundRow = inboundItems.locator('tbody > tr:not([data-empty-row])').first();
expect(await inboundItems.locator('tbody > tr:not([data-empty-row])').count() === 1, '其他入库新增明细失败');
const storageBin = inboundRow.locator('[data-field="storageBin"]');
expect((await storageBin.locator('option').allTextContents()).filter(Boolean).join(',') === '请选择库位,A-01-0101,A-03-0302,B-01-0104,B-04-0401,D-01-0101,E-01-0101,E-02-0102', '其他入库库位未按武汉中心仓联动');
await inboundRow.locator('[data-field="purchaseCategory"]').selectOption('备品备件');
await inboundRow.locator('[data-field="purchaseName"]').fill('温度传感器');
await inboundRow.locator('[data-field="specification"]').fill('PT100，M12');
await inboundRow.locator('[data-field="unit"]').selectOption('个');
await storageBin.selectOption('B-01-0104');
const inboundQuantity = inboundRow.locator('[data-field="inventoryQuantity"]');
await inboundQuantity.fill('0');
expect(!await inboundQuantity.evaluate((input) => input.validity.valid), '其他入库数量为0时未拦截');
await inboundQuantity.fill('3');
await inboundRow.locator('[data-field="costUnitPrice"]').fill('125.6789');
expect((await inboundRow.locator('[data-column="costAmount"]').textContent()).trim() === '377.04', '其他入库成本未实时按数量乘单价计算');
expect((await inboundItems.locator('[data-footer-summary-column="inventoryQuantity"]').textContent()).trim() === '3.00', '其他入库数量合计未实时汇总');
expect((await inboundItems.locator('[data-footer-summary-column="costAmount"]').textContent()).trim() === '377.04', '其他入库成本合计未实时汇总');
expect((await inboundItems.locator('tfoot .pro-table-total-label').textContent()).trim() === '合计', '其他入库明细缺少合计行');
await inboundBasic.locator('[data-field="warehouse"]').selectOption('长沙项目仓');
expect(await storageBin.inputValue() === '', '其他入库变更库存地点后未清空原库位');
expect((await storageBin.locator('option').allTextContents()).filter(Boolean).join(',') === '请选择库位,B-02-0203,D-02-0202', '其他入库库位未切换为长沙项目仓范围');
await addInboundRow.click();
expect(await inboundItems.locator('tbody > tr:not([data-empty-row])').count() === 2, '其他入库再次新增明细未追加为两行');
expect((await inboundItems.locator('[data-sequence-cell]').allTextContents()).map((text) => text.trim()).join(',') === '1,2', '其他入库追加后明细序号未重排为1,2');
await inboundDetail.locator('[data-tab="attachments"]').click();
expect(await inboundDetail.locator('[data-tab-panel="attachments"] [data-act="upload"]').count() === 1, '其他入库附件页签缺少上传入口');
await inboundDetail.locator('[data-tab="inbound-info"]').click();
await inbound.screenshot({ path: path.join(reportDir, 'other-inbound-detail.png'), fullPage: true });
expect(await inboundDetail.locator('[data-tab="workflow-activity"],[data-tab="workflow-owner"],[data-tab="workflow-chart"]').count() === 0, '其他入库内容区重复显示流程页签');
await inbound.setViewportSize({ width: 2048, height: 1200 });
expect(!await inbound.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1), '其他入库页面出现页面级横向溢出');

const menuHtml = fs.readFileSync('menu/index.html', 'utf8');
for (const [name, route] of [['物资出库', 'material/material-outbound.html'], ['其他出库', 'material/other-outbound.html'], ['其他入库', 'material/other-inbound.html']]) {
  expect(menuHtml.includes(`"name": "${name}"`) && menuHtml.includes(`"path": "${route}"`), `菜单缺少${name}有效路由`);
}
expect(!menuHtml.includes('"name": "物资台账"'), '隐藏的物资台账重新出现在菜单');

await outbound.close();
await inbound.close();
await browser.close();

const report = {
  pages: ['pages/material/other-outbound.html', 'pages/material/other-inbound.html'],
  checkedAt: new Date().toISOString(), status: errors.length ? 'failed' : 'passed', issues: errors,
  screenshots: ['other-outbound-list.png', 'other-outbound-picker.png', 'other-outbound-detail.png', 'other-inbound-list.png', 'other-inbound-detail.png'].map((name) => `outputs/reports/visual/${name}`),
};
fs.writeFileSync(path.join(reportDir, 'other-inventory-adjustments-smoke.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log('Other inventory adjustments smoke passed: lists, required fields, inventory picker, quantity limits, editable inbound calculations, warehouse-bin linkage, attachments, lifecycle and menu routes');
