import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '../lib/playwright-smoke.mjs';

const allCases = [
  { code: 'purchase-invoice', file: 'pages/procurement/purchase-invoice.html', detailAct: 'edit', tab: 'basic', maintainable: true },
  { code: 'payment-request', file: 'pages/expense/payment-request.html', detailAct: 'edit', tab: 'basic', maintainable: true },
  { code: 'payment-order', file: 'pages/expense/payment-order.html', detailAct: 'edit', tab: 'basic', overlay: 'supplier-picker', maintainable: true },
  { code: 'invoice-payment-reconciliation', file: 'pages/expense/invoice-payment-reconciliation.html', detailAct: 'edit', tab: 'basic', maintainable: true }
];
const requestedCodes = new Set(process.argv.slice(2));
const cases = requestedCodes.size ? allCases.filter((item) => requestedCodes.has(item.code)) : allCases;

const reportDir = path.resolve('outputs/reports/visual/purchase-payment');
fs.mkdirSync(reportDir, { recursive: true });
const executablePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const browser = await chromium.launch({ executablePath, headless: true });
const errors = [];

for (const item of cases) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  page.setDefaultTimeout(5000);
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.route(/^https?:/, (route) => route.abort());
  try {
    await page.goto(pathToFileURL(path.resolve(item.file)).href, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(650);
    const list = page.locator('[data-page-view="list"]');
    const table = list.locator('[data-component="ProTable"]').first();
    if (!await list.isVisible()) errors.push(`${item.code}: list is not visible`);
    if (!await table.isVisible()) errors.push(`${item.code}: primary table is not visible`);
    const rowCount = await table.locator('tbody > tr[data-row-value]').evaluateAll((rows) => rows.filter((row) => row.getClientRects().length).length);
    if (rowCount < 1 || rowCount > 5) errors.push(`${item.code}: expected 1-5 visible business rows, found ${rowCount}`);
    const listMetrics = await page.evaluate(() => ({
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      headerTop: document.querySelector('.schema-list-header')?.getBoundingClientRect().top ?? 999
    }));
    if (listMetrics.horizontalOverflow) errors.push(`${item.code}: page has global horizontal overflow`);
    if (listMetrics.headerTop > 16) errors.push(`${item.code}: list header has excessive top spacing`);
    const scrollMetrics = await table.locator('.pro-table-scroll').evaluate((element) => ({
      overflowY: getComputedStyle(element).overflowY,
      verticalOverflow: element.scrollHeight > element.clientHeight + 2
    }));
    if (scrollMetrics.overflowY !== 'hidden' || scrollMetrics.verticalOverflow) errors.push(`${item.code}: primary table has vertical scrolling`);
    if (!await table.locator('.pro-table-footer').count()) errors.push(`${item.code}: pagination footer is missing`);
    const footerText = await table.locator('.pro-table-footer').innerText();
    if (!footerText.includes('5条/页') || !footerText.includes('共')) errors.push(`${item.code}: fixed 5-row pagination text is incomplete`);

    const rowDeleteButtons = table.locator('tbody > tr[data-row-value] [data-act="delete"]');
    if (item.maintainable) {
      if (await rowDeleteButtons.count() !== await table.locator('tbody > tr[data-row-value]').count()) errors.push(`${item.code}: every business row must render the shared delete action`);
      const nonSharedDeleteCount = await rowDeleteButtons.evaluateAll((buttons) => buttons.filter((button) => !button.classList.contains('btn-link')).length);
      if (nonSharedDeleteCount) errors.push(`${item.code}: row delete action does not use the shared btn-link component`);
      const enabledDraftDelete = table.locator('tbody > tr[data-row-value] [data-act="delete"][data-row-status="草稿"]:not(:disabled)').first();
      if (!await enabledDraftDelete.count()) errors.push(`${item.code}: draft delete action is missing or disabled`);
      if (await table.locator('tbody > tr[data-row-value] [data-act="delete"][data-row-status]:not([data-row-status="草稿"]):not(:disabled)').count()) errors.push(`${item.code}: non-draft delete action must remain disabled`);
      if (await enabledDraftDelete.count()) {
        await enabledDraftDelete.click();
        const deleteConfirm = page.locator('[data-delete-confirm]');
        if (!await deleteConfirm.isVisible()) errors.push(`${item.code}: shared delete confirmation did not open`);
        else await deleteConfirm.locator('[data-act="cancel-delete"]').first().click();
        if (await deleteConfirm.isVisible()) errors.push(`${item.code}: shared delete confirmation did not close`);
        await page.waitForTimeout(550);
      }
    } else if (await rowDeleteButtons.count()) {
      errors.push(`${item.code}: system-generated reconciliation rows must not expose delete`);
    }
    if (item.code === 'purchase-invoice') {
      const search = list.locator('[data-component="ProSearchForm"]');
      const searchLabels = (await search.locator('.form-label').allTextContents()).map((value) => value.trim());
      const expectedSearchLabels = ['发票号码', '状态', '类型', '供应商', '项目', '是否存在合同', '合同名称', '收票日期'];
      if (JSON.stringify(searchLabels) !== JSON.stringify(expectedSearchLabels)) errors.push(`${item.code}: search fields are incorrect: ${searchLabels.join(', ')}`);
      const hasContractQuery = search.locator('select[data-field="hasContractQuery"]');
      if (JSON.stringify(await hasContractQuery.locator('option').allTextContents()) !== JSON.stringify(['请选择', '是', '否'])) errors.push(`${item.code}: has-contract query options are incorrect`);
      await hasContractQuery.selectOption('否');
      await search.locator('[data-act="query"]').click();
      const noContractRows = table.locator('tbody > tr[data-row-value]:visible');
      if (await noContractRows.count() !== 1 || (await noContractRows.first().locator('[data-column="hasContractLabel"]').innerText()).trim() !== '否') errors.push(`${item.code}: has-contract query did not filter no-contract invoices`);
      await search.locator('[data-act="reset"]').click();
      await search.locator('[data-field="contractName"]').fill('在线仪表');
      await search.locator('[data-act="query"]').click();
      if (await table.locator('tbody > tr[data-row-value]:visible').count() !== 2) errors.push(`${item.code}: contract-name query did not filter matching invoices`);
      await search.locator('[data-act="reset"]').click();
    }
    await page.screenshot({ path: path.join(reportDir, `${item.code}-list.png`), fullPage: true });

    if (item.listOverlay) {
      await list.locator(`[data-target="${item.listOverlay}"]`).click();
      if (!await page.locator(`[data-overlay="${item.listOverlay}"]`).isVisible()) errors.push(`${item.code}: list overlay did not open`);
      await page.locator(`[data-overlay="${item.listOverlay}"] [data-act="close"]`).first().click();
    }

    const link = table.locator(`a[data-act="${item.detailAct}"]`).first();
    if (!await link.count()) errors.push(`${item.code}: detail entry link is missing`);
    else await link.click();
    const detail = page.locator('[data-page-view="detail"]');
    if (!await detail.isVisible()) errors.push(`${item.code}: detail did not open`);
    const form = detail.locator('[data-component="DetailForm"]').first();
    if (await form.count()) {
      const columns = await form.locator('.pro-detail-grid').evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').filter(Boolean).length);
      if (columns !== 3) errors.push(`${item.code}: detail form rendered ${columns} columns`);
    }
    if (item.tab) {
      await detail.locator(`[data-tab="${item.tab}"]`).click();
      if (!await detail.locator(`[data-tab-panel="${item.tab}"]`).isVisible()) errors.push(`${item.code}: target detail tab did not open`);
    }
    if (item.overlay) {
      const target = detail.locator(`[data-target="${item.overlay}"]`).first();
      if (!await target.count()) errors.push(`${item.code}: expected overlay entry is missing`);
      else {
        await target.click();
        if (!await page.locator(`[data-overlay="${item.overlay}"]`).isVisible()) errors.push(`${item.code}: detail overlay did not open`);
        await page.locator(`[data-overlay="${item.overlay}"] [data-act="close"]`).first().click();
      }
    }
    if (item.code === 'payment-request') {
      const listHeaders = await table.locator('thead th').allTextContents();
      const businessHeaders = listHeaders.map((value) => value.trim()).filter((value) => value && value !== '操作');
      const expectedHeaders = ['申请单号', '状态', '付款金额', '计划付款日期', '供应商', '项目', '是否有合同', '合同名称', '付款状态', '申请人', '申请时间'];
      if (JSON.stringify(businessHeaders) !== JSON.stringify(expectedHeaders)) errors.push(`${item.code}: list columns do not match the requested field order: ${businessHeaders.join(', ')}`);
      const search = page.locator('[data-page-view="list"] [data-component="ProSearchForm"]');
      const searchLabels = (await search.locator('.form-label').allTextContents()).map((value) => value.trim());
      const expectedSearchLabels = ['申请单号', '状态', '供应商', '是否有合同', '合同名称', '项目', '付款状态', '计划付款日期'];
      if (JSON.stringify(searchLabels) !== JSON.stringify(expectedSearchLabels)) errors.push(`${item.code}: query conditions are incorrect: ${searchLabels.join(', ')}`);
      if (JSON.stringify(await search.locator('[data-field="hasContract"] option').allTextContents()) !== JSON.stringify(['请选择', '是', '否'])) errors.push(`${item.code}: has-contract query options are incorrect`);
      if (JSON.stringify(await search.locator('[data-field="paymentStatus"] option').allTextContents()) !== JSON.stringify(['请选择', '待付款', '已付款'])) errors.push(`${item.code}: payment-status query options are incorrect`);
      if ((await table.locator('tbody tr').first().locator('[data-column="paymentAmount"]').innerText()).trim() !== '50,000.00') errors.push(`${item.code}: payment amount must display two decimal places`);
      await search.locator('[data-field="paymentStatus"]').selectOption('已付款', { force: true });
      await search.locator('[data-act="query"]').evaluate((button) => button.click());
      if (await table.locator('tbody tr[data-filter-match="true"]').count() !== 1) errors.push(`${item.code}: payment-status query did not filter paid requests`);
      await search.locator('[data-act="reset"]').evaluate((button) => button.click());
      if (await detail.locator('[data-tab="settlement-items"]').count()) errors.push(`${item.code}: invoice settlement detail tab must be removed`);
      if (await detail.locator('[data-tab="basic"]').innerText() !== '基础信息') errors.push(`${item.code}: application info tab was not renamed to basic info`);
      if (await detail.locator('[data-field="currency"]').count()) errors.push(`${item.code}: currency must be removed from basic information`);
      if (await detail.locator('select[data-field="receivingAccount"]').count() !== 1) errors.push(`${item.code}: receiving account must be a select-only control`);
      if (await detail.locator('[data-field="receivingBank"][readonly]').count() !== 1) errors.push(`${item.code}: receiving bank must be readonly`);
      if (await detail.locator('[data-field="receivingBank"][required]').count()) errors.push(`${item.code}: receiving bank must not display a required marker`);
      if (await detail.locator('select[data-field="paymentMethod"][required]').count() !== 1) errors.push(`${item.code}: required payment method select is missing`);
      const paymentMethodOptions = await detail.locator('select[data-field="paymentMethod"] option').allTextContents();
      if (JSON.stringify(paymentMethodOptions.filter((value) => value && value !== '请选择')) !== JSON.stringify(['电汇', '承兑'])) errors.push(`${item.code}: payment method options must be 电汇 and 承兑`);
      const plannedDate = detail.locator('[data-field="plannedPaymentDate"]');
      if (await plannedDate.count() !== 1 || !(await plannedDate.evaluate((field) => field.hasAttribute('required')))) errors.push(`${item.code}: required planned payment date is missing`);
      if (await detail.locator('[data-field="paymentReason"][required]').count() !== 1) errors.push(`${item.code}: required payment reason is missing`);
      const formFieldOrder = await detail.locator('[data-component="DetailForm"] .form-item:visible [data-field]').evaluateAll((fields) => fields.map((field) => field.dataset.field));
      const expectedFormFieldOrder = ['requestNo', 'status', 'supplierName', 'hasContract', 'contractName', 'projectName', 'receivingAccount', 'receivingBank', 'contractAmount', 'availableAmount', 'invoiceAmount', 'paymentAmount', 'paymentMethod', 'plannedPaymentDate', 'paymentReason', 'paymentOrderNo', 'creator', 'createdAt', 'company', 'remark'];
      if (JSON.stringify(formFieldOrder) !== JSON.stringify(expectedFormFieldOrder)) errors.push(`${item.code}: basic information field order is incorrect: ${formFieldOrder.join(', ')}`);
      if (await detail.locator('[data-component="EditableTable"][data-data-source="invoiceItems"]').count()) errors.push(`${item.code}: invoice list must be removed`);

      const hasContract = detail.locator('[data-field="hasContract"]');
      const contractName = detail.locator('[data-field="contractName"]');
      const projectName = detail.locator('[data-field="projectName"]');
      const projectPickerButton = detail.locator('[data-target="project-picker"]');
      const account = detail.locator('[data-field="receivingAccount"]');
      const bank = detail.locator('[data-field="receivingBank"]');
      const contractAmount = detail.locator('[data-field="contractAmount"]');
      const availableAmount = detail.locator('[data-field="availableAmount"]');
      if (!(await hasContract.evaluate((field) => field.hasAttribute('required'))) || await hasContract.inputValue() !== '是') errors.push(`${item.code}: has-contract must be a required yes/no select`);
      if (!(await contractName.evaluate((field) => field.hasAttribute('required'))) || await contractName.isDisabled()) errors.push(`${item.code}: contract name must be required and selectable when has-contract is yes`);
      if (!(await projectName.isDisabled()) || !(await projectPickerButton.isDisabled()) || !(await account.isDisabled())) errors.push(`${item.code}: project and receiving account must be contract-driven when has-contract is yes`);
      if (await contractName.locator('option[value=""]').innerText() !== '请选择') errors.push(`${item.code}: contract name must show the first-selection hint when has-contract is yes`);
      if ((await projectName.getAttribute('placeholder') || '') !== '') errors.push(`${item.code}: disabled project must not show the first-selection hint when has-contract is yes`);
      await contractName.selectOption({ label: '武汉智控技术服务合同' });
      await contractName.dispatchEvent('change');
      if (await projectName.inputValue() !== '东湖水环境运营提升项目' || await account.inputValue() !== '6222 **** **** 6626' || await bank.inputValue() !== '招商银行武汉光谷支行' || await contractAmount.inputValue() !== '80000.00' || await availableAmount.inputValue() !== '32000.00') errors.push(`${item.code}: contract selection did not populate project, account, bank, contract amount and available amount with standard precision`);
      await detail.locator('[data-field="paymentAmount"]').fill('30000');
      await detail.locator('[data-field="paymentReason"]').fill('合同技术服务款');
      await page.screenshot({ path: path.join(reportDir, 'payment-request-with-contract.png'), fullPage: true });

      await hasContract.selectOption('否');
      await hasContract.dispatchEvent('change');
      if (await contractName.evaluate((field) => field.hasAttribute('required')) || !(await contractName.isDisabled())) errors.push(`${item.code}: contract name must be optional and disabled when has-contract is no`);
      if (!(await projectName.evaluate((field) => field.hasAttribute('required'))) || await projectName.isDisabled() || await projectPickerButton.isDisabled()) errors.push(`${item.code}: project must be manually selectable and required when has-contract is no`);
      if (await account.isDisabled()) errors.push(`${item.code}: receiving account must be supplier-selectable when has-contract is no`);
      if (await contractName.locator('option[value=""]').innerText() !== '') errors.push(`${item.code}: disabled contract name must not show the first-selection hint when has-contract is no`);
      if ((await projectName.getAttribute('placeholder') || '') !== '请选择') errors.push(`${item.code}: project must show the first-selection hint when has-contract is no`);
      if (await contractAmount.inputValue() !== '' || await availableAmount.inputValue() !== '50000.00') errors.push(`${item.code}: no-contract mode must leave contract amount blank and show the default available amount with two decimals`);
      await detail.locator('[data-target="supplier-picker"]').click();
      const supplierOverlay = page.locator('[data-overlay="supplier-picker"]');
      await supplierOverlay.locator('tbody tr[data-row-value]').filter({ hasText: '武汉云帆科技有限公司' }).locator('[data-row-select]').check();
      await supplierOverlay.locator('[data-act="confirm-supplier"]').click();
      const supplierAccountOptions = (await account.locator('option').allTextContents()).filter((value) => value && value !== '请选择');
      if (JSON.stringify(supplierAccountOptions) !== JSON.stringify(['6001 **** **** 8899'])) errors.push(`${item.code}: receiving account options were not refreshed for the selected supplier`);
      await projectPickerButton.click();
      const projectOverlay = page.locator('[data-overlay="project-picker"]');
      if (!await projectOverlay.isVisible()) errors.push(`${item.code}: project picker did not open`);
      const projectHeaders = (await projectOverlay.locator('thead th').allTextContents()).map((value) => value.trim()).filter(Boolean);
      if (JSON.stringify(projectHeaders) !== JSON.stringify(['项目编码', '项目名称'])) errors.push(`${item.code}: project picker columns are incorrect`);
      await projectOverlay.locator('tbody tr[data-row-value]').filter({ hasText: '临港污水处理厂设备更新项目' }).locator('[data-row-select]').check();
      await projectOverlay.locator('[data-act="confirm-project"]').click();
      if (await projectName.inputValue() !== '临港污水处理厂设备更新项目') errors.push(`${item.code}: manually selected project was not populated`);
      await account.selectOption({ label: '6001 **** **** 8899' });
      await account.dispatchEvent('change');
      if (await bank.inputValue() !== '中国银行武汉高新支行') errors.push(`${item.code}: receiving bank was not populated from the selected account`);

      const paymentAmount = detail.locator('[data-field="paymentAmount"]');
      if (await paymentAmount.count() !== 1 || !(await paymentAmount.evaluate((field) => field.hasAttribute('required')))) errors.push(`${item.code}: payment amount must be a required form field`);
      if (await paymentAmount.isDisabled()) errors.push(`${item.code}: payment amount must remain editable in draft status`);
      await paymentAmount.fill('12500.50');
      if (await paymentAmount.inputValue() !== '12500.50') errors.push(`${item.code}: payment amount cannot be edited`);
      for (const code of ['contractAmount', 'availableAmount', 'invoiceAmount', 'paymentAmount']) {
        if (await detail.locator(`[data-field="${code}"]`).getAttribute('data-precision') !== '2') errors.push(`${item.code}: ${code} must use two-decimal precision`);
      }
      for (const code of ['contractAmount', 'availableAmount', 'invoiceAmount', 'paymentOrderNo']) {
        if (await detail.locator(`[data-field="${code}"]:not([readonly])`).count()) errors.push(`${item.code}: ${code} must remain readonly`);
      }
      if (await detail.locator('[data-component="EditableTable"][data-data-source="purchaseOrderLines"]').count()) errors.push(`${item.code}: purchase order detail table must be removed`);
      if (await detail.locator('[data-target="purchase-order-line-picker"]').count()) errors.push(`${item.code}: purchase order detail selector must be removed`);
      if (await page.locator('[data-overlay="purchase-order-line-picker"]').count()) errors.push(`${item.code}: purchase order detail picker overlay must be removed`);
      await page.screenshot({ path: path.join(reportDir, 'payment-request-without-contract.png'), fullPage: true });

      await detail.locator('[data-tab="attachments"]').click();
      const attachmentUpload = detail.locator('[data-tab-panel="attachments"] [data-component="ProUploadList"]');
      if (!await attachmentUpload.isVisible() || !await attachmentUpload.locator('.pro-upload-dropzone').count()) errors.push(`${item.code}: attachments must use the shared upload-list component`);
      const attachmentHeaders = (await attachmentUpload.locator('thead th').allTextContents()).map((value) => value.trim()).filter(Boolean);
      if (JSON.stringify(attachmentHeaders) !== JSON.stringify(['文件名', '大小', '上传人', '上传时间', '操作'])) errors.push(`${item.code}: attachment columns are incorrect: ${attachmentHeaders.join(', ')}`);
      if (await attachmentUpload.locator('[data-column="documentType"]').count()) errors.push(`${item.code}: attachment document type must be removed`);
      await page.screenshot({ path: path.join(reportDir, 'payment-request-attachments.png'), fullPage: true });
      await detail.locator('[data-tab="basic"]').click();
    }
    if (item.code === 'payment-order') {
      if (await list.locator('[data-act="toggle-search"]').count()) errors.push(`${item.code}: search form must not render expand or collapse controls`);
      const searchFields = list.locator('[data-component="ProSearchForm"] .form-item:has([data-field])');
      if (await searchFields.count() !== 8 || await list.locator('[data-component="ProSearchForm"] .schema-advanced-field').count()) errors.push(`${item.code}: all eight query fields must render without collapsed fields`);
      const search = list.locator('[data-component="ProSearchForm"]');
      const searchLabels = (await search.locator('.form-label').allTextContents()).map((value) => value.trim());
      const expectedSearchLabels = ['付款单号', '状态', '类型', '付款日期', '供应商', '项目', '是否存在合同', '合同名称'];
      if (JSON.stringify(searchLabels) !== JSON.stringify(expectedSearchLabels)) errors.push(`${item.code}: search fields are incorrect: ${searchLabels.join(', ')}`);
      const hasContractQuery = search.locator('select[data-field="hasContractText"]');
      if (JSON.stringify(await hasContractQuery.locator('option').allTextContents()) !== JSON.stringify(['请选择', '是', '否'])) errors.push(`${item.code}: has-contract query options are incorrect`);
      const listHeaders = (await table.locator('thead th').allTextContents()).map((value) => value.trim()).filter((value) => value && value !== '操作');
      const expectedListHeaders = ['付款单号', '状态', '类型', '付款日期', '付款金额', '供应商', '项目', '是否存在合同', '合同名称', '创建人', '创建时间'];
      if (JSON.stringify(listHeaders) !== JSON.stringify(expectedListHeaders)) errors.push(`${item.code}: list columns are incorrect: ${listHeaders.join(', ')}`);
      if ((await table.locator('tbody tr').first().locator('[data-column="paymentAmount"]').innerText()).trim() !== '5,000.00') errors.push(`${item.code}: list payment amount must display two decimal places`);
      if ((await table.locator('tbody tr').nth(1).locator('[data-column="paymentAmount"]').innerText()).trim() !== '-90,000.00') errors.push(`${item.code}: red payment amount must display as a negative value`);
      if ((await table.locator('tbody tr').first().locator('[data-column="hasContractText"]').innerText()).trim() !== '是') errors.push(`${item.code}: list has-contract value must display as yes or no`);
      await hasContractQuery.selectOption('否', { force: true });
      await search.locator('[data-act="query"]').evaluate((button) => button.click());
      const noContractRows = table.locator('tbody > tr[data-row-value][data-filter-match="true"]');
      if (await noContractRows.count() !== 1 || (await noContractRows.first().locator('[data-column="hasContractText"]').textContent()).trim() !== '否') errors.push(`${item.code}: has-contract query did not filter no-contract payments`);
      await search.locator('[data-act="reset"]').evaluate((button) => button.click());

      const basicTabs = detail.locator('[data-component="ProTabsDetail"] > .pro-tabs [data-tab="basic"]');
      if (await basicTabs.count() !== 1 || await basicTabs.innerText() !== '基础信息' || !(await basicTabs.evaluate((tab) => tab.classList.contains('active')))) errors.push(`${item.code}: basic information tab must reuse the active purchase-invoice tab style`);
      if (await detail.locator('[data-component="ProTabsDetail"] > .pro-tabs [data-tab]').count() !== 1) errors.push(`${item.code}: only the basic information tab may remain`);
      if (await detail.locator('[data-component="DetailForm"] > .pro-section-header').count()) errors.push(`${item.code}: detail form must not repeat an inner section title below the tab`);
      const formFieldOrder = await detail.locator('[data-component="DetailForm"] .form-item:visible [data-field]').evaluateAll((fields) => fields.map((field) => field.dataset.field));
      const expectedFieldOrder = ['paymentNo', 'status', 'paymentType', 'paymentDate', 'supplierName', 'projectName', 'hasContract', 'contractName', 'settlementCurrency', 'paymentAmount', 'paymentMethod', 'receivingAccount', 'receivingBank', 'creator', 'createdAt', 'reviewer', 'reviewedAt', 'company', 'remark'];
      if (JSON.stringify(formFieldOrder) !== JSON.stringify(expectedFieldOrder)) errors.push(`${item.code}: basic information field order is incorrect: ${formFieldOrder.join(', ')}`);
      const expectedLabels = ['付款单号', '状态', '类型', '付款日期', '供应商', '项目', '是否存在合同', '合同名称', '结算币别', '付款金额', '付款方式', '收款账户', '收款银行', '创建人', '创建时间', '审核人', '审核时间', '所属公司', '备注'];
      const formLabels = (await detail.locator('[data-component="DetailForm"] .form-item:visible .form-label').allTextContents()).map((value) => value.replace('*', '').trim());
      if (JSON.stringify(formLabels) !== JSON.stringify(expectedLabels)) errors.push(`${item.code}: basic information labels are incorrect: ${formLabels.join(', ')}`);
      for (const code of ['paymentType', 'supplierName', 'projectName', 'contractName', 'paymentAmount', 'paymentMethod', 'receivingAccount']) {
        if (!(await detail.locator(`[data-field="${code}"]`).evaluate((field) => field.hasAttribute('required')))) errors.push(`${item.code}: ${code} must be required`);
      }
      for (const code of expectedFieldOrder.filter((value) => !['paymentType', 'supplierName', 'projectName', 'contractName', 'paymentAmount', 'paymentMethod', 'receivingAccount'].includes(value))) {
        if (await detail.locator(`[data-field="${code}"][required]`).count()) errors.push(`${item.code}: ${code} must not be required`);
      }
      const hasContract = detail.locator('input[type="checkbox"][data-field="hasContract"]');
      if (await hasContract.count() !== 1 || !(await hasContract.isChecked())) errors.push(`${item.code}: existing contract sample must show a checked has-contract checkbox`);
      if ((await hasContract.locator('xpath=..').textContent()).trim()) errors.push(`${item.code}: has-contract checkbox must not repeat a visible text label`);
      if (await detail.locator('[data-field="requestNo"], [data-field="paymentAccount"], [data-field="paymentFlowNo"]').count()) errors.push(`${item.code}: payment request number, payment account and payment flow number must be removed`);
      const paymentAmount = detail.locator('[data-field="paymentAmount"]');
      if (await paymentAmount.count() !== 1 || await paymentAmount.getAttribute('data-precision') !== '2' || await paymentAmount.isDisabled()) errors.push(`${item.code}: payment amount must be an editable required two-decimal field`);
      if (await detail.locator('select[data-field="paymentMethod"]:not([required])').count() || await detail.locator('select[data-field="paymentMethod"][readonly]').count()) errors.push(`${item.code}: payment method must be a required editable select`);

      const paymentType = detail.locator('[data-field="paymentType"]');
      await paymentType.selectOption('红字');
      await paymentType.dispatchEvent('change');
      if (Number(await paymentAmount.inputValue()) !== -5000) errors.push(`${item.code}: changing to red type must normalize the current amount to negative`);
      await paymentAmount.fill('1200.50');
      if (Number(await paymentAmount.inputValue()) !== -1200.5) errors.push(`${item.code}: red payment amount input must normalize to negative`);
      await paymentType.selectOption('蓝字');
      await paymentType.dispatchEvent('change');
      if (Number(await paymentAmount.inputValue()) !== 1200.5) errors.push(`${item.code}: changing to blue type must normalize the current amount to positive`);

      await detail.locator('[data-target="supplier-picker"]').click();
      const picker = page.locator('[data-overlay="supplier-picker"]');
      const pickerHeaders = (await picker.locator('thead th').allTextContents()).map((value) => value.trim()).filter(Boolean);
      if (JSON.stringify(pickerHeaders) !== JSON.stringify(['供应商编码', '供应商名称'])) errors.push(`${item.code}: supplier picker columns are incorrect: ${pickerHeaders.join(', ')}`);
      if (await picker.locator('[data-page-size="5"]').count() !== 1) errors.push(`${item.code}: supplier picker must use fixed five-row pagination`);
      const confirm = picker.locator('[data-act="confirm-supplier"]');
      if (!await confirm.isDisabled()) errors.push(`${item.code}: supplier confirmation must be disabled before selection`);
      await page.screenshot({ path: path.join(reportDir, 'payment-order-supplier-picker.png'), fullPage: true });
      await picker.locator('tbody tr[data-row-value]').filter({ hasText: '武汉云帆科技有限公司' }).locator('[data-row-select]').check();
      if (await confirm.isDisabled()) errors.push(`${item.code}: supplier confirmation did not enable after selection`);
      await confirm.click();
      if (await detail.locator('[data-field="supplierName"]').inputValue() !== '武汉云帆科技有限公司' || await detail.locator('[data-field="settlementCurrency"]').inputValue() !== 'CNY') errors.push(`${item.code}: supplier selection must populate supplier and settlement currency`);
      const project = detail.locator('select[data-field="projectName"]');
      if (JSON.stringify(await project.locator('option').allTextContents()) !== JSON.stringify(['请选择', '临港污水处理厂设备更新项目'])) errors.push(`${item.code}: project options were not refreshed from supplier`);
      await project.selectOption('临港污水处理厂设备更新项目');
      await project.dispatchEvent('change');
      const contract = detail.locator('select[data-field="contractName"]');
      if (JSON.stringify(await contract.locator('option').allTextContents()) !== JSON.stringify(['请选择', '智能加药系统采购合同'])) errors.push(`${item.code}: contract options were not refreshed from supplier and project`);
      const account = detail.locator('select[data-field="receivingAccount"]');
      await contract.selectOption('智能加药系统采购合同');
      await contract.dispatchEvent('change');
      if (await detail.locator('[data-field="paymentMethod"]').inputValue() !== '承兑汇票' || await account.inputValue() !== '6001 **** **** 8899' || await detail.locator('[data-field="receivingBank"]').inputValue() !== '中国银行武汉高新支行') errors.push(`${item.code}: contract selection must populate payment method, receiving account and bank`);
      await page.screenshot({ path: path.join(reportDir, 'payment-order-contract-linkage.png'), fullPage: true });
      if (await detail.locator('[data-field="receivingBank"]:not([readonly])').count()) errors.push(`${item.code}: populated receiving bank must remain readonly`);
      await detail.locator('[data-act="back-list"]').click();
      await list.locator('[data-act="create"]').click();
      const createProject = detail.locator('select[data-field="projectName"]');
      if (await createProject.isDisabled()) errors.push(`${item.code}: project must stay editable before supplier selection`);
      const createProjectOptions = (await createProject.locator('option').allTextContents()).filter((value) => value && value !== '请选择');
      if (JSON.stringify(createProjectOptions) !== JSON.stringify(['沙河市污水厂智能化改造项目', '东湖水环境运营提升项目', '临港污水处理厂设备更新项目'])) errors.push(`${item.code}: project must expose all order projects before supplier selection`);
      const createHasContract = detail.locator('input[type="checkbox"][data-field="hasContract"]');
      const createContract = detail.locator('select[data-field="contractName"]');
      if (await createHasContract.isChecked() || !(await createContract.isDisabled()) || await createContract.evaluate((field) => field.hasAttribute('required'))) errors.push(`${item.code}: create mode must require checking has-contract before contract selection`);
      await createHasContract.check();
      await createHasContract.dispatchEvent('change');
      if (await createContract.isDisabled() || !(await createContract.evaluate((field) => field.hasAttribute('required')))) errors.push(`${item.code}: checking has-contract must enable and require contract name`);
    }
    if (item.code === 'purchase-invoice') {
      const listHeaders = (await table.locator('thead th').allTextContents()).map((value) => value.trim()).filter((value) => value && value !== '操作');
      const expectedListHeaders = ['发票号码', '状态', '类型', '收票日期', '发票金额', '验票总金额', '供应商', '项目', '是否存在合同', '合同名称', '创建人', '创建时间'];
      if (JSON.stringify(listHeaders) !== JSON.stringify(expectedListHeaders)) errors.push(`${item.code}: list columns are incorrect: ${listHeaders.join(', ')}`);
      const tabLabels = (await detail.locator('[data-tab]').allTextContents()).map((value) => value.trim());
      if (JSON.stringify(tabLabels) !== JSON.stringify(['基础信息'])) errors.push(`${item.code}: detail must keep only the basic-information tab: ${tabLabels.join(', ')}`);
      const saveDraft = detail.locator('.schema-detail-header [data-act="save"]');
      if (await saveDraft.count() !== 1 || await saveDraft.innerText() !== '保存草稿') errors.push(`${item.code}: draft detail must expose Save Draft`);
      const formFieldOrder = await detail.locator('[data-component="DetailForm"] .form-item:visible [data-field]').evaluateAll((fields) => fields.map((field) => field.dataset.field));
      const expectedFieldOrder = ['invoiceNo', 'status', 'receiptDate', 'invoiceNature', 'invoiceDate', 'invoiceAmount', 'verificationTotalAmount', 'supplierName', 'projectName', 'hasContract', 'contractName', 'isInventory', 'inventoryAmount', 'inventoryReason', 'creator', 'createdAt', 'reviewer', 'reviewedAt', 'company', 'invoiceAttachment', 'remark'];
      if (JSON.stringify(formFieldOrder) !== JSON.stringify(expectedFieldOrder)) errors.push(`${item.code}: basic information field order is incorrect: ${formFieldOrder.join(', ')}`);
      if (await detail.locator('[data-field="company"]').inputValue() !== '昕彤赋能（长沙）人工智能行业应用系统有限公司') errors.push(`${item.code}: company must use the concrete business entity name`);
      if (await detail.locator('[data-field="company"]').evaluate((field) => /当前登录公司/.test(field.value))) errors.push(`${item.code}: company must not use the current-login placeholder`);
      for (const code of ['invoiceNo', 'receiptDate', 'invoiceNature', 'invoiceDate', 'invoiceAmount', 'supplierName', 'projectName', 'contractName']) {
        if (!(await detail.locator(`[data-field="${code}"]`).evaluate((field) => field.hasAttribute('required')))) errors.push(`${item.code}: ${code} must be required`);
      }
      for (const code of expectedFieldOrder.filter((value) => !['invoiceNo', 'receiptDate', 'invoiceNature', 'invoiceDate', 'invoiceAmount', 'supplierName', 'projectName', 'contractName'].includes(value))) {
        if (await detail.locator(`[data-field="${code}"][required]`).count()) errors.push(`${item.code}: ${code} must not be required`);
      }
      const contractName = detail.locator('[data-field="contractName"]');
      const projectName = detail.locator('[data-field="projectName"]');
      const hasContract = detail.locator('input[type="checkbox"][data-field="hasContract"]');
      if (await projectName.evaluate((field) => field.tagName) !== 'SELECT' || await contractName.evaluate((field) => field.tagName) !== 'SELECT') errors.push(`${item.code}: project and contract name must use select controls`);
      if (!(await projectName.evaluate((field) => field.hasAttribute('required'))) || !(await contractName.evaluate((field) => field.hasAttribute('required')))) errors.push(`${item.code}: project and contract name must be required`);
      if (await projectName.getAttribute('data-depends-on') || await contractName.getAttribute('data-depends-on') !== 'projectName') errors.push(`${item.code}: project must remain editable while contract continues to cascade from project`);
      if (await hasContract.count() !== 1 || !(await hasContract.isChecked())) errors.push(`${item.code}: existing contract sample must show a checked has-contract checkbox`);
      if ((await hasContract.locator('xpath=..').textContent()).trim()) errors.push(`${item.code}: has-contract checkbox must not repeat a visible text label`);
      const invoiceAttachment = detail.locator('input[type="file"][data-field="invoiceAttachment"]');
      if (await invoiceAttachment.count() !== 1 || await invoiceAttachment.evaluate((field) => field.hasAttribute('required'))) errors.push(`${item.code}: optional invoice attachment upload field is missing`);
      await invoiceAttachment.setInputFiles({ name: 'purchase-invoice.pdf', mimeType: 'application/pdf', buffer: Buffer.from('invoice attachment') });
      if (await detail.locator('[data-upload-display]').inputValue() !== 'purchase-invoice.pdf') errors.push(`${item.code}: uploaded invoice attachment name is not displayed`);
      const isInventory = detail.locator('[data-field="isInventory"]');
      const inventoryAmount = detail.locator('[data-field="inventoryAmount"]');
      const inventoryReason = detail.locator('[data-field="inventoryReason"]');
      if (await isInventory.getAttribute('type') !== 'checkbox' || await isInventory.isChecked()) errors.push(`${item.code}: inventory flag must be an unchecked checkbox by default`);
      if (await inventoryAmount.getAttribute('readonly') === null || !(await inventoryReason.isDisabled())) errors.push(`${item.code}: inventory amount must be readonly and inventory reason disabled when inventory is unchecked`);
      if ((await inventoryReason.getAttribute('placeholder') || '') !== '') errors.push(`${item.code}: disabled inventory reason must not show an input hint`);
      await isInventory.check();
      await isInventory.dispatchEvent('change');
      if (await inventoryAmount.getAttribute('readonly') === null || await inventoryReason.isDisabled()) errors.push(`${item.code}: checking inventory must enable only the inventory reason while keeping the calculated amount readonly`);
      if (!(await inventoryReason.evaluate((field) => field.hasAttribute('required')))) errors.push(`${item.code}: inventory reason must be required when inventory is checked`);
      await isInventory.uncheck();
      await isInventory.dispatchEvent('change');
      const invoiceNatureOptions = (await detail.locator('[data-field="invoiceNature"] option').allTextContents()).filter((value) => value && value !== '请选择');
      if (JSON.stringify(invoiceNatureOptions) !== JSON.stringify(['蓝字', '红字'])) errors.push(`${item.code}: invoice type options must be 蓝字 and 红字`);
      const invoiceNature = detail.locator('[data-field="invoiceNature"]');
      const invoiceAmount = detail.locator('[data-field="invoiceAmount"]');
      const verificationTotal = detail.locator('[data-field="verificationTotalAmount"]');
      const orderItems = detail.locator('[data-component="EditableTable"][data-data-source="orderItems"]');
      const settlementItems = detail.locator('[data-component="EditableTable"][data-data-source="settlementItems"]');
      const initialOrderValues = await orderItems.locator('tbody tr[data-row-value]').evaluateAll((rows) => rows.map((row) => JSON.parse(row.dataset.rowValue || '{}')));
      const initialSettlementValues = await settlementItems.locator('tbody tr[data-row-value]').evaluateAll((rows) => rows.map((row) => JSON.parse(row.dataset.rowValue || '{}')));
      const initialOrder = initialOrderValues[0] || {};
      const initialSettlement = initialSettlementValues[0] || {};
      const initialTraceFields = ['purchaseCategory', 'itemName', 'specification', 'unit', 'verificationQuantity', 'taxIncludedUnitPrice', 'taxRate', 'unitPrice', 'taxAmount', 'taxExcludedAmount', 'taxIncludedAmount', 'purchaseOrderNo', 'purchaseOrderLineNo', 'purchaseReceiptNo', 'purchaseReceiptLineNo'];
      if (initialOrderValues.length !== 1 || initialSettlementValues.length !== 1 || initialTraceFields.some((field) => String(initialOrder[field] ?? '') !== String(initialSettlement[field] ?? '')) || initialOrder.serviceSettlementNo || initialSettlement.serviceSettlementNo || await invoiceAmount.inputValue() !== '68000.00' || await verificationTotal.inputValue() !== '68000.00') errors.push(`${item.code}: initial detail samples must use one consistent physical-procurement order/receipt chain totaling 68000`);
      await invoiceNature.selectOption('红字');
      await invoiceNature.dispatchEvent('change');
      await invoiceAmount.fill('1234.56');
      await invoiceAmount.dispatchEvent('change');
      if (await invoiceAmount.inputValue() !== '-1234.56') errors.push(`${item.code}: red invoice positive input must normalize to a negative amount`);
      await invoiceAmount.fill('-88.25');
      await invoiceAmount.dispatchEvent('change');
      if (await invoiceAmount.inputValue() !== '-88.25') errors.push(`${item.code}: red invoice negative input must remain negative`);
      await invoiceNature.selectOption('蓝字');
      await invoiceNature.dispatchEvent('change');
      if (await invoiceAmount.inputValue() !== '88.25') errors.push(`${item.code}: switching back to blue must normalize the amount to positive`);
      if (await verificationTotal.count() !== 1 || await verificationTotal.getAttribute('data-precision') !== '2' || await detail.locator('[data-field="verificationTotalAmount"]:not([readonly])').count()) errors.push(`${item.code}: verification total amount must be readonly with two-decimal precision`);
      if (await detail.locator('[data-tab="invoice-info"], [data-tab="allocations"], [data-tab="attachments"]').count()) errors.push(`${item.code}: legacy invoice-info, allocation and attachment tabs must remain removed`);

      const editableTableAlignment = await detail.locator('[data-component="EditableTable"][data-data-source="orderItems"], [data-component="EditableTable"][data-data-source="settlementItems"]').evaluateAll((tables) => tables.map((table) => {
        const title = table.querySelector(':scope > .pro-section-header .section-title');
        const toolbar = table.querySelector(':scope > .pro-table-toolbar');
        const firstAction = toolbar?.querySelector('.pro-table-actions .btn');
        const titleRect = title?.getBoundingClientRect();
        const toolbarRect = toolbar?.getBoundingClientRect();
        const actionRect = firstAction?.getBoundingClientRect();
        return {
          source: table.dataset.dataSource,
          leftDelta: titleRect && actionRect ? Math.abs(titleRect.left - actionRect.left) : 999,
          centerDelta: toolbarRect && actionRect ? Math.abs((toolbarRect.top + toolbarRect.height / 2) - (actionRect.top + actionRect.height / 2)) : 999
        };
      }));
      for (const alignment of editableTableAlignment) {
        if (alignment.leftDelta > 1) errors.push(`${item.code}: ${alignment.source} title and first toolbar action are not left-aligned; delta=${alignment.leftDelta}`);
        if (alignment.centerDelta > 1) errors.push(`${item.code}: ${alignment.source} toolbar action is not vertically centered; delta=${alignment.centerDelta}`);
      }
      if (!await orderItems.isVisible() || !await settlementItems.isVisible()) errors.push(`${item.code}: order and settlement detail tables must render below basic information`);
      const detailTableTitles = await detail.locator('#purchase-invoice-order-items .section-title, #purchase-invoice-settlement-items .section-title').allTextContents();
      if (detailTableTitles.map((value) => value.trim()).join(',') !== '订单行,收票结算行') errors.push(`${item.code}: detail table titles must use 订单行、收票结算行`);
      const detailBatchDeleteLabels = await detail.locator('#purchase-invoice-order-items [data-act="batch-delete"], #purchase-invoice-settlement-items [data-act="batch-delete"]').allTextContents();
      if (detailBatchDeleteLabels.map((value) => value.trim()).join(',') !== '删除选中明细,删除选中明细') errors.push(`${item.code}: batch delete labels must both use 删除选中明细`);
      const detailSections = await detail.locator('[data-tab-panel="basic"] > [data-component]').evaluateAll((nodes) => nodes.map((node) => node.dataset.dataSource || node.dataset.component));
      if (JSON.stringify(detailSections) !== JSON.stringify(['DetailForm', 'orderItems', 'settlementItems'])) errors.push(`${item.code}: basic information, order items and settlement items are in the wrong order: ${detailSections.join(', ')}`);
      const orderHeaders = (await orderItems.locator('thead th').allTextContents()).map((value) => value.trim()).filter((value) => value && value !== '操作');
      const expectedOrderHeaders = ['序号', '物资类型', '物资名称', '规格', '单位', '验票数量', '暂估单价', '含税单价', '价税合计', '税率', '不含税单价', '税额', '不含税金额', '采购订单', '订单行', '采购入库单（蓝字）', '入库行', '服务结算单（蓝字）', '结算行'];
      if (JSON.stringify(orderHeaders) !== JSON.stringify(expectedOrderHeaders)) errors.push(`${item.code}: order detail columns are incorrect: ${orderHeaders.join(', ')}`);
      const settlementHeaders = (await settlementItems.locator('thead th').allTextContents()).map((value) => value.trim()).filter((value) => value && value !== '操作');
      const expectedSettlementHeaders = ['序号', '物资类型', '物资名称', '规格', '单位', '验票数量', '含税单价', '价税合计', '税率', '不含税单价', '税额', '不含税金额', '采购订单', '订单行', '采购入库单', '入库行', '服务结算单', '结算行'];
      if (JSON.stringify(settlementHeaders) !== JSON.stringify(expectedSettlementHeaders)) errors.push(`${item.code}: settlement detail columns are incorrect: ${settlementHeaders.join(', ')}`);
      for (const detailTable of [orderItems, settlementItems]) {
        const footerCodes = await detailTable.locator('tfoot [data-footer-summary-column]').evaluateAll((cells) => cells.map((cell) => cell.dataset.footerSummaryColumn));
        if (JSON.stringify(footerCodes) !== JSON.stringify(['verificationQuantity', 'taxIncludedAmount', 'taxAmount', 'taxExcludedAmount']) || (await detailTable.locator('tfoot .pro-table-total-label').textContent()).trim() !== '合计') errors.push(`${item.code}: ${await detailTable.getAttribute('data-data-source')} must total quantity and the three amount columns`);
      }
      if (await orderItems.locator('tbody tr[data-row-value]').count() || await settlementItems.locator('tbody tr[data-row-value]').count() || await verificationTotal.inputValue() !== '') errors.push(`${item.code}: switching invoice type must clear both source tables and the settlement total; actual=${await verificationTotal.inputValue()}`);
      if (await detail.locator('[data-field="redReason"], [data-field="originalInvoiceNo"], [data-target="original-invoice-picker"]').count()) errors.push(`${item.code}: later red-invoice original-blue-invoice design must remain rolled back`);

      const blueOrderButton = detail.locator('[data-target="purchase-order-line-picker"]');
      const redReceiptButton = detail.locator('[data-target="blue-receipt-line-picker"]');
      const settlementReceiptButton = detail.locator('[data-target="purchase-receipt-line-picker"]');
      if (!await blueOrderButton.isVisible() || (await blueOrderButton.textContent()).trim() !== '选择采购订单') errors.push(`${item.code}: blue invoice must show 选择采购订单`);
      if (await redReceiptButton.isVisible()) errors.push(`${item.code}: blue invoice must hide 选择蓝字入库/服务结算`);
      if (!await settlementReceiptButton.isVisible() || (await settlementReceiptButton.textContent()).trim() !== '选择采购入库/服务结算') errors.push(`${item.code}: settlement picker button must always be 选择采购入库/服务结算`);

      await blueOrderButton.click();
      const orderPicker = page.locator('[data-overlay="purchase-order-line-picker"]');
      if (await orderPicker.locator('.pro-table-footer, .pagination, [data-act="page-prev"], [data-act="page-next"], [data-act="page-goto"]').count()) errors.push(`${item.code}: purchase-order picker must not paginate`);
      const orderSearch = orderPicker.locator('[data-component="ProSearchForm"]');
      const orderSearchLabels = (await orderSearch.locator('.form-label').allTextContents()).map((value) => value.trim());
      if (JSON.stringify(orderSearchLabels) !== JSON.stringify(['订单日期', '业务类型', '物资类型', '物资名称', '采购订单'])) errors.push(`${item.code}: purchase-order picker query fields are incorrect: ${orderSearchLabels.join(', ')}`);
      if (await orderSearch.locator('[data-field="orderDateQueryStart"][data-range-bound="start"][type="date"]').count() !== 1 || await orderSearch.locator('[data-field="orderDateQueryEnd"][data-range-bound="end"][type="date"]').count() !== 1 || await orderSearch.locator('select[data-field="orderCategoryQuery"]').count() !== 1) errors.push(`${item.code}: purchase-order date-range/category query controls are incorrect`);
      const orderCategoryOptions = (await orderSearch.locator('[data-field="orderCategoryQuery"] option').allTextContents()).map((value) => value.trim()).filter((value) => value !== '请选择');
      if (JSON.stringify(orderCategoryOptions) !== JSON.stringify(['办公用品', '服务采购', '固定资产', '原材料'])) errors.push(`${item.code}: purchase-order category options are incorrect`);
      await orderSearch.locator('[data-field="businessTypeQuery"]').selectOption('实物采购');
      await orderSearch.locator('[data-act="query"]').click();
      const physicalOrderValues = await orderPicker.locator('tbody tr[data-row-value]:visible').evaluateAll((rows) => rows.map((row) => JSON.parse(row.dataset.rowValue || '{}')));
      if (!physicalOrderValues.length || physicalOrderValues.some((row) => row.businessType !== '实物采购')) errors.push(`${item.code}: purchase-order business-type query did not filter physical procurement rows`);
      await orderSearch.locator('[data-act="reset"]').click();
      await orderSearch.locator('[data-field="orderDateQueryStart"]').fill('2026-08-18');
      await orderSearch.locator('[data-field="orderDateQueryEnd"]').fill('2026-08-18');
      await orderSearch.locator('[data-field="orderNoQuery"]').fill('PO20260818003');
      await orderSearch.locator('[data-act="query"]').click();
      if (await orderPicker.locator('tbody tr[data-row-value]:visible').count() !== 1 || !await orderPicker.locator('tbody tr[data-row-value]:visible').first().innerText().then((text) => text.includes('PO20260818003'))) errors.push(`${item.code}: purchase-order number query did not filter correctly`);
      await orderSearch.locator('[data-act="reset"]').click();
      const orderPickerHeaders = (await orderPicker.locator('thead th').allTextContents()).map((value) => value.trim()).filter(Boolean);
      const expectedOrderPickerHeaders = ['订单日期', '业务类型', '物资类型', '物资名称', '订单数量', '已入库/结算数量', '已验票数量', '采购订单', '订单行'];
      if (JSON.stringify(orderPickerHeaders) !== JSON.stringify(expectedOrderPickerHeaders)) errors.push(`${item.code}: purchase-order picker columns are incorrect: ${orderPickerHeaders.join(', ')}`);
      const orderConfirm = orderPicker.locator('[data-act="confirm-order-lines"]');
      if (!await orderConfirm.isDisabled()) errors.push(`${item.code}: purchase-order picker confirmation must be disabled before selection`);
      await orderPicker.locator('tbody tr[data-row-value]').filter({ hasText: 'PO20260818003' }).locator('[data-row-select]').check();
      if (await orderConfirm.isDisabled()) errors.push(`${item.code}: purchase-order picker confirmation did not enable after selection`);
      await orderConfirm.click();
      const addedOrderRow = orderItems.locator('tbody tr[data-row-value]').filter({ hasText: 'PO20260818003' });
      if (await addedOrderRow.count() !== 1) errors.push(`${item.code}: selected purchase-order line was not appended to order items`);
      const addedOrderVerificationCell = addedOrderRow.locator('[data-column="verificationQuantity"]');
      if (await addedOrderVerificationCell.locator('[data-field]').count() || (await addedOrderVerificationCell.textContent()).trim() !== '') errors.push(`${item.code}: order verification quantity must stay empty before settlement selection`);
      if (Number((await addedOrderRow.locator('[data-column="taxRate"]').textContent()).trim()) !== 13) errors.push(`${item.code}: selected purchase-order line must immediately carry its order tax rate`);
      if (await orderItems.locator('th.required').filter({ hasText: '验票数量' }).count()) errors.push(`${item.code}: order verification quantity must not be required`);
      if (await verificationTotal.inputValue() !== '0.00') errors.push(`${item.code}: verification total must default from the currently blank order-row amount; actual=${await verificationTotal.inputValue()}`);

      await invoiceNature.selectOption('红字');
      await invoiceNature.dispatchEvent('change');
      if (await blueOrderButton.isVisible() || !await redReceiptButton.isVisible() || (await redReceiptButton.textContent()).trim() !== '选择蓝字入库/服务结算') errors.push(`${item.code}: red invoice order source button is incorrect`);
      if (!await settlementReceiptButton.isVisible() || (await settlementReceiptButton.textContent()).trim() !== '选择采购入库/服务结算') errors.push(`${item.code}: settlement picker button changed with invoice type`);
      if (await orderItems.locator('tbody tr[data-row-value]').count() || await settlementItems.locator('tbody tr[data-row-value]').count()) errors.push(`${item.code}: switching to red must clear both upstream and settlement rows`);
      await redReceiptButton.click();
      const blueReceiptPicker = page.locator('[data-overlay="blue-receipt-line-picker"]');
      if (await blueReceiptPicker.locator('.pro-table-footer, .pagination, [data-act="page-prev"], [data-act="page-next"], [data-act="page-goto"]').count()) errors.push(`${item.code}: blue-receipt picker must not paginate`);
      const blueReceiptSearch = blueReceiptPicker.locator('[data-component="ProSearchForm"]');
      const blueReceiptSearchLabels = (await blueReceiptSearch.locator('.form-label').allTextContents()).map((value) => value.trim());
      if (JSON.stringify(blueReceiptSearchLabels) !== JSON.stringify(['入库/结算日期', '物资类型', '物资名称', '采购订单', '采购入库单', '服务结算单'])) errors.push(`${item.code}: blue-receipt picker query fields are incorrect: ${blueReceiptSearchLabels.join(', ')}`);
      if (await blueReceiptSearch.locator('[data-field="blueReceiptDateQueryStart"][data-range-bound="start"][type="date"]').count() !== 1 || await blueReceiptSearch.locator('[data-field="blueReceiptDateQueryEnd"][data-range-bound="end"][type="date"]').count() !== 1 || await blueReceiptSearch.locator('select[data-field="blueReceiptCategoryQuery"]').count() !== 1) errors.push(`${item.code}: blue-receipt date-range/category query controls are incorrect`);
      await blueReceiptSearch.locator('[data-field="blueReceiptDateQueryStart"]').fill('2026-08-24');
      await blueReceiptSearch.locator('[data-field="blueReceiptDateQueryEnd"]').fill('2026-08-24');
      await blueReceiptSearch.locator('[data-field="blueReceiptNoQuery"]').fill('GR2026082503');
      await blueReceiptSearch.locator('[data-act="query"]').click();
      if (await blueReceiptPicker.locator('tbody tr[data-row-value]:visible').count() !== 1 || !await blueReceiptPicker.locator('tbody tr[data-row-value]:visible').first().innerText().then((text) => text.includes('GR2026082503'))) errors.push(`${item.code}: blue-receipt number query did not filter correctly`);
      await blueReceiptSearch.locator('[data-act="reset"]').click();
      await page.screenshot({ path: path.join(reportDir, 'purchase-invoice-blue-receipt-picker.png'), fullPage: true });
      const blueReceiptHeaders = (await blueReceiptPicker.locator('thead th').allTextContents()).map((value) => value.trim()).filter(Boolean);
      const expectedBlueReceiptHeaders = ['入库/结算日期', '类型', '物资类型', '物资名称', '已退货/结算数量', '已退货/结算验票数量', '采购订单', '订单行', '采购入库单', '入库行', '服务结算单', '结算行'];
      if (JSON.stringify(blueReceiptHeaders) !== JSON.stringify(expectedBlueReceiptHeaders)) errors.push(`${item.code}: blue-receipt picker columns are incorrect: ${blueReceiptHeaders.join(', ')}`);
      const blueReceiptTypeValues = (await blueReceiptPicker.locator('tbody tr[data-row-value]:visible [data-column="receiptNature"]').allTextContents()).map((value) => value.trim());
      if (!blueReceiptTypeValues.length || blueReceiptTypeValues.some((value) => value !== '蓝字') || await blueReceiptPicker.locator('[data-column="sourceType"]').count()) errors.push(`${item.code}: blue-receipt picker type must use blue/red document nature instead of source business type`);
      const blueReceiptConfirm = blueReceiptPicker.locator('[data-act="confirm-blue-receipt-lines"]');
      if (!await blueReceiptConfirm.isDisabled()) errors.push(`${item.code}: blue-receipt picker confirmation must be disabled before selection`);
      await blueReceiptPicker.locator('tbody tr[data-row-value]:visible').filter({ hasText: 'GR2026082503' }).locator('[data-row-select]').check();
      if (await blueReceiptConfirm.isDisabled()) errors.push(`${item.code}: blue-receipt picker confirmation did not enable after selection`);
      await blueReceiptConfirm.click();
      const addedBlueReceiptRow = orderItems.locator('tbody tr[data-row-value]').filter({ hasText: 'GR2026082503' });
      if (await addedBlueReceiptRow.count() !== 1) errors.push(`${item.code}: selected blue-receipt line was not appended to order items`);
      await invoiceNature.selectOption('蓝字');
      await invoiceNature.dispatchEvent('change');
      if (!await blueOrderButton.isVisible() || await redReceiptButton.isVisible() || await orderItems.locator('tbody tr[data-row-value]').count()) errors.push(`${item.code}: switching back to blue did not restore the order source contract`);

      await blueOrderButton.click();
      await orderPicker.locator('tbody tr[data-row-value]').filter({ hasText: 'PO20260815002' }).locator('[data-row-select]').check();
      await orderConfirm.click();
      const derivedOrderRow = orderItems.locator('tbody tr[data-row-value]').filter({ hasText: 'PO20260815002' });
      if ((await derivedOrderRow.locator('[data-column="verificationQuantity"]').textContent()).trim() !== '') errors.push(`${item.code}: unmatched order verification quantity must start empty`);

      await settlementReceiptButton.click();
      const receiptPicker = page.locator('[data-overlay="purchase-receipt-line-picker"]');
      if (await receiptPicker.locator('.pro-table-footer, .pagination, [data-act="page-prev"], [data-act="page-next"], [data-act="page-goto"]').count()) errors.push(`${item.code}: purchase-receipt picker must not paginate`);
      const receiptSearch = receiptPicker.locator('[data-component="ProSearchForm"]');
      const receiptSearchLabels = (await receiptSearch.locator('.form-label').allTextContents()).map((value) => value.trim());
      if (JSON.stringify(receiptSearchLabels) !== JSON.stringify(['入库日期', '物资类型', '物资名称', '采购订单', '采购入库单'])) errors.push(`${item.code}: purchase-receipt picker query fields are incorrect: ${receiptSearchLabels.join(', ')}`);
      if (await receiptSearch.locator('[data-field="receiptDateQueryStart"][data-range-bound="start"][type="date"]').count() !== 1 || await receiptSearch.locator('[data-field="receiptDateQueryEnd"][data-range-bound="end"][type="date"]').count() !== 1 || await receiptSearch.locator('select[data-field="receiptCategoryQuery"]').count() !== 1) errors.push(`${item.code}: purchase-receipt date-range/category query controls are incorrect`);
      await receiptSearch.locator('[data-field="receiptDateQueryStart"]').fill('2026-08-21');
      await receiptSearch.locator('[data-field="receiptDateQueryEnd"]').fill('2026-08-21');
      await receiptSearch.locator('[data-field="receiptNoQuery"]').fill('GR2026082506');
      await receiptSearch.locator('[data-act="query"]').click();
      if (await receiptPicker.locator('tbody tr[data-row-value]:visible').count() !== 1 || !await receiptPicker.locator('tbody tr[data-row-value]:visible').first().innerText().then((text) => text.includes('GR2026082506'))) errors.push(`${item.code}: purchase-receipt number query did not filter correctly`);
      await receiptSearch.locator('[data-act="reset"]').click();
      const receiptPickerHeaders = (await receiptPicker.locator('thead th').allTextContents()).map((value) => value.trim()).filter(Boolean);
      const expectedReceiptPickerHeaders = ['入库/结算日期', '类型', '物资类型', '物资名称', '已入库/结算数量', '已验票数量', '采购订单', '订单行', '采购入库单', '入库行', '服务结算单', '结算行'];
      if (JSON.stringify(receiptPickerHeaders) !== JSON.stringify(expectedReceiptPickerHeaders)) errors.push(`${item.code}: purchase-receipt picker columns are incorrect: ${receiptPickerHeaders.join(', ')}`);
      if (await receiptPicker.locator('tbody tr[data-row-value]:visible [data-column="receiptNature"]').first().innerText() !== '蓝字' || await receiptPicker.locator('[data-column="sourceType"]').count()) errors.push(`${item.code}: purchase-receipt picker type must use blue/red document nature instead of source business type`);
      const receiptConfirm = receiptPicker.locator('[data-act="confirm-receipt-lines"]');
      if (!await receiptConfirm.isDisabled()) errors.push(`${item.code}: purchase-receipt picker confirmation must be disabled before selection`);
      await receiptPicker.locator('tbody tr[data-row-value]').filter({ hasText: 'GR2026082506' }).locator('[data-row-select]').check();
      if (await receiptConfirm.isDisabled()) errors.push(`${item.code}: purchase-receipt picker confirmation did not enable after selection`);
      await receiptConfirm.click();
      const addedReceiptRow = settlementItems.locator('tbody tr[data-row-value]').filter({ hasText: 'GR2026082506' });
      if (await addedReceiptRow.count() !== 1) errors.push(`${item.code}: selected purchase-receipt line was not appended to settlement items`);
      if ((await derivedOrderRow.locator('[data-column="verificationQuantity"]').textContent()).trim() !== '1.50') errors.push(`${item.code}: settlement selection did not update the matching order verification quantity`);
      const initialOrderRollup = await derivedOrderRow.locator('[data-column="taxIncludedUnitPrice"], [data-column="taxIncludedAmount"], [data-column="taxRate"], [data-column="unitPrice"], [data-column="taxAmount"], [data-column="taxExcludedAmount"]').allTextContents();
      if (initialOrderRollup.map((value) => value.trim()).join(',') !== '12500.00,18750.00,13,11061.95,2157.07,16592.93') errors.push(`${item.code}: order row did not preserve order tax rate while deriving price and summed amounts from settlement rows: ${initialOrderRollup.join(',')}`);
      if (await verificationTotal.inputValue() !== '18750.00') errors.push(`${item.code}: purchase-receipt selection did not refresh the order-row verification total; actual=${await verificationTotal.inputValue()}`);

      const settlementInputs = {
        quantity: addedReceiptRow.locator('[data-field="verificationQuantity"]'),
        unitPrice: addedReceiptRow.locator('[data-field="taxIncludedUnitPrice"]'),
        total: addedReceiptRow.locator('[data-field="taxIncludedAmount"]'),
        tax: addedReceiptRow.locator('[data-field="taxAmount"]'),
        taxExcluded: addedReceiptRow.locator('[data-field="taxExcludedAmount"]')
      };
      if ((await Promise.all(Object.values(settlementInputs).map((field) => field.count()))).some((count) => count !== 1)) errors.push(`${item.code}: all five settlement amount fields must be editable after receipt selection`);
      if (Number(await settlementInputs.quantity.inputValue()) !== 1.5 || Number(await settlementInputs.unitPrice.inputValue()) !== 12500 || Number(await settlementInputs.total.inputValue()) !== 18750 || Number(await settlementInputs.tax.inputValue()) !== 2157.07 || Number(await settlementInputs.taxExcluded.inputValue()) !== 16592.93) errors.push(`${item.code}: receipt selection did not auto-fill the five settlement fields`);
      if (await settlementInputs.quantity.getAttribute('min') !== '0' || await settlementInputs.quantity.getAttribute('max') !== '1.5') errors.push(`${item.code}: verification quantity must be limited from zero to its default remaining quantity`);
      await settlementInputs.quantity.fill('1');
      if (await settlementInputs.total.inputValue() !== '12500.00' || await settlementInputs.tax.inputValue() !== '1438.05' || await settlementInputs.taxExcluded.inputValue() !== '11061.95' || await verificationTotal.inputValue() !== '12500.00') errors.push(`${item.code}: changing verification quantity did not recalculate settlement amounts forward`);
      if ((await derivedOrderRow.locator('[data-column="verificationQuantity"]').textContent()).trim() !== '1.00' || (await derivedOrderRow.locator('[data-column="taxIncludedAmount"]').textContent()).trim() !== '12500.00') errors.push(`${item.code}: order row did not roll up the adjusted settlement quantity and amount`);
      await settlementInputs.unitPrice.fill('12000');
      if (await settlementInputs.total.inputValue() !== '12000.00' || await settlementInputs.tax.inputValue() !== '1380.53' || await settlementInputs.taxExcluded.inputValue() !== '10619.47' || await verificationTotal.inputValue() !== '12000.00') errors.push(`${item.code}: changing tax-included unit price did not recalculate settlement amounts forward`);
      await settlementInputs.total.fill('11000');
      await settlementInputs.tax.fill('1000');
      await settlementInputs.taxExcluded.fill('10000');
      if (Number(await settlementInputs.quantity.inputValue()) !== 1 || Number(await settlementInputs.unitPrice.inputValue()) !== 12000 || Number(await settlementInputs.total.inputValue()) !== 11000 || Number(await settlementInputs.tax.inputValue()) !== 1000 || Number(await settlementInputs.taxExcluded.inputValue()) !== 10000) errors.push(`${item.code}: manual amount adjustments must not reverse-calculate quantity or tax-included unit price`);
      if ((await derivedOrderRow.locator('[data-column="taxIncludedUnitPrice"]').textContent()).trim() !== '12000.00' || (await derivedOrderRow.locator('[data-column="taxIncludedAmount"]').textContent()).trim() !== '11000.00' || (await derivedOrderRow.locator('[data-column="taxAmount"]').textContent()).trim() !== '1000.00' || (await derivedOrderRow.locator('[data-column="taxExcludedAmount"]').textContent()).trim() !== '10000.00') errors.push(`${item.code}: order row did not reflect manually adjusted settlement prices and amounts`);
      for (const detailTable of [orderItems, settlementItems]) {
        const totals = await detailTable.locator('tfoot [data-footer-summary-column]').allTextContents();
        if (totals.map((value) => value.trim()).join(',') !== '1.00,11,000.00,1,000.00,10,000.00') errors.push(`${item.code}: ${await detailTable.getAttribute('data-data-source')} footer totals did not refresh from adjusted rows: ${totals.join(',')}`);
      }
      await derivedOrderRow.locator('[data-act="remove-row"]').click();
      await page.locator('[data-delete-confirm] [data-act="confirm-delete"]').click();
      if (await settlementItems.locator('tbody tr[data-row-value]').count() || await verificationTotal.inputValue() !== '') errors.push(`${item.code}: deleting the upstream source must remove unsupported settlement rows and clear the total`);

      await detail.locator('[data-target="supplier-picker"]').click();
      const supplierPicker = page.locator('[data-overlay="supplier-picker"]');
      if (!await supplierPicker.isVisible() || await supplierPicker.locator('[data-page-size="5"]').count() !== 1) errors.push(`${item.code}: standard supplier picker is incomplete`);
      await supplierPicker.locator('[data-act="close"]').first().click();

      await detail.locator('[data-target="supplier-picker"]').click();
      await supplierPicker.locator('tbody tr[data-row-value]').filter({ hasText: '北京清源自动化有限公司' }).locator('[data-row-select]').check();
      await supplierPicker.locator('[data-act="confirm-supplier"]').click();
      const projectOptions = (await projectName.locator('option').allTextContents()).filter((value) => value && value !== '请选择');
      if (JSON.stringify(projectOptions) !== JSON.stringify(['北湖污水厂应急维护项目'])) errors.push(`${item.code}: project options did not cascade from supplier`);
      await projectName.selectOption('北湖污水厂应急维护项目');
      await projectName.dispatchEvent('change');
      if (await contractName.inputValue() !== '无' || JSON.stringify((await contractName.locator('option').allTextContents()).filter((value) => value && value !== '请选择')) !== JSON.stringify(['无'])) errors.push(`${item.code}: project without contracts must display 无`);
      if (await detail.locator('[data-field="projectCode"]').inputValue() !== 'PRJ202608031') errors.push(`${item.code}: cascaded project code was not synchronized`);

      await detail.locator('[data-act="back-list"]').click();
      await list.locator('[data-act="create"]').click();
      const expectedToday = await page.evaluate(() => { const now = new Date(); const pad = (value) => String(value).padStart(2, '0'); return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`; });
      if (await detail.locator('[data-field="receiptDate"]').inputValue() !== expectedToday) errors.push(`${item.code}: create mode receipt date did not default to today`);
      if (await detail.locator('[data-field="invoiceNature"]').inputValue() !== '') errors.push(`${item.code}: create mode invoice type must remain unselected`);
      if (await projectName.isDisabled()) errors.push(`${item.code}: project must stay editable before supplier selection`);
      const createProjectOptions = (await projectName.locator('option').allTextContents()).filter((value) => value && value !== '请选择');
      if (JSON.stringify(createProjectOptions) !== JSON.stringify(['沙河市污水厂智能化改造项目', '南湖污水厂提标改造项目', '东湖水环境运营提升项目', '德清污水厂节能优化项目', '临港污水处理厂设备更新项目', '滨江污水厂数字化项目', '北湖污水厂应急维护项目'])) errors.push(`${item.code}: project must expose all order projects before supplier selection`);
      if (await hasContract.isChecked() || !(await contractName.isDisabled()) || await contractName.evaluate((field) => field.hasAttribute('required'))) errors.push(`${item.code}: create mode must require checking has-contract before contract selection`);
      if (!await detail.locator('[data-target="purchase-order-line-picker"]').isVisible() || await detail.locator('[data-target="blue-receipt-line-picker"]').isVisible()) errors.push(`${item.code}: create mode without invoice type must default to 选择采购订单`);
      const createOrderButton = detail.locator('[data-target="purchase-order-line-picker"]');
      const createReceiptButton = detail.locator('[data-target="purchase-receipt-line-picker"]');
      if (await createOrderButton.isDisabled() || await createReceiptButton.isDisabled()) errors.push(`${item.code}: source picker buttons must remain enabled before supplier, contract and project selection`);
      await createOrderButton.click();
      if (!await orderPicker.isVisible() || await orderPicker.locator('tbody tr[data-row-value]:visible').count() !== 0) errors.push(`${item.code}: purchase-order picker must stay empty before supplier and project are selected`);
      await page.screenshot({ path: path.join(reportDir, 'purchase-invoice-create-order-picker-samples.png'), fullPage: true });
      await orderPicker.locator('[data-act="close"]').first().click();
      await createReceiptButton.click();
      if (!await receiptPicker.isVisible() || await receiptPicker.locator('tbody tr[data-row-value]:visible').count() !== 0 || !await receiptPicker.locator('[data-act="confirm-receipt-lines"]').isDisabled()) errors.push(`${item.code}: purchase-receipt picker must be empty before an upstream order or blue receipt is selected`);
      await receiptPicker.locator('[data-act="close"]').first().click();

      await detail.locator('[data-target="supplier-picker"]').click();
      await supplierPicker.locator('tbody tr[data-row-value]').filter({ hasText: '武汉云帆科技有限公司' }).locator('[data-row-select]').check();
      await supplierPicker.locator('[data-act="confirm-supplier"]').click();
      await projectName.selectOption('东湖水环境运营提升项目');
      await projectName.dispatchEvent('change');
      await createOrderButton.click();
      const noContractOrderRows = orderPicker.locator('tbody tr[data-row-value][data-context-match="true"]');
      if (await noContractOrderRows.count() !== 6 || !await noContractOrderRows.filter({ hasText: 'PO20260818003' }).count() || !await noContractOrderRows.filter({ hasText: 'PO20260820006' }).count()) errors.push(`${item.code}: unchecked has-contract must filter purchase orders by supplier and project only`);
      await orderPicker.locator('[data-act="close"]').first().click();
      await hasContract.check();
      await hasContract.dispatchEvent('change');
      await contractName.selectOption('智能加药系统采购合同');
      await contractName.dispatchEvent('change');

      await createOrderButton.click();
      const smartDosingOrderRows = orderPicker.locator('tbody tr[data-row-value]:visible');
      if (await smartDosingOrderRows.count() !== 3 || !await smartDosingOrderRows.filter({ hasText: 'PO20260820006' }).count() || !await smartDosingOrderRows.filter({ hasText: 'PO20260821002' }).count() || !await smartDosingOrderRows.filter({ hasText: 'PO20260822005' }).count()) errors.push(`${item.code}: purchase-order picker sample data does not match the smart-dosing cascade`);
      if (await smartDosingOrderRows.filter({ hasText: 'PO20260820007' }).count() || await smartDosingOrderRows.filter({ hasText: 'PO20260820008' }).count()) errors.push(`${item.code}: purchase-order picker must hide zero-receipt and fully-invoiced order lines`);
      const smartDosingOrderValues = await smartDosingOrderRows.evaluateAll((rows) => rows.map((row) => JSON.parse(row.dataset.rowValue || '{}')));
      if (smartDosingOrderValues.some((row) => Number(row.invoicedQuantity) >= Number(row.receivedQuantity))) errors.push(`${item.code}: purchase-order picker exposed an order line whose invoiced quantity reached its received quantity`);
      await orderPicker.locator('[data-act="close"]').first().click();

      await hasContract.uncheck();
      await hasContract.dispatchEvent('change');
      await invoiceNature.selectOption('红字');
      await invoiceNature.dispatchEvent('change');
      await redReceiptButton.click();
      const noContractBlueReceiptRows = blueReceiptPicker.locator('tbody tr[data-row-value][data-context-match="true"]');
      if (await noContractBlueReceiptRows.count() !== 4 || !await noContractBlueReceiptRows.filter({ hasText: 'GR2026082503' }).count() || !await noContractBlueReceiptRows.filter({ hasText: 'SS20260823001' }).count()) errors.push(`${item.code}: unchecked has-contract must filter blue receipt/service-settlement sources by supplier and project only`);
      await blueReceiptPicker.locator('[data-act="close"]').first().click();
      await hasContract.check();
      await hasContract.dispatchEvent('change');
      await contractName.selectOption('智能加药系统采购合同');
      await contractName.dispatchEvent('change');
      await redReceiptButton.click();
      await blueReceiptSearch.locator('[data-field="blueServiceSettlementNoQuery"]').fill('SS20260823001');
      await blueReceiptSearch.locator('[data-act="query"]').click();
      if (await blueReceiptPicker.locator('tbody tr[data-row-value]:visible').count() !== 1 || !await blueReceiptPicker.locator('tbody tr[data-row-value]:visible').first().innerText().then((text) => text.includes('SS20260823001'))) errors.push(`${item.code}: service-settlement query did not filter the red upstream picker`);
      await blueReceiptSearch.locator('[data-act="reset"]').click();
      const smartDosingBlueReceiptRows = blueReceiptPicker.locator('tbody tr[data-row-value]:visible');
      if (await smartDosingBlueReceiptRows.count() !== 3 || !await smartDosingBlueReceiptRows.filter({ hasText: 'SS20260823001' }).count() || !await smartDosingBlueReceiptRows.filter({ hasText: 'GR2026082601' }).count() || !await smartDosingBlueReceiptRows.filter({ hasText: 'GR2026082703' }).count()) errors.push(`${item.code}: blue receipt/service-settlement picker sample data does not match the smart-dosing cascade`);
      if (await smartDosingBlueReceiptRows.filter({ hasText: '红字' }).count()) errors.push(`${item.code}: red-invoice upstream picker must only expose blue receipt lines`);
      const blueReceiptValues = await smartDosingBlueReceiptRows.evaluateAll((rows) => rows.map((row) => JSON.parse(row.dataset.rowValue || '{}')));
      if (blueReceiptValues.some((row) => row.sourceType === '采购入库' && (Number(row.returnedQuantity) > 0 || Number(row.returnedInvoicedQuantity) > 0))) errors.push(`${item.code}: blue purchase-receipt return quantities must be zero or negative`);
      if (await smartDosingBlueReceiptRows.filter({ hasText: 'SS20260829001' }).count() || await smartDosingBlueReceiptRows.filter({ hasText: 'SS20260829002' }).count()) errors.push(`${item.code}: upstream picker must hide zero and fully invoiced sources`);
      if (blueReceiptValues.some((row) => Math.abs(Number(row.returnedQuantity)) <= 0 || Math.abs(Number(row.returnedInvoicedQuantity)) >= Math.abs(Number(row.returnedQuantity)))) errors.push(`${item.code}: blue-receipt picker exposed a receipt line without remaining return-invoice quantity`);
      const blueServiceSource = smartDosingBlueReceiptRows.filter({ hasText: 'SS20260823001' });
      const blueServiceValue = JSON.parse(await blueServiceSource.getAttribute('data-row-value') || '{}');
      if (blueServiceValue.sourceType !== '服务结算' || blueServiceValue.purchaseReceiptNo || !blueServiceValue.serviceSettlementNo) errors.push(`${item.code}: service procurement upstream must only carry service-settlement trace fields`);
      await blueServiceSource.locator('[data-row-select]').check();
      await blueReceiptPicker.locator('[data-act="confirm-blue-receipt-lines"]').click();
      await createReceiptButton.click();
      const redDownstreamReceiptRows = receiptPicker.locator('tbody tr[data-row-value]:visible');
      if (await redDownstreamReceiptRows.count() !== 1 || !await redDownstreamReceiptRows.filter({ hasText: 'SS20260828001' }).count() || await redDownstreamReceiptRows.filter({ hasText: '蓝字' }).count()) errors.push(`${item.code}: red invoice must only expose the downstream red service-settlement line`);
      const redDownstreamValues = await redDownstreamReceiptRows.evaluateAll((rows) => rows.map((row) => JSON.parse(row.dataset.rowValue || '{}')));
      if (redDownstreamValues.some((row) => row.receiptNature !== '红字' || Number(row.receiptQuantity) >= 0 || Number(row.invoicedQuantity) >= 0)) errors.push(`${item.code}: red-invoice receipt quantity and invoiced quantity must both be negative`);
      await redDownstreamReceiptRows.locator('[data-row-select]').check();
      await receiptPicker.locator('[data-act="confirm-receipt-lines"]').click();
      const redServiceSettlementRow = settlementItems.locator('tbody tr[data-row-value]').filter({ hasText: 'SS20260823001' });
      const redSettlementQuantity = redServiceSettlementRow.locator('[data-field="verificationQuantity"]');
      const redOrderRow = orderItems.locator('tbody tr[data-row-value]').filter({ hasText: 'SS20260823001' });
      if (await redSettlementQuantity.inputValue() !== '-0.15' || await redSettlementQuantity.getAttribute('min') !== '-0.15' || await redSettlementQuantity.getAttribute('max') !== '0') errors.push(`${item.code}: red receipt default verification quantity must retain its negative sign and zero-to-default range`);
      if ((await redOrderRow.locator('[data-column="verificationQuantity"]').textContent()).trim() !== '-0.15' || (await redOrderRow.locator('[data-column="taxIncludedAmount"]').textContent()).trim() !== '-2700.00' || await verificationTotal.inputValue() !== '-2700.00') errors.push(`${item.code}: red invoice order row must aggregate by source blue service-settlement and line`);
      const redServiceOrderValue = JSON.parse(await redOrderRow.getAttribute('data-row-value') || '{}');
      const redServiceSettlementValue = JSON.parse(await redServiceSettlementRow.getAttribute('data-row-value') || '{}');
      if ([redServiceOrderValue, redServiceSettlementValue].some((row) => row.purchaseReceiptNo || row.purchaseReceiptLineNo || !row.serviceSettlementNo || !row.serviceSettlementLineNo)) errors.push(`${item.code}: red service procurement rows must only carry the blue service-settlement source`);

      await invoiceNature.selectOption('蓝字');
      await invoiceNature.dispatchEvent('change');
      await invoiceNature.selectOption('红字');
      await invoiceNature.dispatchEvent('change');
      await contractName.selectOption('在线仪表采购合同');
      await contractName.dispatchEvent('change');
      await redReceiptButton.click();
      const bluePhysicalReceiptRow = blueReceiptPicker.locator('tbody tr[data-row-value]:visible').filter({ hasText: 'GR2026082503' });
      await bluePhysicalReceiptRow.locator('[data-row-select]').check();
      await blueReceiptPicker.locator('[data-act="confirm-blue-receipt-lines"]').click();
      await createReceiptButton.click();
      const redPhysicalReceiptRow = receiptPicker.locator('tbody tr[data-row-value]:visible').filter({ hasText: 'RR2026082802' });
      if (await redPhysicalReceiptRow.count() !== 1) errors.push(`${item.code}: red invoice did not expose the downstream red purchase-receipt line`);
      await redPhysicalReceiptRow.locator('[data-row-select]').check();
      await receiptPicker.locator('[data-act="confirm-receipt-lines"]').click();
      const redPhysicalOrderRow = orderItems.locator('tbody tr[data-row-value]').filter({ hasText: 'GR2026082503' });
      const redPhysicalOrderValue = JSON.parse(await redPhysicalOrderRow.getAttribute('data-row-value') || '{}');
      const redPhysicalSettlementRow = settlementItems.locator('tbody tr[data-row-value]').filter({ hasText: 'GR2026082503' });
      const redPhysicalSettlementValue = JSON.parse(await redPhysicalSettlementRow.getAttribute('data-row-value') || '{}');
      if ([redPhysicalOrderValue, redPhysicalSettlementValue].some((row) => !row.purchaseReceiptNo || !row.purchaseReceiptLineNo || row.serviceSettlementNo || row.serviceSettlementLineNo)) errors.push(`${item.code}: red physical procurement rows must only carry the blue purchase-receipt source`);
      if ((await redPhysicalOrderRow.locator('[data-column="verificationQuantity"]').textContent()).trim() !== '-1.00' || (await redPhysicalOrderRow.locator('[data-column="taxIncludedAmount"]').textContent()).trim() !== '-2500.00') errors.push(`${item.code}: red physical procurement did not aggregate by source blue receipt and line`);

      await invoiceNature.selectOption('蓝字');
      await invoiceNature.dispatchEvent('change');
      await contractName.selectOption('智能加药系统采购合同');
      await contractName.dispatchEvent('change');
      await createOrderButton.click();
      await orderPicker.locator('tbody tr[data-row-value]:visible').filter({ hasText: 'PO20260820006' }).locator('[data-row-select]').check();
      await orderPicker.locator('[data-act="confirm-order-lines"]').click();
      await createReceiptButton.click();
      const smartDosingReceiptRows = receiptPicker.locator('tbody tr[data-row-value]:visible');
      if (await smartDosingReceiptRows.count() !== 2 || !await smartDosingReceiptRows.filter({ hasText: 'SS20260823001' }).count() || !await smartDosingReceiptRows.filter({ hasText: 'SS20260828001' }).count()) errors.push(`${item.code}: blue invoice must expose both blue and red service-settlement lines within the selected order scope`);
      if (await smartDosingReceiptRows.filter({ hasText: 'SS20260829001' }).count() || await smartDosingReceiptRows.filter({ hasText: 'SS20260829002' }).count()) errors.push(`${item.code}: source picker must hide zero-quantity and fully-invoiced service-settlement lines`);
      const mixedReceiptValues = await smartDosingReceiptRows.evaluateAll((rows) => rows.map((row) => JSON.parse(row.dataset.rowValue || '{}')));
      if (mixedReceiptValues.some((row) => Math.abs(Number(row.receiptQuantity)) <= 0 || Math.abs(Number(row.invoicedQuantity)) >= Math.abs(Number(row.receiptQuantity)))) errors.push(`${item.code}: purchase-receipt picker exposed a receipt line without remaining invoiceable quantity`);
      const mixedBlueReceipt = mixedReceiptValues.find((row) => row.receiptNature === '蓝字');
      const mixedRedReceipt = mixedReceiptValues.find((row) => row.receiptNature === '红字');
      const mixedReceiptTypeValues = (await smartDosingReceiptRows.locator('[data-column="receiptNature"]').allTextContents()).map((value) => value.trim()).sort();
      if (JSON.stringify(mixedReceiptTypeValues) !== JSON.stringify(['红字', '蓝字'])) errors.push(`${item.code}: purchase-receipt picker must visibly distinguish blue and red document types`);
      if (!mixedBlueReceipt || Number(mixedBlueReceipt.receiptQuantity) <= 0 || Number(mixedBlueReceipt.invoicedQuantity) <= 0) errors.push(`${item.code}: blue-invoice blue receipt quantity and invoiced quantity must both be positive`);
      if (!mixedRedReceipt || Number(mixedRedReceipt.receiptQuantity) >= 0 || Number(mixedRedReceipt.invoicedQuantity) >= 0) errors.push(`${item.code}: blue-invoice red receipt quantity and invoiced quantity must both be negative`);
      await page.screenshot({ path: path.join(reportDir, 'purchase-invoice-create-source-samples.png'), fullPage: true });
      for (const checkbox of await smartDosingReceiptRows.locator('[data-row-select]').all()) await checkbox.check();
      await receiptPicker.locator('[data-act="confirm-receipt-lines"]').click();
      const blueSettlementQuantity = settlementItems.locator('tbody tr[data-row-value]').filter({ hasText: 'SS20260823001' }).first().locator('[data-field="verificationQuantity"]');
      const blueReturnSettlementQuantity = settlementItems.locator('tbody tr[data-row-value]').filter({ hasText: 'SS20260823001' }).last().locator('[data-field="verificationQuantity"]');
      if (Number(await blueSettlementQuantity.inputValue()) <= 0 || Number(await blueReturnSettlementQuantity.inputValue()) >= 0) errors.push(`${item.code}: blue invoice must keep blue receipt quantity positive and red receipt quantity negative`);
      const smartOrderRow = orderItems.locator('tbody tr[data-row-value]').filter({ hasText: 'PO20260820006' });
      if ((await smartOrderRow.locator('[data-column="verificationQuantity"]').textContent()).trim() !== '0.60' || (await smartOrderRow.locator('[data-column="taxIncludedAmount"]').textContent()).trim() !== '10800.00') errors.push(`${item.code}: mixed blue/red receipt quantities and amounts did not net into the purchase-order row`);
      for (const detailTable of [orderItems, settlementItems]) {
        const mixedTotals = await detailTable.locator('tfoot [data-footer-summary-column]').allTextContents();
        if (mixedTotals.map((value) => value.trim()).join(',') !== '0.60,10,800.00,611.32,10,188.68') errors.push(`${item.code}: ${await detailTable.getAttribute('data-data-source')} mixed blue/red footer totals are incorrect: ${mixedTotals.join(',')}`);
      }
      await page.evaluate(() => {
        window.__lastPurchaseInvoiceRuleMessage = '';
        const originalMessage = window.EAMPage?.message;
        if (window.EAMPage) window.EAMPage.message = (message, type) => {
          window.__lastPurchaseInvoiceRuleMessage = String(message || '');
          if (typeof originalMessage === 'function') originalMessage(message, type);
        };
      });
      await invoiceAmount.fill('10000');
      await detail.locator('[data-act="submit"]').click();
      if (!String(await page.evaluate(() => window.__lastPurchaseInvoiceRuleMessage || '')).includes('发票金额绝对值不得小于验票总金额')) errors.push(`${item.code}: invoice amount below the verification total must block submission`);
      await invoiceAmount.fill('12000');
      if (await inventoryAmount.inputValue() !== '1200.00') errors.push(`${item.code}: inventory amount must equal invoice amount minus the order-row verification total`);
      await page.evaluate(() => { window.__lastPurchaseInvoiceRuleMessage = ''; });
      await settlementItems.locator('tbody tr[data-row-value]').filter({ hasText: 'SS20260823001' }).last().locator('[data-field="taxIncludedUnitPrice"]').fill('17000');
      await detail.locator('[data-act="submit"]').click();
      if (!String(await page.evaluate(() => window.__lastPurchaseInvoiceRuleMessage || '')).includes('含税单价、不含税单价和税率必须一致')) errors.push(`${item.code}: inconsistent prices for the same order line must block submission`);
      await settlementItems.locator('tbody tr[data-row-value]').filter({ hasText: 'SS20260823001' }).last().locator('[data-field="taxIncludedUnitPrice"]').fill('18000');
      await page.screenshot({ path: path.join(reportDir, 'purchase-invoice-create-default.png'), fullPage: true });
      await detail.locator('[data-field="invoiceNo"]').fill('');
      await detail.locator('[data-act="save"]').click();
      if (!await list.isVisible()) errors.push(`${item.code}: Save Draft must allow incomplete fields and return to the list`);
      const detailSampleCases = [
        { id: 'PI2', nature: '蓝字', amount: '24500.00', source: 'service', documentNo: 'SS20260824002' },
        { id: 'PI3', nature: '红字', amount: '-2000.00', source: 'receipt', documentNo: 'GR2026081801' }
      ];
      for (const sample of detailSampleCases) {
        const sampleLink = table.locator(`a[data-row-id="${sample.id}"]`);
        await sampleLink.click();
        const sampleOrderRows = orderItems.locator('tbody tr[data-row-value]');
        const sampleSettlementRows = settlementItems.locator('tbody tr[data-row-value]');
        const sampleOrder = JSON.parse(await sampleOrderRows.first().getAttribute('data-row-value') || '{}');
        const sampleSettlement = JSON.parse(await sampleSettlementRows.first().getAttribute('data-row-value') || '{}');
        const sampleFields = ['purchaseCategory', 'itemName', 'specification', 'unit', 'verificationQuantity', 'taxIncludedUnitPrice', 'taxRate', 'unitPrice', 'taxAmount', 'taxExcludedAmount', 'taxIncludedAmount', 'purchaseOrderNo', 'purchaseOrderLineNo'];
        const sourceMatches = sample.source === 'service'
          ? sampleOrder.serviceSettlementNo === sample.documentNo && sampleSettlement.serviceSettlementNo === sample.documentNo && !sampleOrder.purchaseReceiptNo && !sampleSettlement.purchaseReceiptNo
          : sampleOrder.purchaseReceiptNo === sample.documentNo && sampleSettlement.purchaseReceiptNo === sample.documentNo && !sampleOrder.serviceSettlementNo && !sampleSettlement.serviceSettlementNo;
        if (await sampleOrderRows.count() !== 1 || await sampleSettlementRows.count() !== 1 || sampleFields.some((field) => String(sampleOrder[field] ?? '') !== String(sampleSettlement[field] ?? '')) || !sourceMatches || await detail.locator('[data-field="invoiceNature"]').inputValue() !== sample.nature || await detail.locator('[data-field="invoiceAmount"]').inputValue() !== sample.amount || await detail.locator('[data-field="verificationTotalAmount"]').inputValue() !== sample.amount) errors.push(`${item.code}: ${sample.id} list record does not open a matching traceable detail sample`);
        await detail.locator('[data-act="back-list"]').click();
      }
    }
    if (item.code === 'invoice-payment-reconciliation') {
      const tabLabels = (await detail.locator('[data-component="ProTabsDetail"] > .pro-tabs [data-tab]').allTextContents()).map((value) => value.trim());
      if (JSON.stringify(tabLabels) !== JSON.stringify(['基础信息'])) errors.push(`${item.code}: detail must keep only the basic-information tab: ${tabLabels.join(', ')}`);
      if (await detail.locator('[data-tab="payment"], [data-tab="invoice-business"], [data-tab="history"]').count()) errors.push(`${item.code}: payment, invoice-business and adjustment-history tabs must be removed`);

      const formFieldOrder = await detail.locator('[data-component="DetailForm"] .form-item:visible [data-field]').evaluateAll((fields) => fields.map((field) => field.dataset.field));
      const expectedFieldOrder = ['paymentNo', 'status', 'supplierName', 'contractName', 'projectName', 'reconciliationDate', 'paymentAmount', 'unreconciledAmount', 'currentReconciliationAmount', 'company', 'creator', 'createdAt', 'reviewer', 'reviewedAt', 'remark'];
      if (JSON.stringify(formFieldOrder) !== JSON.stringify(expectedFieldOrder)) errors.push(`${item.code}: basic information field order is incorrect: ${formFieldOrder.join(', ')}`);
      const expectedLabels = ['付款单号', '状态', '供应商', '合同名称', '项目', '核销日期', '付款金额', '未核销金额', '本次核销金额', '所属公司', '创建人', '创建时间', '审核人', '审核时间', '备注'];
      const formLabels = (await detail.locator('[data-component="DetailForm"] .form-item:visible .form-label').allTextContents()).map((value) => value.replace('*', '').trim());
      if (JSON.stringify(formLabels) !== JSON.stringify(expectedLabels)) errors.push(`${item.code}: basic information labels are incorrect: ${formLabels.join(', ')}`);
      if (await detail.locator('[data-field="company"]').inputValue() !== '昕彤赋能（长沙）人工智能行业应用系统有限公司' || await detail.locator('[data-field="creator"]').inputValue() !== '李杨洋') errors.push(`${item.code}: company and creator must use concrete business values`);
      if (await detail.locator('[data-field="company"], [data-field="creator"]').evaluateAll((fields) => fields.some((field) => /当前登录/.test(field.value)))) errors.push(`${item.code}: audit fields must not use current-login placeholders`);
      if (await detail.locator('[data-field="reviewer"]:not([readonly]), [data-field="reviewedAt"]:not([readonly])').count()) errors.push(`${item.code}: reviewer and review time must remain readonly`);
      if (await detail.locator('[data-field="remark"][readonly]').count()) errors.push(`${item.code}: remark must be editable for draft records`);
      if (await detail.locator('[data-field="reconciliationDate"]').getAttribute('data-default-today') !== 'true') errors.push(`${item.code}: reconciliation date must declare today as its create default`);
      for (const code of ['paymentAmount', 'unreconciledAmount', 'currentReconciliationAmount']) {
        const field = detail.locator(`[data-component="DetailForm"] [data-field="${code}"]`);
        if (await field.getAttribute('data-precision') !== '2' || await field.count() !== 1) errors.push(`${item.code}: ${code} must use two-decimal precision`);
      }

      const pendingInvoices = detail.locator('[data-component="EditableTable"][data-data-source="pendingInvoices"]');
      if (!await pendingInvoices.isVisible()) errors.push(`${item.code}: pending invoice table must render below basic information`);
      const detailSections = await detail.locator('[data-tab-panel="basic"] > [data-component]').evaluateAll((nodes) => nodes.map((node) => node.dataset.dataSource || node.dataset.component));
      if (JSON.stringify(detailSections) !== JSON.stringify(['DetailForm', 'pendingInvoices'])) errors.push(`${item.code}: basic information and pending invoices are in the wrong order: ${detailSections.join(', ')}`);
      const invoiceHeaders = (await pendingInvoices.locator('thead th').allTextContents()).map((value) => value.replace('*', '').trim()).filter((value) => value && value !== '操作');
      const expectedInvoiceHeaders = ['序号', '发票号码', '类型', '发票日期', '发票金额', '未核销金额', '本次核销金额'];
      if (JSON.stringify(invoiceHeaders) !== JSON.stringify(expectedInvoiceHeaders)) errors.push(`${item.code}: pending invoice columns are incorrect: ${invoiceHeaders.join(', ')}`);
      if (await pendingInvoices.locator('[data-column="supplierName"], th:has-text("供应商")').count()) errors.push(`${item.code}: pending invoice table must not display supplier`);
      if (await pendingInvoices.locator('[data-row-select], [data-act="select-all"]').count()) errors.push(`${item.code}: pending invoice table must not render checkboxes`);
      const pendingTableAlignment = await pendingInvoices.evaluate((element) => {
        const header = element.querySelector('thead th:first-child');
        const scroll = element.querySelector('.pro-table-scroll');
        const lastInput = element.querySelector('tbody td:last-child input');
        return {
          sequencePosition: header ? getComputedStyle(header).position : '',
          sequenceLeft: header ? parseFloat(getComputedStyle(header).left || '999') : 999,
          rightGap: scroll && lastInput ? scroll.getBoundingClientRect().right - lastInput.getBoundingClientRect().right : 0
        };
      });
      if (pendingTableAlignment.sequencePosition !== 'sticky' || pendingTableAlignment.sequenceLeft !== 0) errors.push(`${item.code}: pending invoice sequence must be the fixed first column`);
      if (pendingTableAlignment.rightGap < 23 || pendingTableAlignment.rightGap > 25) errors.push(`${item.code}: pending invoice last field must keep a 24px right gutter`);
      if (await pendingInvoices.locator('thead th').filter({ hasText: '操作' }).count()) errors.push(`${item.code}: pending invoice table must not render an operation column`);
      const footerLabel = pendingInvoices.locator('tfoot .pro-table-total-label');
      const footerValue = pendingInvoices.locator('tfoot [data-footer-summary-column="currentReconciliationAmount"]');
      if (await footerLabel.innerText() !== '合计' || await footerValue.innerText() !== '20,000.00') errors.push(`${item.code}: pending invoice total row is missing or incorrect`);
      const redInvoiceRow = pendingInvoices.locator('tbody tr[data-row-value]').filter({ hasText: '红字' });
      const redInvoiceValue = JSON.parse(await redInvoiceRow.getAttribute('data-row-value') || '{}');
      const redReconciliationInput = redInvoiceRow.locator('[data-field="currentReconciliationAmount"]');
      if (!(redInvoiceValue.invoiceAmount < 0 && redInvoiceValue.unreconciledAmount < 0 && Number(await redReconciliationInput.inputValue()) < 0)) errors.push(`${item.code}: red invoice amounts must all be negative`);
      if (await redReconciliationInput.getAttribute('min') !== '-30000' || await redReconciliationInput.getAttribute('max') !== '0') errors.push(`${item.code}: red invoice reconciliation range must run from its negative balance to zero`);
      await redReconciliationInput.fill('12000');
      if (await redReconciliationInput.inputValue() !== '-12000' || await footerValue.innerText() !== '28,000.00' || await detail.locator('[data-component="DetailForm"] [data-field="currentReconciliationAmount"]').inputValue() !== '28000.00') errors.push(`${item.code}: positive red-invoice input must convert to negative and refresh totals`);
      await redReconciliationInput.fill('');
      await redReconciliationInput.pressSequentially('8000');
      if (await redReconciliationInput.inputValue() !== '-8000') errors.push(`${item.code}: sequential red-invoice digit entry must remain negative`);
      await redReconciliationInput.fill('-35000');
      if (await redReconciliationInput.evaluate((field) => field.checkValidity())) errors.push(`${item.code}: red invoice reconciliation amount must not be below its negative balance`);
      await redReconciliationInput.fill('-20000');
      await page.screenshot({ path: path.join(reportDir, 'invoice-payment-reconciliation-red-invoice-detail.png'), fullPage: true });
      const firstInvoiceAmount = pendingInvoices.locator('tbody tr[data-row-value]').first().locator('[data-field="currentReconciliationAmount"]');
      if (await firstInvoiceAmount.count() !== 1 || await firstInvoiceAmount.evaluate((field) => field.hasAttribute('required'))) errors.push(`${item.code}: invoice reconciliation amount must be editable and allow zero for invoices excluded from this reconciliation`);
      await firstInvoiceAmount.fill('35000');
      if (await detail.locator('[data-component="DetailForm"] [data-field="currentReconciliationAmount"]').inputValue() !== '15000.00') errors.push(`${item.code}: basic reconciliation amount must sum invoice allocations`);
      if (await footerValue.innerText() !== '15,000.00') errors.push(`${item.code}: invoice total row did not refresh after editing`);
      await firstInvoiceAmount.fill('45000');
      if (await firstInvoiceAmount.evaluate((field) => field.checkValidity())) errors.push(`${item.code}: invoice reconciliation amount must not exceed the invoice unreconciled amount`);
      await firstInvoiceAmount.fill('40000');

      const paymentPickerButton = detail.locator('[data-target="payment-order-picker"]');
      if (await paymentPickerButton.count() !== 1) errors.push(`${item.code}: payment order picker entry is missing`);
      else await paymentPickerButton.click();
      const paymentPicker = page.locator('[data-overlay="payment-order-picker"]');
      if (!await paymentPicker.isVisible()) errors.push(`${item.code}: payment order picker did not open`);
      const pickerHeaders = (await paymentPicker.locator('thead th').allTextContents()).map((value) => value.trim()).filter(Boolean);
      const expectedPickerHeaders = ['付款单号', '付款日期', '付款金额', '未核销金额', '供应商', '合同名称', '项目'];
      if (JSON.stringify(pickerHeaders) !== JSON.stringify(expectedPickerHeaders)) errors.push(`${item.code}: payment order picker columns are incorrect: ${pickerHeaders.join(', ')}`);
      if (await paymentPicker.locator('[data-page-size="5"]').count() !== 1) errors.push(`${item.code}: payment order picker must use fixed five-row pagination`);
      await page.screenshot({ path: path.join(reportDir, 'invoice-payment-reconciliation-payment-order-picker.png'), fullPage: true });
      const paymentConfirm = paymentPicker.locator('[data-act="confirm-payment-order"]');
      if (!await paymentConfirm.isDisabled()) errors.push(`${item.code}: payment order confirmation must be disabled before selection`);
      const selectedPaymentRow = paymentPicker.locator('tbody tr[data-row-value]').filter({ hasText: 'PM202608270001' });
      await selectedPaymentRow.locator('[data-row-select]').check();
      if (await paymentConfirm.isDisabled()) errors.push(`${item.code}: payment order confirmation did not enable after selection`);
      await paymentConfirm.click();
      const expectedAutoFill = {
        paymentNo: 'PM202608270001',
        supplierName: '浙江光华科技股份有限公司',
        contractName: 'G1-ZJ05设备采购合同',
        projectName: '浙江产线数字化升级项目',
        paymentAmount: '120000.00',
        unreconciledAmount: '80000.00',
        currentReconciliationAmount: '0.00'
      };
      for (const [code, value] of Object.entries(expectedAutoFill)) {
        if (await detail.locator(`[data-component="DetailForm"] [data-field="${code}"]`).inputValue() !== value) errors.push(`${item.code}: ${code} was not populated from the selected payment order`);
      }
      const selectedInvoiceRows = pendingInvoices.locator('tbody tr[data-row-value]');
      if (await selectedInvoiceRows.count() !== 2) errors.push(`${item.code}: selected payment order did not replace the pending invoice rows`);
      const pendingBalances = await selectedInvoiceRows.evaluateAll((rows) => rows.map((row) => Number(JSON.parse(row.dataset.rowValue || '{}').unreconciledAmount)));
      if (pendingBalances.some((value) => value === 0)) errors.push(`${item.code}: pending invoice table includes a fully reconciled invoice`);
      if (await footerValue.innerText() !== '0.00') errors.push(`${item.code}: payment order selection must reset the reconciliation total`);
      await detail.locator('[data-act="submit"]').click();
      if (!await detail.isVisible()) errors.push(`${item.code}: zero reconciliation total must block submission`);
      await selectedInvoiceRows.first().locator('[data-field="currentReconciliationAmount"]').fill('33900');
      if (await detail.locator('[data-component="DetailForm"] [data-field="currentReconciliationAmount"]').inputValue() !== '33900.00' || await footerValue.innerText() !== '33,900.00') errors.push(`${item.code}: selected payment invoice amount did not update both totals`);

      const listHeaders = (await table.locator('thead th').allTextContents()).map((value) => value.trim()).filter((value) => value && value !== '操作');
      const expectedListHeaders = ['付款单号', '状态', '核销日期', '付款金额', '本次核销金额', '供应商', '合同名称', '项目', '创建人', '创建时间'];
      if (JSON.stringify(listHeaders) !== JSON.stringify(expectedListHeaders)) errors.push(`${item.code}: list columns are incorrect: ${listHeaders.join(', ')}`);
      if (listHeaders.includes('未核销金额')) errors.push(`${item.code}: unreconciled amount must be removed from the list`);
      const searchLabels = (await list.locator('[data-component="ProSearchForm"] .form-label').allTextContents()).map((value) => value.trim());
      if (JSON.stringify(searchLabels) !== JSON.stringify(['付款单号', '状态', '供应商', '合同名称', '项目', '核销日期'])) errors.push(`${item.code}: query conditions are incorrect: ${searchLabels.join(', ')}`);
      const statusValues = await table.locator('tbody tr[data-row-value]').evaluateAll((rows) => rows.map((row) => JSON.parse(row.dataset.rowValue || '{}').status));
      if (JSON.stringify(statusValues) !== JSON.stringify(['草稿', '待审核', '已审核'])) errors.push(`${item.code}: status samples must be 草稿、待审核、已审核: ${statusValues.join(', ')}`);

      await detail.locator('[data-act="back-list"]').click();
      await list.locator('[data-act="create"]').click();
      const expectedToday = await page.evaluate(() => { const now = new Date(); const pad = (value) => String(value).padStart(2, '0'); return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`; });
      if (await detail.locator('[data-field="reconciliationDate"]').inputValue() !== expectedToday) errors.push(`${item.code}: create mode reconciliation date did not default to today`);
      await detail.locator('[data-act="back-list"]').click();
      const pendingAuditRow = table.locator('tbody tr[data-row-value]').filter({ hasText: 'PM202608250002' });
      await pendingAuditRow.locator('[data-row-select]').check();
      const auditAction = list.locator('[data-act="audit"]');
      if (await auditAction.isDisabled()) errors.push(`${item.code}: audit action did not enable for a pending record`);
      await auditAction.click();
      const auditedRowValue = JSON.parse(await pendingAuditRow.getAttribute('data-row-value') || '{}');
      if (auditedRowValue.status !== '已审核' || auditedRowValue.reviewer !== '黄驰' || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(auditedRowValue.reviewedAt || '')) errors.push(`${item.code}: audit action did not record reviewer and review time`);
      await pendingAuditRow.locator('a[data-act="view"]').click();
      if (await detail.locator('[data-field="reviewer"]').inputValue() !== '黄驰' || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(await detail.locator('[data-field="reviewedAt"]').inputValue())) errors.push(`${item.code}: audited detail did not display reviewer and review time`);
      if (await detail.locator('[data-field="remark"]:not(:disabled)').count()) errors.push(`${item.code}: remark must be readonly after audit`);
    }
    await page.screenshot({ path: path.join(reportDir, `${item.code}-detail.png`), fullPage: true });
    if (pageErrors.length) errors.push(`${item.code}: ${pageErrors.join('; ')}`);
  } catch (error) {
    errors.push(`${item.code}: ${error.message}`);
  } finally {
    await page.close();
  }
}

