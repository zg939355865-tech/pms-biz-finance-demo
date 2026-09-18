import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '../lib/playwright-smoke.mjs';

const expectedSearchFields = [
  ['applicationNo', '申请单号'],
  ['status', '状态'],
  ['projectName', '项目'],
  ['department', '申请部门'],
  ['creator', '申请人'],
  ['createdAt', '申请时间']
];
const expectedListColumns = [
  ['applicationNo', '申请单号'],
  ['status', '状态'],
  ['projectName', '项目'],
  ['estimatedTotal', '预估总金额（元）'],
  ['expectedDate', '期望到货日期'],
  ['creator', '申请人'],
  ['department', '申请部门'],
  ['createdAt', '申请时间']
];
const expectedDetailFields = [
  ['applicationNo', '申请单号'],
  ['status', '状态'],
  ['purpose', '申请用途'],
  ['expectedDate', '期望到货日期'],
  ['projectName', '所属项目'],
  ['estimatedTotal', '预估总金额（元）'],
  ['reason', '采购原因'],
  ['department', '申请部门'],
  ['creator', '申请人'],
  ['createdAt', '申请时间'],
  ['company', '所属公司']
];
const expectedItemColumns = [
  ['purchaseCategory', '采购类别'],
  ['purchaseName', '采购名称'],
  ['specification', '规格'],
  ['unit', '单位'],
  ['quantity', '数量'],
  ['estimatedUnitPrice', '预估单价（含税）'],
  ['estimatedAmount', '预估金额'],
  ['remark', '备注']
];
const expectedPurposeOptions = ['生产耗用', '研发专用', '日常办公', '项目专用', '销售包装', '其它'];

const schemaPath = path.resolve('schemas/pages/procurement/purchase-requisition.json');
const pagePath = path.resolve('pages/procurement/purchase-requisition.html');
const listScreenshotPath = path.resolve('outputs/reports/visual/purchase-requisition-list-optimized.png');
const screenshotPath = path.resolve('outputs/reports/visual/purchase-requisition-optimized.png');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
const errors = [];
const same = (actual, expected, label) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) errors.push(`${label}: ${JSON.stringify(actual)}`);
};

const search = schema.regions.find((region) => region.id === 'purchase-requisition-search');
const list = schema.regions.find((region) => region.id === 'purchase-requisition-table');
const detail = schema.regions.find((region) => region.id === 'purchase-requisition-detail');
const basicTab = detail?.tabs?.find((tab) => tab.key === 'basic');
const form = basicTab?.children?.find((child) => child.component === 'DetailForm');
const items = basicTab?.children?.find((child) => child.component === 'EditableTable');

same((search?.fields || []).map((field) => [field.code, field.label]), expectedSearchFields, '查询字段不匹配');
same((list?.columns || []).map((column) => [column.code, column.label]), expectedListColumns, '列表字段不匹配');
same((detail?.tabs || []).map((tab) => tab.label), ['基础信息', '附件'], '页签不匹配');
same((form?.fields || []).map((field) => [field.code, field.label]), expectedDetailFields, '基础信息字段不匹配');
same((items?.columns || []).map((column) => [column.code, column.label]), expectedItemColumns, '申请明细字段不匹配');

const searchProject = search?.fields?.find((field) => field.code === 'projectName');
const searchDepartment = search?.fields?.find((field) => field.code === 'department');
if (searchProject?.component !== 'input') errors.push('查询项目必须使用输入框');
if (searchDepartment?.component !== 'select' || !(searchDepartment?.options || []).length) errors.push('查询申请部门必须使用有选项的下拉框');

if (items?.title !== '申请明细') errors.push('EditableTable 标题必须为申请明细');
if ((basicTab?.children || []).some((child) => child.component === 'AmountSummary')) errors.push('基础信息页签仍包含 AmountSummary');
const requiredFields = (form?.fields || []).filter((field) => field.required).map((field) => field.code);
same(requiredFields, ['purpose', 'expectedDate', 'projectName', 'reason'], '基础信息必填字段不匹配');
const purpose = form?.fields?.find((field) => field.code === 'purpose');
same(purpose?.options || [], expectedPurposeOptions, '申请用途选项不匹配');
const project = form?.fields?.find((field) => field.code === 'projectName');
if (project?.component !== 'select' || project?.value !== '通用项目' || project?.preserveOnCreate !== true) {
  errors.push('所属项目必须为下拉且新增默认通用项目');
}
const department = form?.fields?.find((field) => field.code === 'department');
const creator = form?.fields?.find((field) => field.code === 'creator');
if (!department?.readonly || department?.preserveOnCreate !== true || !creator?.readonly || creator?.preserveOnCreate !== true) {
  errors.push('申请人及其所属部门必须在新增时保留并只读显示');
}
const estimatedTotal = form?.fields?.find((field) => field.code === 'estimatedTotal');
same(estimatedTotal?.summarySource, { table: 'purchaseItems', column: 'estimatedAmount', precision: 2 }, '预估总金额汇总规则不匹配');
const estimatedAmount = items?.columns?.find((column) => column.code === 'estimatedAmount');
same(estimatedAmount?.calculatedBy, { type: 'multiply', fields: ['quantity', 'estimatedUnitPrice'], precision: 2 }, '明细预估金额计算规则不匹配');
if (items?.keepOperationColumn !== true) errors.push('申请明细操作列必须固定在最右侧');
same((items?.rowActions || []).map((action) => [action.code, action.label]), [['remove-row', '删除']], '申请明细操作必须仅保留删除');
const creatorLinkage = (schema.detailLinkages || []).find((linkage) => linkage.trigger === 'creator');
if (creatorLinkage?.records?.李杨洋?.fields?.department !== '技术研发部') errors.push('申请人与申请部门联动规则缺失');

