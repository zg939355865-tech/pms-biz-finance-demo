import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '../lib/playwright-smoke.mjs';

const htmlPath = process.argv[2] || 'pages/procurement/purchase-receipt.html';
const absolutePath = path.resolve(htmlPath);
const reportDir = path.resolve('outputs/reports/visual');
fs.mkdirSync(reportDir, { recursive: true });

const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
const expect = (condition, message) => { if (!condition) errors.push(message); };

await page.goto(pathToFileURL(absolutePath).href, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(250);

const list = page.locator('[data-page-view="list"]');
const listTable = list.locator('#purchase-receipt-table');
expect(await list.isVisible(), '采购入库列表未显示');
expect(await listTable.locator('tbody > tr:visible:not([data-empty-row])').count() === 5, '列表首屏未固定显示5条');
expect(await listTable.locator('tbody > tr:not([data-empty-row])').count() === 12, '列表样例不是12条');
expect((await list.locator('.page-size-select[data-fixed-page-size]').textContent()).trim() === '5条/页', '列表不是固定5条/页');
expect(await list.locator('#purchase-receipt-search .form-label').allTextContents().then((labels) => labels.some((label) => label.trim() === '库存地点')), '查询条件未显示库存地点');
expect(await listTable.locator('thead th').allTextContents().then((labels) => labels.some((label) => label.trim() === '库存地点')), '列表未显示库存地点');
const searchLabels = await list.locator('#purchase-receipt-search .form-label').allTextContents().then((labels) => labels.map((label) => label.trim()));
expect(searchLabels.filter((label) => label === '供应商').length === 1 && !searchLabels.includes('项目'), '查询条件未将项目统一改为唯一供应商条件');
const listHeaders = await listTable.locator('thead th').allTextContents().then((labels) => labels.map((label) => label.trim()).filter(Boolean));
expect(listHeaders.indexOf('状态') === listHeaders.indexOf('入库单号') + 1, '列表状态未紧跟入库单号');
expect(listHeaders.indexOf('类型') === listHeaders.indexOf('状态') + 1, '列表类型未紧跟状态');
expect(listHeaders.indexOf('入库日期') === listHeaders.indexOf('类型') + 1 && listHeaders.indexOf('供应商') === listHeaders.indexOf('入库日期') + 1, '列表入库日期未放在供应商之前');
expect(listHeaders.includes('供应商') && !listHeaders.includes('项目'), '列表未将项目改为供应商');
expect(!listHeaders.includes('入库状态'), '列表仍显示“入库状态”旧名称');
const listStatuses = await listTable.locator('tbody > tr:not([data-empty-row])').evaluateAll((rows) => [...new Set(rows.map((row) => row.dataset.rowStatus))].sort());
expect(JSON.stringify(listStatuses) === JSON.stringify(['审核', '新增'].sort()), '采购入库状态未统一为新增、审核');
expect(await page.locator('[data-act="workflow-activity"],[data-act="workflow-owner"],[data-act="workflow-chart"],[data-act="approve"]').count() === 0, '页面错误包含流程审批入口');
expect(await list.locator('[data-act="audit"]').count() === 1, '列表右上角缺少审核按钮');
expect(await list.locator('[data-act="reverse-audit"]').count() === 1, '列表右上角缺少反审核按钮');
expect(await list.locator('[data-act="audit"]').isDisabled() && await list.locator('[data-act="reverse-audit"]').isDisabled(), '未选择单据时审核按钮未禁用');
expect(await page.locator('[data-page-view="detail"] [data-act="audit"],[data-page-view="detail"] [data-act="reverse-audit"]').count() === 0, '详情页错误重复审核或反审核按钮');
await page.screenshot({ path: path.join(reportDir, 'purchase-receipt-list.png') });

await list.locator('[data-act="create"]').click();
const detail = page.locator('[data-page-view="detail"]');
expect(await detail.isVisible(), '新增采购入库详情未显示');
const basicForm = detail.locator('[data-tab-panel="basic"] [data-component="DetailForm"]').first();
const basicCodes = await basicForm.locator('[data-field]').evaluateAll((nodes) => nodes.map((node) => node.dataset.field));
for (const required of ['receiptNo', 'status', 'receiptType', 'receiptDate', 'supplierName', 'warehouse', 'company', 'creator', 'createdAt', 'auditUser', 'auditTime', 'remark']) expect(basicCodes.includes(required), `基础信息缺少${required}`);
for (const forbidden of ['projectCode', 'projectName', 'relatedOrderCount', 'totalReceiptQuantity', 'handler', 'reverseAuditUser', 'reverseAuditTime', 'currency', 'amount']) expect(!basicCodes.includes(forbidden), `基础信息仍包含${forbidden}`);
const basicLabels = await basicForm.locator('.form-label').allTextContents().then((labels) => labels.map((label) => label.trim().replace(/^\*\s*/, '')));
expect(basicLabels.join(',') === '入库单号,状态,类型,入库日期,供应商,库存地点,创建人,创建时间,审核人,审核时间,所属公司,备注', '基础信息字段或顺序不符合要求');
expect(basicCodes.indexOf('status') === basicCodes.indexOf('receiptNo') + 1, '详情状态未紧跟入库单号');
expect(basicCodes.indexOf('receiptType') === basicCodes.indexOf('status') + 1, '详情类型未紧跟状态');
expect(basicCodes.indexOf('auditUser') === basicCodes.indexOf('createdAt') + 1 && basicCodes.indexOf('auditTime') === basicCodes.indexOf('auditUser') + 1, '审核人和审核时间未紧跟创建时间');
expect(basicCodes.indexOf('company') === basicCodes.indexOf('auditTime') + 1 && basicCodes.indexOf('remark') === basicCodes.indexOf('company') + 1, '所属公司未放在审核时间与备注之间');
expect(await detail.locator('select[data-field="receiptType"]').inputValue() === '', '新增时类型未默认显示请选择');
expect(await detail.locator('[data-component="ProTabsDetail"] > .pro-tabs [data-tab]').allTextContents().then((labels) => labels.map((label) => label.trim()).join(',')) === '基础信息,附件', '详情页签未合并为基础信息和附件');
expect(await detail.locator('[data-tab="linkage"], [data-tab-panel="linkage"]').count() === 0, '关联单据页签仍存在');
expect(await detail.locator('[data-tab-panel="basic"] .form-label').allTextContents().then((labels) => labels.some((label) => label.trim() === '库存地点')), '详情基础信息未显示库存地点');
expect(await page.locator('.form-label').allTextContents().then((labels) => !labels.some((label) => label.trim() === '仓库')), '页面仍显示仓库字段名称');
const items = detail.locator('#purchase-receipt-items');
expect((await items.locator('.section-title').textContent()).trim() === '入库明细', '选择采购订单上方未显示入库明细标题');
const defaultSelectOrder = items.locator('[data-act="open"][data-target="order-line-picker"]');
expect(await defaultSelectOrder.isVisible(), '类型未选择时未默认显示“选择采购订单”按钮');
expect(await defaultSelectOrder.isDisabled(), '类型未选择时“选择采购订单”按钮未保持禁用');
expect(!await items.locator('[data-act="open"][data-target="blue-receipt-line-picker"]').isVisible(), '类型未选择时错误显示红字来源按钮');

await detail.locator('[data-target="supplier-picker"]').click();
const supplierPicker = page.locator('[data-overlay="supplier-picker"]');
await supplierPicker.locator('tbody tr[data-row-value]').filter({ hasText: '武汉智控电气有限公司' }).locator('[data-row-select]').check();
await supplierPicker.locator('[data-act="confirm-supplier"]').click();
await detail.locator('select[data-field="warehouse"]').selectOption({ label: '沙河项目仓' });
await detail.locator('select[data-field="receiptType"]').selectOption('蓝字');
expect((await items.locator('[data-act="batch-delete"]').textContent()).trim() === '删除选中入库行', '采购入库批量删除按钮未统一为“删除选中入库行”');
const selectLines = items.locator('[data-act="open"][data-target="order-line-picker"]');
expect(!await selectLines.isDisabled(), '选择供应商和库存地点后明细选择按钮未启用');
expect(await selectLines.isVisible() && (await selectLines.textContent()).trim() === '选择采购订单', '蓝字类型未显示“选择采购订单”入口');
expect(!await items.locator('[data-act="open"][data-target="blue-receipt-line-picker"]').isVisible(), '蓝字类型错误显示蓝字入库行选择入口');
await selectLines.click();

const picker = page.locator('[data-overlay="order-line-picker"]');
expect(await picker.isVisible(), '选择采购订单弹窗未显示');
expect((await picker.locator('.pro-modal-header h2').textContent()).trim() === '选择采购订单', '采购订单弹窗标题未改为“选择采购订单”');
const orderPickerSearchLabels = await picker.locator('[data-component="ProSearchForm"] .form-label').allTextContents().then((labels) => labels.map((label) => label.trim()));
expect(orderPickerSearchLabels.join(',') === '采购订单号,项目,物资类型,物资名称', '选择采购订单弹窗查询条件未将供应商改为项目');
const orderPickerHeaders = await picker.locator('#available-order-line-table thead th').allTextContents().then((labels) => labels.map((label) => label.trim()).filter(Boolean));
expect(orderPickerHeaders.join(',') === '订单日期,物资类型,物资名称,规格,单位,订单数量,可入库数量,项目,采购订单,订单行', '选择采购订单弹窗列表字段或顺序错误');
const visiblePickerValues = await picker.locator('tbody > tr:visible:not([data-empty-row])').evaluateAll((rows) => rows.map((row) => JSON.parse(row.dataset.rowValue || '{}')));
expect(visiblePickerValues.length >= 2, '当前供应商可选订单行不足');
expect(visiblePickerValues.every((row) => row.supplierName === '武汉智控电气有限公司'), '弹窗未按供应商过滤');
expect(visiblePickerValues.every((row) => row.company === '昕彤赋能（武汉）设计研究有限公司'), '弹窗未按当前公司过滤');
expect(visiblePickerValues.every((row) => /^\d{4}-\d{2}-\d{2}$/.test(row.orderDate || '')), '采购订单行弹窗缺少订单日期');
await page.screenshot({ path: path.join(reportDir, 'purchase-receipt-picker.png') });
await picker.locator('tbody > tr:visible:not([data-empty-row]) [data-row-select]').nth(0).check();
await picker.locator('tbody > tr:visible:not([data-empty-row]) [data-row-select]').nth(1).check();
await picker.locator('[data-act="confirm-order-lines"]').click();

expect(await items.locator('tbody > tr:not([data-empty-row])').count() === 2, '多选订单行未带入两行');
const values = await items.locator('tbody > tr:not([data-empty-row])').evaluateAll((rows) => rows.map((row) => {
  const value = {};
  row.querySelectorAll('[data-column]').forEach((cell) => { const input = cell.querySelector('[data-field]'); value[cell.dataset.column] = input ? input.value : cell.textContent.trim(); });
  return value;
}));
expect(values.every((row) => Number(row.receiptQuantity) === Number(row.receivableQuantity)), '入库数量未默认等于可入库数量');
const receiptQuantityTotal = values.reduce((total, row) => total + Number(row.receiptQuantity), 0).toFixed(2);
expect((await items.locator('[data-footer-summary-column="receiptQuantity"]').textContent()).trim() === receiptQuantityTotal, '采购入库明细未合计入库数量');
expect(values.every((row) => row.locationCode === 'A-10-1001'), '库位未默认A-10-1001');
const headers = await items.locator('thead th').allTextContents().then((x) => x.map((item) => item.trim()));
expect(headers.slice(-3).join(',') === '采购订单,订单行,操作', '蓝字入库行来源列未显示采购订单、订单行');
expect(!headers.includes('项目') && !headers.includes('供应商名称'), '入库明细仍显示项目或供应商名称');
expect(headers.indexOf('备注') === headers.indexOf('库位') + 1, '删除项目后备注未紧跟库位');
expect(!headers.some((label) => /合同|单价|金额|币种|税/.test(label)), '明细仍包含合同或价格字段');
expect((await items.locator('[data-act="batch-delete"]').textContent()).trim() === '删除选中入库行', '入库行批量删除文案错误');
expect((await items.locator('tbody [data-act="remove-row"]').allTextContents()).every((text) => text.trim() === '删除'), '明细行删除文案错误');
const quantityInput = items.locator('[data-field="receiptQuantity"]').first();
const receivable = Number(values[0].receivableQuantity);
await quantityInput.fill(String(receivable + 1));
expect(!await quantityInput.evaluate((input) => input.validity.valid), '入库数量超过可入库数量时未拦截');
await quantityInput.fill(String(receivable));
expect(await quantityInput.evaluate((input) => input.validity.valid), '合法入库数量仍被判无效');
expect((await items.locator('[data-footer-summary-column="receiptQuantity"]').textContent()).trim() === receiptQuantityTotal, '采购入库数量合计未随编辑更新');
await page.screenshot({ path: path.join(reportDir, 'purchase-receipt-detail.png') });

await detail.locator('select[data-field="receiptType"]').selectOption('红字');
expect(await items.locator('tbody > tr:not([data-empty-row])').count() === 0, '切换入库类型后未清空原来源明细');
const redHeaders = await items.locator('thead th').allTextContents().then((x) => x.map((item) => item.trim()));
expect(redHeaders.slice(-3).join(',') === '蓝字入库单,入库行,操作', '红字入库行来源列未显示蓝字入库单、入库行');
const selectBlueReceiptLines = items.locator('[data-act="open"][data-target="blue-receipt-line-picker"]');
expect(await selectBlueReceiptLines.isVisible() && !await selectBlueReceiptLines.isDisabled(), '红字类型未启用蓝字入库明细选择入口');
expect(!await selectLines.isVisible(), '红字类型错误显示选择采购订单入口');
await selectBlueReceiptLines.click();
const blueReceiptPicker = page.locator('[data-overlay="blue-receipt-line-picker"]');
expect(await blueReceiptPicker.isVisible(), '蓝字入库明细选择弹窗未显示');
const blueReceiptSearchLabels = await blueReceiptPicker.locator('[data-component="ProSearchForm"] .form-label').allTextContents().then((labels) => labels.map((label) => label.trim()));
expect(blueReceiptSearchLabels.join(',') === '入库日期,物资类型,蓝字入库单,项目,物资名称,采购订单', '蓝字入库明细弹窗查询条件未将供应商改为项目');
const blueReceiptHeaders = await blueReceiptPicker.locator('#available-blue-receipt-line-table thead th').allTextContents().then((labels) => labels.map((label) => label.trim()).filter(Boolean));
expect(blueReceiptHeaders.join(',') === '入库日期,物资类型,物资名称,规格,单位,入库数量,可退货数量,项目,蓝字入库单,入库行,采购订单,订单行', '蓝字入库行弹窗列表未将供应商改为项目');
const blueReceiptRows = await blueReceiptPicker.locator('tbody > tr:visible:not([data-empty-row])').evaluateAll((rows) => rows.map((row) => JSON.parse(row.dataset.rowValue || '{}')));
expect(blueReceiptRows.length >= 1, '红字可选蓝字入库明细不足');
expect(blueReceiptRows.every((row) => row.supplierName === '武汉智控电气有限公司'), '红字来源未按供应商过滤');
expect(blueReceiptRows.every((row) => row.sourceStatus === '审核' && row.closeStatus === '未关闭'), '红字来源包含未审核或已关闭蓝字入库明细');
expect(blueReceiptRows.every((row) => row.purchaseOrderNo && row.purchaseOrderLineNo && row.sourcePurchaseOrderNo && row.sourcePurchaseOrderLineNo), '蓝字入库明细缺少双层来源追溯字段');
await blueReceiptPicker.locator('[data-field="sourcePurchaseOrderNo"]').fill('PO20260819001');
await blueReceiptPicker.locator('[data-act="query"]').click();
const filteredBlueReceiptRows = await blueReceiptPicker.locator('tbody > tr:visible:not([data-empty-row])').evaluateAll((rows) => rows.map((row) => JSON.parse(row.dataset.rowValue || '{}')));
expect(filteredBlueReceiptRows.length === 1 && filteredBlueReceiptRows[0].sourcePurchaseOrderNo === 'PO20260819001', '蓝字入库明细未按采购订单查询');
await blueReceiptPicker.locator('[data-act="reset"]').click();
await page.screenshot({ path: path.join(reportDir, 'purchase-receipt-red-picker.png') });
await blueReceiptPicker.locator('tbody > tr:visible:not([data-empty-row]) [data-row-select]').first().check();
await blueReceiptPicker.locator('[data-act="confirm-blue-receipt-lines"]').click();
expect(await items.locator('tbody > tr:not([data-empty-row])').count() === 1, '红字蓝字入库明细未带入');

await page.reload({ waitUntil: 'domcontentloaded' });
for (const sample of [{ id: 'GR002', status: '审核' }, { id: 'GR003', status: '审核' }]) {
  const readOnlyRow = page.locator(`#purchase-receipt-table tbody > tr:has(a[data-row-id="${sample.id}"])`);
  await readOnlyRow.locator(`a[data-row-id="${sample.id}"]`).click();
  expect(await detail.getAttribute('data-detail-editable') === 'false', `${sample.status}详情未标记为只读`);
  expect(await detail.locator('input:not(:disabled),select:not(:disabled),textarea:not(:disabled)').count() === 0, `${sample.status}详情仍存在可编辑字段`);
  expect(await detail.locator('[data-act="open"],[data-act="remove-row"],[data-act="upload"],[data-act="batch-delete"]').evaluateAll((buttons) => buttons.every((button) => button.disabled)), `${sample.status}详情仍存在可用修改操作`);
  expect(await detail.locator('[data-row-select],[data-act="select-all"]').evaluateAll((controls) => controls.every((control) => control.disabled)), `${sample.status}详情仍可选择或删除明细`);
  await detail.locator('[data-tab="attachments"]').click();
  expect(await detail.locator('[data-act="upload"]').isDisabled(), `${sample.status}附件仍可上传`);
  await detail.locator('[data-act="back-list"]').click();
}
const waitRow = page.locator('#purchase-receipt-table tbody > tr:has(a[data-row-id="GR001"])');
const auditAction = page.locator('[data-page-view="list"] [data-act="audit"]');
const reverseAction = page.locator('[data-page-view="list"] [data-act="reverse-audit"]');
await waitRow.locator('[data-row-select]').check();
expect(!await auditAction.isDisabled(), '选中新增单据后审核按钮未启用');
expect(await reverseAction.isDisabled(), '选中新增单据后反审核按钮错误启用');
await auditAction.click();
await page.locator('[data-overlay="audit-receipt-modal"] [data-act="confirm-status"]').click();
expect(await waitRow.getAttribute('data-row-status') === '审核', '审核后列表状态未变为审核');
let waitRowValue = JSON.parse(await waitRow.getAttribute('data-row-value') || '{}');
expect(Boolean(waitRowValue.auditUser) && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(waitRowValue.auditTime || ''), '审核后未重新写入审核人和审核时间');
const firstAuditTime = waitRowValue.auditTime;

await waitRow.locator('[data-row-select]').check();
expect(await auditAction.isDisabled(), '选中已审核单据后审核按钮错误启用');
expect(!await reverseAction.isDisabled(), '选中已审核单据后反审核按钮未启用');
await reverseAction.click();
await page.locator('[data-overlay="reverse-receipt-modal"] [data-act="confirm-status"]').click();
expect(await waitRow.getAttribute('data-row-status') === '新增', '反审核后未直接回新增');
waitRowValue = JSON.parse(await waitRow.getAttribute('data-row-value') || '{}');
expect(waitRowValue.auditUser === '' && waitRowValue.auditTime === '', '反审核后审核人或审核时间未清空');

await waitRow.locator('a[data-row-id="GR001"]').click();
await page.locator('[data-page-view="detail"] [data-act="save"]').click();
expect(await waitRow.getAttribute('data-row-status') === '新增', '反审核回新增后保存不应变更状态');
await page.waitForTimeout(1100);
await waitRow.locator('[data-row-select]').check();
await auditAction.click();
await page.locator('[data-overlay="audit-receipt-modal"] [data-act="confirm-status"]').click();
waitRowValue = JSON.parse(await waitRow.getAttribute('data-row-value') || '{}');
expect(Boolean(waitRowValue.auditUser) && Boolean(waitRowValue.auditTime) && waitRowValue.auditTime !== firstAuditTime, '重新审核后未重新赋值审核人和审核时间');

const auditedRow = page.locator('#purchase-receipt-table tbody > tr:has(a[data-row-id="GR004"])');
await auditedRow.locator('[data-row-select]').check();
expect(!await reverseAction.isDisabled(), '选中其他已审核单据后反审核按钮未启用');

await page.setViewportSize({ width: 2048, height: 1200 });
await page.reload({ waitUntil: 'domcontentloaded' });
const list2048Overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
expect(!list2048Overflow, '2048px 列表出现页面级横向溢出');
await page.locator('[data-page-view="list"] [data-act="create"]').click();
const detail2048Overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
expect(!detail2048Overflow, '2048px 详情出现页面级横向溢出');
await page.screenshot({ path: path.join(reportDir, 'purchase-receipt-2048.png') });

const report = {
  page: htmlPath,
  checkedAt: new Date().toISOString(),
  status: errors.length ? 'failed' : 'passed',
  issues: errors,
  screenshots: ['purchase-receipt-list.png', 'purchase-receipt-picker.png', 'purchase-receipt-detail.png', 'purchase-receipt-red-picker.png', 'purchase-receipt-2048.png'].map((name) => `outputs/reports/visual/${name}`),
};
fs.writeFileSync(path.join(reportDir, 'purchase-receipt-smoke.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await browser.close();
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log('Purchase receipt smoke passed: supplier header grain, project hidden from receipt items, blue/red source switching, basic field order, audit lifecycle');
