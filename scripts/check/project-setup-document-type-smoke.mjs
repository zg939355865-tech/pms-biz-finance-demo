import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '../lib/playwright-smoke.mjs';

const expectedOptions = ['请选择', '设备验收单', '点位采集表', '算法技术方案', '培训记录表'];
const schemaPath = path.resolve('schemas/pages/project/project-setup.json');
const pagePath = path.resolve('pages/project-setup.html');
const screenshotPath = path.resolve('outputs/reports/visual/project-setup-document-type.png');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
const errors = [];

const detail = schema.regions.find((region) => region.id === 'project-setup-detail');
const stageTab = detail?.tabs?.find((tab) => tab.key === 'project-stages');
const table = stageTab?.children?.find((child) => child.component === 'EditableTable');
const columns = table?.columns || [];
const ownerIndex = columns.findIndex((column) => column.code === 'owner');
const documentTypeIndex = columns.findIndex((column) => column.code === 'documentType');
const plannedDaysIndex = columns.findIndex((column) => column.code === 'plannedDays');
const documentType = columns[documentTypeIndex];

if (documentTypeIndex !== ownerIndex + 1 || plannedDaysIndex !== documentTypeIndex + 1) {
  errors.push('文档类型必须位于负责人与预计工期(天)之间');
}
if (documentType?.label !== '文档类型' || documentType?.component !== 'select') {
  errors.push('文档类型必须使用下拉组件');
}
if (documentType?.required === true) errors.push('文档类型不得设为必填');
if (documentType?.placeholder !== '请选择') errors.push('文档类型占位项必须为请选择');
if (JSON.stringify(documentType?.options) !== JSON.stringify(expectedOptions.slice(1))) {
  errors.push('文档类型业务选项或顺序不正确');
}
if ((schema.mockData?.projectStages || []).some((row) => row.documentType !== '')) {
  errors.push('文档类型样例默认值必须为空');
}

const browser = await chromium.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(15000);

try {
  const url = new URL(pathToFileURL(pagePath));
  url.searchParams.set('sample', 'detail');
  url.searchParams.set('status', '草稿');
  url.searchParams.set('tab', 'project-stages');
  await page.goto(url.href, { waitUntil: 'commit', timeout: 15000 });

  const renderedTable = page.locator('[data-page-view="detail"] [data-component="EditableTable"]');
  const headers = (await renderedTable.locator('thead th').allTextContents()).map((value) => value.trim());
  const renderedOwnerIndex = headers.indexOf('负责人');
  const renderedDocumentTypeIndex = headers.indexOf('文档类型');
  const renderedPlannedDaysIndex = headers.indexOf('预计工期(天)');
  if (renderedDocumentTypeIndex !== renderedOwnerIndex + 1 || renderedPlannedDaysIndex !== renderedDocumentTypeIndex + 1) {
    errors.push('生成页面的文档类型列位置不正确');
  }

  const firstSelect = renderedTable.locator('tbody tr').first().locator('[data-column="documentType"] select');
  const renderedOptions = (await firstSelect.locator('option').allTextContents()).map((value) => value.trim());
  if (JSON.stringify(renderedOptions) !== JSON.stringify(expectedOptions)) {
    errors.push(`生成页面的文档类型选项不正确：${renderedOptions.join('、')}`);
  }
  if (await firstSelect.getAttribute('required')) errors.push('生成页面将文档类型标记为必填');
  if (await firstSelect.inputValue()) errors.push('文档类型初始值应为请选择');

  await firstSelect.selectOption({ label: '算法技术方案' });
  if (await firstSelect.inputValue() !== '算法技术方案') errors.push('文档类型下拉无法正常选择');

  await renderedTable.locator('[data-act="add-row"]').click();
  const addedSelect = renderedTable.locator('tbody tr').last().locator('[data-column="documentType"] select');
  if (await addedSelect.inputValue()) errors.push('新增阶段行的文档类型应默认为请选择');

  fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
  await renderedTable.screenshot({ path: screenshotPath });
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

console.log('Project setup document type smoke passed');
process.exit(0);
