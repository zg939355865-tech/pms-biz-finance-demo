import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '../lib/playwright-smoke.mjs';

const file = 'pages/report/inventory-price-summary.html';
const schemaPath = 'schemas/pages/report/inventory-price-summary.json';
const expectedHeaders = ['物资类型', '物资名称', '规格', '单位', '移动平均价', '最近成交价', '最高价', '最低价'];
const errors = [];
const reportDir = path.resolve('outputs/reports/visual/report');
fs.mkdirSync(reportDir, { recursive: true });

const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
if (schema.mockData.records.length !== 12) errors.push('inventory-price-summary: expected 12 sample records');

const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
for (const width of [1024, 1440, 2048]) {
  const page = await browser.newPage({ viewport: { width, height: 1000 } });
  page.on('pageerror', (error) => errors.push(`inventory-price-summary@${width}: ${error.message}`));
  await page.route(/^https?:/, (route) => route.abort());
  await page.goto(pathToFileURL(path.resolve(file)).href, { waitUntil: 'domcontentloaded', timeout: 10000 });
  await page.waitForTimeout(600);

  const table = page.locator('#inventory-price-summary-table');
  const headers = (await table.locator('thead th').allTextContents()).map((value) => value.trim());
  const visibleRows = table.locator('tbody > tr:visible:not([data-filter-empty-row])');
  const metrics = await page.evaluate(() => {
    const scroll = document.querySelector('#inventory-price-summary-table .pro-table-scroll');
    const widths = [...document.querySelectorAll('#inventory-price-summary-table thead th')].map((element) => element.getBoundingClientRect().width);
    return {
      tableHorizontalOverflow: scroll.scrollWidth > scroll.clientWidth + 1,
      pageHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      documentHeight: document.documentElement.scrollHeight,
      viewportHeight: innerHeight,
      widths
    };
  });

  if ((await page.locator('h1').first().textContent())?.trim() !== '库存价格汇总') errors.push(`inventory-price-summary@${width}: wrong title`);
  if (headers.join(',') !== expectedHeaders.join(',')) errors.push(`inventory-price-summary@${width}: wrong headers`);
  if (await page.locator('#inventory-price-summary-search [data-field="purchaseCategory"]').evaluate((element) => element.tagName) !== 'SELECT') errors.push(`inventory-price-summary@${width}: purchase category must be select`);
  if (await page.locator('#inventory-price-summary-search [data-field="itemName"]').evaluate((element) => element.tagName) !== 'INPUT') errors.push(`inventory-price-summary@${width}: purchase name must be search input`);
  if (await visibleRows.count() !== 5) errors.push(`inventory-price-summary@${width}: first page must show 5 rows`);
  if ((await table.locator('[data-record-count]').innerText()).trim() !== '共 12 条记录') errors.push(`inventory-price-summary@${width}: record count must be 12`);
  if (!await table.getByText('5条/页', { exact: true }).count()) errors.push(`inventory-price-summary@${width}: fixed page-size label is missing`);
  if (await table.locator('select').count()) errors.push(`inventory-price-summary@${width}: page-size dropdown must not exist`);
  if (await page.locator('[data-act="create"],[data-act="delete"],[data-act="batch-delete"],[data-act="audit"],[data-act="reverse-audit"],[data-act="export"]').count()) errors.push(`inventory-price-summary@${width}: modifying or export action is visible`);
  if (metrics.pageHorizontalOverflow) errors.push(`inventory-price-summary@${width}: page-level horizontal overflow`);
  if (metrics.documentHeight > metrics.viewportHeight + 1) errors.push(`inventory-price-summary@${width}: list page requires vertical scrolling`);
  const [, nameWidth, specificationWidth, unitWidth, movingWidth, latestWidth, highestWidth, lowestWidth] = metrics.widths;
  if (!(specificationWidth > nameWidth && nameWidth > unitWidth && movingWidth > unitWidth && Math.abs(latestWidth - movingWidth) < 1 && Math.abs(highestWidth - lowestWidth) < 1)) errors.push(`inventory-price-summary@${width}: semantic column width distribution is incorrect`);
  const priceCells = await table.locator('tbody > tr:visible:not([data-filter-empty-row]) td[data-column="movingAveragePrice"],tbody > tr:visible:not([data-filter-empty-row]) td[data-column="latestTransactionPrice"],tbody > tr:visible:not([data-filter-empty-row]) td[data-column="highestPrice"],tbody > tr:visible:not([data-filter-empty-row]) td[data-column="lowestPrice"]').evaluateAll((cells) => cells.map((cell) => ({ text: cell.textContent.trim(), align: getComputedStyle(cell).textAlign })));
  if (priceCells.some((cell) => cell.align !== 'right' || !/^-?[\d,]+\.\d{4}$/.test(cell.text))) errors.push(`inventory-price-summary@${width}: price cells must be right aligned and show 4 decimals`);

  await page.locator('#inventory-price-summary-search [data-field="purchaseCategory"]').selectOption('备品备件');
  await page.locator('#inventory-price-summary-search [data-act="query"]').click();
  if ((await table.locator('[data-record-count]').innerText()).trim() !== '共 3 条记录') errors.push(`inventory-price-summary@${width}: category filter failed`);
  await page.locator('#inventory-price-summary-search [data-field="itemName"]').fill('变频');
  await page.locator('#inventory-price-summary-search [data-act="query"]').click();
  if ((await table.locator('[data-record-count]').innerText()).trim() !== '共 1 条记录') errors.push(`inventory-price-summary@${width}: name filter failed`);
  await page.locator('#inventory-price-summary-search [data-act="reset"]').click();
  if ((await table.locator('[data-record-count]').innerText()).trim() !== '共 12 条记录') errors.push(`inventory-price-summary@${width}: reset failed`);

  if (width === 1440) await page.screenshot({ path: path.join(reportDir, 'inventory-price-summary.png'), fullPage: true });
  await page.close();
}