const browser = await chromium.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

try {
  await page.goto(pathToFileURL(pagePath).href);
  const listView = page.locator('[data-page-view="list"]');
  same(
    await listView.locator('[data-component="ProSearchForm"] .form-label').allTextContents().then((labels) => labels.map((label) => label.trim())),
    expectedSearchFields.map(([, label]) => label),
    '生成页查询字段不匹配'
  );
  if (await listView.locator('[data-component="ProSearchForm"] [data-field="projectName"]').evaluate((element) => element.tagName) !== 'INPUT') {
    errors.push('生成页查询项目不是输入框');
  }
  if (await listView.locator('[data-component="ProSearchForm"] [data-field="department"]').evaluate((element) => element.tagName) !== 'SELECT') {
    errors.push('生成页查询申请部门不是下拉框');
  }
  same(
    await listView.locator('#purchase-requisition-table thead th').allTextContents().then((labels) => labels.map((label) => label.trim()).filter((label) => label && label !== '操作')),
    expectedListColumns.map(([, label]) => label),
    '生成页列表字段不匹配'
  );
  const listOverflow = await listView.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  if (listOverflow) errors.push('列表页存在表格外横向溢出');
  fs.mkdirSync(path.dirname(listScreenshotPath), { recursive: true });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: listScreenshotPath, fullPage: false });

  await listView.locator('[data-act="create"]:visible').click();
  const detailView = page.locator('[data-page-view="detail"]');
  same(
    await detailView.locator('#purchase-requisition-detail > .pro-tabs > .pro-tab').allTextContents().then((labels) => labels.map((label) => label.trim())),
    ['基础信息', '附件'],
    '生成页页签不匹配'
  );
  same(
    await detailView.locator('[data-tab-panel="basic"] [data-component="DetailForm"] .form-item').evaluateAll((items) => items.map((item) => [
      item.querySelector('[data-field]')?.getAttribute('data-field') || '',
      item.querySelector('.form-label')?.textContent?.trim() || ''
    ])),
    expectedDetailFields,
    '生成页基础信息字段不匹配'
  );

  const projectControl = detailView.locator('[data-field="projectName"]');
  if (await projectControl.inputValue() !== '通用项目') errors.push('新增页所属项目未默认通用项目');
  const creatorControl = detailView.locator('[data-field="creator"]');
  const departmentControl = detailView.locator('[data-field="department"]');
  if (await creatorControl.inputValue() !== '栗磊' || await departmentControl.inputValue() !== '项目交付部') {
    errors.push('新增页未按当前申请人自动显示申请部门');
  }
  await creatorControl.evaluate((element) => {
    element.value = '李杨洋';
    element.dispatchEvent(new Event('change', { bubbles: true }));
  });
  if (await departmentControl.inputValue() !== '技术研发部') errors.push('切换申请人后未同步更新申请部门');
  await creatorControl.evaluate((element) => {
    element.value = '栗磊';
    element.dispatchEvent(new Event('change', { bubbles: true }));
  });
  const purposeControl = detailView.locator('[data-field="purpose"]');
  same(
    await purposeControl.locator('option').evaluateAll((options) => options.slice(1).map((option) => option.textContent.trim())),
    expectedPurposeOptions,
    '生成页申请用途选项不匹配'
  );

  const itemTable = detailView.locator('#purchase-item-table');
  if ((await itemTable.locator('.section-title').textContent())?.trim() !== '申请明细') errors.push('生成页未显示申请明细标题');
  same(
    await itemTable.locator('thead th').allTextContents().then((labels) => labels.map((label) => label.trim()).filter((label) => label && label !== '操作')),
    expectedItemColumns.map(([, label]) => label),
    '生成页申请明细字段不匹配'
  );
  if (await detailView.locator('[data-component="AmountSummary"], .pro-amount-summary').count()) errors.push('生成页仍显示明细汇总卡片');

  const addRow = itemTable.locator('[data-act="add-row"]');
  await addRow.click();
  let itemRows = itemTable.locator('tbody tr:not([data-empty-row])');
  let firstRow = itemRows.first();
  await firstRow.locator('[data-field="quantity"]').fill('2');
  await firstRow.locator('[data-field="estimatedUnitPrice"]').fill('15.5');
  await firstRow.locator('[data-field="remark"]').fill('首行备注');
  if ((await firstRow.locator('[data-column="estimatedAmount"]').textContent())?.trim() !== '31.00') {
    errors.push('首行预估金额未按数量 × 预估单价计算');
  }
  if (await detailView.locator('[data-field="estimatedTotal"]').inputValue() !== '31.00') {
    errors.push('单行预估总金额未同步明细预估金额');
  }

  await addRow.click();
  itemRows = itemTable.locator('tbody tr:not([data-empty-row])');
  if (await itemRows.count() !== 2) errors.push('申请明细无法连续新增多行');
  const secondRow = itemRows.first();
  await secondRow.locator('[data-field="quantity"]').fill('3');
  await secondRow.locator('[data-field="estimatedUnitPrice"]').fill('10');
  if ((await secondRow.locator('[data-column="estimatedAmount"]').textContent())?.trim() !== '30.00') {
    errors.push('第二行预估金额未按数量 × 预估单价计算');
  }
  if (await detailView.locator('[data-field="estimatedTotal"]').inputValue() !== '61.00') {
    errors.push('预估总金额未汇总全部明细行预估金额');
  }
  if ((await itemTable.locator('[data-field="remark"]').evaluateAll((controls) => controls.map((control) => control.value))).filter((value) => value === '首行备注').length !== 1) {
    errors.push('申请明细备注未保留录入值');
  }
  const rowActionLabels = await itemRows.evaluateAll((rows) => rows.map((row) => Array.from(row.querySelectorAll('td.actions [data-act]')).map((button) => `${button.dataset.act}:${button.textContent.trim()}`)));
  if (rowActionLabels.some((actions) => JSON.stringify(actions) !== JSON.stringify(['remove-row:删除']))) {
    errors.push(`申请明细行操作不是仅删除: ${JSON.stringify(rowActionLabels)}`);
  }

  const tableScroll = itemTable.locator(':scope > .pro-table-scroll');
  const stickyBefore = await itemTable.evaluate((table) => {
    const header = table.querySelector('thead .schema-action-col');
    const cell = table.querySelector('tbody tr:not([data-empty-row]) td.actions');
    return {
      headerRight: header?.getBoundingClientRect().right,
      cellRight: cell?.getBoundingClientRect().right,
      headerPosition: header ? getComputedStyle(header).position : '',
      cellPosition: cell ? getComputedStyle(cell).position : '',
      headerRightStyle: header ? getComputedStyle(header).right : '',
      cellRightStyle: cell ? getComputedStyle(cell).right : ''
    };
  });
  await tableScroll.evaluate((element) => { element.scrollLeft = element.scrollWidth; });
  await page.waitForTimeout(50);
  const stickyAfter = await itemTable.evaluate((table) => {
    const header = table.querySelector('thead .schema-action-col');
    const cell = table.querySelector('tbody tr:not([data-empty-row]) td.actions');
    return { headerRight: header?.getBoundingClientRect().right, cellRight: cell?.getBoundingClientRect().right };
  });
  if (stickyBefore.headerPosition !== 'sticky' || stickyBefore.cellPosition !== 'sticky' || stickyBefore.headerRightStyle !== '0px' || stickyBefore.cellRightStyle !== '0px') {
    errors.push(`申请明细操作列未使用右侧固定样式: ${JSON.stringify(stickyBefore)}`);
  }
  if (Math.abs(stickyBefore.headerRight - stickyAfter.headerRight) > 1 || Math.abs(stickyBefore.cellRight - stickyAfter.cellRight) > 1) {
    errors.push(`申请明细操作列随横向滚动发生位移: ${JSON.stringify({ stickyBefore, stickyAfter })}`);
  }
  await tableScroll.evaluate((element) => { element.scrollLeft = 0; });
  const layout = await detailView.evaluate((element) => ({
    documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    visible: !element.hidden,
    detailWidth: element.getBoundingClientRect().width
  }));
  if (!layout.visible || layout.documentOverflow || layout.detailWidth <= 0) errors.push(`详情布局异常: ${JSON.stringify(layout)}`);
  fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
  await page.screenshot({ path: screenshotPath, fullPage: true });
} finally {
  await browser.close();
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('Purchase requisition smoke passed: fields, search controls, department linkage, amount calculations and fixed delete-only operation column.');
