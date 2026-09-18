import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '../lib/playwright-smoke.mjs';

const schemaPath = 'schemas/pages/income/receipt.json';
const pagePath = 'pages/income/receipt.html';
const reportDir = path.resolve('outputs/reports/visual/income-receipt');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
const errors = [];
const expectedSearch = ['receiptNo', 'status', 'receiptType', 'contractName', 'projectName', 'customer', 'receiptDate'];
const expectedColumns = ['receiptNo', 'status', 'receiptType', 'receiptDate', 'receiptAmount', 'contractName', 'projectName', 'customer', 'creator', 'createdAt'];
const expectedFields = ['receiptNo', 'status', 'receiptType', 'receiptDate', 'contractName', 'projectName', 'customer', 'receiptMethod', 'contractAmount', 'receivedAmount', 'pendingReceiptAmount', 'receiptAmount', 'creator', 'createdAt', 'reviewer', 'reviewedAt', 'company', 'remark'];
const search = schema.regions.find((region) => region.id === 'search');
const table = schema.regions.find((region) => region.id === 'receipt-table');
const basic = schema.regions.find((region) => region.id === 'receipt-detail')?.tabs?.find((tab) => tab.key === 'basic');
const fields = basic?.children?.find((item) => item.component === 'DetailForm')?.fields || [];

if (schema.pageActions.some((action) => action.code === 'export')) errors.push('Schema 仍存在导出按钮');
if (schema.regions.some((region) => region.component === 'BizfinChain')) errors.push('Schema 仍存在业务流程区');
if ((schema.policyProfile !== 'auditable-list-detail' && schema.policyProfile !== 'auditable-list-detail-save') || schema.workflowActions !== false || schema.detailReviewEnabled !== false || schema.detailWorkflowLinksEnabled !== false) errors.push('收款单仍启用审批流或详情流程入口');
if (!['audit', 'reverse-audit'].every((code) => schema.pageActions.some((action) => action.code === code)) || schema.overlays.some((overlay) => overlay.id === 'approval-modal')) errors.push('收款单审核或反审核配置不完整');
if (JSON.stringify(search?.fields?.map((item) => item.code)) !== JSON.stringify(expectedSearch)) errors.push('查询条件字段或顺序不正确');
if (JSON.stringify(table?.columns?.map((item) => item.code)) !== JSON.stringify(expectedColumns)) errors.push('列表字段或顺序不正确');
if (table?.columns?.find((item) => item.code === 'receiptAmount')?.label !== '本次收款金额' || table?.columns?.some((item) => item.code === 'contractAmount')) errors.push('列表金额字段标签不正确');
if (JSON.stringify(fields.map((item) => item.code)) !== JSON.stringify(expectedFields)) errors.push('基础信息字段或顺序不正确');
if (basic && schema.regions.find((region) => region.id === 'receipt-detail')?.tabs?.length !== 1) errors.push('详情页仍存在非基础信息页签');
if (fields.find((item) => item.code === 'contractName')?.component !== 'picker' || fields.find((item) => item.code === 'projectName')?.component !== 'picker') errors.push('合同或项目未使用弹窗选择');
const contractPicker = schema.overlays.find((overlay) => overlay.id === 'contract-picker');
if (!['customer', 'contractAmount', 'receivedAmount', 'pendingReceiptAmount'].every((code) => contractPicker?.selectionMap?.[code])) errors.push('合同选择回填字段不完整');
if (fields.find((item) => item.code === 'company')?.value !== '昕彤赋能（武汉）设计研究有限公司') errors.push('所属公司默认值不正确');
if (fields.find((item) => item.code === 'receiptAmount')?.signByFieldValue?.negativeValue !== '红字' || !schema.rules.some((rule) => rule.type === 'absoluteFieldLessThanOrEqualField' && rule.when?.receiptType === '蓝字' && rule.maximumField === 'pendingReceiptAmount') || !schema.rules.some((rule) => rule.type === 'absoluteFieldLessThanOrEqualField' && rule.when?.receiptType === '红字' && rule.maximumField === 'receivedAmount')) errors.push('红蓝字收款金额规则不完整');

