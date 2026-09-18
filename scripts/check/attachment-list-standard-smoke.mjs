import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '../lib/playwright-smoke.mjs';

const pages = [
  ['material-outbound', 'pages/material/material-outbound.html'],
  ['other-inbound', 'pages/material/other-inbound.html'],
  ['other-outbound', 'pages/material/other-outbound.html'],
  ['purchase-order', 'pages/procurement/purchase-order.html'],
  ['purchase-receipt', 'pages/procurement/purchase-receipt.html'],
  ['purchase-requisition', 'pages/procurement/purchase-requisition.html'],
  ['expense-contract', 'pages/procurement/expense-contract.html'],
  ['payment-request', 'pages/expense/payment-request.html']
];
const expectedHeaders = ['文件名', '大小', '上传人', '上传时间', '操作'];
const reportDir = path.resolve('outputs/reports/visual/attachment-lists');
fs.mkdirSync(reportDir, { recursive: true });

const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
const errors = [];

for (const [pageCode, htmlPath] of pages) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  page.on('pageerror', (error) => errors.push(`${pageCode}: pageerror: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`${pageCode}: console: ${message.text()}`); });
  await page.goto(pathToFileURL(path.resolve(htmlPath)).href, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(100);

  const upload = page.locator('[data-component="ProUploadList"]');
  if (await upload.count() !== 1) {
    errors.push(`${pageCode}: expected one ProUploadList`);
    await page.close();
    continue;
  }
  const headers = (await upload.locator('thead th').allTextContents()).map((value) => value.trim()).filter(Boolean);
  if (JSON.stringify(headers) !== JSON.stringify(expectedHeaders)) errors.push(`${pageCode}: attachment columns are ${headers.join(', ')}`);
  if (await upload.locator('[data-column="documentType"]').count()) errors.push(`${pageCode}: attachment document type is still rendered`);

  await page.evaluate(() => {
    const detail = document.querySelector('[data-page-view="detail"]');
    const list = document.querySelector('[data-page-view="list"]');
    const uploadList = document.querySelector('[data-component="ProUploadList"]');
    const attachmentPanel = uploadList?.closest('[data-tab-panel]');
    if (list) list.hidden = true;
    if (detail) detail.hidden = false;
    document.querySelectorAll('[data-tab-panel]').forEach((panel) => { panel.hidden = panel !== attachmentPanel; });
    if (attachmentPanel) {
      const key = attachmentPanel.getAttribute('data-tab-panel');
      document.querySelectorAll('[data-tab]').forEach((tab) => tab.classList.toggle('active', tab.getAttribute('data-tab') === key));
    }
  });
  await page.screenshot({ path: path.join(reportDir, `${pageCode}.png`), fullPage: true });
  await page.close();
}

await browser.close();
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`Attachment list smoke passed: ${pages.length} pages`);
