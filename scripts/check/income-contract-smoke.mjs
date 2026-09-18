import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '../lib/playwright-smoke.mjs';

const schemaPath = 'schemas/pages/income/income-contract-schema.json';
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
const errors = [];
const form = schema.regions.find((region) => region.id === 'contract-form');
const basicTab = form?.tabs.find((tab) => tab.key === 'basic');
const fields = basicTab?.children.find((child) => child.component === 'DetailForm')?.fields || [];
const field = (code) => fields.find((item) => item.code === code);
const serviceTable = basicTab?.children.find((item) => item.id === 'service-table');
const planTable = basicTab?.children.find((item) => item.id === 'receipt-plan-table');
const relationsTab = form?.tabs.find((tab) => tab.key === 'relations');

const listCodes = schema.regions.find((region) => region.id === 'contract-table')?.columns.map((column) => column.code) || [];
const searchCodes = schema.regions.find((region) => region.id === 'contract-search')?.fields.map((item) => item.code) || [];
const expectedList = ['code', 'status', 'businessStatus', 'name', 'nature', 'contractLevel', 'amount', 'signDate', 'effectiveDate', 'customer', 'creator', 'createdAt'];
const expectedSearch = ['keyword', 'status', 'businessStatus', 'customer', 'nature', 'contractLevel', 'signDate'];
if (JSON.stringify(listCodes) !== JSON.stringify(expectedList)) errors.push('列表字段未按合同优化要求设置');
if (JSON.stringify(searchCodes) !== JSON.stringify(expectedSearch)) errors.push('查询条件未按合同优化要求设置');
if (field('subtype')) errors.push('详情仍显示合同类型');
if (field('expiryDate')?.required === true) errors.push('截止日期仍为必填');
if (schema.pageActions.some((action) => action.code === 'export')) errors.push('列表仍存在导出按钮');
if (schema.workflowActions !== false || schema.detailReviewEnabled !== false || schema.overlays.some((overlay) => overlay.id === 'approval-modal')) errors.push('收入合同仍存在审批流配置');
if (!field('customerCode') || field('customer')?.component !== 'picker' || !field('customerContact') || !field('contactPhone')?.readonly) errors.push('客户选择及联系人带出字段不完整');
const basicOrder = fields.slice(0, 3).map((item) => item.code);
if (JSON.stringify(basicOrder) !== JSON.stringify(['code', 'name', 'status']) || !field('code')?.required || !field('name')?.required) errors.push('合同编号、合同名称、状态字段顺序或必填规则不正确');
if (field('currency')?.value !== 'CNY' || field('parentContract')?.readonlyWhen?.contractLevel !== '主合同' || field('parentContract')?.requiredWhen?.contractLevel !== '子合同' || field('parentContract')?.visibleWhen) errors.push('币别默认或主合同可编辑规则不正确');
if (!serviceTable || !planTable || form.tabs.some((tab) => ['services', 'plans'].includes(tab.key))) errors.push('服务明细或收款计划未置于基础信息下方');
if (JSON.stringify(serviceTable?.footerSummary?.columns.map((item) => item.column)) !== JSON.stringify(['quantity', 'amount', 'taxAmount', 'netAmount'])) errors.push('服务明细合计列不完整');
for (const code of ['amount', 'taxAmount', 'netAmount', 'netUnitPrice']) if (!serviceTable?.columns.find((column) => column.code === code)?.calculatedBy) errors.push(`服务明细${code}未配置自动计算`);
if (planTable?.footerSummary?.column !== 'amount') errors.push('收款计划合计计划金额未配置');
if (planTable?.selectable !== true || !planTable.actions.some((action) => action.code === 'batch-delete' && action.label === '删除选中明细') || planTable.columns.some((column) => column.code === 'status') || !planTable.columns.find((column) => column.code === 'receiptDate')?.editableWhen) errors.push('收款计划复选、日期或批量删除规则不正确');
if (!form.tabs.some((tab) => tab.key === 'attachments') || !relationsTab || relationsTab.children.length !== 2) errors.push('附件或关联信息页签不完整');
if (!relationsTab.children.every((table) => table.columns[0]?.code === 'sequence')) errors.push('关联信息项目或子合同未增加序号列');
const statusOptions = schema.regions.find((region) => region.id === 'contract-search').fields.find((item) => item.code === 'status').options;
const businessStatusOptions = schema.regions.find((region) => region.id === 'contract-search').fields.find((item) => item.code === 'businessStatus').options;
if (JSON.stringify(statusOptions) !== JSON.stringify(['新增', '审核'])) errors.push('状态集合不正确');
if (JSON.stringify(businessStatusOptions) !== JSON.stringify(['未生效', '已生效', '履约中', '已关闭'])) errors.push('业务状态集合不正确');
if (!statusOptions.every((status) => schema.mockData.contracts.some((contract) => contract.status === status))) errors.push('状态样例数据不完整');
if (!businessStatusOptions.every((status) => schema.mockData.contracts.some((contract) => contract.businessStatus === status))) errors.push('业务状态样例数据不完整');
const pageAction = (code) => schema.pageActions.find((action) => action.code === code);
const auditAction = pageAction('audit');
const reverseAuditAction = pageAction('reverse-audit');
const closeContractAction = pageAction('close-contract');
if (!auditAction?.requiresSingleSelection || JSON.stringify(auditAction?.enabledSelectionStatuses) !== JSON.stringify(['新增']) || auditAction?.nextStatus !== '审核') errors.push('审核按钮未按“仅状态为新增可选”配置门禁');
if (!reverseAuditAction?.requiresSingleSelection || JSON.stringify(reverseAuditAction?.enabledSelectionStatuses) !== JSON.stringify(['审核']) || JSON.stringify(reverseAuditAction?.enabledSelectionWhen?.businessStatus) !== JSON.stringify(['未生效', '已生效']) || reverseAuditAction?.nextStatus !== '新增') errors.push('反审核按钮未按“仅状态为审核且业务状态非履约中、已关闭可选”配置门禁');
if (!closeContractAction?.requiresSingleSelection || JSON.stringify(closeContractAction?.enabledSelectionWhen) !== JSON.stringify({ businessStatus: '履约中' }) || closeContractAction?.fieldUpdates?.businessStatus !== '已关闭') errors.push('关闭按钮未按“仅业务状态为履约中可选”配置门禁');

