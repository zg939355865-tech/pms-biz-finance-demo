import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '../lib/playwright-smoke.mjs';

const file = 'pages/material/current-inventory.html';
const schemaPath = 'schemas/pages/material/current-inventory.json';
const expectedHeaders = ['物资类型', '物资名称', '规格', '单位', '库存余量', '库存地点', '库位'];
const errors = [];
const reportDir = path.resolve('outputs/reports/visual/material');
fs.mkdirSync(reportDir, { recursive: true });

const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
if (schema.mockData.records.length !== 12) errors.push('current-inventory: expected 12 sample records');

const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
for (const width of [1024, 1440, 2048]) {
  const page = await browser.newPage({ viewport: { width, height: 1000 } });
  page.on('pageerror', (error) => errors.push(`current-inventory@${width}: ${error.message}`));
  await page.route(/^https?:/, (route) => route.abort());
  await page.goto(pathToFileURL(path.resolve(file)).href, { waitUntil: 'domcontentloaded', timeout: 10000 });
  await page.waitForTimeout(600);

  const table = page.locator('[data-component="ProTable"]').first();
  const headers = (await table.locator('thead th').allTextContents()).map((value) => value.trim());
  const visibleRows = table.locator('tbody > tr:visible:not([data-filter-empty-row])');
  const metrics = await page.evaluate(() => {
    const textLeft = (element) => {
      const textNode = [...element.childNodes].find((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
      if (!textNode) return element.getBoundingClientRect().left;
      const range = document.createRange();
      range.selectNodeContents(textNode);
      return range.getBoundingClientRect().left;
    };
    const searchLabel = document.querySelector('#current-inventory-search .form-label');
    const firstHeader = document.querySelector('#current-inventory-table thead th:first-child');
    const firstCell = document.querySelector('#current-inventory-table tbody tr:not([hidden]) td:first-child');
    const scroll = document.querySelector('#current-inventory-table .pro-table-scroll');
    const headerWidths = [...document.querySelectorAll('#current-inventory-table thead th')].map((element) => element.getBoundingClientRect().width);
    return {
      searchLeft: textLeft(searchLabel),
      headerLeft: textLeft(firstHeader),
      cellLeft: textLeft(firstCell),
      headerWidths,
      tableHorizontalOverflow: scroll.scrollWidth > scroll.clientWidth + 1,
      pageHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      documentHeight: document.documentElement.scrollHeight,
      viewportHeight: innerHeight
    };
  });

  if ((await page.locator('h1').first().textContent())?.trim() !== '即时汇总库存') errors.push(`current-inventory@${width}: wrong title`);
  if (headers.join(',') !== expectedHeaders.join(',')) errors.push(`current-inventory@${width}: wrong headers`);
  const storageBin = page.locator('#current-inventory-search [data-field="storageBin"]');
  const inventoryLocation = page.locator('#current-inventory-search [data-field="inventoryLocation"]');
  const showZeroStock = page.locator('#current-inventory-search [data-field="showZeroStock"]');
  if (await page.locator('#current-inventory-search .form-label', { hasText: '库存范围' }).count()) errors.push(`current-inventory@${width}: redundant inventory-range label must not be rendered`);
  if (!await page.locator('#current-inventory-search .schema-check', { hasText: '显示零库存' }).count()) errors.push(`current-inventory@${width}: show-zero-stock checkbox text is missing`);
  if (await storageBin.evaluate((element) => element.tagName) !== 'SELECT') errors.push(`current-inventory@${width}: storage-bin filter must be a dropdown`);
  if (!await storageBin.isDisabled() || await storageBin.getAttribute('aria-disabled') !== 'true' || await storageBin.locator('option').count() !== 1) errors.push(`current-inventory@${width}: storage-bin filter must be disabled and empty before selecting inventory location`);
  await inventoryLocation.selectOption('武汉中心仓');
  const wuhanBins = await storageBin.locator('option').evaluateAll((options) => options.map((option) => option.value).filter(Boolean));
  if (await storageBin.isDisabled() || await storageBin.getAttribute('aria-disabled') !== 'false' || wuhanBins.join(',') !== ['A-01-0101', 'A-03-0302', 'B-01-0104', 'B-04-0401', 'D-01-0101', 'E-01-0101'].join(',')) errors.push(`current-inventory@${width}: Wuhan storage bins are not correctly cascaded`);
  await storageBin.selectOption('A-01-0101');
  await inventoryLocation.selectOption('长沙项目仓');
  const changshaBins = await storageBin.locator('option').evaluateAll((options) => options.map((option) => option.value).filter(Boolean));
  if (await storageBin.inputValue() || changshaBins.join(',') !== ['B-02-0203', 'D-02-0202'].join(',')) errors.push(`current-inventory@${width}: changing inventory location must clear the old bin and reload dependent options`);
  await inventoryLocation.selectOption('');
  if (!await storageBin.isDisabled() || await storageBin.inputValue() || await storageBin.locator('option').count() !== 1) errors.push(`current-inventory@${width}: clearing inventory location must clear and disable storage bin`);
  if (await page.locator('#current-inventory-search [data-field="receiptDateStart"],#current-inventory-search [data-field="receiptDateEnd"],#current-inventory-search [data-field="supplierName"],#current-inventory-search [data-field="projectName"]').count()) errors.push(`current-inventory@${width}: removed receipt-date, supplier or project filter is still rendered`);
  if (await showZeroStock.getAttribute('type') !== 'checkbox' || await showZeroStock.isChecked()) errors.push(`current-inventory@${width}: show-zero-stock must be an unchecked checkbox by default`);
  const zeroRow = table.locator('tbody > tr[data-row-index="9"]');
  if (await zeroRow.getAttribute('data-filter-match') !== 'false') errors.push(`current-inventory@${width}: zero-stock row must be hidden by default`);
  if ((await table.locator('[data-record-count]').innerText()).trim() !== '共 11 条记录') errors.push(`current-inventory@${width}: default record count must exclude zero stock`);
  if (await visibleRows.count() !== 5) errors.push(`current-inventory@${width}: first page must show 5 rows`);
  if (!await table.getByText('5条/页', { exact: true }).count()) errors.push(`current-inventory@${width}: fixed page-size label is missing`);
  if (await table.locator('select').count()) errors.push(`current-inventory@${width}: page-size dropdown must not exist`);
  if (await page.locator('[data-act="create"],[data-act="delete"],[data-act="batch-delete"],[data-act="audit"],[data-act="reverse-audit"]').count()) errors.push(`current-inventory@${width}: modifying action is visible`);
  if (Math.abs(metrics.searchLeft - metrics.headerLeft) > 1 || Math.abs(metrics.searchLeft - metrics.cellLeft) > 1) errors.push(`current-inventory@${width}: search label and first column are not left aligned`);
  if (metrics.tableHorizontalOverflow) errors.push(`current-inventory@${width}: unnecessary table horizontal scrollbar`);
  if (metrics.pageHorizontalOverflow) errors.push(`current-inventory@${width}: page-level horizontal overflow`);
  if (metrics.documentHeight > metrics.viewportHeight + 1) errors.push(`current-inventory@${width}: list page requires vertical scrolling`);
  const [categoryWidth, nameWidth, specificationWidth, unitWidth, quantityWidth, locationWidth, binWidth] = metrics.headerWidths;
  if (!(nameWidth > categoryWidth && specificationWidth > nameWidth && unitWidth < categoryWidth && quantityWidth < specificationWidth && locationWidth > categoryWidth && binWidth > categoryWidth)) errors.push(`current-inventory@${width}: semantic column width distribution is incorrect`);

  await showZeroStock.check();
  await page.locator('#current-inventory-search [data-act="query"]').click();
  if (await zeroRow.getAttribute('data-filter-match') !== 'true') errors.push(`current-inventory@${width}: checked show-zero-stock must include zero-stock rows`);
  if ((await table.locator('[data-record-count]').innerText()).trim() !== '共 12 条记录') errors.push(`current-inventory@${width}: checked record count must include zero stock`);
  await page.locator('#current-inventory-search [data-act="reset"]').click();
  if (await showZeroStock.isChecked() || await zeroRow.getAttribute('data-filter-match') !== 'false') errors.push(`current-inventory@${width}: reset must restore zero-stock exclusion`);

  if (width === 1440) await page.screenshot({ path: path.join(reportDir, 'current-inventory.png'), fullPage: true });
  await page.close();
}

const menuPage = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
menuPage.on('pageerror', (error) => errors.push(`menu: ${error.message}`));
await menuPage.route(/^https?:/, (route) => route.abort());
await menuPage.goto(pathToFileURL(path.resolve('menu/index.html')).href, { waitUntil: 'domcontentloaded', timeout: 10000 });
const materialMenu = menuPage.locator('.menu-primary', { hasText: '物资管理' });
await materialMenu.click();
const section = materialMenu.locator('xpath=..');
const menuNames = (await section.locator('.submenu button').allTextContents()).map((value) => value.trim());
if (menuNames.join(',') !== ['即时汇总库存', '出入库流水', '物资出库', '其他出库', '其他入库', '固资领用'].join(',')) errors.push(`menu: material entries are incorrect: ${menuNames.join(',')}`);
const item = section.locator('.submenu button', { hasText: '即时汇总库存' });
if (await item.getAttribute('data-path') !== 'material/current-inventory.html') errors.push('menu: current inventory path is incorrect');
await item.click();
await menuPage.waitForTimeout(600);
if (!(await menuPage.locator('#contentFrame').getAttribute('src'))?.endsWith('material/current-inventory.html')) errors.push('menu: iframe did not navigate to current inventory');
if (await menuPage.locator('#breadcrumbModule').innerText() !== '物资管理') errors.push('menu: module breadcrumb is incorrect');
if (await menuPage.locator('#breadcrumbPage').innerText() !== '即时汇总库存') errors.push('menu: page breadcrumb is incorrect');
await menuPage.screenshot({ path: path.join(reportDir, 'menu-binding.png'), fullPage: true });
await menuPage.close();

const browserClosed = await Promise.race([browser.close().then(() => true), new Promise((resolve) => setTimeout(() => resolve(false), 5000))]);
if (!browserClosed) console.warn('Browser close timed out after all page checks completed; forcing test-process exit.');
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Current inventory smoke passed: filters, layout, alignment, menu and three desktop viewports');
}
process.exit(process.exitCode || 0);