const widePage = await browser.newPage({ viewport: { width: 2048, height: 1200 }, deviceScaleFactor: 1 });
const widePageErrors = [];
widePage.on('pageerror', (error) => widePageErrors.push(error.message));
await widePage.route(/^https?:/, (route) => route.abort());
try {
  await widePage.goto(pathToFileURL(path.resolve('pages/procurement/purchase-invoice.html')).href, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await widePage.waitForTimeout(650);
  if (await widePage.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)) errors.push('purchase-invoice: 2048px list has global horizontal overflow');
  await widePage.screenshot({ path: path.join(reportDir, 'purchase-invoice-list-2048.png'), fullPage: true });
  await widePage.locator('[data-page-view="list"] [data-component="ProTable"] a[data-act="edit"]').first().click();
  const wideDetail = widePage.locator('[data-page-view="detail"]');
  if (!await wideDetail.isVisible()) errors.push('purchase-invoice: 2048px detail did not open');
  if (await widePage.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)) errors.push('purchase-invoice: 2048px detail has global horizontal overflow');
  const wideSettlementScroll = wideDetail.locator('[data-data-source="settlementItems"] .pro-table-scroll');
  if (await wideSettlementScroll.evaluate((element) => getComputedStyle(element).overflowY !== 'hidden' || element.scrollHeight > element.clientHeight + 2)) errors.push('purchase-invoice: 2048px settlement table exposes vertical scrolling');
  await widePage.screenshot({ path: path.join(reportDir, 'purchase-invoice-detail-2048.png'), fullPage: true });
  if (widePageErrors.length) errors.push(`purchase-invoice: 2048px ${widePageErrors.join('; ')}`);
} finally {
  await widePage.close();
}

await Promise.race([
  browser.close(),
  new Promise((resolve) => setTimeout(resolve, 2000))
]);
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`Purchase/payment page smoke passed: ${cases.length} pages; screenshots: ${reportDir}`);
process.exit(0);
