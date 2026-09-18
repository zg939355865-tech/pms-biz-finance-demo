import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '../lib/playwright-smoke.mjs';

const schemaPath = 'schemas/pages/material/inout-ledger.json';
const pagePath = 'pages/material/inout-ledger.html';
const reportDir = path.resolve('outputs/reports/visual/material');
const expectedHeaders = ['移动业务', '业务单据', '业务日期', '物资类型', '物资名称', '规格', '单位', '移动数量', '当时剩余数量', '库位', '库存地点', '供应商', '创建人', '创建时间', '审核人', '审核时间', '流水号', '行号'];
const expectedTypes = ['采购入库-蓝字', '采购入库-红字', '物资出库-蓝字', '物资出库-红字', '盘亏出库', '报废出库', '其他出库', '盘盈入库', '期初补录', '其他入库'];
const positiveTypes = new Set(['采购入库-蓝字', '物资出库-红字', '盘盈入库', '期初补录', '其他入库']);
const negativeTypes = new Set(['采购入库-红字', '物资出库-蓝字', '盘亏出库', '报废出库', '其他出库']);
const errors = [];
const expect = (condition, message) => { if (!condition) errors.push(message); };
fs.mkdirSync(reportDir, { recursive: true });

const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
const records = schema.mockData.records;
expect(records.length === 15, 'Schema 应包含15条流水样例');
expect(JSON.stringify([...new Set(records.map((row) => row.movementBusiness))].sort()) === JSON.stringify([...expectedTypes].sort()), 'Schema 未完整覆盖十类移动业务');
expect(records.every((row) => positiveTypes.has(row.movementBusiness) ? row.movementQuantity > 0 : negativeTypes.has(row.movementBusiness) && row.movementQuantity < 0), '移动数量正负号与移动业务不一致');
expect(new Set(records.map((row) => row.ledgerNo)).size === records.length, '流水号不唯一');
expect(records.every((row, index) => row.ledgerNo === String(records.length - index).padStart(12, '0')), '流水号未按倒序连续展示');
expect(records.every((row) => !Object.hasOwn(row, 'inboundDate')), '样例数据仍包含已移除的入库日期');
expect(records.every((row) => ['采购入库-蓝字', '采购入库-红字'].includes(row.movementBusiness) ? row.supplier && row.supplier !== '—' : row.supplier === '—'), '供应商未严格限定为采购入库蓝字/红字');
const searchRegion = schema.regions.find((region) => region.id === 'inout-ledger-search');
const tableRegion = schema.regions.find((region) => region.id === 'inout-ledger-table');
expect(searchRegion.fields.length === 9, '查询条件不是精简后的9项');
expect(!searchRegion.fields.some((field) => field.code === 'inboundDate'), '查询条件仍包含入库日期');
expect(!searchRegion.fields.some((field) => ['creator', 'reviewer'].includes(field.code)), '查询条件仍包含创建人或审核人');
expect(searchRegion.fields.find((field) => field.code === 'movementBusiness')?.component === 'select', '移动业务查询条件不是单选下拉');
expect(!tableRegion.columns.some((column) => column.code === 'inboundDate'), '列表仍包含入库日期');
expect(!tableRegion.columns.find((column) => column.code === 'ledgerNo').fixed && !tableRegion.columns.find((column) => column.code === 'lineNo').fixed, '流水号或行号仍配置为固定列');
const sameDocumentRows = records.filter((row) => row.businessDocument === 'GR20260818002').sort((left, right) => left.lineNo - right.lineNo);
expect(sameDocumentRows.length === 2 && sameDocumentRows[0].ledgerNo !== sameDocumentRows[1].ledgerNo, '同单不同行未生成不同流水号');
expect(sameDocumentRows[0].remainingQuantity === 2 && sameDocumentRows[1].remainingQuantity === 5, '同单同维度余额未按行号承接');

