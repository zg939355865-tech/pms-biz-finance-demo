import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '../lib/playwright-smoke.mjs';

const cases = [
  ['采购收票', 'procurement/purchase-invoice.html'],
  ['付款单', 'expense/payment-order.html'],
  ['票款核销', 'expense/invoice-payment-reconciliation.html']
];
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(10000);
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
await page.route(/^https?:/, (route) => route.abort());

try {
  await page.goto(pathToFileURL(path.resolve('menu/index.html')).href, { waitUntil: 'domcontentloaded' });
  const purchaseMenu = page.locator('.menu-primary', { hasText: '采购管理' });
  await purchaseMenu.click();
  const section = purchaseMenu.locator('xpath=..');
  if (!await section.evaluate((element) => element.classList.contains('open'))) errors.push('采购管理菜单未展开');

  const actualOrder = await section.locator('.submenu button').allTextContents();
  const hiddenPurchaseMenus = ['采购申请', '固资入库', '付款申请'].filter((name) => actualOrder.some((text) => text.trim() === name));
  if (hiddenPurchaseMenus.length) {
    errors.push(`应隐藏的采购菜单仍可见：${hiddenPurchaseMenus.join('、')}`);
  }
  if (await page.locator('.menu-primary', { hasText: '跨司协同台账' }).count()) errors.push('跨司协同台账菜单仍可见');
  if (await page.locator('.menu-primary', { hasText: '费用报销' }).count()) errors.push('费用报销菜单仍可见');

  const incomeMenu = page.locator('.menu-primary', { hasText: '收入管理' });
  await incomeMenu.click();
  const incomeSection = incomeMenu.locator('xpath=..');
  if (!await incomeSection.evaluate((element) => element.classList.contains('open'))) errors.push('收入管理菜单未展开');
  const actualIncomeOrder = (await incomeSection.locator('.submenu button').allTextContents()).map((text) => text.trim());
  const expectedIncomeOrder = ['收入合同', '项目结算单', '销项开票', '收款单', '收款核销'];
  if (actualIncomeOrder.includes('收入回款台账')) errors.push('收入回款台账菜单仍可见');
  if (JSON.stringify(actualIncomeOrder) !== JSON.stringify(expectedIncomeOrder)) {
    errors.push(`收入管理菜单顺序不正确：${actualIncomeOrder.join('、')}`);
  }

  const incomeContract = incomeSection.locator('.submenu button', { hasText: '收入合同' });
  if (await incomeContract.getAttribute('data-path') !== 'income/income-contract-schema.html') {
    errors.push('收入合同菜单路径不正确');
  }

  for (const [name, expectedPath] of cases) {
    const item = section.locator('.submenu button', { hasText: name });
    if (!await item.count()) {
      errors.push(`${name}: 菜单项不存在`);
      continue;
    }
    if (await item.getAttribute('data-path') !== expectedPath) errors.push(`${name}: 菜单路径不正确`);
    await item.click();
    await page.waitForTimeout(500);
    const src = await page.locator('#contentFrame').getAttribute('src');
    if (!src?.endsWith(expectedPath)) errors.push(`${name}: iframe未跳转到目标页面`);
    if (await page.locator('#breadcrumbModule').innerText() !== '采购管理') errors.push(`${name}: 一级面包屑不正确`);
    if (await page.locator('#breadcrumbPage').innerText() !== name) errors.push(`${name}: 二级面包屑不正确`);
    const frameTitle = await page.frameLocator('#contentFrame').locator('.page-title').first().innerText();
    if (frameTitle !== name) errors.push(`${name}: iframe页面标题不正确`);
  }
  await page.screenshot({ path: 'outputs/reports/visual/purchase-payment/menu-binding.png', fullPage: true });
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
console.log('Menu binding smoke passed: purchase/payment bindings valid; income ledger hidden; income menu order preserved');