const menuPage = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
menuPage.on('pageerror', (error) => errors.push(`menu: ${error.message}`));
await menuPage.route(/^https?:/, (route) => route.abort());
await menuPage.goto(pathToFileURL(path.resolve('menu/index.html')).href, { waitUntil: 'domcontentloaded', timeout: 10000 });
const reportMenu = menuPage.locator('.menu-primary', { hasText: '报表管理' });
await reportMenu.click();
const reportSection = reportMenu.locator('xpath=..');
const menuNames = (await reportSection.locator('.submenu button').allTextContents()).map((value) => value.trim());
const traceIndex = menuNames.indexOf('需求跟踪表');
const priceIndex = menuNames.indexOf('库存价格汇总');
if (traceIndex < 0 || priceIndex !== traceIndex + 1) errors.push(`menu: inventory-price-summary must follow requirement-trace: ${menuNames.join(',')}`);
const item = reportSection.locator('.submenu button', { hasText: '库存价格汇总' });
if (await item.getAttribute('data-path') !== 'report/inventory-price-summary.html') errors.push('menu: inventory-price-summary path is incorrect');
await item.click();
await menuPage.waitForTimeout(600);
if (!(await menuPage.locator('#contentFrame').getAttribute('src'))?.endsWith('report/inventory-price-summary.html')) errors.push('menu: iframe did not navigate to inventory-price-summary');
if (await menuPage.locator('#breadcrumbModule').innerText() !== '报表管理') errors.push('menu: module breadcrumb is incorrect');
if (await menuPage.locator('#breadcrumbPage').innerText() !== '库存价格汇总') errors.push('menu: page breadcrumb is incorrect');
await menuPage.screenshot({ path: path.join(reportDir, 'inventory-price-summary-menu-binding.png'), fullPage: true });
await menuPage.close();

const browserClosed = await Promise.race([browser.close().then(() => true), new Promise((resolve) => setTimeout(() => resolve(false), 5000))]);
if (!browserClosed) console.warn('Browser close timed out after all page checks completed; forcing test-process exit.');
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Inventory price summary smoke passed: query, layout, price format, menu and three desktop viewports');
}
process.exit(process.exitCode || 0);
