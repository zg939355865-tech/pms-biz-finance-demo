import fs from 'node:fs';
import { writeJson } from '../lib/file-utils.mjs';
import { walkComponents } from '../lib/component-registry.mjs';
import { loadEffectiveSchema } from '../lib/policy-engine.mjs';

const schemaPath = process.argv[2];
if (!schemaPath) throw new Error('Usage: node scripts/check/page-check.mjs <schemas/pages/{domain}/page.json>');
const { schema } = loadEffectiveSchema(schemaPath);
const issues = [];
const outputPath = schema.outputPath;
let html = '';

if (!outputPath || !fs.existsSync(outputPath)) issues.push(error(`HTML file not found: ${outputPath}`));
else {
  html = fs.readFileSync(outputPath, 'utf8');
  if (!html.includes('<!DOCTYPE html>')) issues.push(error('HTML doctype missing'));
  if (!html.includes(schema.pageName)) issues.push(error('Page name missing in HTML'));
  if (!schema.resourceReference?.baseline || !html.includes(`data-resource-baseline="${schema.resourceReference.baseline}"`)) issues.push(error('resource center baseline is missing or inconsistent'));
  if (!html.includes('prototype-resources/components/tokens.css')) issues.push(error('shared tokens.css is not referenced from prototype-resources/components'));
  if (!html.includes('prototype-resources/components/components.css')) issues.push(error('shared components.css is not referenced from prototype-resources/components'));
  const expected = new Set();
  let expectsPagination = false;
  walkComponents([...(schema.regions || []), ...(schema.overlays || [])], (node) => { expected.add(node.component); if (node.component === 'ProTable' && node.pagination !== false) expectsPagination = true; });
  for (const component of expected) if (!html.includes(`data-component="${component}"`)) issues.push(error(`${component} configured but not rendered`));
  if (expected.has('ProTable') && !html.includes('pro-table-scroll')) issues.push(error('ProTable must have an internal horizontal scroll container'));
  if (expectsPagination && !html.includes('pro-table-footer')) issues.push(warning('ProTable has no independent pagination footer'));
  if (html.includes('data-component="ProTabsDetail"') && !html.includes('data-tab-panel')) issues.push(error('ProTabsDetail has no tab panels'));
  if (expected.has('ProUploadList') && html.includes('data-column="documentType"')) issues.push(error('ProUploadList must not render attachment document type'));
  if (/>\s*(?:undefined|null)\s*<\/td>/.test(html)) issues.push(warning('HTML may contain unresolved values'));
  validatePrimaryListOutput();
}

