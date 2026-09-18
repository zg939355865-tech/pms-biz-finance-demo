import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '../lib/playwright-smoke.mjs';

const cases = [
  ['收入合同', 'income-contract-schema.html', 'contract-form'],
  ['项目结算单', 'project-settlement.html', 'project-settlement-detail'],
  ['销项开票', 'sales-invoice.html', 'sales-invoice-detail'],
  ['收款单', 'receipt.html', 'receipt-detail'],
  ['收款核销', 'receipt-reconciliation.html', 'receipt-reconciliation-detail']
];
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(5000);
const errors = [];

try {
  for (const [pageName, fileName, detailId] of cases) {
    await page.goto(pathToFileURL(path.resolve('pages/income', fileName)).href, { waitUntil: 'domcontentloaded' });
    const create = page.locator('[data-page-view="list"] .schema-list-header [data-act="create"]');
    if (await create.count() !== 1) { errors.push(`${pageName}缺少唯一新增按钮。`); continue; }
    if ((await create.textContent()).trim() !== '新增') errors.push(`${pageName}新增按钮文案未统一为“新增”。`);
    if (await create.getAttribute('data-target') !== detailId) errors.push(`${pageName}新增按钮未指向${detailId}。`);
    await create.click();
    if (await page.locator('[data-page-view="detail"]').isHidden()) errors.push(`${pageName}点击新增后未跳转详情。`);
    if (await page.locator(`#${detailId}`).count() !== 1) errors.push(`${pageName}详情区域不存在。`);
  }
} catch (error) {
  errors.push(error.message);
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('Income create navigation smoke passed: five create buttons use the unified label and enter their detail views.');
process.exit(0);
