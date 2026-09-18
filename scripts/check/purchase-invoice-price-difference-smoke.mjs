import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '../lib/playwright-smoke.mjs';

const schemaPath = 'schemas/pages/procurement/purchase-invoice.json';
const pagePath = 'pages/procurement/purchase-invoice.html';
const reportDir = path.resolve('outputs/reports/visual/procurement');
const expectedHeaders = ['物资类型', '物资名称', '规格', '单位', '验票数量', '暂估单价', '含税单价', '单位价差', '成本价差'];
const overlayId = 'purchase-price-difference-modal';
const differenceOrderLine = { purchaseOrderNo: 'PO20260821002', purchaseOrderLineNo: '2', itemName: '加药泵控制器', estimatedUnitPrice: 8800, taxIncludedUnitPrice: 8600 };
const sameOrderLine = { purchaseOrderNo: 'PO20260822005', purchaseOrderLineNo: '1', itemName: '电磁计量泵', estimatedUnitPrice: 15200, taxIncludedUnitPrice: 15200 };
const errors = [];
const expect = (condition, message) => { if (!condition) errors.push(message); };
fs.mkdirSync(reportDir, { recursive: true });

const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
const overlay = schema.overlays.find((item) => item.id === overlayId);
expect(Boolean(overlay), 'Schema 缺少采购价差明细弹窗');
expect(overlay?.component === 'Modal' && overlay?.title === '采购价差明细', '采购价差明细弹窗组件或标题不符合要求');
expect(JSON.stringify((overlay?.actions || []).map((action) => [action.code, action.label])) === JSON.stringify([['close', '取消'], ['confirm-price-difference', '确认保存']]), '采购价差明细弹窗底部按钮必须为取消、确认保存');
const differenceTable = overlay?.children?.find((child) => child.component === 'EditableTable');
expect(JSON.stringify((differenceTable?.columns || []).map((column) => column.label)) === JSON.stringify(expectedHeaders), '采购价差明细字段顺序必须为：' + expectedHeaders.join('、'));
expect((differenceTable?.columns || []).every((column) => column.editable === false), '采购价差明细必须为只读表格');
expect(['verificationQuantity'].every((code) => differenceTable?.columns?.find((column) => column.code === code)?.component === 'number'), '验票数量必须为数值列');
expect(['estimatedUnitPrice', 'taxIncludedUnitPrice', 'unitPriceDifference', 'costPriceDifference'].every((code) => { const column = differenceTable?.columns?.find((item) => item.code === code); return column?.component === 'money' && column?.align === 'right'; }), '暂估单价、含税单价、单位价差、成本价差必须为右对齐金额列');
const rule = schema.rules.find((item) => item.id === 'R11');
expect(rule?.action === 'save' && rule?.type === 'priceDifferenceConfirm' && rule?.table === 'orderItems' && rule?.overlay === overlayId, 'R11 保存价差确认规则配置不完整');
expect(rule?.estimatedField === 'estimatedUnitPrice' && rule?.actualField === 'taxIncludedUnitPrice' && rule?.quantityField === 'verificationQuantity' && rule?.precision === 2, 'R11 价差计算字段配置不正确');
expect(schema.mockData.availableOrderLines.every((row) => Number.isFinite(Number(row.estimatedUnitPrice))), '可选采购订单行必须全部带出暂估单价');
expect(schema.mockData.availableOrderLines.some((row) => Number(row.estimatedUnitPrice) !== Number(row.taxIncludedUnitPrice)), '示例数据必须包含暂估单价与含税单价不一致的订单行');
expect(schema.mockData.invoices.every((invoice) => (invoice.orderItems || []).every((row) => Number(row.estimatedUnitPrice) === Number(row.taxIncludedUnitPrice))), '既有收票示例的订单行不应产生价差，避免影响原提交回归');
expect(schema.resourceReference.components.includes('Modal') && schema.resourceReference.components.includes('Alert'), '资源引用未登记弹窗与提示组件');

const html = fs.readFileSync(pagePath, 'utf8');
expect(html.includes('data-overlay="' + overlayId + '"'), '生成页面缺少采购价差明细弹窗');
expect(html.includes('data-act="confirm-price-difference"'), '生成页面缺少确认提交按钮');
expect(html.includes('openPriceDifferenceConfirm'), '生成页面缺少提交前价差确认逻辑');

const executablePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const browser = await chromium.launch({ executablePath, headless: true });

async function selectSourceLine(scope, key, value) {
  const rows = scope.locator('tbody tr[data-row-value]');
  const total = await rows.count();
  for (let index = 0; index < total; index += 1) {
    const raw = await rows.nth(index).getAttribute('data-row-value');
    let row = {};
    try { row = JSON.parse(raw || '{}'); } catch (error) { row = {}; }
    const matched = key.every((code) => String(row[code]) === String(value[code]));
    if (matched) { await rows.nth(index).locator('[data-row-select]').check(); return true; }
  }
  return false;
}

