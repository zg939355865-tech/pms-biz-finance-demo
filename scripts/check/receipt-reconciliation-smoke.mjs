import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '../lib/playwright-smoke.mjs';

const schema = JSON.parse(fs.readFileSync('schemas/pages/income/receipt-reconciliation.json', 'utf8'));
const errors = [];
const expectedSearch = ['reconciliationNo', 'status', 'receiptNo', 'contractName', 'projectName', 'customer', 'reconciliationDate'];
const expectedColumns = ['reconciliationNo', 'status', 'reconciliationDate', 'currentReconciliationAmount', 'receiptNo', 'contractName', 'projectName', 'customer', 'creator', 'createdAt'];
const expectedFields = ['reconciliationNo', 'status', 'reconciliationDate', 'receiptNo', 'reconciliationType', 'contractName', 'projectName', 'customer', 'receiptAmount', 'unreconciledAmount', 'currentReconciliationAmount', 'creator', 'createdAt', 'reviewer', 'reviewedAt', 'company', 'remark'];
const search = schema.regions.find((region) => region.id === 'search');
const list = schema.regions.find((region) => region.id === 'reconciliation-table');
const basic = schema.regions.find((region) => region.id === 'receipt-reconciliation-detail')?.tabs?.[0];
const fields = basic?.children?.find((item) => item.component === 'DetailForm')?.fields || [];
const items = basic?.children?.find((item) => item.id === 'reconciliation-items');
const receiptPicker = schema.overlays.find((overlay) => overlay.id === 'receipt-picker');
if (JSON.stringify(search?.fields.map((field) => field.code)) !== JSON.stringify(expectedSearch)) errors.push('查询字段或顺序不正确');
if (JSON.stringify(list?.columns.map((column) => column.code)) !== JSON.stringify(expectedColumns)) errors.push('列表字段或顺序不正确');
if (JSON.stringify(fields.map((field) => field.code)) !== JSON.stringify(expectedFields)) errors.push('基础信息字段或顺序不正确');
if (!fields.find((field) => field.code === 'reconciliationType')?.readonly) errors.push('基础信息类型可被编辑');
if (items?.actions?.some((action) => action.code === 'select-invoices') || schema.overlays.some((overlay) => overlay.id === 'invoice-picker')) errors.push('仍保留选择发票入口');
if (!receiptPicker?.selectionTableMap?.reconciliationItems || !receiptPicker?.selectionMap?.reconciliationType) errors.push('收款单未配置类型和明细自动带出');
const pickerSearch = receiptPicker?.children?.[0]?.fields.map((field) => field.code) || [];
const pickerColumns = receiptPicker?.children?.[1]?.columns.map((column) => column.code) || [];
if (pickerSearch.includes('reconciliationType') || !pickerColumns.includes('reconciliationType')) errors.push('收款单弹窗类型查询或列表字段不正确');
if (!schema.mockData.availableReceipts?.some((row) => row.reconciliationType === '蓝字') || !schema.mockData.availableReceipts?.some((row) => row.reconciliationType === '红字')) errors.push('缺少蓝字或红字收款单示例');
for (const row of schema.mockData.availableReceipts || []) {
  const red = row.reconciliationType === '红字';
  if (red !== (row.receiptAmount < 0) || red !== (row.unreconciledAmount < 0)) errors.push('收款金额符号不符合类型规则');
  if (red && row.reconciliationItems.some((item) => item.invoiceType !== '红字')) errors.push('红字收款匹配了非红字发票');
  if (row.reconciliationItems.some((item) => (item.invoiceType === '红字') !== (item.currentReconciliationAmount < 0))) errors.push('发票本次核销金额符号不符合规则');
}

const reportDir = path.resolve('outputs/reports/visual/income-receipt-reconciliation');
fs.mkdirSync(reportDir, { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
page.setDefaultTimeout(5000);
page.on('pageerror', (error) => errors.push(error.message));
await page.route(/^https?:/, (route) => route.abort());
try {
  await page.goto(pathToFileURL(path.resolve('pages/income/receipt-reconciliation.html')).href, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  const listView = page.locator('[data-page-view="list"]');
  if (await listView.locator('#reconciliation-table tbody tr[data-row-value]:visible').count() !== 5) errors.push('列表未固定展示5条示例数据');
  if (await listView.locator('[data-column="reconciliationType"], [data-column="receiptAmount"]').count()) errors.push('列表仍展示类型或收款金额');
  const pendingCandidate = listView.locator('#reconciliation-table tbody tr[data-row-status="新增"]').first();
  const pendingIndex = await pendingCandidate.getAttribute('data-row-index');
  const pending = listView.locator(`#reconciliation-table tbody tr[data-row-index="${pendingIndex}"]`);
  await pending.locator('[data-row-select]').check();
  await listView.locator('[data-act="audit"]').click();
  await page.locator('[data-overlay="audit-reconciliation-modal"] [data-act="confirm-status"]').click();
  if (await pending.getAttribute('data-row-status') !== '审核') errors.push('审核未变更为审核');
  await pending.locator('[data-row-select]').check();
  await listView.locator('[data-act="reverse-audit"]').click();
  await page.locator('[data-overlay="reverse-reconciliation-modal"] [data-act="confirm-status"]').click();
  if (await pending.getAttribute('data-row-status') !== '新增') errors.push('反审核未恢复新增');
  await listView.locator('[data-act="create"]').click();
  const detail = page.locator('[data-page-view="detail"]');
  const actualFields = await detail.locator('[data-tab-panel="basic"] [data-component="DetailForm"] [data-field]').evaluateAll((nodes) => nodes.map((node) => node.dataset.field));
  if (JSON.stringify(actualFields) !== JSON.stringify(expectedFields)) errors.push('页面基础信息字段顺序不正确');
  if (!await detail.locator('[data-field="reconciliationType"]:visible').count() || await detail.locator('[data-field="reconciliationType"]').getAttribute('readonly') === null) errors.push('页面未展示或未锁定类型');
  if (await detail.locator('[data-act="select-invoices"]').count()) errors.push('页面仍显示选择发票按钮');
  if (await detail.locator('[data-field="company"]').inputValue() !== '昕彤赋能（武汉）') errors.push('所属公司默认值不正确');
  await detail.locator('[data-target="receipt-picker"]').click();
  const picker = page.locator('[data-overlay="receipt-picker"]');
  if (!await picker.locator('[data-column="reconciliationType"]').count()) errors.push('收款单弹窗未显示类型');
  await picker.locator('[data-row-select]').first().check();
  await picker.locator('[data-act="confirm-selection"]').click();
  const blueItems = detail.locator('[data-data-source="reconciliationItems"] tbody tr[data-row-value]');
  if (await blueItems.count() !== 2 || !await blueItems.locator('[data-column="invoiceType"]').allTextContents().then((values) => values.some((value) => value.trim() === '红字'))) errors.push('蓝字收款未自动匹配蓝红字发票');
  const blueTotal = await detail.locator('[data-component="DetailForm"] [data-field="currentReconciliationAmount"]').inputValue();
  if (Number(blueTotal) !== 45000) errors.push('自动匹配后的本次核销金额合计不正确');
  await page.screenshot({ path: path.join(reportDir, 'receipt-reconciliation-detail.png'), fullPage: true });
} catch (error) { errors.push(error.message); } finally { page.close().catch(() => {}); browser.close().catch(() => {}); }
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log('Receipt reconciliation smoke passed: type query, signed samples, auto matching, hidden detail type, default company, and five-row list verified.');
process.exit(0);