const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(3000);
page.on('pageerror', (error) => errors.push(error.message));
await page.route(/^https?:/, (route) => route.abort());

try {
  await page.goto(pathToFileURL(path.resolve('pages/income/income-contract-schema.html')).href, { waitUntil: 'domcontentloaded' });
  if (await page.locator('[data-page-view="list"] [data-act="export"]').count()) errors.push('页面仍显示导出按钮');
  const headers = await page.locator('#contract-table thead th').evaluateAll((items) => items.map((item) => item.textContent.trim()).filter(Boolean));
  const requiredHeaders = ['合同编号', '状态', '业务状态', '合同名称', '合同性质', '合同层级', '合同金额', '签订日期', '生效日期', '客户名称', '创建人', '创建时间'];
  const businessHeaders = headers.filter((label) => !['选择', '操作'].includes(label));
  if (JSON.stringify(businessHeaders) !== JSON.stringify(requiredHeaders)) errors.push('页面列表字段展示顺序或名称不符合要求');
  if (await page.locator('#contract-search [data-field="subtype"], #contract-table [data-column="subtype"]').count()) errors.push('查询或列表仍显示合同类型');
  const statusFilter = page.locator('#contract-search [data-field="status"]');
  await statusFilter.selectOption('审核');
  await page.locator('#contract-search [data-act="query"]').click();
  const pendingStatuses = await page.locator('#contract-table tbody tr[data-row-index]:visible [data-column="status"] .tag').allTextContents();
  if (!pendingStatuses.length || pendingStatuses.some((value) => value.trim() !== '审核')) errors.push('状态查询未正确筛选列表');
  await page.locator('#contract-search [data-act="reset"]').click();
  const businessStatusFilter = page.locator('#contract-search [data-field="businessStatus"]');
  await businessStatusFilter.selectOption('已关闭');
  await page.locator('#contract-search [data-act="query"]').click();
  const terminatedBusinessStatuses = await page.locator('#contract-table tbody tr[data-row-index]:visible [data-column="businessStatus"] .tag').allTextContents();
  if (JSON.stringify(terminatedBusinessStatuses.map((value) => value.trim())) !== JSON.stringify(['已关闭'])) errors.push('业务状态查询未正确筛选列表');
  if (!await page.locator('#contract-table tbody tr[data-row-index]:visible [data-column="businessStatus"] .tag-danger').count()) errors.push('已关闭业务状态未使用终止状态样式');
  await page.locator('#contract-search [data-act="reset"]').click();
  const levelFilter = page.locator('#contract-search [data-field="contractLevel"]');
  await levelFilter.selectOption('子合同');
  await page.locator('#contract-search [data-act="query"]').click();
  const filteredLevels = await page.locator('#contract-table tbody tr[data-row-index]:visible [data-column="contractLevel"]').allTextContents();
  if (!filteredLevels.length || filteredLevels.some((value) => value.trim() !== '子合同')) errors.push('合同层级查询未正确筛选列表');
  await page.locator('#contract-search [data-act="reset"]').click();
  const hasPageHorizontalOverflow1440 = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  if (hasPageHorizontalOverflow1440) errors.push('收入合同列表在1440px下出现页面整体横向滚动');
  await page.screenshot({ path: 'outputs/reports/visual/income-contract/income-contract-list-1440.png', fullPage: true });
  await page.setViewportSize({ width: 2048, height: 1200 });
  const hasPageHorizontalOverflow2048 = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  if (hasPageHorizontalOverflow2048) errors.push('收入合同列表在2048px下出现页面整体横向滚动');
  await page.screenshot({ path: 'outputs/reports/visual/income-contract/income-contract-list-2048.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  const actionButton = (code) => page.locator(`[data-page-view="list"] .pro-page-actions [data-act="${code}"]`);
  const clearRowSelection = async () => {
    await page.evaluate(() => {
      document.querySelectorAll('#contract-table [data-row-select]').forEach((box) => {
        if (box.checked) box.click();
      });
    });
  };
  const selectContractRow = async (match) => {
    const index = await page.evaluate((expected) => {
      const rows = Array.from(document.querySelectorAll('#contract-table tbody tr[data-row-index]'));
      return rows.findIndex((row) => {
        let value = {};
        try { value = JSON.parse(row.dataset.rowValue || '{}'); } catch (error) { return false; }
        return Object.keys(expected).every((code) => String(value[code] ?? '') === String(expected[code]));
      });
    }, match);
    if (index < 0) {
      errors.push(`未找到状态/业务状态为 ${JSON.stringify(match)} 的合同行`);
      return false;
    }
    await clearRowSelection();
    await page.locator('#contract-table tbody tr[data-row-index]').nth(index).locator('[data-row-select]').check();
    return true;
  };
  if (await selectContractRow({ status: '新增' })) {
    if (await actionButton('audit').isDisabled()) errors.push('状态为新增时审核按钮未启用');
    if (!await actionButton('reverse-audit').isDisabled()) errors.push('状态为新增时反审核按钮应禁用');
    if (!await actionButton('close-contract').isDisabled()) errors.push('业务状态非履约中时关闭按钮应禁用');
  }
  if (await selectContractRow({ status: '审核', businessStatus: '已生效' })) {
    if (await actionButton('reverse-audit').isDisabled()) errors.push('状态为审核且业务状态为已生效时反审核按钮未启用');
    if (!await actionButton('audit').isDisabled()) errors.push('状态为审核时审核按钮应禁用');
    if (!await actionButton('close-contract').isDisabled()) errors.push('业务状态为已生效时关闭按钮应禁用');
  }
  if (await selectContractRow({ status: '审核', businessStatus: '已关闭' })) {
    if (!await actionButton('reverse-audit').isDisabled()) errors.push('业务状态为已关闭时反审核按钮应禁用');
    if (!await actionButton('close-contract').isDisabled()) errors.push('业务状态为已关闭时关闭按钮应禁用');
  }
  if (await selectContractRow({ status: '审核', businessStatus: '履约中' })) {
    if (await actionButton('close-contract').isDisabled()) errors.push('业务状态为履约中时关闭按钮未启用');
    if (!await actionButton('reverse-audit').isDisabled()) errors.push('业务状态为履约中时反审核按钮应禁用');
    if (!await actionButton('audit').isDisabled()) errors.push('状态为审核时审核按钮应禁用');
  }
  await clearRowSelection();
  for (const code of ['audit', 'reverse-audit', 'close-contract']) {
    if (!await actionButton(code).isDisabled()) errors.push(`未选中记录时${code}按钮应禁用`);
  }
  await page.locator('[data-act="create"]').click();
  if (!await page.locator('[data-act="save"]').count()) errors.push('详情页缺少保存草稿按钮');
  if (await page.locator('[data-page-view="detail"] [data-field="businessStatus"]').count()) errors.push('详情页仍展示业务状态');
  const parentControl = page.locator('[data-field="parentContract"]');
  if (await page.locator('[data-page-view="detail"] [data-field="subtype"]').count()) errors.push('详情页仍显示合同类型');
  if (await page.locator('[data-field="expiryDate"]').evaluate((control) => control.required)) errors.push('详情页截止日期仍为必填');
  if (!await parentControl.isDisabled()) errors.push('主合同层级时主合同字段未置灰');
  await page.locator('[data-field="contractLevel"][value="子合同"]').check();
  if (await parentControl.isDisabled() || !await parentControl.evaluate((control) => control.required)) errors.push('子合同层级时主合同字段未启用并设为必填');
  await page.locator('[data-field="contractLevel"][value="主合同"]').check();
  if (await page.locator('[data-workflow-actions]').count()) errors.push('详情页仍展示流程入口');
  if (await page.locator('[data-tab="services"], [data-tab="plans"]').count()) errors.push('服务明细或收款计划仍作为独立页签');
  if (!await page.locator('#service-table').count() || !await page.locator('#receipt-plan-table').count()) errors.push('基础信息页未展示服务明细或收款计划');
  if (!await page.locator('#service-table tfoot [data-footer-summary-column="quantity"]').count()) errors.push('服务明细数量合计未渲染');
  if (!await page.locator('#receipt-plan-table tfoot [data-footer-summary-column="amount"]').count()) errors.push('收款计划金额合计未渲染');
  const service = page.locator('#service-table');
  await service.locator('[data-act="add-row"]').click();
  const serviceRow = service.locator('tbody tr[data-row-index]').first();
  await serviceRow.locator('[data-field="quantity"]').fill('2');
  await serviceRow.locator('[data-field="unitPrice"]').fill('106');
  await serviceRow.locator('[data-field="taxRate"]').selectOption('6%');
  await serviceRow.locator('[data-field="taxRate"]').dispatchEvent('change');
  if (await serviceRow.locator('[data-column="amount"]').textContent() !== '212.00') errors.push('价税合计未自动计算');
  if (await serviceRow.locator('[data-column="taxAmount"]').textContent() !== '12.00') errors.push('税额未自动计算');
  if (await serviceRow.locator('[data-column="netAmount"]').textContent() !== '200.00') errors.push('不含税金额未自动计算');
  if (await serviceRow.locator('[data-column="netUnitPrice"]').textContent() !== '100.0000') errors.push('不含税单价未自动计算');
  const plans = page.locator('#receipt-plan-table');
  if (!await plans.locator('thead [data-act="select-all"]').count() || !await plans.locator('[data-act="batch-delete"]').count()) errors.push('收款计划未提供复选或删除选中明细');
  await plans.locator('[data-act="add-row"]').click();
  const planRow = plans.locator('tbody tr[data-row-index]').first();
  await planRow.locator('[data-field="trigger"]').selectOption('项目结算');
  await planRow.locator('[data-field="trigger"]').dispatchEvent('change');
  const settlementDate = planRow.locator('[data-field="receiptDate"]');
  if (!await settlementDate.isDisabled()) errors.push('项目结算触发方式下计划收款日期未置灰');
  await page.locator('[data-tab="relations"]').click();
  if (await page.locator('[data-tab-panel="relations"] .section-title').evaluateAll((items) => items.map((item) => item.textContent.trim())).then((titles) => !titles.includes('项目') || !titles.includes('子合同'))) errors.push('关联信息未展示项目和子合同分区');
  await page.locator('[data-tab="basic"]').click();
  await page.locator('[data-field="customer"] + button, .schema-picker [data-target="customer-picker"]').first().click();
  const picker = page.locator('#customer-picker');
  await picker.locator('[data-row-select]').nth(1).check();
  await picker.locator('[data-act="confirm-customer"]').click();
  if (await page.locator('[data-field="customerCode"]').inputValue() !== 'CUS00002') errors.push('客户弹窗未回填客户编码');
  await page.screenshot({ path: 'outputs/reports/visual/income-contract/optimized-contract-detail.png', fullPage: true });
  await page.goto(pathToFileURL(path.resolve('menu/index.html')).href, { waitUntil: 'domcontentloaded' });
  await page.locator('.menu-primary', { hasText: '收入管理' }).click();
  await page.locator('[data-path="income/income-contract-schema.html"]').click();
  const incomeFrame = page.frameLocator('#contentFrame');
  await incomeFrame.locator('html[data-page-code="income-contract-schema"]').waitFor();
} catch (error) {
  errors.push(error.message);
} finally {
  await page.close();
  await browser.close();
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('Income contract smoke passed: list/search, no workflow, embedded details, attachments, relations, and customer picker verified');
