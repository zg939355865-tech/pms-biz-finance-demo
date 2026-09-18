import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '../lib/playwright-smoke.mjs';

const htmlPath = process.argv[2] || 'pages/procurement/expense-contract.html';
const reportDir = path.resolve('outputs/reports/visual');
fs.mkdirSync(reportDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});
const expect = (condition, message) => {
  if (!condition) errors.push(message);
};
const same = (actual, expected, message) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) errors.push(`${message}: ${JSON.stringify(actual)}`);
};

await page.goto(pathToFileURL(path.resolve(htmlPath)).href, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(250);

const list = page.locator('[data-page-view="list"]');
same(
  await list.locator('[data-component="ProSearchForm"] .form-item').evaluateAll((items) =>
    items.map((item) => item.querySelector('[data-field]')?.getAttribute('data-field') || '').filter(Boolean)
  ),
  ['keyword', 'status', 'businessStatus', 'supplierName', 'owner', 'signDateStart'],
  '查询字段或顺序不匹配'
);
same(
  await list.locator('select[data-field="status"] option').evaluateAll((options) => options.map((option) => option.value).filter(Boolean)),
  ['草稿', '待审核', '已审核'],
  '状态选项不匹配'
);
same(
  await list.locator('select[data-field="businessStatus"] option').evaluateAll((options) => options.map((option) => option.value).filter(Boolean)),
  ['未生效', '履约中', '已完结', '已终止'],
  '业务状态选项不匹配'
);
expect(await list.locator('select[data-field="contractType"]').count() === 0, '查询区仍保留合同类型字段');
same(
  await list.locator('#expense-contract-table thead th').allTextContents().then((labels) =>
    labels.map((label) => label.trim()).filter((label) => label && label !== '操作')
  ),
  ['合同编号', '状态', '业务状态', '合同名称', '供应商', '合同负责人', '签订日期', '生效日期', '截止日期', '创建人', '创建时间'],
  '列表字段或顺序不匹配'
);
await list.locator('select[data-field="status"]').selectOption('待审核');
await list.locator('[data-component="ProSearchForm"] [data-act="query"]').click();
expect(await list.locator('#expense-contract-table tbody > tr:visible:not([data-empty-row])').count() > 0, '状态查询无结果');
expect(await list.locator('#expense-contract-table tbody > tr:visible:not([data-empty-row])').evaluateAll((rows) => rows.every((row) => JSON.parse(row.dataset.rowValue || '{}').status === '待审核')), '状态查询未正确筛选列表');
await list.locator('[data-component="ProSearchForm"] [data-act="reset"]').click();
await list.locator('select[data-field="businessStatus"]').selectOption('已终止');
await list.locator('[data-component="ProSearchForm"] [data-act="query"]').click();
expect(await list.locator('#expense-contract-table tbody > tr:visible:not([data-empty-row])').count() > 0, '业务状态查询无结果');
expect(await list.locator('#expense-contract-table tbody > tr:visible:not([data-empty-row])').evaluateAll((rows) => rows.every((row) => JSON.parse(row.dataset.rowValue || '{}').businessStatus === '已终止')), '业务状态查询未正确筛选列表');
await list.locator('[data-component="ProSearchForm"] [data-act="reset"]').click();
await list.locator('input[data-field="supplierName"]').fill('武汉');
await list.locator('[data-component="ProSearchForm"] [data-act="query"]').click();
expect(await list.locator('#expense-contract-table tbody > tr:visible:not([data-empty-row])').count() > 0, '供应商查询无结果');
expect(await list.locator('#expense-contract-table tbody > tr:visible:not([data-empty-row])').evaluateAll((rows) =>
  rows.every((row) => String(JSON.parse(row.dataset.rowValue || '{}').supplierName || '').includes('武汉'))
), '供应商查询未正确筛选列表');
await list.locator('[data-component="ProSearchForm"] [data-act="reset"]').click();
await page.screenshot({
  path: path.join(reportDir, 'expense-contract-list-current.png'),
  fullPage: true
});
await list.locator('#expense-contract-table a[data-act="edit"]').first().click();
const detail = page.locator('[data-page-view="detail"]');
expect(await detail.isVisible(), '支出合同详情未显示');

const basic = detail.locator('[data-tab-panel="basic"]');
const fieldCodes = await basic.locator('[data-component="DetailForm"] .form-item').evaluateAll((items) =>
  items.map((item) => item.querySelector('[data-field]')?.getAttribute('data-field') || '')
);
expect(fieldCodes.includes('status'), '详情缺少状态字段');
expect(fieldCodes.includes('reviewer'), '详情缺少审核人字段');
expect(fieldCodes.includes('reviewedAt'), '详情缺少审核时间字段');
expect(await basic.locator('[data-field="reviewer"]').isDisabled(), '详情审核人不是只读字段');
expect(await basic.locator('[data-field="reviewedAt"]').isDisabled(), '详情审核时间不是只读字段');
expect(!fieldCodes.includes('contractType'), '详情仍保留合同类型字段');
expect(!fieldCodes.includes('businessStatus'), '详情不应展示业务状态');
expect(!fieldCodes.includes('contractLifecycle'), '详情仍保留旧合同状态字段');
expect(await basic.locator('[data-field="status"]').isDisabled(), '详情状态不是只读字段');
const expiryDate = basic.locator('[data-field="expiryDate"]');
expect(await expiryDate.getAttribute('required') === null, '截止日期仍为必填字段');
expect(await expiryDate.locator('xpath=ancestor::div[contains(@class,"form-item")][1]/label').textContent() === '截止日期', '详情日期字段未更名为截止日期');
expect(!await expiryDate.locator('xpath=ancestor::div[contains(@class,"form-item")][1]/label').evaluate((label) => label.classList.contains('required')), '截止日期仍显示必填标识');
expect(!await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), '支出合同详情在1440px下出现页面整体横向滚动');
await page.screenshot({ path: path.join(reportDir, 'expense-contract-deadline-1440.png'), fullPage: true });
await page.setViewportSize({ width: 2048, height: 1200 });
expect(!await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), '支出合同详情在2048px下出现页面整体横向滚动');
await page.screenshot({ path: path.join(reportDir, 'expense-contract-deadline-2048.png'), fullPage: true });
await page.setViewportSize({ width: 1440, height: 1000 });
expect(fieldCodes.indexOf('settlementCurrency') + 1 === fieldCodes.indexOf('supplierTaxId'), '结算币别未紧邻统一社会信用代码之前');
expect(fieldCodes.indexOf('paymentMethod') + 1 === fieldCodes.indexOf('invoiceType'), '付款方式未紧邻发票类型之前');