const reportPath = `outputs/reports/pages/${schema.domain || 'unknown'}/${schema.pageCode || 'unknown'}.json`;
writeJson(reportPath, { pageCode: schema.pageCode, domain: schema.domain, stage: 'page-check', status: issues.some((x) => x.level === 'error') ? 'failed' : 'passed', outputPath, issues });
console.log(`Page check report generated: ${reportPath}`);
if (issues.some((x) => x.level === 'error')) process.exit(1);
function error(message) { return { level: 'error', message }; }
function warning(message) { return { level: 'warning', message }; }
function validatePrimaryListOutput() {
  if (!['list', 'list-detail'].includes(schema.pageType)) return;
  if (schema.domain === 'report') return;
  const primaryListHtml = html
    .split('<section class="schema-view schema-detail-view"')[0]
    .split('<script>')[0];
  const tables = (schema.regions || []).filter((node) => node.component === 'ProTable');
  for (const table of tables) {
    if (schema.pageCode === 'my-approval') {
      if (!primaryListHtml.includes('schema-action-col')) issues.push(error('Primary ProTable must render a fixed operation column'));
      if (!primaryListHtml.includes('data-act="handle"')) issues.push(error('Approval workbench must render inert handle actions'));
      if (!primaryListHtml.includes('data-identifier-clickable="false"')) issues.push(error('Approval workbench must disable identifier links'));
      const rows = table.rows || schema.mockData?.[table.dataSource] || [];
      const renderedRows = [...html.matchAll(/<tr[^>]*>[\s\S]*?<\/tr>/g)].map((match) => match[0]);
      for (const row of rows) {
        const rowHtml = renderedRows.find((candidate) => candidate.includes(`data-row-status="${row.status}"`) && candidate.includes(String(row.businessNo))) || '';
        if (/已结束|已终结/.test(row.currentOwner || '') || /已通过|已驳回|已结束|已终结/.test(row.status || '')) issues.push(error('Completed approval records must not be rendered'));
        if (/data-act="handle"[^>]* disabled/.test(rowHtml)) issues.push(error('Pending approval handle action must be enabled'));
      }
      continue;
    }
    if (schema.pageCode === 'my-task') {
      if (primaryListHtml.includes('schema-action-col')) issues.push(error('Read-only task workbench must not render an operation column'));
      if (primaryListHtml.includes('data-act="delete"')) issues.push(error('Read-only task workbench must not render delete actions'));
      if (!primaryListHtml.includes('data-identifier-clickable="false"')) issues.push(error('Read-only task workbench must disable identifier links'));
      if (/<input[^>]+data-row-select/.test(primaryListHtml)) issues.push(error('Read-only task workbench must not render row selection'));
      continue;
    }
    if (schema.primaryListReadOnly === true) {
      if (primaryListHtml.includes('data-act="create"') || primaryListHtml.includes('data-act="delete"')) issues.push(error('Read-only primary list must not render create or delete actions'));
      if (/<input[^>]+data-row-select/.test(primaryListHtml) && schema.primaryListSelectionAllowed !== true) issues.push(error('Read-only primary list must not render row selection unless primaryListSelectionAllowed is true'));
      const hasRowActions = (table.rowActions || []).length > 0;
      if (!hasRowActions && primaryListHtml.includes('schema-action-col')) issues.push(error('Read-only primary list without row actions must not render an operation column'));
      if (!hasRowActions && table.identifierClickable !== false && !primaryListHtml.includes('schema-primary-identifier')) issues.push(error('Read-only primary list must expose an identifier link unless identifier links are explicitly disabled'));
      continue;
    }
    if (schema.systemGenerated === true) {
      if (primaryListHtml.includes('data-act="create"')) issues.push(error('System-generated page must not render a create action'));
      if (primaryListHtml.includes('data-act="delete"')) issues.push(error('System-generated primary list must not render delete actions'));
      if (primaryListHtml.includes('schema-action-col')) issues.push(error('System-generated primary list must not render an operation column'));
      if (!primaryListHtml.includes('data-act="audit"') || !primaryListHtml.includes('data-act="reverse-audit"')) issues.push(error('System-generated review list must render audit and reverse-audit actions'));
      continue;
    }
    if (table.inlineEditMode === true) {
      if (!primaryListHtml.includes('data-inline-edit="true"')) issues.push(error('Inline-edit primary list must expose inline-edit runtime evidence'));
      if (!primaryListHtml.includes('data-act="edit-row"')) issues.push(error('Inline-edit primary list must render edit-row actions'));
      if (primaryListHtml.includes('data-act="delete"') || primaryListHtml.includes('data-act="remove-row"')) issues.push(error('Inline-edit primary list must not render delete actions unless explicitly configured'));
      continue;
    }
    if (!primaryListHtml.includes('schema-action-col')) issues.push(error('Primary ProTable must render a fixed operation column'));
    if (!primaryListHtml.includes('data-act="delete"')) issues.push(error('Primary ProTable must render delete actions'));
    const statusCode = table.statusCode || (table.columns || []).find((column) => /^(status|state)$/i.test(column.code || ''))?.code;
    if (!statusCode) continue;
    const rows = table.rows || schema.mockData?.[table.dataSource] || [];
    const renderedRows = [...html.matchAll(/<tr[^>]*>[\s\S]*?<\/tr>/g)].map((match) => match[0]);
    const statuses = [...new Set(rows.map((row) => row[statusCode]).filter(Boolean))];
    const deleteEnabledStatuses = schema.primaryDeleteEnabledStatuses || ['草稿'];
    for (const status of statuses) {
      const rowHtml = renderedRows.find((candidate) => candidate.includes(`data-row-status="${status}"`)) || '';
      if (deleteEnabledStatuses.includes(status) && /data-act="delete"[^>]* disabled/.test(rowHtml)) issues.push(error(`Delete-enabled row action must be enabled: ${status}`));
      if (!deleteEnabledStatuses.includes(status) && !/data-act="delete"[^>]* disabled/.test(rowHtml)) issues.push(error(`Delete-disabled row action must be disabled: ${status}`));
    }
  }
}
