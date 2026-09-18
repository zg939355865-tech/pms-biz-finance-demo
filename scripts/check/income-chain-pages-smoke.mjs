import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '../lib/playwright-smoke.mjs';

const cases = [
  ['项目结算单', 'income/project-settlement.html'],
  ['销项开票', 'income/sales-invoice.html'],
  ['收款单', 'income/receipt.html'],
  ['收款核销', 'income/receipt-reconciliation.html']
];
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(10000);
const errors = [];
const visualDir = 'outputs/reports/visual/income-chain';
fs.mkdirSync(visualDir, { recursive: true });
page.on('pageerror', (error) => errors.push(error.message));
page.route(/^https?:/, (route) => route.abort());

try {
  for (const [name, targetPath] of cases) {
    await page.goto(pathToFileURL(path.resolve(`pages/${targetPath}`)).href, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    if (await page.locator('.page-title').first().innerText() !== name) errors.push(`${name}：列表标题不正确`);
    const table = page.locator('[data-page-view="list"] [data-component="ProTable"]').first();
    if (!await table.count()) { errors.push(`${name}：缺少主列表`); continue; }
    const visibleRows = await table.locator('tbody tr:not([hidden])').count();
    if (visibleRows !== 5) errors.push(`${name}：列表未固定显示 5 条记录（当前 ${visibleRows} 条）`);
    await page.screenshot({ path: path.join(visualDir, `${targetPath.replace(/[\\/]/g, '-').replace(/\.html$/, '')}-list.png`), fullPage: true });
    const identifier = table.locator('tbody tr:not([hidden]) a[data-act]').first();
    await identifier.click();
    if (await page.locator('[data-page-view="detail"]').isHidden()) errors.push(`${name}：单号未进入详情视图`);
    const detailForm = page.locator('[data-page-view="detail"] [data-component="DetailForm"]').first();
    if (!await detailForm.count()) errors.push(`${name}：详情缺少基础信息表单`);
    await page.locator('[data-act="back-list"]').click();
    if (await page.locator('[data-page-view="list"]').isHidden()) errors.push(`${name}：无法返回列表`);
  }

  await page.goto(pathToFileURL(path.resolve('menu/index.html')).href, { waitUntil: 'domcontentloaded' });
  const incomeMenu = page.locator('.menu-primary', { hasText: '收入管理' });
  await incomeMenu.click();
  const incomeSection = incomeMenu.locator('xpath=..');
  for (const [name, targetPath] of cases) {
    const item = incomeSection.locator('.submenu button', { hasText: name });
    if (!await item.count()) { errors.push(`${name}：菜单入口不存在`); continue; }
    if (await item.getAttribute('data-path') !== targetPath) errors.push(`${name}：菜单路径不正确`);
    await item.click();
    const src = await page.locator('#contentFrame').getAttribute('src');
    if (!src?.endsWith(targetPath)) errors.push(`${name}：菜单未加载目标页面`);
  }
  await page.screenshot({ path: path.join(visualDir, 'menu-binding.png'), fullPage: true });
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
console.log('Income chain page smoke passed: 4 pages and menu bindings valid');
