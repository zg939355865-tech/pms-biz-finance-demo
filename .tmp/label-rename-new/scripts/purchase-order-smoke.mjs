import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '../lib/playwright-smoke.mjs';

const expectedSearchFields = [
  ['orderNo', '订单编号'], ['status', '状态'], ['orderDate', '订单日期'],
  ['supplierName', '供应商'], ['projectName', '项目'], ['buyer', '采购员'],
  ['procurementMode', '订单来源'], ['businessType', '业务类型']
];
const expectedListColumns = [
  ['orderNo', '订单编号'], ['status', '状态'], ['orderDate', '订单日期'],
  ['supplierName', '供应商'], ['projectName', '项目'], ['taxExcludedTotal', '金额合计'],
  ['taxTotal', '税额合计'], ['taxIncludedTotal', '价税合计'], ['buyer', '采购员'],
  ['procurementMode', '订单来源'], ['businessType', '业务类型'], ['creator', '创建人'], ['createdAt', '创建时间']
];
const expectedDetailFields = [
  ['orderNo', '采购订单'], ['status', '状态'], ['orderDate', '订单日期'],
  ['procurementMode', '订单来源'],
  ['emergencyReason', '紧急采购原因'], ['businessType', '业务类型'], ['department', '需求部门'], ['requester', '需求人'],
  ['deliveryDate', '期望交货日期'], ['projectName', '项目'], ['supplierName', '供应商'],
  ['settlementCurrency', '结算币别'], ['hasContract', '是否存在合同'], ['contractNo', '合同编号'],
  ['contractName', '合同名称'], ['paymentMethod', '付款方式'], ['buyer', '采购员'], ['creator', '创建人'],
  ['createdAt', '创建时间'], ['reviewer', '审核人'], ['reviewedAt', '审核时间'],
  ['company', '所属公司'], ['remark', '备注']
];
const expectedItemColumns = [
  ['sequence', '序号'], ['purchaseCategory', '物资类型'], ['itemName', '物资名称'],
  ['specification', '规格'], ['unit', '单位'], ['orderQuantity', '采购数量'],
  ['taxIncludedUnitPrice', '含税单价'], ['taxIncludedAmount', '价税合计'],
  ['taxRate', '税率（%）'], ['taxAmount', '税额'], ['taxExcludedAmount', '不含税金额'],
  ['taxExcludedUnitPrice', '不含税单价'], ['itemRemark', '备注']
];

const htmlPath = process.argv[2] || 'pages/procurement/purchase-order.html';
const absolutePath = path.resolve(htmlPath);
const reportDir = path.resolve('outputs/reports/visual');
fs.mkdirSync(reportDir, { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
const expect = (condition, message) => { if (!condition) errors.push(message); };
const same = (actual, expected, message) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) errors.push(`${message}: ${JSON.stringify(actual)}`);
};
const visibleRowCount = async (table) => table.locator('tbody > tr:visible:not([data-empty-row])').count();