const sourceChecks = [
  ['schemas/pages/procurement/purchase-receipt.json', 'receipts', 'receiptNo', 'receiptItems', '采购入库'],
  ['schemas/pages/material/material-outbound.json', 'outboundDocuments', 'outboundNo', 'outboundItems', '物资出库'],
  ['schemas/pages/material/other-outbound.json', 'otherOutboundDocuments', 'outboundNo', 'otherOutboundItems', '其他出库'],
  ['schemas/pages/material/other-inbound.json', 'otherInboundDocuments', 'inboundNo', 'otherInboundItems', '其他入库']
];
for (const [file, listKey, noKey, itemsKey, sourcePage] of sourceChecks) {
  const sourceSchema = JSON.parse(fs.readFileSync(file, 'utf8'));
  const documents = sourceSchema.mockData[listKey];
  for (const record of records.filter((row) => row.sourcePage === sourcePage)) {
    const source = documents.find((document) => document[noKey] === record.businessDocument);
    expect(Boolean(source), `${sourcePage}来源单据不存在: ${record.businessDocument}`);
    expect(source?.status === '已审核', `${sourcePage}来源单据不是已审核: ${record.businessDocument}`);
    expect((source?.[itemsKey] || []).length >= record.lineNo, `${sourcePage}来源行不存在: ${record.businessDocument}/${record.lineNo}`);
  }
}

