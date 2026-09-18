import { loadEffectiveSchema } from '../lib/policy-engine.mjs';

const fixturePath = 'scripts/check/fixtures/detail-content-policy.json';
const { schema, changes } = loadEffectiveSchema(fixturePath, { write: false });
const nonWorkflowFixturePath = 'scripts/check/fixtures/non-workflow-submit-label-policy.json';
const { schema: nonWorkflowSchema, changes: nonWorkflowChanges } = loadEffectiveSchema(nonWorkflowFixturePath, { write: false });
const search = schema.regions.find((node) => node.component === 'ProSearchForm');
const table = schema.regions.find((node) => node.component === 'ProTable');
const detailForm = findComponent(schema.regions, 'DetailForm');
const upload = findComponent(schema.regions, 'ProUploadList');
const editable = findComponent(schema.regions, 'EditableTable');
const errors = [];

if ((search.fields || []).some((field) => field.code === 'purchaseCategory')) errors.push('detail-only field was not removed from search');
if (search.collapsible !== false) errors.push('search form was not standardized to fully expanded mode');
if (search.firstFieldAlignment !== 'first-data-column') errors.push('search without a selection column was not aligned to the first data column');
if ((table.columns || []).some((column) => column.code === 'purchaseCategory')) errors.push('detail-only field was not removed from primary list');
if (upload.title !== undefined) errors.push('attachment inner title was not removed');
if (upload.inheritDetailEditability !== true) errors.push('attachment editability inheritance was not enabled');
if (upload.keepOperationColumn !== true) errors.push('attachment operation column was not enabled');
if (JSON.stringify(upload.rowActions) !== JSON.stringify([{ code: 'remove-row', label: '删除', type: 'link' }])) errors.push('attachment delete action was not standardized');
if (editable.actions?.find((action) => action.code === 'batch-delete')?.label !== '删除选中明细') errors.push('editable table batch delete label was not standardized');
if (editable.rowActions?.find((action) => action.code === 'remove-row')?.label !== '删除') errors.push('editable table row delete label was not standardized');
const { schema: selectionSchema } = loadEffectiveSchema('schemas/pages/period-close/period-close.json', { write: false });
const selectionSearch = selectionSchema.regions.find((node) => node.component === 'ProSearchForm');
if (selectionSearch?.firstFieldAlignment !== 'selection-control') errors.push('search with a selection column was not aligned to the selection control');
if (detailForm.layoutColumns !== 3) errors.push('detail form did not receive the public three-column layout');
if (detailForm.fields[1]?.code !== 'status' || detailForm.fields[1]?.label !== '状态') errors.push('detail status was not normalized and placed after business identifier');
if (table.columns[1]?.code !== 'status' || table.columns[1]?.label !== '状态') errors.push('list status was not normalized and placed after business identifier');
if (table.selectable !== true || JSON.stringify(table.selectableStatuses) !== JSON.stringify(['草稿'])) errors.push('primary list draft-only selection was not standardized');
const batchDelete = (schema.pageActions || []).find((action) => action.code === 'batch-delete');
if (!batchDelete || JSON.stringify(batchDelete.enabledSelectionStatuses) !== JSON.stringify(['草稿'])) errors.push('page-level draft-only batch delete was not standardized');
if (schema.deleteConfirmationEnabled !== true) errors.push('shared delete confirmation was not enabled');
if (findComponent(schema.regions, 'Alert')) errors.push('informational rule alert was not removed');
if ((detailForm.fields || []).some((field) => field.help !== undefined)) errors.push('field helper text was not removed');
if (nonWorkflowSchema.submitActionLabel !== '提交') errors.push('non-workflow submit label was not standardized');
if (!nonWorkflowChanges.some((change) => change.rule === 'detail.non-workflow-submit-label')) errors.push('policy trace is missing detail.non-workflow-submit-label');
const publicReverseAudit = (nonWorkflowSchema.pageActions || []).find((action) => action.code === 'reverse-audit');
if (!publicReverseAudit || publicReverseAudit.nextStatus !== '草稿') errors.push('public reverse audit default must return to draft');
if (!nonWorkflowChanges.some((change) => change.rule === 'list.audit-actions.page-level')) errors.push('policy trace is missing list.audit-actions.page-level for auditable pages');
for (const key of ['detailSaveEnabled', 'detailSubmitEnabled', 'detailReviewEnabled', 'detailWorkflowLinksEnabled']) {
  if (schema[key] !== true) errors.push(`workflow detail action was not standardized: ${key}`);
}
for (const rule of ['search.expanded', 'field-scope.detail-only.search', 'field-scope.detail-only.primary-list', 'attachment.hide-inner-title', 'attachment.inherit-detail-editability', 'attachment.draft-delete', 'editable-table.batch-delete-label', 'editable-table.row-delete-label', 'detail.three-column-layout', 'list.batch-delete.page-level', 'delete.confirmation', 'content.hide-informational-alert', 'content.hide-field-helper-text']) {
  if (!changes.some((change) => change.rule === rule)) errors.push(`policy trace is missing ${rule}`);
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('Policy defaults check passed: shared content and interaction rules are enforced');

function findComponent(nodes, component) {
  for (const node of nodes || []) {
    if (node.component === component) return node;
    for (const value of Object.values(node || {})) {
      if (!Array.isArray(value)) continue;
      const match = findComponent(value, component);
      if (match) return match;
    }
  }
  return null;
}
