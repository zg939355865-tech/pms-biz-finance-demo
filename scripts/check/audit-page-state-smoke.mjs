import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '../lib/playwright-smoke.mjs';

const targets = [
  ['采购订单', 'schemas/pages/procurement/purchase-order.json'],
  ['采购入库', 'schemas/pages/procurement/purchase-receipt.json'],
  ['服务结算', 'schemas/pages/procurement/service-settlement.json'],
  ['采购收票', 'schemas/pages/procurement/purchase-invoice.json'],
  ['付款单', 'schemas/pages/expense/payment-order.json'],
  ['票款核销', 'schemas/pages/expense/invoice-payment-reconciliation.json'],
  ['项目结算单', 'schemas/pages/income/project-settlement.json'],
  ['销项开票', 'schemas/pages/income/sales-invoice.json'],
  ['收款单', 'schemas/pages/income/receipt.json'],
  ['收款核销', 'schemas/pages/income/receipt-reconciliation.json'],
  ['物资出库', 'schemas/pages/material/material-outbound.json'],
  ['其他出库', 'schemas/pages/material/other-outbound.json'],
  ['其他入库', 'schemas/pages/material/other-inbound.json'],
  ['固资变更', 'schemas/pages/fixed-asset/fixed-asset-return.json']
];

const errors = [];
const expect = (condition, message) => { if (!condition) errors.push(message); };
const browser = await chromium.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true
});