async function runCreateFlow(page, width) {
  await page.goto(pathToFileURL(path.resolve(pagePath)).href, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(600);
  const list = page.locator('[data-page-view="list"]');
  await list.locator('[data-act="create"]').first().click();
  await page.waitForTimeout(300);
  const detail = page.locator('[data-page-view="detail"]:not([hidden])');
  expect(await detail.isVisible(), width + ': 新增未打开详情视图');
  await detail.locator('[data-field="invoiceNo"]').fill('24420190000012349999');
  await detail.locator('[data-field="receiptDate"]').fill('2026-09-15');
  await detail.locator('[data-field="invoiceNature"]').selectOption('蓝字');
  await detail.locator('[data-field="invoiceDate"]').fill('2026-09-15');
  await detail.locator('[data-act="open"][data-target="supplier-picker"]').first().click();
  await page.waitForTimeout(250);
  const supplierOverlay = page.locator('[data-overlay="supplier-picker"]');
  expect(await supplierOverlay.isVisible(), width + ': 供应商选择弹窗未打开');
  expect(await selectSourceLine(supplierOverlay, ['supplierCode'], { supplierCode: 'SUP00023' }), width + ': 未找到示例供应商');
  await supplierOverlay.locator('[data-act="confirm-supplier"]').click();
  await page.waitForTimeout(300);
  await detail.locator('[data-field="projectName"]').selectOption('东湖水环境运营提升项目');
  await page.waitForTimeout(250);
  expect(await detail.locator('[data-field="projectCode"]').inputValue() === 'PRJ202608006', width + ': 项目编码未级联带出');

  const orderTable = detail.locator('#purchase-invoice-order-items');
  await orderTable.locator('[data-act="open"][data-target="purchase-order-line-picker"]').click();
  await page.waitForTimeout(300);
  const orderPicker = page.locator('[data-overlay="purchase-order-line-picker"]');
  expect(await orderPicker.isVisible(), width + ': 采购订单选择弹窗未打开');
  expect(await selectSourceLine(orderPicker, ['purchaseOrderNo', 'purchaseOrderLineNo'], differenceOrderLine), width + ': 未找到存在价差的采购订单行');
  expect(await selectSourceLine(orderPicker, ['purchaseOrderNo', 'purchaseOrderLineNo'], sameOrderLine), width + ': 未找到无价差的采购订单行');
  await orderPicker.locator('[data-act="confirm-order-lines"]').click();
  await page.waitForTimeout(300);
  expect(await orderTable.locator('tbody tr[data-row-value]').count() === 2, width + ': 订单行未追加两条来源行');
  const carriedEstimated = await orderTable.locator('tbody tr[data-row-value]').evaluateAll((rows) => rows.map((row) => JSON.parse(row.dataset.rowValue || '{}').estimatedUnitPrice));
  expect(JSON.stringify(carriedEstimated.slice().sort((left, right) => left - right)) === JSON.stringify([8800, 15200]), width + ': 订单行未携带暂估单价，实际=' + JSON.stringify(carriedEstimated));

  const orderHeaders = await orderTable.locator('thead th').evaluateAll((cells) => cells.map((cell) => cell.textContent.trim()));
  expect(orderHeaders[6] === '验票数量' && orderHeaders[7] === '暂估单价' && orderHeaders[8] === '含税单价', width + ': 订单行暂估单价列位置错误，实际=' + orderHeaders.join('、'));
  const orderEstimatedCells = await orderTable.locator('tbody tr[data-row-value] [data-column="estimatedUnitPrice"]').evaluateAll((cells) => cells.map((cell) => cell.textContent.trim()));
  expect(JSON.stringify(orderEstimatedCells.slice().sort()) === JSON.stringify(['15,200.00', '8,800.00']), width + ': 订单行暂估单价列未显示带出值，实际=' + JSON.stringify(orderEstimatedCells));
  const settlementTable = detail.locator('#purchase-invoice-settlement-items');
  await settlementTable.locator('[data-act="open"][data-target="purchase-receipt-line-picker"]').click();
  await page.waitForTimeout(300);
  const receiptPicker = page.locator('[data-overlay="purchase-receipt-line-picker"]');
  expect(await receiptPicker.isVisible(), width + ': 采购入库/服务结算弹窗未打开');
  expect(await selectSourceLine(receiptPicker, ['purchaseOrderNo', 'purchaseOrderLineNo', 'receiptNature'], { ...differenceOrderLine, receiptNature: '蓝字' }), width + ': 未找到价差订单行对应的入库行');
  expect(await selectSourceLine(receiptPicker, ['purchaseOrderNo', 'purchaseOrderLineNo', 'receiptNature'], { ...sameOrderLine, receiptNature: '蓝字' }), width + ': 未找到无价差订单行对应的入库行');
  await receiptPicker.locator('[data-act="confirm-receipt-lines"]').click();
  await page.waitForTimeout(400);

  const verificationTotal = Number(String(await detail.locator('[data-field="verificationTotalAmount"]').inputValue()).replace(/[,￥¥\s]/g, ''));
  expect(Number.isFinite(verificationTotal) && verificationTotal !== 0, width + ': 验票总金额未汇总');
  await detail.locator('[data-field="invoiceAmount"]').fill(String(Math.abs(verificationTotal)));
  await page.waitForTimeout(200);

  const modal = page.locator('[data-overlay="' + overlayId + '"]');
  expect(await modal.isVisible() === false, width + ': 未提交前不应显示价差弹窗');
  await detail.locator('[data-act="save"]').first().click();
  await page.waitForTimeout(400);
  expect(await modal.isVisible(), width + ': 暂估单价与含税单价不一致时保存未弹出采购价差明细');
  if (!await modal.isVisible()) return null;
  expect((await modal.locator('.pro-modal-header h2').innerText()).trim() === '采购价差明细', width + ': 弹窗标题不是采购价差明细');
  const headers = await modal.locator('#price-difference-table thead th').evaluateAll((cells) => cells.map((cell) => cell.textContent.trim()).filter(Boolean));
  expect(JSON.stringify(headers) === JSON.stringify(expectedHeaders), width + ': 弹窗字段顺序错误，实际=' + headers.join('、'));
  const rows = modal.locator('#price-difference-table tbody tr[data-row-value]');
  expect(await rows.count() === 2, width + ': 弹窗应展示两条订单行明细');
  const values = await rows.evaluateAll((items) => items.map((row) => {
    const cell = (code) => { const target = row.querySelector('[data-column="' + code + '"]'); return target ? target.textContent.trim() : ''; };
    const className = (code) => { const target = row.querySelector('[data-column="' + code + '"]'); return target ? target.className : ''; };
    return { value: JSON.parse(row.dataset.rowValue || '{}'), estimated: cell('estimatedUnitPrice'), actual: cell('taxIncludedUnitPrice'), unit: cell('unitPriceDifference'), cost: cell('costPriceDifference'), quantity: cell('verificationQuantity'), unitClass: className('unitPriceDifference'), costClass: className('costPriceDifference') };
  }));
  const differenceRow = values.find((row) => row.value.itemName === differenceOrderLine.itemName);
  const sameRow = values.find((row) => row.value.itemName === sameOrderLine.itemName);
  expect(Boolean(differenceRow) && Boolean(sameRow), width + ': 弹窗明细未包含预期订单行');
  if (differenceRow) {
    expect(differenceRow.estimated === '8,800.00' && differenceRow.actual === '8,600.00', width + ': 价差行暂估单价或含税单价显示错误，实际=' + differenceRow.estimated + '/' + differenceRow.actual);
    const quantity = Number(String(differenceRow.quantity).replace(/[,￥¥\s]/g, ''));
    const unit = Number(String(differenceRow.unit).replace(/[+,￥¥\s]/g, ''));
    const cost = Number(String(differenceRow.cost).replace(/[+,￥¥\s]/g, ''));
    expect(Math.abs(unit - (8600 - 8800)) < 0.005, width + ': 单位价差未按含税单价-暂估单价计算，实际=' + differenceRow.unit);
    expect(Number.isFinite(quantity) && Math.abs(cost - unit * quantity) < 0.01, width + ': 成本价差未按单位价差×验票数量计算，实际=' + differenceRow.cost);
    expect(/schema-signed-(positive|negative)/.test(differenceRow.unitClass) && /schema-signed-(positive|negative)/.test(differenceRow.costClass), width + ': 存在价差的金额未突出显示');
    expect((unit < 0 && differenceRow.unitClass.includes('schema-signed-positive') && differenceRow.unit.startsWith('-')) || (unit > 0 && differenceRow.unitClass.includes('schema-signed-negative') && differenceRow.unit.startsWith('+')), width + ': 价差正负与突出显示样式不一致，实际=' + differenceRow.unit + '/' + differenceRow.unitClass);
  }
  if (sameRow) {
    expect(sameRow.unit === '0.00' && sameRow.cost === '0.00', width + ': 无价差行应显示0.00，实际=' + sameRow.unit + '/' + sameRow.cost);
    expect(!/schema-signed-(positive|negative)/.test(sameRow.unitClass) && !/schema-signed-(positive|negative)/.test(sameRow.costClass), width + ': 无价差金额不应突出显示');
  }
  const summary = await modal.locator('[data-component="Alert"] span').innerText();
  expect(summary.includes('共1行') && summary.includes('成本价差合计'), width + ': 弹窗价差汇总提示不正确，实际=' + summary);
  await page.screenshot({ path: path.join(reportDir, 'purchase-invoice-price-difference-' + width + '.png'), fullPage: true });
  return { modal, detail, page };
}

for (const width of [1440, 2048]) {
  const page = await browser.newPage({ viewport: { width, height: width === 1440 ? 1000 : 1152 }, deviceScaleFactor: 1 });
  page.setDefaultTimeout(6000);
  page.on('pageerror', (error) => errors.push(width + ' pageerror: ' + error.message));
  await page.route(/^https?:/, (route) => route.abort());
  const context = await runCreateFlow(page, width);
  if (context) {
    const { modal, detail } = context;
    await modal.locator('[data-act="close"]').first().click();
    await page.waitForTimeout(300);
    expect(await modal.isVisible() === false, width + ': 取消后价差弹窗未关闭');
    expect(await detail.isVisible(), width + ': 取消后应停留在详情继续修改');
    expect(await page.locator('[data-page-view="list"]').isVisible() === false, width + ': 取消后不应返回列表');
    await detail.locator('[data-act="save"]').first().click();
    await page.waitForTimeout(300);
    expect(await modal.isVisible(), width + ': 再次保存仍应提示价差确认');
    await modal.locator('[data-act="confirm-price-difference"]').click();
    await page.waitForTimeout(500);
    expect(await modal.isVisible() === false, width + ': 确认保存后弹窗未关闭');
    expect(await page.locator('[data-page-view="list"]').isVisible(), width + ': 确认保存后未返回列表');
    expect(await detail.isVisible() === false, width + ': 确认保存后详情未关闭');
    await page.screenshot({ path: path.join(reportDir, 'purchase-invoice-price-difference-confirmed-' + width + '.png'), fullPage: true });
  }
  await page.close();
}

const noDifferencePage = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
noDifferencePage.setDefaultTimeout(6000);
noDifferencePage.on('pageerror', (error) => errors.push('no-difference pageerror: ' + error.message));
await noDifferencePage.route(/^https?:/, (route) => route.abort());
await noDifferencePage.goto(pathToFileURL(path.resolve(pagePath)).href, { waitUntil: 'domcontentloaded', timeout: 15000 });
await noDifferencePage.waitForTimeout(600);
const draftRow = noDifferencePage.locator('[data-page-view="list"] tbody tr[data-row-status="新增"]').first();
await draftRow.locator('[data-column="invoiceNo"] a').click();
await noDifferencePage.waitForTimeout(400);
const readOnlyDetail = noDifferencePage.locator('[data-page-view="detail"]:not([hidden])');
expect(await readOnlyDetail.isVisible(), '未打开既有新增详情');
await readOnlyDetail.locator('[data-act="save"]').first().click();
await noDifferencePage.waitForTimeout(400);
expect(await noDifferencePage.locator('[data-overlay="' + overlayId + '"]').isVisible() === false, '暂估单价与含税单价一致时不应弹出价差弹窗');
expect(await noDifferencePage.locator('[data-page-view="list"]').isVisible(), '无价差记录保存后应直接返回列表');
const submittedStatus = await noDifferencePage.locator('[data-page-view="list"] tbody tr[data-row-index="0"]').getAttribute('data-row-status');
expect(submittedStatus === '新增', '无价差记录保存后状态应保持新增，实际=' + submittedStatus);
await noDifferencePage.close();

const browserClosed = await Promise.race([browser.close().then(() => true), new Promise((resolve) => setTimeout(() => resolve(false), 3000))]);
if (!browserClosed) console.warn('Browser close timed out after 3000ms; forcing smoke process cleanup');
const report = {
  page: pagePath,
  checkedAt: new Date().toISOString(),
  status: errors.length ? 'failed' : 'passed',
  issues: errors,
  screenshots: [1440, 2048].flatMap((width) => ['purchase-invoice-price-difference-' + width + '.png', 'purchase-invoice-price-difference-confirmed-' + width + '.png']).map((name) => 'outputs/reports/visual/procurement/' + name)
};
fs.writeFileSync(path.join(reportDir, 'purchase-invoice-price-difference-smoke.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log('Purchase invoice price difference smoke passed: 暂估单价带出、提交前价差弹窗、字段顺序、价差计算、突出显示、取消/确认提交与无价差直通');
process.exit(0);
