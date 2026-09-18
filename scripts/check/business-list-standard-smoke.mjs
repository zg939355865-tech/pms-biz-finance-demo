import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '../lib/playwright-smoke.mjs';
import { loadEffectiveSchema } from '../lib/policy-engine.mjs';

const executablePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const schemas = walk('schemas/pages')
  .filter((file) => file.endsWith('.json'))
  .map((file) => loadEffectiveSchema(file).schema)
  .filter((schema) => ['list', 'list-detail'].includes(schema.pageType));
const errors = [];
const browser = await chromium.launch({ executablePath, headless: true });

for (const schema of schemas) await verifySchemaList(schema);
await browser.close();

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`Business list standard smoke passed: ${schemas.length} Schema lists`);

async function verifySchemaList(schema) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.route(/^https?:/, (route) => route.abort());
  page.on('pageerror', (error) => errors.push(`${schema.pageCode}: ${error.message}`));
  await page.goto(pathToFileURL(path.resolve(schema.outputPath)).href, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(120);
  const hierarchySchemaTable = schema.regions.find((region) => region.component === 'ProTreeTable' && region.mode === 'hierarchy');
  const table = page.locator(`[data-page-view="list"] [data-component="${hierarchySchemaTable ? 'ProTreeTable' : 'ProTable'}"]`).first();
  if (!await table.count()) {
    errors.push(`${schema.pageCode}: primary ProTable missing`);
    await page.close();
    return;
  }

  const schemaTable = schema.regions.find((region) => region.component === 'ProTable') || hierarchySchemaTable;
  if (!schemaTable) {
    errors.push(`${schema.pageCode}: primary table Schema missing`);
    await page.close();
    return;
  }
  const statusCode = schemaTable.statusCode || schemaTable.columns.find((column) => /^(status|state)$/i.test(column.code || ''))?.code;
  const editableStatuses = schema.detailEditableStatuses || ['草稿'];
  const deleteEnabledStatuses = schema.primaryDeleteEnabledStatuses || (statusCode ? ['草稿'] : []);
  const sourceRows = schema.mockData?.[schemaTable.dataSource] || schemaTable.rows || [];
  const rows = table.locator('tbody > tr');
  const rowCount = await rows.count();
  const isApprovalWorkbench = schema.policyProfile === 'approval-workbench';
  const isTaskWorkbench = schema.pageCode === 'my-task';
  const isSystemGenerated = schema.systemGenerated === true;
  const isReadOnlyList = schema.primaryListReadOnly === true;
  const isHierarchy = Boolean(hierarchySchemaTable);
  const isInlineEditList = schemaTable.inlineEditMode === true;
  const expectedCount = isHierarchy
    ? sourceRows.length
    : isApprovalWorkbench
    ? sourceRows.length
    : isReadOnlyList
      ? sourceRows.length
    : statusCode
      ? schemaTable.representativeByStatus === false
        ? sourceRows.length
        : new Set(sourceRows.map((row) => row[statusCode]).filter(Boolean)).size
      : Math.min(5, sourceRows.length);
  if (rowCount !== expectedCount) errors.push(`${schema.pageCode}: expected ${expectedCount} rows, found ${rowCount}`);

  const scroll = table.locator('.pro-table-scroll');
  const scrollMetrics = await scroll.evaluate((element) => ({ overflowY: getComputedStyle(element).overflowY, verticalOverflow: element.scrollHeight > element.clientHeight + 2 }));
  if (scrollMetrics.overflowY !== 'hidden' || scrollMetrics.verticalOverflow) errors.push(`${schema.pageCode}: table has vertical scrolling`);

  const operation = table.locator('thead .schema-action-col');
  const expectsOperation = isApprovalWorkbench || (!isTaskWorkbench && !isSystemGenerated && !isHierarchy);
  if (expectsOperation && !await operation.count()) errors.push(`${schema.pageCode}: operation column missing`);
  else if (!expectsOperation && await operation.count()) errors.push(`${schema.pageCode}: operation column must be omitted`);
  else if (expectsOperation) {
    const before = await operation.evaluate((element) => element.getBoundingClientRect().right);
    await scroll.evaluate((element) => { element.scrollLeft = element.scrollWidth; });
    const after = await operation.evaluate((element) => element.getBoundingClientRect().right);
    const style = await operation.evaluate((element) => ({ position: getComputedStyle(element).position, right: getComputedStyle(element).right, background: getComputedStyle(element).backgroundColor }));
    if (Math.abs(before - after) > 1 || style.position !== 'sticky' || style.right !== '0px' || style.background === 'rgba(0, 0, 0, 0)') errors.push(`${schema.pageCode}: operation column is not fixed and opaque`);
  }

  if (isApprovalWorkbench) {
    const handleButtons = table.locator('tbody [data-act="handle"]');
    if (await handleButtons.count() !== rowCount) errors.push(`${schema.pageCode}: every row must show handle`);
    if (await table.locator('tbody [data-act="delete"]').count()) errors.push(`${schema.pageCode}: approval workbench must not show delete`);
    if (await table.locator('tbody a[data-act]').count()) errors.push(`${schema.pageCode}: business number must not be clickable`);
  } else if (isTaskWorkbench) {
    if (await table.locator('.schema-select-col').count()) errors.push(`${schema.pageCode}: task workbench must not show selection`);
    if (await table.locator('tbody td.actions, tbody [data-act="delete"], tbody a[data-act]').count()) errors.push(`${schema.pageCode}: task workbench must be read-only`);
    if (await table.locator('thead .schema-fixed-left-data').count() < 2) errors.push(`${schema.pageCode}: frozen sequence and task columns missing`);
  } else if (isReadOnlyList) {
    if (await table.locator('.schema-select-col').count()) errors.push(`${schema.pageCode}: read-only list must not show selection`);
    if (await table.locator('tbody [data-act="delete"]').count()) errors.push(`${schema.pageCode}: read-only list must not show delete`);
    const configuredRowActions = schemaTable.rowActions || [];
    if (configuredRowActions.length) {
      if (await table.locator('tbody [data-act="view"]').count() !== rowCount) errors.push(`${schema.pageCode}: every read-only row must show view`);
    } else if (await table.locator('tbody a[data-act="view"]').count() !== rowCount) {
      errors.push(`${schema.pageCode}: every read-only row must expose an identifier view link`);
    }
  } else if (isHierarchy) {
    if (!await table.locator('tbody .schema-tree-row').count()) errors.push(`${schema.pageCode}: hierarchy rows missing`);
    if (!await table.locator('tbody [data-act="tree-toggle"]').count()) errors.push(`${schema.pageCode}: hierarchy expand controls missing`);
  } else if (isInlineEditList) {
    if (schemaTable.selectable !== false && !await table.locator('thead .schema-select-col').count()) errors.push(`${schema.pageCode}: inline-edit list selection column missing`);
    if (await table.locator('tbody [data-act="edit-row"]').count() !== rowCount) errors.push(`${schema.pageCode}: every inline-edit row must show edit`);
    if (await table.locator('tbody [data-act="delete"],tbody [data-act="remove-row"]').count()) errors.push(`${schema.pageCode}: inline-edit list must not show delete`);
  } else {
    const selection = table.locator('thead .schema-select-col');
    const identifier = table.locator('thead .schema-primary-identifier');
    if ((schemaTable.selectable !== false && !await selection.count()) || !await identifier.count()) errors.push(`${schema.pageCode}: fixed selection or identifier column missing`);
    else {
      await scroll.evaluate((element) => { element.scrollLeft = 0; });
      const selectionBefore = await selection.count() ? await selection.evaluate((element) => element.getBoundingClientRect().left) : null;
      const identifierBefore = await identifier.evaluate((element) => element.getBoundingClientRect().left);
      await scroll.evaluate((element) => { element.scrollLeft = element.scrollWidth; });
      const selectionAfter = await selection.count() ? await selection.evaluate((element) => element.getBoundingClientRect().left) : null;
      const identifierAfter = await identifier.evaluate((element) => element.getBoundingClientRect().left);
      const styles = await identifier.evaluate((element) => ({ position: getComputedStyle(element).position, background: getComputedStyle(element).backgroundColor, zIndex: Number(getComputedStyle(element).zIndex) }));
      if ((selectionBefore != null && Math.abs(selectionBefore - selectionAfter) > 1) || Math.abs(identifierBefore - identifierAfter) > 1 || styles.position !== 'sticky' || styles.background === 'rgba(0, 0, 0, 0)' || styles.zIndex < 5) errors.push(`${schema.pageCode}: left fixed columns are not stable and opaque`);
    }

    const deleteButtons = table.locator('tbody [data-act="delete"]');
    const rowActionButtons = table.locator('tbody td.actions .btn');
    if (isSystemGenerated) {
      if (await deleteButtons.count() || await rowActionButtons.count()) errors.push(`${schema.pageCode}: system-generated list must not show delete`);
    } else {
      if (await deleteButtons.count() !== rowCount) errors.push(`${schema.pageCode}: every row must show delete`);
      if (await rowActionButtons.count() !== rowCount) errors.push(`${schema.pageCode}: operation column must contain delete only`);
    }
    for (let index = 0; index < await deleteButtons.count(); index += 1) {
      const button = deleteButtons.nth(index);
      const status = await button.getAttribute('data-row-status');
      const disabled = await button.isDisabled();
      if (statusCode && deleteEnabledStatuses.includes(status) && disabled) errors.push(`${schema.pageCode}: delete is disabled for configured status ${status}`);
      if (statusCode && !deleteEnabledStatuses.includes(status) && !disabled) errors.push(`${schema.pageCode}: delete is enabled outside configured statuses (${status})`);
      if (!statusCode && disabled) errors.push(`${schema.pageCode}: non-workflow delete is disabled`);
    }

    for (let index = 0; index < rowCount; index += 1) {
      const row = rows.nth(index);
      const link = row.locator('a[data-act]').first();
      if (!await link.count()) {
        errors.push(`${schema.pageCode}: row ${index + 1} has no identifier link`);
        continue;
      }
      const status = await link.getAttribute('data-row-status');
      const action = await link.getAttribute('data-act');
      const expectedAction = statusCode ? editableStatuses.includes(status) ? 'edit' : 'view' : 'edit';
      if (action !== expectedAction) errors.push(`${schema.pageCode}: identifier link should use ${expectedAction} for ${status || 'non-workflow'} records`);
    }
  }

  const globalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  if (globalOverflow) errors.push(`${schema.pageCode}: page has horizontal overflow outside the table`);
  await page.close();
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
}
