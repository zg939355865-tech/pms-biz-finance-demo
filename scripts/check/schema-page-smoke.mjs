import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '../lib/playwright-smoke.mjs';

const htmlPath = process.argv[2];
if (!htmlPath) throw new Error('Usage: node scripts/check/schema-page-smoke.mjs <pages/...html>');
const absolutePath = path.resolve(htmlPath);
const reportDir = path.resolve('outputs/reports/visual');
fs.mkdirSync(reportDir, { recursive: true });
const screenshotPath = path.join(reportDir, `${path.basename(htmlPath, '.html')}.png`);
const detailScreenshotPath = path.join(reportDir, `${path.basename(htmlPath, '.html')}-detail.png`);
const plansScreenshotPath = path.join(reportDir, `${path.basename(htmlPath, '.html')}-detail-plans.png`);
const embeddedScreenshotPath = path.join(reportDir, `${path.basename(htmlPath, '.html')}-embedded.png`);
const executablePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
await page.goto(pathToFileURL(absolutePath).href, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(500);

const listView = page.locator('[data-page-view="list"]');
const table = listView.locator('[data-component="ProTable"]').first();
if (!await table.isVisible()) errors.push('ProTable is not visible');
if (await table.locator('tbody > tr').count() !== 3) errors.push('Status document list does not show one representative row per status');
const representativeStatuses = await table.locator('tbody > tr [data-row-status]').evaluateAll((items) => [...new Set(items.map((item) => item.dataset.rowStatus))]);
if (representativeStatuses.length !== 3 || !['草稿', '待审核', '已生效'].every((status) => representativeStatuses.includes(status))) errors.push('Representative contract statuses are incomplete');
if (await page.locator('[data-page-view="detail"]').isVisible()) errors.push('Detail view should be hidden initially');
const initialListMetrics = await page.evaluate(() => ({
  bodyPaddingTop: getComputedStyle(document.body).paddingTop,
  headerTop: document.querySelector('.schema-list-header').getBoundingClientRect().top,
  headerHeight: document.querySelector('.schema-list-header').getBoundingClientRect().height,
  tableBottom: document.querySelector('#contract-table').getBoundingClientRect().bottom,
  viewportHeight: innerHeight,
  documentHeight: document.documentElement.scrollHeight,
}));
if (initialListMetrics.bodyPaddingTop !== '0px' || initialListMetrics.headerTop > 16) errors.push('List page still has excessive top whitespace');
if (initialListMetrics.tableBottom > initialListMetrics.viewportHeight + 1 || initialListMetrics.documentHeight > initialListMetrics.viewportHeight + 1) errors.push('List page requires vertical scrolling to show all information');
const tableHeightBeforeSelection = await table.evaluate((element) => element.getBoundingClientRect().height);
if (!await listView.locator('[data-requires-selection]').isDisabled()) errors.push('Batch delete is enabled without a draft selection');
await table.locator('[data-act="select-all"]').check();
if (await table.locator('[data-batch-toolbar]:visible').count()) errors.push('Row selection displays an unwanted selected-count prompt bar');
if (await table.locator('[data-row-select]:checked').count() !== 1) errors.push('Select all does not restrict destructive selection to draft contracts');
if (await listView.locator('[data-requires-selection]').isDisabled()) errors.push('Batch delete remains disabled after selecting a draft contract');
const tableHeightAfterSelection = await table.evaluate((element) => element.getBoundingClientRect().height);
if (Math.abs(tableHeightAfterSelection - tableHeightBeforeSelection) > 1) errors.push('Row selection changes the table height');
await table.locator('[data-act="select-all"]').uncheck();
if (!await listView.locator('[data-requires-selection]').isDisabled()) errors.push('Batch delete remains enabled after clearing selection');
const tableMetrics = await table.locator('.pro-table-scroll').evaluate((element) => ({
  overflowY: getComputedStyle(element).overflowY,
  hasVerticalOverflow: element.scrollHeight > element.clientHeight + 2,
}));
if (tableMetrics.overflowY !== 'hidden' || tableMetrics.hasVerticalOverflow) errors.push('Contract table exposes vertical scrolling');
const headerStyle = await table.locator('thead th').first().evaluate((element) => {
  const style = getComputedStyle(element);
  return { position: style.position, top: style.top, background: style.backgroundColor, zIndex: Number(style.zIndex), fontSize: style.fontSize, fontWeight: style.fontWeight, letterSpacing: style.letterSpacing };
});
if (headerStyle.position !== 'sticky' || headerStyle.top !== '0px' || headerStyle.background === 'rgba(0, 0, 0, 0)' || headerStyle.zIndex < 1) errors.push('Table header is not an opaque frozen row');
if (headerStyle.fontSize !== '14px' || headerStyle.fontWeight !== '400' || !['normal', '0px'].includes(headerStyle.letterSpacing)) errors.push('Table header does not use the standard 14px regular typography');
const checkboxCenters = await table.evaluate((element) => {
  const boxes = [...element.querySelectorAll('.schema-select-col input')].slice(0, 2).map((input) => input.getBoundingClientRect());
  return boxes.map((box) => box.left + box.width / 2);
});
if (checkboxCenters.length !== 2 || Math.abs(checkboxCenters[0] - checkboxCenters[1]) > 1) errors.push('Header and row checkboxes are not aligned');
const searchLayout = await page.locator('#contract-search .pro-search-form-grid > .form-item:not(.pro-search-form-actions)').evaluateAll((items) => items.filter((item) => item.getClientRects().length).slice(0, 5).map((item) => item.getBoundingClientRect()));
if (searchLayout.length < 4 || searchLayout.slice(0, 4).some((box) => Math.abs(box.top - searchLayout[0].top) > 2) || (searchLayout[4] && searchLayout[4].top <= searchLayout[0].top + 2)) errors.push('Search form is not laid out as four fields per row');
const listSelectArrow = await page.locator('#contract-search select').first().evaluate((element) => getComputedStyle(element).backgroundImage);
if (!listSelectArrow || listSelectArrow === 'none') errors.push('Search select does not show a dropdown arrow');
const projectFilter = page.locator('#contract-search [data-field="project"]');
if (await projectFilter.evaluate((element) => element.tagName) !== 'SELECT') errors.push('Project filter is not a dropdown select');
if (!await projectFilter.locator('option').count()) errors.push('Project filter does not provide project options');
if (await page.locator('#contract-search .schema-picker [data-field="project"]').count()) errors.push('Project filter still uses an input-plus-button picker');
const searchToggle = page.locator('[data-act="toggle-search"]');
if (await searchToggle.count()) await searchToggle.click();
const expandedSearchMetrics = await page.locator('#contract-search').evaluate((element) => {
  const items = [...element.querySelectorAll('.form-item:not(.pro-search-form-actions)')];
  const range = element.querySelector('.schema-range');
  const rangeItem = range.closest('.form-item');
  return {
    clippedLabels: items.filter((item) => item.querySelector('.form-label').scrollWidth > item.querySelector('.form-label').clientWidth + 1).length,
    rangeOverflow: range.getBoundingClientRect().right > rangeItem.getBoundingClientRect().right + 1,
    pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  };
});
if (expandedSearchMetrics.clippedLabels) errors.push('Expanded search form clips field labels');
if (expandedSearchMetrics.rangeOverflow || expandedSearchMetrics.pageOverflow) errors.push('Expanded date range overflows its search grid cell');
if (await searchToggle.count()) await searchToggle.click();
await page.screenshot({ path: screenshotPath, fullPage: true });
await table.locator('[data-act="view"][data-row-status="已生效"]').first().click();
if (!await page.locator('[data-page-view="detail"]').isVisible()) errors.push('Detail view did not open');
const detailHeaderHeight = await page.locator('.schema-detail-header').evaluate((element) => element.getBoundingClientRect().height);
if (Math.abs(detailHeaderHeight - initialListMetrics.headerHeight) > 1) errors.push('List and detail page header rows do not have the same height');
if (await page.locator('[data-detail-status]').textContent() !== '已生效') errors.push('Detail status did not follow selected row');
if (await page.locator('[data-tab-panel="basic"] [data-field="status"]').inputValue() !== '已生效') errors.push('Effective contract status field did not follow selected row');
if (await page.locator('[data-detail-edit-action]:visible').count()) errors.push('Effective contract exposes edit actions');
if (await page.locator('[data-detail-review-action]:visible').count()) errors.push('Effective contract exposes review actions');
if (await page.locator('[data-workflow-actions] .btn:visible').count() !== 3) errors.push('Effective contract workflow actions are missing');
if (await page.locator('[data-page-view="detail"] [data-field]:not(:disabled)').count()) errors.push('Effective contract exposes editable controls');
if (await page.locator('[data-page-view="detail"] [data-act="open"]:not(:disabled)').count()) errors.push('Effective contract exposes modifying detail actions');
if (await page.locator('[data-component="BizfinChain"]').count()) errors.push('Detail view still contains a biz-fin trace chain');
if (await page.locator('[data-component="ProTabsDetail"] > .pro-tabs > [data-tab]').count() !== 5) errors.push('Contract detail does not use the expected five standard business tabs');
if (await page.locator('[data-tab="history"]').count()) errors.push('Approval history is duplicated as a detail tab');
if (await page.locator('[data-tab-panel="basic"] > [data-component="DetailForm"] > .pro-section-header').count()) errors.push('Basic tab repeats an unnecessary inner section title');
const detailLayout = await page.locator('[data-tab-panel="basic"] .pro-detail-grid > .form-item').evaluateAll((items) => items.slice(0, 4).map((item) => item.getBoundingClientRect()));
if (detailLayout.length < 4 || detailLayout.slice(0, 3).some((box) => Math.abs(box.top - detailLayout[0].top) > 2) || detailLayout[3].top <= detailLayout[0].top + 2) errors.push('Detail form is not laid out as three fields per row');
if (detailLayout.slice(0, 3).some((box) => Math.abs(box.width - detailLayout[0].width) > 2)) errors.push('Detail fields do not have equal widths');
const detailSelectArrow = await page.locator('[data-tab-panel="basic"] select:disabled').first().evaluate((element) => getComputedStyle(element).backgroundImage);
if (!detailSelectArrow || detailSelectArrow === 'none') errors.push('Disabled detail select does not show a dropdown arrow');
await page.locator('[data-act="back-list"]').click();
await table.locator('a[data-act="view"][data-row-status="待审核"]').evaluate((button) => button.click());
if (await page.locator('[data-detail-review-action]:visible').count() !== 1) errors.push('Pending contract should expose one review entry action');
if (await page.locator('[data-page-view="detail"] > .schema-detail-header [data-act="reject"]').count()) errors.push('Pending contract header duplicates the reject decision');
await page.locator('[data-detail-review-action]:visible').click();
if (!await page.locator('[data-overlay="approval-modal"]').isVisible()) errors.push('Review modal did not open');
if (await page.locator('[data-overlay="approval-modal"] [data-act="reject"]').count() !== 1 || await page.locator('[data-overlay="approval-modal"] [data-act="approve"]').count() !== 1) errors.push('Review modal does not contain reject and approve decisions');
await page.locator('[data-overlay="approval-modal"] [data-act="close"]').first().click();
if (await page.locator('[data-tab-panel="basic"] [data-field="status"]').inputValue() !== '待审核') errors.push('Pending contract status field did not follow selected row');
if (await page.locator('[data-detail-edit-action]:visible').count()) errors.push('Pending contract exposes draft edit actions');
if (await page.locator('[data-page-view="detail"] [data-field]:not(:disabled)').count()) errors.push('Pending contract fields are editable');
await page.locator('[data-act="back-list"]').click();
await table.locator('[data-act="edit"][data-row-status="草稿"]').first().click();
if (await page.locator('[data-detail-status]').textContent() !== '草稿') errors.push('Draft contract status did not follow selected row');
if (await page.locator('[data-tab-panel="basic"] [data-field="status"]').inputValue() !== '草稿') errors.push('Draft contract status field did not follow selected row');
if (await page.locator('[data-detail-edit-action]:visible').count() !== 2) errors.push('Draft contract edit actions are missing');
if (await page.locator('[data-detail-review-action]:visible').count()) errors.push('Draft contract exposes review actions');
if (!await page.locator('[data-page-view="detail"] [data-field]:not(:disabled)').count()) errors.push('Draft contract fields are not editable');
await page.screenshot({ path: detailScreenshotPath, fullPage: true });
await page.locator('[data-tab="projects"]').click();
if (!await page.locator('[data-tab-panel="projects"]').isVisible()) errors.push('Projects tab did not open');
if (await page.locator('[data-tab-panel="projects"] .pro-section-header').count()) errors.push('Projects tab repeats an unnecessary table title');
if (await page.locator('[data-tab-panel="projects"] .pro-table-footer').count()) errors.push('Short project table displays unnecessary pagination');
if (!await page.locator('[data-tab-panel="projects"] [data-act="open"]:not(:disabled)').count()) errors.push('Draft project selector is not editable');
const projectActionOffset = await page.locator('[data-tab-panel="projects"] .pro-table-toolbar').evaluate((toolbar) => toolbar.querySelector('.pro-table-actions').getBoundingClientRect().left - toolbar.getBoundingClientRect().left);
if (projectActionOffset > 40) errors.push('Projects tab actions are not left aligned');
await page.locator('[data-tab-panel="projects"] [data-target="project-picker"]').click();
if (!await page.locator('[data-overlay="project-picker"]').isVisible()) errors.push('Project picker did not open');
await page.locator('[data-overlay="project-picker"] [data-act="close"]').first().click();
await page.locator('[data-tab="plans"]').click();
if (!await page.locator('[data-tab-panel="plans"]').isVisible()) errors.push('Plans tab did not open');
if (await page.locator('[data-tab-panel="plans"] [data-component="AmountSummary"]').count()) errors.push('Plans tab contains an unnecessary summary strip');
if (await page.locator('[data-tab-panel="plans"] .pro-section-header').count()) errors.push('Plans tab repeats an unnecessary table title');
if (await page.locator('[data-tab-panel="plans"] .pro-table-footer').count()) errors.push('Short plans table displays unnecessary pagination');
const planActionOffset = await page.locator('[data-tab-panel="plans"] .pro-table-toolbar').evaluate((toolbar) => toolbar.querySelector('.pro-table-actions').getBoundingClientRect().left - toolbar.getBoundingClientRect().left);
if (planActionOffset > 40) errors.push('Plans tab actions are not left aligned');
await page.screenshot({ path: plansScreenshotPath, fullPage: true });
await page.locator('[data-tab="children"]').click();
if (await page.locator('[data-tab-panel="children"] [data-component="Alert"]').count()) errors.push('Children tab contains an unnecessary explanatory alert');
if (await page.locator('[data-tab-panel="children"] .pro-section-header').count()) errors.push('Children tab repeats an unnecessary table title');
if (await page.locator('[data-tab-panel="children"] .pro-table-footer').count()) errors.push('Short child-contract table displays unnecessary pagination');
if (await page.locator('[data-tab-panel="children"] [data-act="create-child"]').count()) errors.push('Child-contract tab still exposes a detail-level creation action');
await page.locator('[data-act="back-list"]').click();
if (!await page.locator('[data-page-view="list"]').isVisible()) errors.push('List view did not restore');
await page.close();

const embeddedPage = await browser.newPage({ viewport: { width: 1024, height: 768 }, deviceScaleFactor: 1 });
embeddedPage.on('pageerror', (error) => errors.push(`embedded: ${error.message}`));
await embeddedPage.goto(pathToFileURL(absolutePath).href, { waitUntil: 'domcontentloaded' });
await embeddedPage.waitForTimeout(300);
const embeddedSearchLayout = await embeddedPage.locator('#contract-search .pro-search-form-grid > .form-item:not(.pro-search-form-actions)').evaluateAll((items) => items.slice(0, 4).map((item) => item.getBoundingClientRect()));
if (embeddedSearchLayout.length < 4 || embeddedSearchLayout.some((box) => Math.abs(box.top - embeddedSearchLayout[0].top) > 2)) errors.push('Embedded-width search form does not keep four fields per row');
await embeddedPage.screenshot({ path: embeddedScreenshotPath, fullPage: true });
await embeddedPage.close();

await browser.close();

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`Visual smoke passed: ${screenshotPath}`);
