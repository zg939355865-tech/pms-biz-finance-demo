import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '../lib/playwright-smoke.mjs';

const expectedDocumentTypeOptions = ['请选择', '设备验收单', '点位采集表', '算法技术方案', '培训记录表'];
const schemaPath = path.resolve('schemas/pages/project/project-setup.json');
const pagePath = path.resolve('pages/project-setup.html');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
const browser = await chromium.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(15000);
const errors = [];

const detail = schema.regions.find((region) => region.id === 'project-setup-detail');
const stageTab = detail?.tabs?.find((tab) => tab.key === 'project-stages');
const stageTable = stageTab?.children?.find((child) => child.component === 'EditableTable');
const stageColumns = stageTable?.columns || [];
const ownerColumnIndex = stageColumns.findIndex((column) => column.code === 'owner');
const documentTypeColumnIndex = stageColumns.findIndex((column) => column.code === 'documentType');
const plannedDaysColumnIndex = stageColumns.findIndex((column) => column.code === 'plannedDays');
const documentTypeColumn = stageColumns[documentTypeColumnIndex];

if (documentTypeColumnIndex !== ownerColumnIndex + 1 || plannedDaysColumnIndex !== documentTypeColumnIndex + 1) {
  errors.push('文档类型必须位于负责人与预计工期(天)之间');
}
if (documentTypeColumn?.label !== '文档类型' || documentTypeColumn?.component !== 'select') {
  errors.push('文档类型必须使用下拉组件');
}
if (documentTypeColumn?.required === true) errors.push('文档类型不得设为必填');
if (documentTypeColumn?.placeholder !== '请选择') errors.push('文档类型占位项必须为请选择');
if (JSON.stringify(documentTypeColumn?.options) !== JSON.stringify(expectedDocumentTypeOptions.slice(1))) {
  errors.push('文档类型业务选项或顺序不正确');
}
if ((schema.mockData?.projectStages || []).some((row) => row.documentType !== '')) {
  errors.push('文档类型样例默认值必须为空');
}

try {
  const url = new URL(pathToFileURL(pagePath));
  url.searchParams.set('sample', 'detail');
  url.searchParams.set('status', '草稿');
  url.searchParams.set('tab', 'project-stages');
  await page.goto(url.href, { waitUntil: 'commit', timeout: 15000 });

  const table = page.locator('[data-component="EditableTable"]');
  const headers = (await table.locator('thead th').allTextContents()).map((value) => value.trim());
  const companyIndex = headers.indexOf('协作公司');
  const ownerIndex = headers.indexOf('负责人');
  const documentTypeIndex = headers.indexOf('文档类型');
  const plannedDaysIndex = headers.indexOf('预计工期(天)');
  if (companyIndex < 0 || ownerIndex !== companyIndex + 1) {
    errors.push('协作公司必须位于负责人之前');
  }
  if (documentTypeIndex !== ownerIndex + 1 || plannedDaysIndex !== documentTypeIndex + 1) {
    errors.push('生成页面的文档类型列位置不正确');
  }

  const firstRow = table.locator('tbody tr').first();
  const companyOptions = (await firstRow.locator('[data-column="company"] option').allTextContents())
    .map((value) => value.trim())
    .filter(Boolean);
  const expectedCompanies = [
    '昕彤赋能（长沙）人工智能行业应用系统有限公司',
    '昕彤赋能（武汉）设计研究有限公司'
  ];
  if (JSON.stringify(companyOptions) !== JSON.stringify(expectedCompanies)) {
    errors.push(`公司选项不正确：${companyOptions.join('、')}`);
  }

  const documentTypeSelect = firstRow.locator('[data-column="documentType"] select');
  const documentTypeOptions = (await documentTypeSelect.locator('option').allTextContents())
    .map((value) => value.trim());
  if (JSON.stringify(documentTypeOptions) !== JSON.stringify(expectedDocumentTypeOptions)) {
    errors.push(`文档类型选项不正确：${documentTypeOptions.join('、')}`);
  }
  if (await documentTypeSelect.getAttribute('required')) errors.push('生成页面将文档类型标记为必填');
  if (await documentTypeSelect.inputValue()) errors.push('文档类型初始值应为请选择');
  await documentTypeSelect.selectOption({ label: '算法技术方案' });
  if (await documentTypeSelect.inputValue() !== '算法技术方案') errors.push('文档类型下拉无法正常选择');

  const sequence = firstRow.locator('[data-column="sequence"]');
  const scroll = table.locator('.pro-table-scroll');
  const before = await sequence.boundingBox();
  await scroll.evaluate((element) => { element.scrollLeft = 480; });
  const after = await sequence.boundingBox();
  if (!before || !after || Math.abs(before.x - after.x) > 1) {
    errors.push('序号列未在左右滚动时冻结');
  }

  await firstRow.locator('[data-column="plannedStartDate"] input').fill('2026-08-01');
  await firstRow.locator('[data-column="plannedDays"] input').fill('5');
  const finishCell = firstRow.locator('[data-column="plannedFinishDate"]');
  if ((await finishCell.textContent()).trim() !== '2026-08-06') {
    errors.push('计划完成日期未按计划开始日期和预计工期自动计算');
  }
  if (await finishCell.locator('input,select,textarea').count()) {
    errors.push('计划完成日期仍可编辑');
  }
  if (await firstRow.locator(
    '[data-column="actualStartDate"] input, ' +
    '[data-column="actualFinishDate"] input, ' +
    '[data-column="actualDays"] input'
  ).count()) {
    errors.push('实际开始日期、实际完成日期或实际工期仍可编辑');
  }

  await table.locator('[data-act="add-row"]').click();
  const addedRow = table.locator('tbody tr').last();
  if (await addedRow.locator('[data-column="documentType"] select').inputValue()) {
    errors.push('新增阶段行的文档类型应默认为请选择');
  }
  if ((await addedRow.locator('[data-column="plannedFinishDate"]').textContent()).trim()) {
    errors.push('新增阶段行继承了计划完成日期');
  }
  if ((await addedRow.locator('[data-column="actualStartDate"]').textContent()).trim() ||
      (await addedRow.locator('[data-column="actualFinishDate"]').textContent()).trim() ||
      (await addedRow.locator('[data-column="actualDays"]').textContent()).trim()) {
    errors.push('新增阶段行继承了实际执行数据');
  }
} finally {
  await Promise.race([
    browser.close(),
    new Promise((resolve) => setTimeout(resolve, 3000))
  ]);
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('Project setup stage smoke passed');
process.exit(0);