const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
for (const width of [1024, 1440, 2048]) {
  const page = await browser.newPage({ viewport: { width, height: 1200 } });
  page.on('pageerror', (error) => errors.push(`inout-ledger@${width} pageerror: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error' && !message.text().includes('Failed to load resource')) errors.push(`inout-ledger@${width} console: ${message.text()}`); });
  await page.route(/^https?:/, (route) => route.abort());
  await page.goto(pathToFileURL(path.resolve(pagePath)).href, { waitUntil: 'domcontentloaded', timeout: 10000 });
  await page.waitForTimeout(200);

  const table = page.locator('#inout-ledger-table');
  const headers = (await table.locator('thead th').allTextContents()).map((value) => value.trim());
  expect((await page.locator('h1').first().textContent())?.trim() === '出入库流水', `inout-ledger@${width} 页面标题错误`);
  expect(headers.join(',') === expectedHeaders.join(','), `inout-ledger@${width} 列表字段或顺序错误: ${headers.join(',')}`);
  expect(await table.locator('tbody > tr:not([data-empty-row])').count() === 15, `inout-ledger@${width} 不是15条样例`);
  expect(await table.locator('tbody > tr:visible:not([data-empty-row])').count() === 5, `inout-ledger@${width} 首屏不是5条`);
  expect((await table.locator('[data-record-count]').textContent())?.trim() === '共 15 条记录', `inout-ledger@${width} 总记录数错误`);
  expect(await table.locator('select.page-size-select').count() === 0, `inout-ledger@${width} 出现页容量下拉`);
  expect((await table.locator('[data-fixed-page-size]').textContent())?.trim() === '5条/页', `inout-ledger@${width} 未显示固定每页5条`);
  expect(await page.locator('[data-act="create"],[data-act="edit"],[data-act="delete"],[data-act="batch-delete"],[data-act="audit"],[data-act="reverse-audit"]').count() === 0, `inout-ledger@${width} 出现维护操作`);
  expect(await page.locator('[data-field="inboundDate"],[data-field="inboundDateStart"],[data-field="inboundDateEnd"],[data-column="inboundDate"]').count() === 0, `inout-ledger@${width} 仍渲染入库日期`);
  expect(await page.locator('#inout-ledger-search [data-field="creator"],#inout-ledger-search [data-field="reviewer"]').count() === 0, `inout-ledger@${width} 查询区仍渲染创建人或审核人`);
  expect(await table.locator('tbody [data-column="businessDocument"] a[data-navigation]').count() === 15, `inout-ledger@${width} 业务单据未全部生成穿透链接`);
  const renderedSuppliers = await table.locator('tbody > tr:not([data-empty-row])').evaluateAll((rows) => rows.map((row) => ({ movementBusiness: JSON.parse(row.dataset.rowValue).movementBusiness, supplier: row.querySelector('[data-column="supplier"]').textContent.trim() })));
  expect(renderedSuppliers.every((row) => ['采购入库-蓝字', '采购入库-红字'].includes(row.movementBusiness) ? row.supplier !== '—' : row.supplier === '—'), `inout-ledger@${width} 页面供应商展示边界错误`);

  const layout = await page.evaluate(() => {
    const tableRoot = document.querySelector('#inout-ledger-table');
    const scroll = tableRoot.querySelector('.pro-table-scroll');
    const first = tableRoot.querySelector('tbody tr:not([hidden]) [data-column="movementBusiness"]');
    const second = tableRoot.querySelector('tbody tr:not([hidden]) [data-column="businessDocument"]');
    const ledger = tableRoot.querySelector('tbody tr:not([hidden]) [data-column="ledgerNo"]');
    const line = tableRoot.querySelector('tbody tr:not([hidden]) [data-column="lineNo"]');
    return {
      tableOverflow: scroll.scrollWidth > scroll.clientWidth + 1,
      pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      pageVerticalOverflow: document.documentElement.scrollHeight > innerHeight + 1,
      firstPosition: getComputedStyle(first).position,
      firstLeft: getComputedStyle(first).left,
      secondPosition: getComputedStyle(second).position,
      secondLeft: getComputedStyle(second).left,
      ledgerPosition: getComputedStyle(ledger).position,
      ledgerRight: getComputedStyle(ledger).right,
      linePosition: getComputedStyle(line).position,
      lineRight: getComputedStyle(line).right
    };
  });
  expect(layout.tableOverflow, `inout-ledger@${width} 宽表未在表格区产生横向滚动`);
  expect(!layout.pageOverflow, `inout-ledger@${width} 出现页面级横向溢出`);
  expect(!layout.pageVerticalOverflow, `inout-ledger@${width} 五行列表出现页面级纵向滚动`);
  expect(layout.firstPosition === 'sticky' && layout.firstLeft === '0px', `inout-ledger@${width} 移动业务未固定左侧`);
  expect(layout.secondPosition === 'sticky' && layout.secondLeft === '152px', `inout-ledger@${width} 业务单据未固定左侧`);
  expect(layout.ledgerPosition !== 'sticky' && layout.ledgerRight === 'auto', `inout-ledger@${width} 流水号仍固定右侧`);
  expect(layout.linePosition !== 'sticky' && layout.lineRight === 'auto', `inout-ledger@${width} 行号仍固定右侧`);

  const firstPositive = table.locator('tbody > tr[data-row-index="0"] [data-column="movementQuantity"]');
  const firstNegative = table.locator('tbody > tr[data-row-index="3"] [data-column="movementQuantity"]');
  expect((await firstPositive.textContent())?.trim() === '+2.00', `inout-ledger@${width} 正数未显示正号和两位小数`);
  expect((await firstNegative.textContent())?.trim() === '-2.00', `inout-ledger@${width} 负数格式错误`);
  expect(await firstPositive.evaluate((cell) => getComputedStyle(cell).color) === 'rgb(21, 128, 61)', `inout-ledger@${width} 正数颜色错误`);
  expect(await firstNegative.evaluate((cell) => getComputedStyle(cell).color) === 'rgb(220, 38, 38)', `inout-ledger@${width} 负数颜色错误`);

  if (width === 1440) {
    const search = page.locator('#inout-ledger-search');
    const movementSelect = search.locator('select[data-field="movementBusiness"]');
    expect(await movementSelect.count() === 1, '移动业务未渲染为单选下拉');
    const optionLabels = (await movementSelect.locator('option').allTextContents()).map((value) => value.trim());
    expect(optionLabels.join(',') === ['请选择', ...expectedTypes, '固资转固'].join(','), `移动业务下拉选项错误: ${optionLabels.join(',')}`);
    await movementSelect.selectOption('固资转固');
    await search.locator('[data-act="query"]').click();
    expect((await table.locator('[data-record-count]').textContent())?.trim() === '共 0 条记录', '固资转固无样例时未显示零条记录');
    expect(await table.locator('tbody > tr[data-row-index]:visible').count() === 0, '固资转固筛选混入其他移动业务');
    await page.screenshot({ path: path.join(reportDir, 'inout-ledger-capitalization-filter.png'), fullPage: true });
    await search.locator('[data-act="reset"]').click();
    expect(await movementSelect.inputValue() === '', '重置未清空固资转固条件');
    expect((await table.locator('[data-record-count]').textContent())?.trim() === '共 15 条记录', '固资转固筛选重置未恢复原有流水');
    await movementSelect.selectOption('物资出库-红字');
    await search.locator('[data-act="query"]').click();
    expect((await table.locator('[data-record-count]').textContent())?.trim() === '共 2 条记录', '移动业务单选筛选结果错误');
    const filteredTypes = await table.locator('tbody > tr:visible:not([data-empty-row])').evaluateAll((rows) => rows.map((row) => JSON.parse(row.dataset.rowValue).movementBusiness));
    expect(filteredTypes.every((value) => value === '物资出库-红字'), '移动业务单选筛选包含未选类型');
    await page.screenshot({ path: path.join(reportDir, 'inout-ledger-movement-single-select.png'), fullPage: true });
    await search.locator('[data-act="reset"]').click();

    await search.locator('[data-field="inventoryLocation"]').selectOption('武汉中心仓');
    const bins = await search.locator('[data-field="storageBin"] option').evaluateAll((options) => options.map((option) => option.value).filter(Boolean));
    expect(JSON.stringify(bins) === JSON.stringify(['A-01-0101', 'A-03-0302', 'B-01-0104', 'B-04-0401', 'E-01-0101']), '库存地点与库位未正确联动');
    await search.locator('[data-field="businessDateStart"]').fill('2026-09-02');
    await search.locator('[data-act="query"]').click();
    expect((await table.locator('[data-record-count]').textContent())?.trim() === '共 2 条记录', '业务日期与库存地点组合筛选错误');
    await search.locator('[data-act="reset"]').click();
    await page.screenshot({ path: path.join(reportDir, 'inout-ledger.png'), fullPage: true });
  }
  if ([1440, 2048].includes(width)) await page.screenshot({ path: path.join(reportDir, `inout-ledger-${width}.png`), fullPage: true });
  await page.close();
}

const menuPage = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
menuPage.on('pageerror', (error) => errors.push(`menu pageerror: ${error.message}`));
await menuPage.route(/^https?:/, (route) => route.abort());
await menuPage.goto(pathToFileURL(path.resolve('menu/index.html')).href, { waitUntil: 'domcontentloaded', timeout: 10000 });
const materialMenu = menuPage.locator('.menu-primary', { hasText: '物资管理' });
await materialMenu.click();
const menuItem = materialMenu.locator('xpath=..').locator('.submenu button', { hasText: '出入库流水' });
expect(await menuItem.getAttribute('data-path') === 'material/inout-ledger.html', '菜单未绑定出入库流水路由');
await menuItem.click();
await menuPage.waitForTimeout(250);
const frame = menuPage.locator('#contentFrame');
expect((await frame.getAttribute('src'))?.endsWith('material/inout-ledger.html'), '菜单未打开出入库流水页面');
const ledgerFrame = frame.contentFrame();
await ledgerFrame.locator('#inout-ledger-table tbody > tr[data-row-index="0"] [data-column="businessDocument"] a').click();
await menuPage.waitForTimeout(500);
expect((await frame.getAttribute('src'))?.includes('material/other-inbound.html?sample=detail'), '业务单据未路由到其他入库详情');
const sourceFrame = frame.contentFrame();
expect(await sourceFrame.locator('[data-page-view="detail"]').isVisible(), '来源单据未打开详情视图');
expect(await sourceFrame.locator('[data-page-view="detail"] [data-field="inboundNo"]').inputValue() === 'QTRK2026090012', '来源详情未定位到对应业务单据');
expect(await sourceFrame.locator('[data-page-view="detail"] [data-field="businessType"]').inputValue() === '其他入库', '来源详情业务类型与流水不一致');
await menuPage.screenshot({ path: path.join(reportDir, 'inout-ledger-source-navigation.png'), fullPage: true });
await menuPage.close();

const directPage = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
directPage.on('pageerror', (error) => errors.push(`direct pageerror: ${error.message}`));
await directPage.route(/^https?:/, (route) => route.abort());
await directPage.goto(pathToFileURL(path.resolve(pagePath)).href, { waitUntil: 'domcontentloaded', timeout: 10000 });
await directPage.locator('#inout-ledger-table tbody > tr[data-row-index="0"] [data-column="businessDocument"] a').click();
await directPage.waitForTimeout(250);
expect(directPage.url().includes('/pages/material/other-inbound.html?sample=detail'), '页面直开时业务单据未正确解析为 pages 根目录路由');
expect(await directPage.locator('[data-page-view="detail"] [data-field="inboundNo"]').inputValue() === 'QTRK2026090012', '页面直开时来源详情未定位到对应业务单据');
await directPage.close();

const browserClosed = await Promise.race([browser.close().then(() => true), new Promise((resolve) => setTimeout(() => resolve(false), 5000))]);
if (!browserClosed) console.warn('Browser close timed out after all page checks completed; forcing test-process exit.');
const report = {
  page: pagePath,
  checkedAt: new Date().toISOString(),
  status: errors.length ? 'failed' : 'passed',
  issues: errors,
  screenshots: ['inout-ledger.png', 'inout-ledger-movement-single-select.png', 'inout-ledger-source-navigation.png'].map((name) => `outputs/reports/visual/material/${name}`)
};
fs.writeFileSync(path.join(reportDir, 'inout-ledger-smoke.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('In/out ledger smoke passed: exact fields, single-select movement options, signed quantities, supplier boundary, balances, scroll columns, filters, pagination, menu route and source-document traceability');
process.exit(0);
