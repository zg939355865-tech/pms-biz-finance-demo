import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '../lib/playwright-smoke.mjs';

const target = path.resolve('pages/procurement/purchase-requisition.html');
const browser = await chromium.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];

try {
  await page.goto(pathToFileURL(target).href);

  const create = page.locator('[data-page-view="list"] [data-act="create"]:visible').first();
  await create.click();
  const detail = page.locator('[data-page-view="detail"]');
  if (!await detail.isVisible()) errors.push('create did not open detail view');

  const detailForm = detail.locator('[data-component="DetailForm"]').first();
  if (await detailForm.getAttribute('data-detail-columns') !== '3') errors.push('detail form is not marked as three-column layout');
  const gridColumns = await detailForm.locator('.pro-detail-grid').evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').filter(Boolean).length);
  if (gridColumns !== 3) errors.push(`detail form rendered ${gridColumns} columns instead of 3`);

  for (const action of ['save', 'submit']) {
    if (!await detail.locator(`[data-act="${action}"]:visible`).count()) errors.push(`draft detail is missing ${action}`);
  }
  const invalid = detail.locator('[required]:not(:disabled)').first();
  if (await invalid.count()) {
    if (await invalid.evaluate((element) => element.matches('select'))) await invalid.selectOption('');
    else await invalid.fill('');
    await detail.locator('[data-act="submit"]:visible').click();
    if (!await detail.isVisible()) errors.push('submit ignored required-field validation');
  } else {
    errors.push('detail has no enabled required field for validation regression');
  }

  await detail.locator('[data-act="back-list"]:visible').click();
  const edit = page.locator('[data-page-view="list"] [data-act="edit"]:visible').first();
  await edit.click();
  for (const action of ['workflow-activity', 'workflow-owner', 'workflow-chart']) {
    if (!await detail.locator(`[data-act="${action}"]:visible`).count()) errors.push(`existing workflow detail is missing ${action}`);
  }
  await detail.locator('[data-act="back-list"]:visible').click();

  const primaryTable = page.locator('[data-page-view="list"] .schema-regions > [data-component="ProTable"]').first();
  const before = await primaryTable.locator('tbody tr[data-row-value]').count();
  const selectable = primaryTable.locator('tbody [data-row-select]:not(:disabled)').first();
  await selectable.check();
  const batchDelete = page.locator('[data-page-view="list"] .pro-page-actions [data-act="batch-delete"]');
  if (await batchDelete.isDisabled()) errors.push('batch delete did not enable after selecting a draft row');
  await batchDelete.click();
  const confirmation = page.locator('[data-delete-confirm]');
  if (!await confirmation.isVisible()) errors.push('batch delete did not open confirmation');
  if (await primaryTable.locator('tbody tr[data-row-value]').count() !== before) errors.push('row was deleted before confirmation');
  await confirmation.locator('[data-act="cancel-delete"]').last().click();
  if (await primaryTable.locator('tbody tr[data-row-value]').count() !== before) errors.push('cancel delete changed the list');

  await batchDelete.click();
  await confirmation.locator('[data-act="confirm-delete"]').click();
  const after = await primaryTable.locator('tbody tr[data-row-value]').count();
  if (after !== before - 1) errors.push('confirmed batch delete did not remove exactly one row');
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
console.log('Public interaction standard smoke passed: batch delete, workflow detail actions, required validation, delete confirmation and three-column detail layout');