const contractItems = basic.locator('#contract-item-table');
expect(await contractItems.locator('tfoot .pro-table-total-label').count() === 1, '支出合同标的明细缺少合计行');
for (const code of ['quantity', 'amount']) {
  const expectedTotal = await contractItems.locator('tbody > tr:not([data-empty-row])').evaluateAll((rows, columnCode) => rows.reduce((total, row) => {
    const cell = row.querySelector(`[data-column="${columnCode}"]`);
    const input = cell?.querySelector('[data-field]');
    const value = Number(String(input ? input.value : cell?.textContent || '').replace(/[%￥¥,\s]/g, ''));
    return total + (Number.isFinite(value) ? value : 0);
  }, 0), code);
  expect(Number((await contractItems.locator(`[data-footer-summary-column="${code}"]`).textContent()).replace(/,/g, '').trim()) === Number(expectedTotal.toFixed(2)), `支出合同标的明细 ${code} 合计错误`);
}

const settlementCurrency = basic.locator('select[data-field="settlementCurrency"]');
expect(await settlementCurrency.inputValue() === 'CNY', '结算币别默认值不是 CNY');
expect(await settlementCurrency.isDisabled(), '结算币别不是只读');
same(
  await settlementCurrency.locator('option').evaluateAll((options) => options.map((option) => option.value).filter(Boolean)),
  ['CNY', 'USD', 'EUR', 'HKD', 'JPY'],
  '结算币别选项不匹配'
);

const paymentMethod = basic.locator('select[data-field="paymentMethod"]');
expect(await paymentMethod.getAttribute('required') !== null, '付款方式不是必填字段');
same(
  await paymentMethod.locator('option').evaluateAll((options) => options.map((option) => option.value).filter(Boolean)),
  ['电汇', '承兑'],
  '付款方式选项不匹配'
);

await basic.locator('[data-field="supplierName"]').locator('xpath=following-sibling::button').click();
const supplierOverlay = page.locator('[data-overlay="supplier-picker"]');
expect(await supplierOverlay.isVisible(), '供应商选择弹窗未显示');
await supplierOverlay.locator('[data-row-select]').nth(2).check();
await supplierOverlay.locator('[data-act="confirm-supplier"]').click();
expect(await settlementCurrency.inputValue() === 'USD', '结算币别未随供应商自动带出');

await page.screenshot({
  path: path.join(reportDir, 'expense-contract-currency-payment-current.png'),
  fullPage: true
});