fs.mkdirSync(reportDir, { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
page.setDefaultTimeout(4000);
page.on('pageerror', (error) => errors.push(error.message));
await page.route(/^https?:/, (route) => route.abort());

try {
  await page.goto(pathToFileURL(path.resolve(pagePath)).href, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
  const list = page.locator('[data-page-view="list"]');
  if (await list.locator('[data-act="export"]').count()) errors.push('页面仍显示导出按钮');
  if (await page.locator('[data-component="BizfinChain"]').count()) errors.push('页面仍显示业务流程区');
  if (await list.locator('[data-act="audit"]').count() !== 1 || await list.locator('[data-act="reverse-audit"]').count() !== 1) errors.push('列表缺少审核或反审核操作');
  if (await list.locator('[data-act="audit"]').isDisabled() === false || await list.locator('[data-act="reverse-audit"]').isDisabled() === false) errors.push('未选中记录时审核操作未禁用');
  const labels = (await list.locator('#search .form-label').allTextContents()).map((value) => value.trim());
  if (JSON.stringify(labels) !== JSON.stringify(['收款单号', '状态', '类型', '合同名称', '项目名称', '客户名称', '收款日期'])) errors.push(`查询条件展示不正确：${labels.join('、')}`);
  const headerLabels = (await list.locator('#receipt-table thead th').allTextContents()).map((value) => value.trim()).filter(Boolean);
  if (!['收款单号', '状态', '类型', '收款日期', '本次收款金额', '合同名称', '项目名称', '客户名称', '创建人', '创建时间'].every((label) => headerLabels.includes(label))) errors.push('页面列表字段展示不完整');
  if (await list.locator('#receipt-table tbody tr[data-row-value]:visible').count() !== 5) errors.push('列表未固定展示 5 条数据');
  const pendingRow = list.locator('#receipt-table tbody > tr:has(a[data-row-id="RE1"])');
  await pendingRow.locator('[data-row-select]').check();
  if (await list.locator('[data-act="audit"]').isDisabled() || await list.locator('[data-act="reverse-audit"]').isDisabled() === false) errors.push('新增记录的审核选择规则错误');
  await list.locator('[data-act="audit"]').click();
  if (await pendingRow.getAttribute('data-row-status') !== '审核') errors.push('审核后状态未更新为审核');
  let auditedValue = JSON.parse(await pendingRow.getAttribute('data-row-value') || '{}');
  if (!auditedValue.reviewer || !auditedValue.reviewedAt) errors.push('审核后未写入审核人或审核时间');
  await pendingRow.locator('[data-row-select]').check();
  await list.locator('[data-act="reverse-audit"]').click();
  if (await pendingRow.getAttribute('data-row-status') !== '新增') errors.push('反审核后状态未回到新增');
  auditedValue = JSON.parse(await pendingRow.getAttribute('data-row-value') || '{}');
  if (auditedValue.reviewer || auditedValue.reviewedAt) errors.push('反审核后未清空审核信息');
  await page.screenshot({ path: path.join(reportDir, 'receipt-list.png'), fullPage: true });

  await list.locator('[data-act="create"]').click();
  const detail = page.locator('[data-page-view="detail"]');
  const fieldOrder = await detail.locator('[data-tab-panel="basic"] [data-field]').evaluateAll((items) => items.map((item) => item.dataset.field));
  if (JSON.stringify(fieldOrder) !== JSON.stringify(expectedFields)) errors.push(`基础信息页面字段顺序不正确：${fieldOrder.join(',')}`);
  if (await detail.locator('[data-tab]:not([data-tab="basic"])').count()) errors.push('页面仍显示收款凭据或其他详情页签');
  if (await detail.locator('[data-workflow-actions], [data-detail-review-action]').count()) errors.push('详情页仍显示审批流或流程入口');
  const typeControl = detail.locator('[data-field="receiptType"]');
  if (await typeControl.locator('option').allTextContents().then((items) => JSON.stringify(items.filter((item) => item && item !== '请选择')) !== JSON.stringify(['蓝字', '红字']))) errors.push('类型枚举不正确');
  await detail.locator('[data-target="contract-picker"]').click();
  const picker = page.locator('[data-overlay="contract-picker"]');
  await picker.locator('[data-row-select]').first().check();
  await picker.locator('[data-act="confirm-selection"]').click();
  if (!await detail.locator('[data-field="customer"]').inputValue()) errors.push('合同选择未回填客户名称');
  if (await detail.locator('[data-field="contractAmount"]').inputValue() !== '1260000.00') errors.push('合同选择未回填合同金额');
  if (await detail.locator('[data-field="pendingReceiptAmount"]').inputValue() !== '720000.00') errors.push('合同选择未回填待收款金额');
  if (await detail.locator('[data-field="receivedAmount"]').inputValue() !== '540000.00') errors.push('合同选择未回填已收款金额');
  const receiptType = detail.locator('[data-field="receiptType"]');
  const receiptAmount = detail.locator('[data-field="receiptAmount"]');
  await receiptType.selectOption('红字');
  await receiptAmount.fill('100');
  await receiptAmount.dispatchEvent('input');
  if (await receiptAmount.inputValue() !== '-100') errors.push('红字本次收款金额未自动转为负数');
  await receiptType.selectOption('蓝字');
  if (await receiptAmount.inputValue() !== '100') errors.push('蓝字本次收款金额未自动转为正数');
  await page.evaluate(() => { window.__receiptMessages = []; window.EAMPage = { ...(window.EAMPage || {}), message: (message) => window.__receiptMessages.push(message) }; });
  await receiptAmount.fill('720001');
  await receiptAmount.dispatchEvent('input');
  await detail.locator('[data-act="save"]').click();
  if (!await page.evaluate(() => window.__receiptMessages.includes('蓝字本次收款金额不得超过待收款金额'))) errors.push('蓝字超待收款金额未被拦截');
  await receiptType.selectOption('红字');
  await receiptAmount.fill('540001');
  await receiptAmount.dispatchEvent('input');
  await detail.locator('[data-act="save"]').click();
  if (!await page.evaluate(() => window.__receiptMessages.includes('红字本次收款金额绝对值不得超过已收款金额'))) errors.push('红字超已收款金额未被拦截');
  await page.screenshot({ path: path.join(reportDir, 'receipt-detail.png'), fullPage: true });
} catch (error) {
  errors.push(error.message);
} finally {
  page.close().catch(() => {});
  browser.close().catch(() => {});
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('Receipt smoke passed: toolbar, non-workflow audit lifecycle, tabs, field contracts, five-row list, and contract picker backfill verified');
process.exit(0);
