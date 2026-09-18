import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '../lib/playwright-smoke.mjs';

const pages = [
  'pages/procurement/purchase-requisition.html',
  'pages/procurement/expense-contract.html',
  'pages/procurement/purchase-order.html',
  'pages/procurement/purchase-receipt.html',
  'pages/expense/payment-request.html',
  'pages/procurement/purchase-invoice.html',
  'pages/expense/payment-order.html',
  'pages/expense/invoice-payment-reconciliation.html'
];
const errors = [];
const browser = await chromium.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true
});

for (const file of pages) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.route(/^https?:/, (route) => route.abort());
  await page.goto(pathToFileURL(path.resolve(file)).href, { waitUntil: 'domcontentloaded', timeout: 10000 });
  const button = page.locator('[data-page-view="list"] [data-act="create"]:visible').first();
  if (!await button.count()) {
    errors.push(`${file}: create action is missing`);
  } else {
    const contract = await button.evaluate((element) => ({
      text: element.textContent.trim(),
      ariaLabel: element.getAttribute('aria-label'),
      title: element.getAttribute('title'),
      target: element.getAttribute('data-target')
    }));
    if (contract.text !== '新增') errors.push(`${file}: visible label must be 新增`);
    if (contract.ariaLabel !== '新增') errors.push(`${file}: aria-label must be 新增`);
    if (contract.title !== '新增') errors.push(`${file}: title must be 新增`);
    if (!contract.target) errors.push(`${file}: create target is missing`);
  }
  await page.close();
}

await browser.close();
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`Procurement create label smoke passed: ${pages.length} pages`);