await detail.locator('[data-act="back-list"]').click();
await list.locator('[data-act="create"]').click();
expect(await detail.locator('[data-field="settlementCurrency"]').inputValue() === 'CNY', '新增合同结算币别未默认 CNY');
const createPayeeAccount = detail.locator('select[data-field="payeeAccount"]');
const createPayeeBank = detail.locator('[data-field="payeeBank"]');
expect(await detail.locator('[data-field="supplierCode"]').inputValue() === '', '新增时供应商编码未清空');
expect(await createPayeeAccount.isDisabled(), '未选择供应商时收款账户未禁用');
same(
  await createPayeeAccount.locator('option').evaluateAll((options) => options.map((option) => option.value).filter(Boolean)),
  [],
  '未选择供应商时收款账户仍存在账户数据'
);
expect(await createPayeeBank.inputValue() === '', '未选择供应商时收款银行未清空');
await page.screenshot({
  path: path.join(reportDir, 'expense-contract-account-empty-before-supplier.png'),
  fullPage: true
});

await detail.locator('[data-field="supplierName"]').locator('xpath=following-sibling::button').click();
const createSupplierOverlay = page.locator('[data-overlay="supplier-picker"]');
await createSupplierOverlay.locator('[data-row-select]').first().check();
await createSupplierOverlay.locator('[data-act="confirm-supplier"]').click();
expect(!await createPayeeAccount.isDisabled(), '选择供应商后收款账户仍被禁用');
same(
  await createPayeeAccount.locator('option').evaluateAll((options) => options.map((option) => option.value).filter(Boolean)),
  ['42001876108051501234', '42001876108051505678'],
  '选择供应商后未加载该供应商收款账户'
);
expect(await createPayeeAccount.inputValue() === '42001876108051501234', '选择供应商后未默认首个收款账户');
expect(await createPayeeBank.inputValue() === '中国建设银行武汉光谷支行', '默认收款账户未自动带出收款银行');
await createPayeeAccount.selectOption('42001876108051505678');
expect(await createPayeeBank.inputValue() === '招商银行武汉光谷科技支行', '改选收款账户后收款银行未联动');

// 审核/反审核回归
await detail.locator('[data-act="back-list"]').click();
const auditButton = list.locator('[data-act="audit"]');
const reverseAuditButton = list.locator('[data-act="reverse-audit"]');
expect(await auditButton.count() === 1, '列表缺少审核按钮');
expect(await reverseAuditButton.count() === 1, '列表缺少反审核按钮');
expect(await auditButton.isDisabled() && await reverseAuditButton.isDisabled(), '未选择记录时审核/反审核不应启用');
const pendingCandidate = list.locator('#expense-contract-table tbody tr[data-row-status="待审核"]').first();
expect(await pendingCandidate.count() === 1, '列表缺少待审核示例数据');
const pendingIndex = await pendingCandidate.getAttribute('data-row-index');
const pendingRow = list.locator(`#expense-contract-table tbody tr[data-row-index="${pendingIndex}"]`);
await pendingRow.locator('[data-row-select]').check();
expect(!await auditButton.isDisabled(), '选中待审核合同后审核按钮未启用');
expect(await reverseAuditButton.isDisabled(), '选中待审核合同时反审核不应启用');
await auditButton.click();
await page.waitForTimeout(150);
let auditedRowValue = {};
try { auditedRowValue = JSON.parse((await pendingRow.getAttribute('data-row-value')) || '{}'); } catch (error) { auditedRowValue = {}; }
expect(auditedRowValue.status === '已审核', '审核后合同状态未变为已审核');
expect(auditedRowValue.reviewer === '管理员', '审核后未记录审核人');
expect(String(auditedRowValue.reviewedAt || '').trim() !== '', '审核后未记录审核时间');
await pendingRow.locator('[data-row-select]').check();
expect(!await reverseAuditButton.isDisabled(), '选中已审核合同后反审核按钮未启用');
expect(await auditButton.isDisabled(), '选中已审核合同时审核不应启用');
await reverseAuditButton.click();
await page.waitForTimeout(150);
let reversedRowValue = {};
try { reversedRowValue = JSON.parse((await pendingRow.getAttribute('data-row-value')) || '{}'); } catch (error) { reversedRowValue = {}; }
expect(reversedRowValue.status === '草稿', '反审核后合同状态未回到草稿');
expect(String(reversedRowValue.reviewer || '') === '', '反审核后未清空审核人');
expect((await pendingRow.locator('a[data-act]').first().getAttribute('data-act')) === 'edit', '反审核后未恢复草稿编辑入口');
await page.screenshot({
  path: path.join(reportDir, 'expense-contract-audit-current.png'),
  fullPage: true
});

await page.goto(pathToFileURL(path.resolve('menu/index.html')).href, { waitUntil: 'domcontentloaded' });
await page.locator('.menu-primary', { hasText: '采购管理' }).click();
await page.locator('[data-path="procurement/expense-contract.html"]').click();
await page.frameLocator('#contentFrame').locator('html[data-page-code="expense-contract"]').waitFor();

await browser.close();
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('expense-contract-smoke: PASS');
