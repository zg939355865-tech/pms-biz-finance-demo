import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '../lib/playwright-smoke.mjs';

const htmlPath = process.argv[2] || 'pages/material/material-outbound.html';
const absolutePath = path.resolve(htmlPath);
const reportDir = path.resolve('outputs/reports/visual');
fs.mkdirSync(reportDir, { recursive: true });

const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
const expect = (condition, message) => { if (!condition) errors.push(message); };
const labels = async (locator) => locator.allTextContents().then((items) => items.map((item) => item.trim()).filter(Boolean));

await page.goto(pathToFileURL(absolutePath).href, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(200);

const list = page.locator('[data-page-view="list"]');
const listTable = list.locator('#material-outbound-table');
expect(await list.isVisible(), '物资出库列表未显示');
expect((await labels(list.locator('#material-outbound-search .form-label'))).join(',') === '出库单号,状态,类型,库存地点,领用部门,项目,出库日期', '查询条件或顺序错误');
expect(await listTable.locator('tbody > tr:visible:not([data-empty-row])').count() === 5, '列表首屏未固定显示5条');
expect(await listTable.locator('tbody > tr:not([data-empty-row])').count() === 12, '列表样例不是12条');
const listHeaders = await labels(listTable.locator('thead th'));
expect(!listHeaders.includes('出库总数量'), '列表仍显示出库总数量');
expect(listHeaders.indexOf('状态') === listHeaders.indexOf('出库单号') + 1, '状态未紧跟出库单号');
expect(listHeaders.join(',') === '出库单号,状态,类型,出库日期,库存地点,领用部门,项目,创建人,创建时间,操作', '列表字段或顺序错误');
const statusSet = await listTable.locator('tbody > tr:not([data-empty-row])').evaluateAll((rows) => [...new Set(rows.map((row) => row.dataset.rowStatus))].sort());
expect(JSON.stringify(statusSet) === JSON.stringify(['新增', '审核'].sort()), '列表状态不是草稿、待审核、已审核');
expect(await list.locator('[data-act="audit"]').count() === 1, '列表缺少审核按钮');
expect(await list.locator('[data-act="reverse-audit"]').count() === 1, '列表缺少反审核按钮');
expect(await page.locator('[data-act="workflow-activity"],[data-act="workflow-owner"],[data-act="workflow-chart"],[data-act="approve"]').count() === 0, '页面错误显示流程入口');
await page.screenshot({ path: path.join(reportDir, 'material-outbound-list.png') });

await list.locator('[data-act="create"]').click();
const detail = page.locator('[data-page-view="detail"]');
expect(await detail.isVisible(), '新增物资出库详情未显示');
expect((await labels(detail.locator('[data-component="ProTabsDetail"] > .pro-tabs [data-tab]'))).join(',') === '出库信息,附件', '详情页签不是出库信息、附件');
expect(await detail.locator('[data-act="save"]').count() === 1, '详情缺少保存');
expect((await detail.locator('[data-act="save"]').innerText()).trim() === '保存', '详情保存按钮文案不是保存');
expect(await detail.locator('[data-act="submit"]').count() === 0, '详情仍保留提交按钮');
const basicForm = detail.locator('#material-outbound-basic');
const basicLabels = await labels(basicForm.locator('.form-label'));
expect(basicLabels.join(',') === '出库单号,状态,出库日期,类型,库存地点,领用部门,项目,创建人,创建时间,审核人,审核时间,所属公司,备注', '基础信息字段或顺序错误');
expect(await basicForm.locator('.section-title').count() === 0, '仍显示基础信息区块标题');
const itemTable = detail.locator('#material-outbound-items');
const itemHeaders = await labels(itemTable.locator('thead th'));
expect(itemHeaders.join(',') === '序号,物资类型,物资名称,规格,单位,库位,可出库数量,出库数量,备注,物资出库单（蓝字）,出库行,操作', '出库明细字段或顺序错误');
expect(await detail.locator('[data-tab-panel="outbound-info"] [data-component="ProUploadList"]').count() === 0, '附件仍位于出库信息页签');
await detail.locator('[data-tab="attachments"]').click();
expect(await detail.locator('[data-tab-panel="attachments"] [data-component="ProUploadList"] [data-act="upload"]').count() === 1, '附件页签缺少附件上传');
await detail.locator('[data-tab="outbound-info"]').click();
const projectSelect = detail.locator('select[data-field="projectName"]');
expect(await projectSelect.count() === 1 && await detail.locator('[data-target="project-picker"]').count() === 0, '项目未改为下拉选择或仍保留项目弹窗入口');
expect(await projectSelect.inputValue() === '通用项目', '新增时项目未默认为通用项目');
const typeSelect = detail.locator('select[data-field="outboundType"]');
expect(await typeSelect.inputValue() === '', '新增时类型未默认为请选择');
const inventoryAction = itemTable.locator('[data-target="inventory-picker"]');
expect(await inventoryAction.isVisible(), '类型为请选择时未默认显示选择即时库存按钮');
expect(await inventoryAction.isDisabled(), '未选择库存地点时选择即时库存按钮未禁用');
await page.screenshot({ path: path.join(reportDir, 'material-outbound-default-detail.png'), fullPage: true });

await detail.locator('select[data-field="department"]').selectOption('数字化中心');
expect(await projectSelect.inputValue() === '通用项目' && !await projectSelect.isDisabled(), '选择部门后未带出通用项目或项目下拉仍禁用');
expect((await projectSelect.locator('option').allTextContents()).filter(Boolean).join(',') === '请选择项目,通用项目,PMS业财一体化建设项目,数据治理平台建设项目', '项目下拉未按领用部门限制候选项');
await projectSelect.selectOption('数据治理平台建设项目');
expect(await projectSelect.inputValue() === '数据治理平台建设项目', '项目下拉无法选择项目');

await detail.locator('select[data-field="warehouse"]').selectOption('武汉中心仓');
expect(!await inventoryAction.isDisabled(), '选择库存地点后即时库存按钮未启用');
expect(await inventoryAction.isVisible(), '类型为请选择时选择即时库存按钮未显示');
expect(!await itemTable.locator('[data-target="blue-outbound-picker"]').isVisible(), '类型为请选择时错误显示选择蓝字出库单按钮');
await typeSelect.selectOption('蓝字');
expect(await inventoryAction.isVisible(), '蓝字时未显示选择即时库存按钮');
await inventoryAction.click();
const inventoryPicker = page.locator('[data-overlay="inventory-picker"]');
expect(await inventoryPicker.isVisible(), '即时库存弹窗未显示');
expect((await labels(inventoryPicker.locator('#inventory-picker-search .form-label'))).join(',') === '物资类型,物资名称', '即时库存查询条件错误');
expect((await labels(inventoryPicker.locator('#available-inventory-table thead th'))).join(',') === '物资类型,物资名称,规格,单位,库位,库存余量', '即时库存列表字段或顺序错误');
const inventoryRows = await inventoryPicker.locator('#available-inventory-table tbody > tr:visible:not([data-empty-row])').evaluateAll((rows) => rows.map((row) => JSON.parse(row.dataset.rowValue || '{}')));
expect(inventoryRows.length === 5 && inventoryRows.every((row) => row.warehouse === '武汉中心仓' && Number(row.availableQuantity) > 0), '即时库存未按库存地点和正库存过滤');
await page.screenshot({ path: path.join(reportDir, 'material-outbound-picker.png') });
await inventoryPicker.locator('#available-inventory-table tbody > tr:visible:not([data-empty-row]) [data-row-select]').nth(0).check();
await inventoryPicker.locator('#available-inventory-table tbody > tr:visible:not([data-empty-row]) [data-row-select]').nth(1).check();
await inventoryPicker.locator('[data-act="confirm-inventory"]').click();
expect(await itemTable.locator('tbody > tr:not([data-empty-row])').count() === 2, '即时库存多选未带入两条出库明细');
const quantities = await itemTable.locator('tbody > tr:not([data-empty-row])').evaluateAll((rows) => rows.map((row) => ({
  available: Number(row.querySelector('[data-column="availableQuantity"]')?.textContent.trim()),
  outbound: Number(row.querySelector('[data-field="outboundQuantity"]')?.value)
})));
expect(quantities.every((row) => row.available === row.outbound && row.available > 0), '库存余量未作为可出库数量及默认出库数量');
const blueQuantityTotal = quantities.reduce((total, row) => total + row.outbound, 0).toFixed(2);
expect((await itemTable.locator('[data-footer-summary-column="outboundQuantity"]').textContent()).trim() === blueQuantityTotal, '物资出库明细未合计出库数量');
expect(await itemTable.locator('[data-column="inboundDate"],[data-column="supplierName"]').count() === 0, '出库明细仍显示入库日期或供应商');
expect(await itemTable.locator('[data-column="sourceOutboundNo"]').evaluateAll((cells) => cells.every((cell) => !cell.textContent.trim())), '蓝字明细的来源蓝字单号不为空');
expect(await itemTable.locator('[data-column="sourceOutboundLine"]').evaluateAll((cells) => cells.every((cell) => !cell.textContent.trim())), '蓝字明细的出库行不为空');
const quantityInput = itemTable.locator('[data-field="outboundQuantity"]').first();
await quantityInput.fill(String(quantities[0].available + 1));
expect(!await quantityInput.evaluate((input) => input.validity.valid), '出库数量超过库存余量时未拦截');
await quantityInput.fill(String(quantities[0].available));
expect(await quantityInput.evaluate((input) => input.validity.valid), '合法出库数量仍被判无效');
expect((await itemTable.locator('[data-footer-summary-column="outboundQuantity"]').textContent()).trim() === blueQuantityTotal, '物资出库数量合计未随编辑更新');

await inventoryAction.click();
await inventoryPicker.locator('#available-inventory-table tbody > tr:visible:not([data-empty-row]) [data-row-select]:not(:disabled)').first().check();
await inventoryPicker.locator('[data-act="confirm-inventory"]').click();
expect(await itemTable.locator('tbody > tr:not([data-empty-row])').count() === 3, '即时库存再次选择未追加为三条出库明细');
expect(await itemTable.locator('[data-sequence-cell]').evaluateAll((cells) => cells.map((cell) => cell.textContent.trim()).join(',')) === '1,2,3', '物资出库追加后明细序号未重排为1,2,3');

await detail.locator('select[data-field="outboundType"]').selectOption('红字');
expect(await itemTable.locator('tbody > tr:not([data-empty-row])').count() === 0, '切换红字后未清空蓝字明细');
expect(!await inventoryAction.isVisible(), '红字时错误显示选择即时库存按钮');
const blueOutboundAction = itemTable.locator('[data-target="blue-outbound-picker"]');
expect(await blueOutboundAction.isVisible() && !await blueOutboundAction.isDisabled(), '红字时未显示或未启用选择蓝字出库单按钮');
await blueOutboundAction.click();
const blueOutboundPicker = page.locator('[data-overlay="blue-outbound-picker"]');
expect(await blueOutboundPicker.isVisible(), '蓝字出库单弹窗未显示');
expect((await labels(blueOutboundPicker.locator('#blue-outbound-picker-search .form-label'))).join(',') === '物资类型,物资名称,物资出库单', '蓝字出库单查询条件错误');
expect((await labels(blueOutboundPicker.locator('#blue-outbound-table thead th'))).join(',') === '出库日期,物资类型,物资名称,规格,单位,库位,已出库数量,已退货数量（负数）,物资出库单（蓝字）,出库行', '蓝字出库单列表字段或顺序错误');
const blueOutboundRows = await blueOutboundPicker.locator('#blue-outbound-table tbody > tr:visible:not([data-empty-row])').evaluateAll((rows) => rows.map((row) => JSON.parse(row.dataset.rowValue || '{}')));
expect(blueOutboundRows.length === 5 && blueOutboundRows.every((row) => row.warehouse === '武汉中心仓' && row.outboundDate && row.returnedQuantity <= 0 && row.availableQuantity === row.issuedQuantity - Math.abs(row.returnedQuantity)), '蓝字出库行未按库存地点过滤、缺少出库日期或可退数量计算错误');
expect(await blueOutboundPicker.locator('#blue-outbound-table [data-column="supplierName"]').count() === 0, '蓝字出库单弹窗仍显示供应商');
await page.screenshot({ path: path.join(reportDir, 'material-outbound-blue-picker.png') });
await blueOutboundPicker.locator('#blue-outbound-table tbody > tr:visible:not([data-empty-row]) [data-row-select]').first().check();
await blueOutboundPicker.locator('[data-act="confirm-blue-outbound"]').click();
expect(await itemTable.locator('tbody > tr:not([data-empty-row])').count() === 1, '红字来源未带入出库明细');
const redQuantity = itemTable.locator('[data-field="outboundQuantity"]').first();
const redAvailable = Number(await itemTable.locator('[data-column="availableQuantity"]').first().textContent());
expect(Number(await redQuantity.inputValue()) === -redAvailable, '红字出库数量未默认为可退数量负数');
expect(Boolean((await itemTable.locator('[data-column="sourceOutboundNo"]').first().textContent()).trim()), '红字明细缺少物资出库单（蓝字）');
expect(Boolean((await itemTable.locator('[data-column="sourceOutboundLine"]').first().textContent()).trim()), '红字明细缺少出库行');
await redQuantity.fill(String(redAvailable + 1));
expect(Number(await redQuantity.inputValue()) === -(redAvailable + 1) && !await redQuantity.evaluate((input) => input.validity.valid), '红字数量未自动转负或未拦截超可退数量');
await redQuantity.fill(String(redAvailable));
expect(Number(await redQuantity.inputValue()) === -redAvailable && await redQuantity.evaluate((input) => input.validity.valid), '合法红字数量仍被判无效');
await page.evaluate(() => window.scrollTo(0, 0));
await page.screenshot({ path: path.join(reportDir, 'material-outbound-detail.png'), fullPage: true });

await page.reload({ waitUntil: 'domcontentloaded' });
const auditedRow = page.locator('#material-outbound-table tbody > tr:has(a[data-row-id="MO002"])');
await auditedRow.locator('a[data-row-id="MO002"]').click();
expect(await detail.getAttribute('data-detail-editable') === 'false', '审核详情未只读');
expect(await detail.locator('[data-act="open"],[data-act="remove-row"],[data-act="upload"],[data-act="batch-delete"]').evaluateAll((buttons) => buttons.every((button) => button.disabled)), '审核详情仍可修改明细或附件');
await detail.locator('[data-act="back-list"]').click();

const auditAction = list.locator('[data-act="audit"]');
const reverseAction = list.locator('[data-act="reverse-audit"]');
const pendingRow = page.locator('#material-outbound-table tbody > tr:has(a[data-row-id="MO001"])');
await pendingRow.locator('[data-row-select]').check();
expect(!await auditAction.isDisabled() && await reverseAction.isDisabled(), '新增选择后的审核/反审核按钮状态错误');
await auditAction.click();
await page.locator('[data-overlay="audit-outbound-modal"] [data-act="confirm-status"]').click();
expect(await pendingRow.getAttribute('data-row-status') === '审核', '审核后状态未变为审核');
await pendingRow.locator('[data-row-select]').check();
expect(await auditAction.isDisabled() && !await reverseAction.isDisabled(), '审核选择后的审核/反审核按钮状态错误');
await reverseAction.click();
await page.locator('[data-overlay="reverse-outbound-modal"] [data-act="confirm-status"]').click();
expect(await pendingRow.getAttribute('data-row-status') === '新增', '反审核后状态未回到新增');

await page.setViewportSize({ width: 2048, height: 1200 });
await page.reload({ waitUntil: 'domcontentloaded' });
expect(!await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1), '2048px列表出现页面级横向溢出');

const report = {
  page: htmlPath,
  checkedAt: new Date().toISOString(),
  status: errors.length ? 'failed' : 'passed',
  issues: errors,
  screenshots: ['material-outbound-list.png', 'material-outbound-default-detail.png', 'material-outbound-picker.png', 'material-outbound-blue-picker.png', 'material-outbound-detail.png'].map((name) => `outputs/reports/visual/${name}`)
};
fs.writeFileSync(path.join(reportDir, 'material-outbound-smoke.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await browser.close();
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log('Material outbound smoke passed: list/detail fields, simplified source pickers, signed quantity limits, source traceability, attachment tab and audit lifecycle');