for (const [pageName, schemaPath] of targets) {
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  const pageActions = schema.pageActions || [];
  const audit = pageActions.find((action) => action.code === 'audit');
  const reverseAudit = pageActions.find((action) => action.code === 'reverse-audit');
  const primaryTable = (schema.regions || []).find((region) => region.component === 'ProTable');
  const rows = primaryTable ? schema.mockData?.[primaryTable.dataSource] || [] : [];
  const statuses = new Set(rows.map((row) => row.status));

  const pendingStatus = schema.auditPendingStatus || '待审核';
  const completedStatus = schema.auditCompletedStatus || '已审核';
  const reverseStatus = schema.reverseAuditNextStatus || '草稿';
  const editableStatuses = schema.detailEditableStatuses || ['草稿'];
  expect(JSON.stringify(editableStatuses) === JSON.stringify(schema.detailEditableStatuses || []), `${pageName} Schema 未限定可编辑状态`);
  expect(schema.detailReviewEnabled === false, `${pageName} 详情仍启用审核编辑入口`);
  expect(schema.detailWorkflowLinksEnabled === false, `${pageName} 详情仍启用流程入口`);
  expect(audit && audit.nextStatus === completedStatus, `${pageName} 审核未配置流转到审核完成状态`);
  expect(audit && JSON.stringify(audit.enabledSelectionStatuses) === JSON.stringify([pendingStatus]), `${pageName} 审核状态门禁不正确`);
  expect(reverseAudit && JSON.stringify(reverseAudit.enabledSelectionStatuses) === JSON.stringify([completedStatus]), `${pageName} 反审核状态门禁不正确`);
  expect(reverseAudit && reverseAudit.nextStatus === reverseStatus, `${pageName} 反审核未配置回到待审核状态`);
  for (const status of [reverseStatus, pendingStatus, completedStatus]) expect(statuses.has(status), `${pageName} 缺少${status}示例数据`);
  if (!primaryTable || !fs.existsSync(schema.outputPath)) continue;

  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', (error) => errors.push(`${pageName} pageerror: ${error.message}`));
  await page.goto(pathToFileURL(path.resolve(schema.outputPath)).href, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(120);

  const list = page.locator('[data-page-view="list"]');
  const table = list.locator(`[data-data-source="${primaryTable.dataSource}"]`).first();
  const detail = page.locator('[data-page-view="detail"]');
  const auditButton = list.locator('[data-act="audit"]').first();
  const reverseButton = list.locator('[data-act="reverse-audit"]').first();
  expect(await table.count() === 1, `${pageName} 主列表未生成`);
  expect(await auditButton.count() === 1, `${pageName} 列表缺少审核按钮`);
  expect(await reverseButton.count() === 1, `${pageName} 列表缺少反审核按钮`);

  const openAndCheck = async (status, editable) => {
    const row = table.locator(`tbody > tr[data-row-status="${status}"]:visible`).first();
    expect(await row.count() === 1, `${pageName} 首屏缺少${status}示例`);
    if (!await row.count()) return;
    const link = row.locator('a[data-act]').first();
    expect(await link.getAttribute('data-act') === (editable ? 'edit' : 'view'), `${pageName} ${status}详情入口模式错误`);
    await link.click();
    expect(await detail.getAttribute('data-detail-editable') === String(editable), `${pageName} ${status}详情编辑标记错误`);
    const editableControls = detail.locator('input[data-field]:not([data-schema-readonly="true"]):not([type="hidden"]),select[data-field]:not([data-schema-readonly="true"]),textarea[data-field]:not([data-schema-readonly="true"])');
    const enabledCount = await editableControls.evaluateAll((controls) => controls.filter((control) => !control.disabled && control.offsetParent !== null).length);
    if (editable) expect(enabledCount > 0, `${pageName} 草稿详情没有可编辑业务字段`);
    else expect(enabledCount === 0, `${pageName} ${status}详情仍有可编辑业务字段`);
    const editActionCount = await detail.locator('[data-detail-edit-action]:visible').count();
    expect(editable ? editActionCount > 0 : editActionCount === 0, `${pageName} ${status}详情编辑按钮状态错误`);
    const mutatingEnabled = await detail.locator('[data-act="open"],[data-act="get-location"],[data-act="remove-row"],[data-act="add-row"],[data-act="split"],[data-act="create-child"],[data-act="upload"],[data-act="batch-delete"]').evaluateAll((buttons) => buttons.filter((button) => !button.disabled && button.offsetParent !== null).length);
    if (!editable) expect(mutatingEnabled === 0, `${pageName} ${status}详情仍有可执行修改操作`);
    expect(await detail.locator('[data-field]').evaluateAll((controls) => controls.some((control) => String(control.value ?? '').trim() !== '')), `${pageName} ${status}详情没有示例业务数据`);
    await detail.locator('[data-act="back-list"]').first().click();
  };

  for (const status of [reverseStatus, pendingStatus, completedStatus]) {
    await openAndCheck(status, editableStatuses.includes(status));
  }

  const pendingCandidate = table.locator(`tbody > tr[data-row-status="${pendingStatus}"]:visible`).first();
  const pendingIndex = await pendingCandidate.getAttribute('data-row-index');
  const pendingRow = table.locator(`tbody > tr[data-row-index="${pendingIndex}"]`);
  await pendingRow.locator('[data-row-select]').check();
  expect(!await auditButton.isDisabled(), `${pageName} 选中待审核记录后审核按钮未启用`);
  expect(await reverseButton.isDisabled(), `${pageName} 待审核记录错误启用反审核`);
  await auditButton.click();
  const auditTarget = await auditButton.getAttribute('data-target');
  if (auditTarget) {
    const overlay = page.locator(`[data-overlay="${auditTarget}"]`);
    expect(await overlay.isVisible(), `${pageName} 审核确认弹窗未打开`);
    await overlay.locator('input[required],textarea[required]').evaluateAll((controls) => controls.forEach((control) => { if (!control.value) control.value = '状态回归测试'; }));
    await overlay.locator('select[required]').evaluateAll((controls) => controls.forEach((control) => { if (!control.value && control.options.length > 1) control.selectedIndex = 1; }));
    await overlay.locator('[data-act="confirm-status"]').click();
  }
  expect(await pendingRow.getAttribute('data-row-status') === completedStatus, `${pageName} 审核后未变为${completedStatus}`);

  const approvedCandidate = table.locator(`tbody > tr[data-row-status="${completedStatus}"]:visible`).first();
  const approvedIndex = await approvedCandidate.getAttribute('data-row-index');
  const approvedRow = table.locator(`tbody > tr[data-row-index="${approvedIndex}"]`);
  await approvedRow.locator('[data-row-select]').check();
  expect(!await reverseButton.isDisabled(), `${pageName} 选中已审核记录后反审核按钮未启用`);
  expect(await auditButton.isDisabled(), `${pageName} 已审核记录错误启用审核`);
  await reverseButton.click();
  const reverseTarget = await reverseButton.getAttribute('data-target');
  if (reverseTarget) {
    const overlay = page.locator(`[data-overlay="${reverseTarget}"]`);
    expect(await overlay.isVisible(), `${pageName} 反审核确认弹窗未打开`);
    await overlay.locator('input[required],textarea[required]').evaluateAll((controls) => controls.forEach((control) => { if (!control.value) control.value = '状态回归测试'; }));
    await overlay.locator('select[required]').evaluateAll((controls) => controls.forEach((control) => { if (!control.value && control.options.length > 1) control.selectedIndex = 1; }));
    await overlay.locator('[data-act="confirm-status"]').click();
  }
  expect(await approvedRow.getAttribute('data-row-status') === reverseStatus, `${pageName} 反审核后未回到${reverseStatus}`);
  expect(await approvedRow.locator('a[data-act]').first().getAttribute('data-act') === (editableStatuses.includes(reverseStatus) ? 'edit' : 'view'), `${pageName} 反审核后未恢复可编辑状态的详情入口`);
  await page.close();
}

await browser.close();

const reportPath = path.resolve('outputs/reports/visual/audit-page-state-smoke.json');
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify({ status: errors.length ? 'failed' : 'passed', checkedPages: targets.length, issues: errors }, null, 2));
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`审核页面状态回归通过：${targets.length} 个页面`);
