import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '../lib/playwright-smoke.mjs';

const cases = [
  { file: 'pages/procurement/expense-contract.html', tables: [['#contract-item-table', true], ['#contract-attachments', false, true]] },
  { file: 'pages/procurement/purchase-order.html', tables: [['#purchase-order-items', true], ['#purchase-order-attachments', false, true]] },
  { file: 'pages/procurement/purchase-receipt.html', tables: [['#purchase-receipt-items', true], ['#purchase-receipt-attachments', false, true]] },
  { file: 'pages/procurement/purchase-invoice.html', tables: [['#purchase-invoice-order-items', true], ['#purchase-invoice-settlement-items', true]] },
  { file: 'pages/expense/invoice-payment-reconciliation.html', tables: [['#pending-invoice-table', false]] },
  { file: 'pages/material/material-outbound.html', tables: [['#material-outbound-items', true], ['#material-outbound-attachments', false, true]] },
  { file: 'pages/material/other-outbound.html', tables: [['#other-outbound-items', true], ['#other-outbound-attachments', false, true]] },
  { file: 'pages/material/other-inbound.html', tables: [['#other-inbound-items', true], ['#other-inbound-attachments', false, true]] }
];

const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
const errors = [];

for (const item of cases) {
  const page = await browser.newPage({ viewport: { width: 1180, height: 900 } });
  page.on('pageerror', (error) => errors.push(`${item.file}: ${error.message}`));
  await page.goto(pathToFileURL(path.resolve(item.file)).href, { waitUntil: 'domcontentloaded' });
  const detailLink = page.locator('[data-page-view="list"] .pro-table-scroll tbody tr[data-row-value] a[data-act]').first();
  if (await detailLink.count()) await detailLink.click();

  for (const [selector, selectable, upload] of item.tables) {
    const shell = page.locator(selector);
    if (!await shell.count()) {
      errors.push(`${item.file}: missing ${selector}`);
      continue;
    }
    if (upload) {
      const attachmentsTab = page.locator('[data-page-view="detail"] [data-tab="attachments"]');
      if (await attachmentsTab.count()) await attachmentsTab.click();
    }
    const table = upload ? shell.locator('[data-component="ProTable"]') : shell;
    if (!await table.count()) {
      errors.push(`${item.file}: ${selector} has no rendered table`);
      continue;
    }
    const headers = (await table.locator('thead th').allTextContents()).map((value) => value.trim());
    const expectedIndex = selectable ? 1 : 0;
    if (headers[expectedIndex] !== '序号') errors.push(`${item.file}: ${selector} sequence is not ${selectable ? 'after checkbox' : 'the first column'}`);
    if (!selectable && await table.locator('[data-row-select], [data-act="select-all"]').count()) errors.push(`${item.file}: ${selector} must not render checkboxes`);
    const values = (await table.locator('tbody [data-sequence-cell]').allTextContents()).map((value) => value.trim());
    if (values.some((value, index) => value !== String(index + 1))) errors.push(`${item.file}: ${selector} sequence values are not continuous`);
    const sticky = await table.evaluate(async (element, expectedLeft) => {
      const scroll = element.querySelector('.pro-table-scroll');
      const header = element.querySelector('thead .schema-sequence-col');
      const cell = element.querySelector('tbody [data-sequence-cell]');
      if (!scroll || !header || !cell) return { missing: true };
      const before = { header: header.getBoundingClientRect().left, cell: cell.getBoundingClientRect().left };
      scroll.scrollLeft = scroll.scrollWidth;
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const headerStyle = getComputedStyle(header);
      const cellStyle = getComputedStyle(cell);
      return {
        headerPosition: headerStyle.position,
        cellPosition: cellStyle.position,
        headerLeftStyle: parseFloat(headerStyle.left || '999'),
        cellLeftStyle: parseFloat(cellStyle.left || '999'),
        headerShift: Math.abs(header.getBoundingClientRect().left - before.header),
        cellShift: Math.abs(cell.getBoundingClientRect().left - before.cell),
        expectedLeft
      };
    }, selectable ? 56 : 0);
    if (sticky.missing || sticky.headerPosition !== 'sticky' || sticky.cellPosition !== 'sticky' || sticky.headerLeftStyle !== sticky.expectedLeft || sticky.cellLeftStyle !== sticky.expectedLeft || sticky.headerShift > 1 || sticky.cellShift > 1) {
      errors.push(`${item.file}: ${selector} sequence column is not fixed correctly: ${JSON.stringify(sticky)}`);
    }
  }
  await page.close();
}

await browser.close();
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('Fixed detail sequence smoke passed: 15 tables use continuous fixed sequence columns with the required checkbox boundary.');