await page.goto(pathToFileURL(absolutePath).href, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(250);
const list = page.locator('[data-page-view="list"]');
const primaryTable = list.locator('#purchase-order-table');
const detail = page.locator('[data-page-view="detail"]');
expect(await list.isVisible(), '采购订单列表未显示');
expect(await visibleRowCount(primaryTable) === 5, '采购订单列表首屏必须固定显示5条记录');
expect(await primaryTable.locator('tbody > tr:not([data-empty-row])').count() === 12, '采购订单列表模拟数据应为12条');
same(await list.locator('#purchase-order-search .form-item:has([data-field])').evaluateAll((items) => items.map((item) => [(item.querySelector('[data-field]')?.getAttribute('data-field') || '').replace(/Start$/, ''), item.querySelector('.form-label')?.textContent?.trim() || ''])), expectedSearchFields, '查询字段名称或顺序不匹配');
same(await primaryTable.locator('thead th').allTextContents().then((labels) => labels.map((label) => label.trim()).filter((label) => label && label !== '操作')), expectedListColumns.map(([, label]) => label), '列表字段名称或顺序不匹配');
expect(await list.locator('#purchase-order-search input[data-field="orderNo"]').count() === 1, '订单编号查询不是输入框');
expect(await list.locator('#purchase-order-search [data-field="orderDateStart"],#purchase-order-search [data-field="orderDateEnd"]').count() === 2, '订单日期查询不是日期范围');
expect(await list.locator('#purchase-order-search input[data-field="buyer"]').count() === 1, '采购员查询不是输入框');
expect(await list.locator('#purchase-order-search select[data-field="procurementMode"]').count() === 1, '订单来源查询不是下拉');
const businessTypeSearch = list.locator('#purchase-order-search select[data-field="businessType"]');
expect(await businessTypeSearch.count() === 1, '业务类型查询不是下拉');
same(await businessTypeSearch.locator('option').allTextContents().then((values) => values.map((value) => value.trim()).filter((value) => value && value !== '请选择')), ['实物采购', '服务采购'], '业务类型查询选项不匹配');
expect(await primaryTable.locator('tbody > tr').first().locator('[data-column="businessType"]').textContent().then((value) => value.trim()) === '实物采购', '列表业务类型示例数据未展示');
await businessTypeSearch.selectOption('服务采购');
await list.locator('#purchase-order-search [data-act="query"]').click();
const visibleBusinessTypes = await primaryTable.locator('tbody > tr:visible:not([data-empty-row]) [data-column="businessType"]').allTextContents();
expect(visibleBusinessTypes.length === 5 && visibleBusinessTypes.every((value) => value.trim() === '服务采购'), '业务类型查询未正确筛选服务采购');
await list.locator('#purchase-order-search [data-act="reset"]').click();
expect(await visibleRowCount(primaryTable) === 5, '重置业务类型查询后未恢复首屏5条记录');
same(await primaryTable.locator('tbody > tr').first().locator('[data-column="taxExcludedTotal"],[data-column="taxTotal"],[data-column="taxIncludedTotal"]').allTextContents().then((values) => values.map((value) => value.trim())), ['25,840.70', '3,359.30', '29,200.00'], '列表首行金额合计不匹配');
expect(await primaryTable.locator('[data-column="reviewer"],[data-column="reviewedAt"]').count() === 0, '列表不应显示审核人或审核时间');
expect(await list.locator('[data-act="audit"]').count() === 1, '列表缺少审核操作');
expect(await list.locator('[data-act="reverse-audit"]').count() === 1, '列表缺少反审核操作');
expect(await page.locator('[data-act="workflow-activity"],[data-act="workflow-owner"],[data-act="workflow-chart"],[data-act="approve"],[data-act="terminate"]').count() === 0, '页面仍存在流程、审批或终止操作');
await page.screenshot({ path: path.join(reportDir, 'purchase-order-list.png') });
await page.setViewportSize({ width: 2048, height: 1100 });
await page.screenshot({ path: path.join(reportDir, 'purchase-order-list-wide.png') });
await primaryTable.locator('.pro-table-scroll').evaluate((element) => { element.scrollLeft = element.scrollWidth; });
await page.screenshot({ path: path.join(reportDir, 'purchase-order-list-right.png') });
await primaryTable.locator('.pro-table-scroll').evaluate((element) => { element.scrollLeft = 0; });
await page.setViewportSize({ width: 1440, height: 1000 });

const pendingAuditRow = primaryTable.locator('tbody > tr').filter({ hasText: 'PO20260817003' });
await pendingAuditRow.locator('[data-row-select]').check();
await list.locator('[data-act="audit"]').click();
expect(await pendingAuditRow.getAttribute('data-row-status') === '已审核', '审核后状态未变为已审核');
const auditedRowValue = JSON.parse(await pendingAuditRow.getAttribute('data-row-value') || '{}');
expect(auditedRowValue.reviewer === '管理员', '审核后未写入审核人');
expect(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(auditedRowValue.reviewedAt || ''), '审核后未写入审核时间');
await pendingAuditRow.locator('a[data-act="view"]').click();
expect(await detail.locator('[data-field="reviewer"]').inputValue() === '管理员' && await detail.locator('[data-field="reviewedAt"]').inputValue() === auditedRowValue.reviewedAt, '审核信息未在详情基础信息展示');
await detail.locator('.schema-detail-header [data-act="back-list"]').click();
await pendingAuditRow.locator('[data-row-select]').check();
await list.locator('[data-act="reverse-audit"]').click();
expect(await pendingAuditRow.getAttribute('data-row-status') === '草稿', '反审核后状态未回到草稿');
const reversedRowValue = JSON.parse(await pendingAuditRow.getAttribute('data-row-value') || '{}');
expect(reversedRowValue.reviewer === '' && reversedRowValue.reviewedAt === '', '反审核后未清空审核人或审核时间');
await pendingAuditRow.locator('a[data-act="edit"]').click();
expect(await detail.locator('[data-field="reviewer"]').inputValue() === '' && await detail.locator('[data-field="reviewedAt"]').inputValue() === '', '反审核后详情未清空审核信息');
await detail.locator('.schema-detail-header [data-act="back-list"]').click();

const draftRow = primaryTable.locator('tbody > tr[data-row-status="草稿"]').first();
await draftRow.locator('a[data-act="edit"]').click();
expect(await detail.isVisible(), '采购订单草稿详情未显示');
same(await detail.locator('#purchase-order-detail > .pro-tabs > .pro-tab').allTextContents().then((labels) => labels.map((label) => label.trim())), ['基础信息', '附件'], '详情页签不匹配');

const basic = detail.locator('[data-tab-panel="basic"]');
same(await basic.locator('[data-component="DetailForm"] .form-item').evaluateAll((items) => items.map((item) => [item.querySelector('[data-field]')?.getAttribute('data-field') || '', item.querySelector('.form-label')?.textContent?.trim() || ''])), expectedDetailFields, '基础信息字段名称或顺序不匹配');
expect(await basic.locator('[data-field="purchaseApplicationNo"]').count() === 0, '详情仍显示采购申请单字段');
expect(await basic.locator('select[data-field="department"]').count() === 1, '需求部门不是下拉');
expect(await basic.locator('select[data-field="requester"]').count() === 1, '需求人不是下拉');
expect(await basic.locator('select[data-field="projectName"]').count() === 1, '项目不是下拉');
expect(await basic.locator('[data-field="emergencyReason"]').isVisible(), '紧急采购原因未展示');
expect(await basic.locator('select[data-field="settlementCurrency"]').count() === 1, '结算币别不是下拉');
expect(await basic.locator('input[type="checkbox"][data-field="hasContract"]').count() === 1, '缺少是否存在合同复选框');
same(await basic.locator('select[data-field="paymentMethod"] option').evaluateAll((options) => options.map((option) => option.value).filter(Boolean)), ['电汇', '承兑'], '付款方式选项不匹配');
expect(await basic.locator('select[data-field="buyer"]').count() === 1, '采购员不是下拉');
expect(await basic.locator('#purchase-order-items').count() === 1, '订单行未合并到基础信息页签');
expect(await detail.locator('[data-tab="items"]').count() === 0, '详情仍保留独立订单行页签');

const items = basic.locator('#purchase-order-items');
expect((await items.locator('.section-title').textContent())?.trim() === '订单明细', '新增订单行上方未显示订单明细标题');
const itemColumns = await items.locator('tbody > tr:not([data-empty-row])').first().locator('[data-column]').evaluateAll((nodes) => nodes.map((node) => [node.dataset.column, '']));
const itemHeaders = await items.locator('thead th').evaluateAll((nodes) => nodes.map((node) => node.textContent?.trim() || '').filter(Boolean));
same(itemColumns.map(([code], index) => [code, itemHeaders[index]]), expectedItemColumns, '订单明细字段名称或顺序不匹配');
expect(itemHeaders.at(-1) === '操作', '订单明细末列不是操作');
expect(!itemColumns.some(([code]) => ['requestedQuantity', 'sourceLineNo', 'deliveryDate', 'detailDeliveryDate'].includes(code)), '订单明细仍包含已移除字段');
expect(await items.locator('[data-act="restore-rows"]').count() === 0, '订单明细仍显示恢复来源行');
expect(await basic.locator('.pro-amount-summary').count() === 0, '订单明细下方仍显示金额汇总');
const initialItemCount = await items.locator('tbody > tr:not([data-empty-row])').count();
expect(await items.locator('[data-act="add-row"]').isVisible(), '普通采购未显示新增订单行');
await items.locator('[data-act="add-row"]').click();
expect(await items.locator('tbody > tr:not([data-empty-row])').count() === initialItemCount + 1, '普通采购无法新增订单行');
const newOrdinaryRow = items.locator('tbody > tr[data-new-row="true"]').first();
for (const code of ['purchaseCategory', 'itemName', 'specification', 'unit', 'orderQuantity', 'taxIncludedUnitPrice', 'taxRate', 'itemRemark']) {
  expect(!await newOrdinaryRow.locator(`[data-field="${code}"]`).isDisabled(), `普通采购新增行字段 ${code} 不可编辑`);
}
await newOrdinaryRow.locator('[data-field="purchaseCategory"]').selectOption('原材料');
await newOrdinaryRow.locator('[data-field="itemName"]').fill('联动测试物料');
await newOrdinaryRow.locator('[data-field="specification"]').fill('TEST-01');
await newOrdinaryRow.locator('[data-field="unit"]').selectOption('件');
await newOrdinaryRow.locator('[data-field="orderQuantity"]').fill('2');
await newOrdinaryRow.locator('[data-field="taxIncludedUnitPrice"]').fill('113');
await newOrdinaryRow.locator('[data-field="taxRate"]').selectOption('13');
same(await newOrdinaryRow.locator('[data-column="taxIncludedAmount"],[data-column="taxAmount"],[data-column="taxExcludedAmount"],[data-column="taxExcludedUnitPrice"]').allTextContents().then((values) => values.map((value) => value.trim())), ['226.00', '26.00', '200.00', '100.00'], '订单明细金额联动不匹配');
for (const code of ['orderQuantity', 'taxIncludedAmount', 'taxAmount', 'taxExcludedAmount']) {
  const expectedTotal = await items.locator('tbody > tr:not([data-empty-row])').evaluateAll((rows, columnCode) => rows.reduce((total, row) => {
    const cell = row.querySelector(`[data-column="${columnCode}"]`);
    const input = cell?.querySelector('[data-field]');
    const value = Number(String(input ? input.value : cell?.textContent || '').replace(/[%￥¥,\s]/g, ''));
    return total + (Number.isFinite(value) ? value : 0);
  }, 0), code);
  expect(Number((await items.locator(`[data-footer-summary-column="${code}"]`).textContent()).replace(/,/g, '').trim()) === Number(expectedTotal.toFixed(2)), `采购订单明细 ${code} 合计错误`);
}
await page.screenshot({ path: path.join(reportDir, 'purchase-order-basic.png'), fullPage: true });
await page.screenshot({ path: path.join(reportDir, 'purchase-order-detail.png'), fullPage: true });

await basic.locator('[data-field="contractNo"]').locator('xpath=following-sibling::button').click();
const contractOverlay = page.locator('[data-overlay="expense-contract-picker"]');
expect(await contractOverlay.isVisible(), '合同选择弹窗未显示');
const contractModalWidth = await contractOverlay.locator('.pro-modal').evaluate((element) => element.getBoundingClientRect().width);
expect(contractModalWidth >= 700 && contractModalWidth <= 800, `合同弹窗宽度未优化为双列中型弹窗: ${contractModalWidth}`);
expect(await contractOverlay.locator('input[data-field="contractKeyword"]').count() === 1, '合同弹窗缺少合同编号或名称查询');
expect((await contractOverlay.locator('[data-fixed-page-size]').textContent())?.trim() === '5条/页', '合同弹窗未使用固定5条/页分页');
same(await contractOverlay.locator('thead th').allTextContents().then((labels) => labels.map((label) => label.trim()).filter((label) => label && label !== '操作')), ['合同编号', '合同名称'], '合同弹窗字段不匹配');
await page.screenshot({ path: path.join(reportDir, 'purchase-order-contract-picker.png') });
await contractOverlay.locator('[data-row-select]').first().check();
await contractOverlay.locator('[data-act="confirm-contract"]').click();
expect(await basic.locator('[data-field="contractNo"]').inputValue() === 'EC20260801003', '合同编号未回填');
expect(await basic.locator('[data-field="contractName"]').inputValue() === '控制柜物资采购合同', '合同名称未自动带出');
expect(await basic.locator('[data-field="paymentMethod"]').inputValue() === '电汇', '付款方式未随合同自动带出');
expect(await basic.locator('[data-field="paymentMethod"]').isDisabled(), '存在合同时付款方式仍可编辑');

await detail.locator('.schema-detail-header [data-act="back-list"]').click();
await list.locator('[data-act="create"]').click();
expect(await detail.isVisible(), '新增采购订单详情未显示');
const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' });
expect(await detail.locator('[data-field="orderDate"]').inputValue() === today, '新增时订单日期未默认当天');
expect(await detail.locator('[data-field="procurementMode"]').inputValue() === '普通采购', '新增时订单来源未默认普通采购');
expect(await detail.locator('[data-field="projectName"]').inputValue() === '通用项目', '新增时项目未默认通用项目');
const businessType = detail.locator('[data-field="businessType"]');
expect(await businessType.count() === 1 && await businessType.getAttribute('required') !== null, '业务类型不是必填下拉');
same(await businessType.locator('option').allTextContents().then((values) => values.map((value) => value.trim()).filter((value) => value && value !== '请选择')), ['实物采购', '服务采购'], '业务类型详情选项不匹配');
expect(await businessType.inputValue() === '', '新增时业务类型不应预设用户未指定的默认值');
await businessType.selectOption('服务采购');
expect(await businessType.inputValue() === '服务采购', '业务类型无法选择服务采购');
expect(await detail.locator('#purchase-order-items [data-act="add-row"]').isVisible(), '新增普通采购未显示新增订单行');
const emergencyReason = detail.locator('[data-field="emergencyReason"]');
expect(await emergencyReason.isDisabled() && await emergencyReason.getAttribute('required') === null, '普通采购时紧急采购原因未置灰或仍必填');
await detail.locator('[data-field="procurementMode"]').selectOption('紧急采购');
expect(await detail.locator('#purchase-order-items [data-act="add-row"]').isVisible(), '紧急采购未显示新增订单行');
expect(!await emergencyReason.isDisabled() && await emergencyReason.getAttribute('required') !== null, '紧急采购时紧急采购原因未启用必填');
await emergencyReason.fill('现场紧急需求');

const settlementCurrency = detail.locator('[data-field="settlementCurrency"]');
expect(await settlementCurrency.inputValue() === 'CNY' && await settlementCurrency.isDisabled(), '新增时结算币别未默认CNY或不是只读');
await detail.locator('[data-field="supplierName"]').locator('xpath=following-sibling::button').click();
const supplierOverlay = page.locator('[data-overlay="supplier-picker"]');
await supplierOverlay.locator('[data-row-select]').nth(2).check();
await supplierOverlay.locator('[data-act="confirm-supplier"]').click();
expect(await settlementCurrency.inputValue() === 'USD', '结算币别未根据供应商自动带出');

const hasContract = detail.locator('[data-field="hasContract"]');
const contractNo = detail.locator('[data-field="contractNo"]');
const contractButton = contractNo.locator('xpath=following-sibling::button');
const paymentMethod = detail.locator('[data-field="paymentMethod"]');
const buyer = detail.locator('[data-field="buyer"]');
expect(!await hasContract.isChecked(), '新增时是否存在合同不应默认勾选');
expect(await contractNo.isDisabled() && await contractButton.isDisabled(), '未勾选是否存在合同时合同编号未禁用');
expect(await paymentMethod.getAttribute('required') !== null && !await paymentMethod.isDisabled(), '无合同时付款方式不是可编辑必填下拉');
expect(await buyer.getAttribute('required') !== null && await buyer.inputValue() === '', '新增时采购员不是待选择的必填下拉');
same(await buyer.locator('option').evaluateAll((options) => options.map((option) => option.value).filter(Boolean)), ['栗磊', '李杨洋', '陆志军', '张水波', '肖邵雷'], '采购员选项不匹配');
await buyer.selectOption('李杨洋');
expect(await buyer.inputValue() === '李杨洋', '采购员无法手动选择');
await hasContract.check();
expect(!await contractNo.isDisabled() && !await contractButton.isDisabled(), '勾选是否存在合同后合同编号仍不可选择');
expect(await paymentMethod.isDisabled(), '勾选是否存在合同后付款方式未锁定');
await contractButton.click();
await contractOverlay.locator('[data-row-select]').nth(1).check();
await contractOverlay.locator('[data-act="confirm-contract"]').click();
expect(await contractNo.inputValue() === 'EC20260725007', '合同编号未按选择结果回填');
expect(await detail.locator('[data-field="contractName"]').inputValue() === '年度电气元件框架采购合同', '合同名称未按选择结果自动带出');
expect(await paymentMethod.inputValue() === '承兑', '付款方式未按合同自动带出');
expect(await paymentMethod.isDisabled(), '合同带出付款方式后仍可编辑');
await hasContract.uncheck();
expect(await contractNo.inputValue() === '' && await detail.locator('[data-field="contractName"]').inputValue() === '', '取消勾选后合同编号或名称未清空');
expect(!await paymentMethod.isDisabled(), '取消勾选是否存在合同后付款方式未恢复可编辑');
await paymentMethod.selectOption('电汇');
expect(await paymentMethod.inputValue() === '电汇', '无合同时付款方式无法手动选择');
const layout = await detail.evaluate((element) => ({ documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1, detailWidth: element.getBoundingClientRect().width }));
expect(!layout.documentOverflow && layout.detailWidth > 0, `详情布局异常: ${JSON.stringify(layout)}`);
await page.setViewportSize({ width: 2048, height: 1200 });
const wideLayout = await detail.evaluate((element) => ({ documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1, detailWidth: element.getBoundingClientRect().width }));
expect(!wideLayout.documentOverflow && wideLayout.detailWidth > 0, `2048px详情布局异常: ${JSON.stringify(wideLayout)}`);

const report = { page: htmlPath, checkedAt: new Date().toISOString(), status: errors.length ? 'failed' : 'passed', issues: errors, screenshots: ['outputs/reports/visual/purchase-order-list.png', 'outputs/reports/visual/purchase-order-list-wide.png', 'outputs/reports/visual/purchase-order-list-right.png', 'outputs/reports/visual/purchase-order-basic.png', 'outputs/reports/visual/purchase-order-detail.png', 'outputs/reports/visual/purchase-order-contract-picker.png'] };
fs.writeFileSync(path.resolve('outputs/reports/visual/purchase-order-smoke.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await browser.close();
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log('Purchase order smoke passed: exact list/search fields, audit write/clear, financial totals, unified editable order items and contract/payment locking.');
