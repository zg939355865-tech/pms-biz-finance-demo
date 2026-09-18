import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '../lib/playwright-smoke.mjs';

const htmlPath = path.resolve('pages/income/sales-invoice.html');
const schema = JSON.parse(fs.readFileSync(path.resolve('schemas/pages/income/sales-invoice.json'), 'utf8'));
const screenshotPath = path.resolve('outputs/reports/visual/sales-invoice-payment-plan.png');
fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1080 }, deviceScaleFactor: 1 });
page.setDefaultTimeout(4000);
const errors = [];
const expect = (condition, message) => { if (!condition) errors.push(message); };

try {
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'commit', timeout: 4000 });
  await page.waitForTimeout(300);
  const searchFields = schema.regions.find((region) => region.id === 'search')?.fields.map((field) => field.label);
  const listColumns = schema.regions.find((region) => region.id === 'invoice-table')?.columns.map((column) => column.label);
  const pageActions = schema.pageActions.map((action) => action.label);
  expect(JSON.stringify(searchFields) === JSON.stringify(['发票号码', '状态', '类型', '合同名称', '项目名称', '业务日期']), '销项发票查询条件发生非预期回退。');
  expect(JSON.stringify(listColumns) === JSON.stringify(['发票号码', '状态', '类型', '发票日期', '本次开票金额', '合同名称', '项目名称', '客户名称', '创建人', '创建时间']), '销项发票列表字段发生非预期回退。');
  expect(JSON.stringify(pageActions) === JSON.stringify(['审核', '反审核', '作废', '批量删除', '新增']), '销项发票列表按钮发生非预期回退。');
  await page.locator('[data-page-view="list"] [data-act="create"]').click();
  const detail = page.locator('[data-page-view="detail"]');
  expect(schema.workflowActions === false && schema.approvalOverlay === false, '销项开票仍被配置为审批流页面。');
  expect(await detail.locator('[data-workflow-actions]').count() === 0, '详情页仍显示流程动态、当前责任人或流程图入口。');
  const labels = (await detail.locator('[data-tab-panel="basic"] > [data-component] .form-label').allTextContents()).map((label) => label.replace('*', '').trim());
  expect(!labels.includes('蓝字发票') && !labels.includes('发票金额') && !labels.includes('待开票金额'), '基础信息仍保留已移除字段。');
  expect(labels.includes('本次开票金额'), '基础信息缺少本次开票金额。');
  expect(!await detail.locator('[data-field="invoiceAmount"]').isEditable(), '本次开票金额仍允许手工录入。');

  const basis = detail.locator('#invoice-basis-table');
  expect(await basis.count() === 1, '基础信息下方缺少开票依据。');
  const headerLabels = (await basis.locator('thead th').allTextContents()).map((label) => label.trim()).filter(Boolean);
  expect(JSON.stringify(headerLabels) === JSON.stringify(['序号', '计划名称', '计划金额', '已净开票金额', '未开票金额', '本次开票金额', '操作']), '开票依据字段或顺序不正确。');
  const actions = await basis.locator('.pro-table-actions [data-act]').allTextContents();
  expect(actions.some((label) => label.includes('选择收款计划')) && actions.some((label) => label.includes('删除选中明细')), '开票依据缺少指定按钮。');

  await detail.locator('[data-target="contract-picker"]').click();
  const contractPicker = page.locator('#contract-picker');
  await contractPicker.locator('[data-row-select]').first().check();
  await contractPicker.locator('[data-act="confirm-selection"]').click();
  await basis.locator('[data-act="open-payment-plan-picker"]').click();
  const planPicker = page.locator('#payment-plan-picker');
  expect(await planPicker.isVisible(), '选择收款计划弹窗未打开。');
  const planColumns = (await planPicker.locator('thead th').allTextContents()).map((label) => label.trim()).filter(Boolean);
  expect(JSON.stringify(planColumns) === JSON.stringify(['计划名称', '计划金额', '已净开票金额', '未开票金额']), '收款计划弹窗字段或顺序不正确。');
  const rows = planPicker.locator('tbody tr:not([hidden])');
  expect(await rows.count() === 3, '收款计划弹窗未按当前合同筛选。');
  await rows.nth(0).locator('[data-row-select]').check();
  await rows.nth(1).locator('[data-row-select]').check();
  await planPicker.locator('[data-act="confirm-selection"]').click();
  expect(await basis.locator('tbody tr[data-row-value]').count() === 2, '收款计划未写入开票依据。');
  await detail.locator('[data-field="invoiceType"]').selectOption('蓝字');
  const currentAmounts = basis.locator('[data-field="currentInvoiceAmount"]');
  await currentAmounts.nth(0).fill('-100');
  await currentAmounts.nth(0).dispatchEvent('input');
  expect(await currentAmounts.nth(0).inputValue() === '100', '蓝字本次开票金额未自动规范为正数。');
  await currentAmounts.nth(0).fill('180001');
  await currentAmounts.nth(0).dispatchEvent('input');
  await detail.locator('[data-act="save"]').click();
  expect(await detail.isVisible(), '蓝字金额超过未开票金额时仍允许提交。');
  await currentAmounts.nth(0).fill('10000');
  await currentAmounts.nth(0).dispatchEvent('input');
  await currentAmounts.nth(1).fill('20000');
  await currentAmounts.nth(1).dispatchEvent('input');
  expect(await detail.locator('[data-field="invoiceAmount"]').inputValue() === '30000.00', '本次开票金额未按开票依据自动汇总。');
  const totals = await basis.locator('tfoot [data-footer-summary-column]').allTextContents();
  expect(totals.length === 3 && totals[2].includes('30,000.00'), '开票依据合计行未汇总三项金额。');
  await detail.locator('[data-field="invoiceType"]').selectOption('红字');
  expect(await currentAmounts.nth(0).inputValue() === '-10000' && await currentAmounts.nth(1).inputValue() === '-20000', '切换红字后本次开票金额未自动规范为负数。');
  expect(await detail.locator('[data-field="invoiceAmount"]').inputValue() === '-30000.00', '红字本次开票金额未按负数明细汇总。');
  await currentAmounts.nth(0).fill('60001');
  await currentAmounts.nth(0).dispatchEvent('input');
  expect(await currentAmounts.nth(0).inputValue() === '-60001', '红字输入未自动规范为负数。');
  await detail.locator('[data-act="save"]').click();
  expect(await detail.isVisible(), '红字金额绝对值超过已净开票金额时仍允许提交。');
  await page.screenshot({ path: screenshotPath, fullPage: true });
} catch (error) {
  errors.push(error.message);
  await page.screenshot({ path: screenshotPath, fullPage: true });
} finally {
  await Promise.race([browser.close(), new Promise((resolve) => setTimeout(resolve, 2000))]);
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('Sales invoice smoke passed: list baseline, payment-plan basis, signed amounts, limits, and auto summary verified.');
process.exit(0);
