import fs from 'node:fs';
import { writeJson } from '../lib/file-utils.mjs';
import { loadEffectiveSchema } from '../lib/policy-engine.mjs';

const schemaPath = process.argv[2];
if (!schemaPath) throw new Error('Usage: node scripts/check/policy-check.mjs <schemas/pages/{domain}/page.json>');

const SYSTEM_GENERATED_AUDITABLE_PROFILE = 'system-generated-auditable-list-detail';

const { schema, profile, effectivePath } = loadEffectiveSchema(schemaPath);
const issues = [];
const detailForms = [];
const searchForms = [];
const tables = [];
const uploadLists = [];
const editableTables = [];
const informationalAlerts = [];
const fieldHelperTexts = [];

walkNodes(schema.regions || [], (node) => {
  if (node.component === 'DetailForm') detailForms.push(node);
  if (node.component === 'ProSearchForm') searchForms.push(node);
  if (node.component === 'ProTable') tables.push(node);
  if (node.component === 'ProUploadList') uploadLists.push(node);
  if (node.component === 'EditableTable') editableTables.push(node);
  if (node.component === 'Alert' && (node.type || 'info') === 'info' && node.persistent !== true) informationalAlerts.push(node);
  for (const field of node.fields || []) if (field.help !== undefined) fieldHelperTexts.push({ node, field });
});

if (!schema.policyVersion) issues.push(error('policyVersion is missing'));
if (!schema.policyProfile) issues.push(error('policyProfile is missing'));
if (informationalAlerts.length) issues.push(error('Persistent informational rule banners are hidden by public policy unless explicitly marked persistent'));
if (fieldHelperTexts.length) issues.push(error('Field-level helper text must be removed by public content policy'));
const toastException = (schema.policyExceptions || []).includes('interaction.toast-explicit-feedback');
if (schema.toastEnabled !== false && !toastException) issues.push(error('Toast is disabled by default and requires an approved exception'));
if (profile.auditFields && schema.auditFields !== false) {
  const auditCodes = ['company', 'creator', 'createdAt'];
  const primaryCodes = new Set((detailForms[0]?.fields || []).map((field) => field.code));
  for (const code of auditCodes) {
    if (!primaryCodes.has(code)) issues.push(error(`Primary DetailForm is missing mandatory audit field: ${code}`));
  }
  for (const [index, form] of detailForms.slice(1).entries()) {
    const duplicateCodes = (form.fields || []).map((field) => field.code).filter((code) => auditCodes.includes(code));
    if (duplicateCodes.length) {
      issues.push(error(`Secondary DetailForm ${index + 2} repeats page audit fields: ${duplicateCodes.join(', ')}`));
    }
  }
}
for (const form of searchForms) {
  if (form.collapsedFieldCount !== 4) issues.push(error('ProSearchForm must use four fields per row'));
  if (form.collapsible !== false) issues.push(error('ProSearchForm must display all query fields without a collapse control'));
  if (!['selection-control', 'first-data-column'].includes(form.firstFieldAlignment)) issues.push(error('ProSearchForm must declare the policy-driven first-field alignment'));
  validateStatusPlacement(form.fields, `ProSearchForm ${form.id || 'unknown'}`, form.statusAfterField);
}
for (const form of detailForms) {
  if (form.layoutColumns !== 3) issues.push(error(`DetailForm must use the shared three-column layout: ${form.id || 'unknown'}`));
  validateStatusPlacement(form.fields, `DetailForm ${form.id || 'unknown'}`, form.statusAfterField);
}
for (const table of tables) {
  if ((table.pageSize || 0) > 5) issues.push(error('ProTable pageSize must not exceed five'));
  if (table.pagination !== false) {
    if (Number(table.pageSize || 5) !== 5) issues.push(error('Paginated business ProTable must use pageSize 5'));
    if (table.showRecordCount === false) issues.push(error('Paginated business ProTable must not hide record count'));
    if (table.showPageSize === false) issues.push(error('Paginated business ProTable must not hide fixed page size'));
  }
  const columns = table.columns || [];
  validateStatusPlacement(columns, `ProTable ${table.id || 'unknown'}`, table.statusAfterField);
}
const detailOnlyFields = new Set(schema.detailOnlyFields || []);
if (detailOnlyFields.size) {
  const primarySearchCodes = new Set(searchForms.flatMap((form) => (form.fields || []).map((field) => field.code)));
  const primaryTableCodes = new Set((schema.regions || []).filter((node) => node.component === 'ProTable').flatMap((table) => (table.columns || []).map((column) => column.code)));
  for (const code of detailOnlyFields) {
    if (primarySearchCodes.has(code)) issues.push(error(`Detail-only field must not appear in search: ${code}`));
    if (primaryTableCodes.has(code)) issues.push(error(`Detail-only field must not appear in primary list: ${code}`));
  }
}
for (const upload of uploadLists) {
  if (schema.pageType !== 'list-detail') continue;
  if (upload.title) issues.push(error(`ProUploadList must not repeat an inner title: ${upload.id || 'unknown'}`));
  if (upload.inheritDetailEditability !== true) issues.push(error(`ProUploadList must inherit detail editability: ${upload.id || 'unknown'}`));
  if (upload.keepOperationColumn !== true) issues.push(error(`ProUploadList must keep its delete operation column: ${upload.id || 'unknown'}`));
  if (JSON.stringify(upload.rowActions || []) !== JSON.stringify([{ code: 'remove-row', label: '删除', type: 'link' }])) {
    issues.push(error(`ProUploadList must use the shared draft-only delete action: ${upload.id || 'unknown'}`));
  }
}
for (const table of editableTables) {
  const batchDelete = (table.actions || []).find((action) => action.code === 'batch-delete');
  const rowDelete = (table.rowActions || []).find((action) => action.code === 'remove-row');
  if (batchDelete && !/^删除选中(?:明细|.+行)$/.test(String(batchDelete.label || ''))) issues.push(error(`EditableTable batch delete label must be 删除选中明细 or a contextual 删除选中…行 label: ${table.id || 'unknown'}`));
  if (rowDelete && rowDelete.label !== '删除') issues.push(error(`EditableTable row delete label must be 删除: ${table.id || 'unknown'}`));
}
if (schema.workflowActions === false && schema.saveDraftEnabled !== false && schema.policyProfile !== 'auditable-list-detail' && schema.policyProfile !== 'auditable-list-detail-save') {
  issues.push(error('Non-workflow detail pages must not show Save Draft'));
}
if (schema.workflowActions === false && schema.pageType === 'list-detail' && schema.policyProfile !== 'auditable-list-detail' && schema.policyProfile !== 'auditable-list-detail-save' && schema.policyProfile !== SYSTEM_GENERATED_AUDITABLE_PROFILE) {
  if (schema.detailReadOnly === true) {
    if (schema.detailSaveEnabled !== false || schema.detailSubmitEnabled !== false) issues.push(error('Read-only detail pages must disable Save and Submit actions'));
  } else {
    if (schema.detailSaveEnabled !== false) issues.push(error('Non-workflow entry detail pages must disable Save actions'));
    if (schema.detailSubmitEnabled !== true) issues.push(error('Non-workflow entry detail pages must use Submit as the primary action'));
  }
}
if (schema.policyProfile === SYSTEM_GENERATED_AUDITABLE_PROFILE) {
  if (schema.systemGenerated !== true) issues.push(error('System-generated auditable pages must declare systemGenerated'));
  if (schema.workflowActions !== false) issues.push(error('System-generated auditable pages must not enable workflow actions'));
  for (const key of ['saveDraftEnabled', 'detailSaveEnabled', 'detailSubmitEnabled', 'detailReviewEnabled', 'detailWorkflowLinksEnabled']) {
    if (schema[key] !== false) issues.push(error(`System-generated auditable pages must disable ${key}`));
  }
  if ((schema.pageActions || []).some((action) => ['create', 'delete', 'batch-delete'].includes(action.code || action.event))) issues.push(error('System-generated auditable pages must not expose create or delete page actions'));
  const auditAction = (schema.pageActions || []).find((action) => action.code === 'audit');
  const reverseAction = (schema.pageActions || []).find((action) => action.code === 'reverse-audit');
  if (!auditAction || !reverseAction) issues.push(error('System-generated auditable list must expose Audit and Reverse Audit in the page header'));
  if (auditAction?.nextStatus !== '已审核') issues.push(error('System-generated Audit must move the record to 已审核'));
  if (reverseAction?.nextStatus !== (schema.reverseAuditNextStatus || profile.reverseAuditNextStatus || '待审核')) issues.push(error('System-generated Reverse Audit must return the record to 待审核'));
  const primaryAuditTable = tables[0];
  const statusValues = new Set((schema.mockData?.[primaryAuditTable?.dataSource] || []).map((row) => row.status).filter(Boolean));
  if (statusValues.has('草稿')) issues.push(error('System-generated auditable pages must not keep a Draft status'));
}
if (schema.policyProfile === 'auditable-list-detail-save') {
  if (schema.workflowActions !== false) issues.push(error('Save-only auditable pages must not enable workflow actions'));
  if (schema.detailSaveEnabled !== true || schema.detailSubmitEnabled !== false) issues.push(error('Save-only auditable detail pages must keep Save and remove Submit'));
  if (schema.detailReviewEnabled !== false || schema.detailWorkflowLinksEnabled !== false) issues.push(error('Save-only auditable detail pages must not render workflow review or workflow links'));
  if (schema.saveActionLabel !== '保存') issues.push(error('Save-only auditable detail pages must label the Save action 保存'));
  if (schema.createStatus !== '新增') issues.push(error('Save-only auditable pages must default new records to 新增'));
  const createAction = (schema.pageActions || []).find((action) => (action.code || action.event) === 'create');
  if (createAction && createAction.label !== '新增') issues.push(error('Create action label must be 新增'));
  const saveAuditAction = (schema.pageActions || []).find((action) => action.code === 'audit');
  const saveReverseAction = (schema.pageActions || []).find((action) => action.code === 'reverse-audit');
  if (!saveAuditAction || !saveReverseAction) issues.push(error('Save-only auditable list must expose Audit and Reverse Audit in the page header'));
  if (saveAuditAction && (!saveAuditAction.requiresSingleSelection || JSON.stringify(saveAuditAction.enabledSelectionStatuses || []) !== JSON.stringify([schema.auditPendingStatus]))) issues.push(error('Audit must require one selected record in its pending status'));
  if (saveAuditAction?.nextStatus !== schema.auditCompletedStatus) issues.push(error('Audit must move the record to the completed status'));
  if (saveReverseAction && (!saveReverseAction.requiresSingleSelection || JSON.stringify(saveReverseAction.enabledSelectionStatuses || []) !== JSON.stringify([schema.auditCompletedStatus]))) issues.push(error('Reverse Audit must require one selected record in its completed status'));
  if (saveReverseAction?.nextStatus !== (schema.reverseAuditNextStatus || profile.reverseAuditNextStatus)) issues.push(error('Reverse Audit must return to the pending status'));
  const overlayConfirmUpdates = (overlayId) => (schema.overlays || []).find((overlay) => overlay.id === overlayId)?.actions?.find((action) => action.code === 'confirm-status')?.fieldUpdates;
  const auditWrite = saveAuditAction?.target ? overlayConfirmUpdates(saveAuditAction.target) : saveAuditAction?.fieldUpdates;
  const reverseClear = saveReverseAction?.target ? overlayConfirmUpdates(saveReverseAction.target) : saveReverseAction?.fieldUpdates;
  if (!auditWrite || !Object.values(auditWrite).some((value) => value === '$currentDateTime') || !Object.values(auditWrite).some((value) => String(value).trim() !== '')) issues.push(error('Audit must write the auditor and audit time'));
  if (!reverseClear || Object.values(reverseClear).some((value) => String(value).trim() !== '')) issues.push(error('Reverse Audit must clear the auditor and audit time'));
}
if (schema.policyProfile === 'auditable-list-detail') {
  if (schema.workflowActions !== false) issues.push(error('Auditable detail pages must not enable workflow actions'));
  if (schema.detailReadOnly !== true && (schema.detailSaveEnabled !== true || schema.detailSubmitEnabled !== true)) issues.push(error('Auditable detail pages must support Save Draft and Submit for Audit'));
  if (schema.detailReviewEnabled !== false || schema.detailWorkflowLinksEnabled !== false) issues.push(error('Auditable detail pages must not render workflow review or workflow links'));
  const auditAction = (schema.pageActions || []).find((action) => action.code === 'audit');
  const reverseAction = (schema.pageActions || []).find((action) => action.code === 'reverse-audit');
  if (!auditAction || !reverseAction) issues.push(error('Auditable list must expose Audit and Reverse Audit in the page header'));
  if (auditAction && (!auditAction.requiresSingleSelection || auditAction.enabledSelectionStatuses?.length !== 1)) issues.push(error('Audit must require one selected record in its pending status'));
  if (reverseAction && (!reverseAction.requiresSingleSelection || reverseAction.enabledSelectionStatuses?.length !== 1)) issues.push(error('Reverse Audit must require one selected record in its completed status'));
  const expectedReverseStatus = schema.reverseAuditNextStatus || profile.reverseAuditNextStatus || '草稿';
  if (reverseAction?.nextStatus !== expectedReverseStatus) issues.push(error(`Reverse Audit must return to ${expectedReverseStatus}`));
  if ((schema.detailActions || []).some((action) => /^反?审核/.test(String(action.label || '')) || ['audit', 'reverse-audit'].includes(action.code))) issues.push(error('Audit actions must not be duplicated in the detail header'));
}
if (schema.workflowActions === false && schema.detailSubmitEnabled === true && schema.submitActionLabel !== '提交') {
  issues.push(error('Non-workflow detail Submit action label must be 提交'));
}
if (schema.workflowActions === true && schema.pageType === 'list-detail') {
  for (const key of ['detailSaveEnabled', 'detailSubmitEnabled', 'detailReviewEnabled', 'detailWorkflowLinksEnabled']) {
    if (schema[key] !== true) issues.push(error(`Workflow detail public action is not enabled: ${key}`));
  }
}

const primaryTable = (schema.regions || []).find((node) => node.component === 'ProTable');
const primaryDelete = (primaryTable?.rowActions || []).find((action) => action.code === 'delete');
if (primaryDelete) {
  const batchDelete = (schema.pageActions || []).find((action) => action.code === 'batch-delete');
  if (!batchDelete) issues.push(error('Maintainable primary list is missing page-level Batch Delete'));
  if (primaryTable.selectable !== true) issues.push(error('Maintainable primary list must enable row selection'));
  if ((primaryTable.actions || []).some((action) => action.code === 'batch-delete')) issues.push(error('Batch Delete must not be placed inside the primary table'));
  if (schema.workflowActions === true) {
    if (JSON.stringify(primaryTable.selectableStatuses || []) !== JSON.stringify(['草稿'])) issues.push(error('Workflow Batch Delete must only select Draft rows'));
    if (JSON.stringify(batchDelete?.enabledSelectionStatuses || []) !== JSON.stringify(['草稿'])) issues.push(error('Workflow Batch Delete must only enable for Draft selections'));
  }
  if (schema.policyProfile === 'auditable-list-detail') {
    if ((primaryTable.selectableStatuses || []).length) issues.push(error('Auditable list must allow selecting all business statuses'));
    if (JSON.stringify(batchDelete?.enabledSelectionStatuses || []) !== JSON.stringify(['草稿'])) issues.push(error('Auditable Batch Delete must only enable for Draft selections'));
  }
}
if (hasDeleteMutation(schema) && schema.deleteConfirmationEnabled !== true) {
  issues.push(error('Delete mutations must enable the shared confirmation dialog'));
}

let html = '';
if (schema.outputPath && fs.existsSync(schema.outputPath)) html = fs.readFileSync(schema.outputPath, 'utf8');
if (html && schema.policyProfile === 'auditable-list-detail-save') {
  const saveDetailHeader = html.match(/<header[^>]*schema-detail-header[^>]*>[\s\S]*?<\/header>/)?.[0] || '';
  if (!saveDetailHeader.includes('data-act="save"')) issues.push(error('Save-only auditable detail header is missing Save action'));
  if (saveDetailHeader.includes('data-act="submit"')) issues.push(error('Save-only auditable detail header must not render Submit action'));
  const saveButton = saveDetailHeader.match(/<button[^>]*data-act="save"[^>]*>[\s\S]*?<\/button>/)?.[0] || '';
  if (saveButton.replace(/<[^>]+>/g, '').trim() !== '保存') issues.push(error('Rendered Save action label must be 保存'));
  for (const action of ['approve', 'workflow-activity', 'workflow-owner', 'workflow-chart']) {
    if (saveDetailHeader.includes(`data-act="${action}"`)) issues.push(error(`Save-only auditable detail header must not render ${action}`));
  }
  if (!html.includes(`data-policy-version="${schema.policyVersion}"`)) issues.push(error('HTML is missing policy version evidence'));
  if (!html.includes(`data-policy-profile="${schema.policyProfile}"`)) issues.push(error('HTML is missing policy profile evidence'));
}
if (html) {
  if (!html.includes(`data-policy-version="${schema.policyVersion}"`)) issues.push(error('HTML is missing policy version evidence'));
  if (!html.includes(`data-policy-profile="${schema.policyProfile}"`)) issues.push(error('HTML is missing policy profile evidence'));
  if ((schema.toastEnabled === false || !toastException) && html.includes('data-enable-toast="true"')) issues.push(error('HTML enables Toast against policy'));
  if (html.includes('data-field-help')) issues.push(error('HTML renders prohibited field-level helper text'));
  if (schema.workflowActions === false && schema.pageType === 'list-detail' && schema.policyProfile !== 'auditable-list-detail' && schema.policyProfile !== 'auditable-list-detail-save' && schema.policyProfile !== SYSTEM_GENERATED_AUDITABLE_PROFILE) {
    const detailHeader = html.match(/<header[^>]*schema-detail-header[^>]*>[\s\S]*?<\/header>/)?.[0] || '';
    if (schema.detailReadOnly === true && detailHeader.includes('data-act="submit"')) issues.push(error('Read-only detail header must not render Submit action'));
    if (schema.detailReadOnly !== true && !detailHeader.includes('data-act="submit"')) issues.push(error('Non-workflow detail header is missing Submit action'));
    if (detailHeader.includes('data-act="save"')) issues.push(error('Non-workflow detail header must not render Save action'));
  }
  if (schema.policyProfile === SYSTEM_GENERATED_AUDITABLE_PROFILE) {
    const detailHeader = html.match(/<header[^>]*schema-detail-header[^>]*>[\s\S]*?<\/header>/)?.[0] || '';
    for (const action of ['save', 'submit', 'approve', 'audit', 'reverse-audit', 'workflow-activity', 'workflow-owner', 'workflow-chart']) {
      if (detailHeader.includes(`data-act="${action}"`)) issues.push(error(`System-generated auditable detail header must not render ${action}`));
    }
    if (!detailHeader.includes('data-act="back-list"')) issues.push(error('System-generated auditable detail header must keep the Back to List action'));
    if (html.includes('data-act="create"')) issues.push(error('System-generated auditable page must not render a Create action'));
  }
  if (schema.policyProfile === 'auditable-list-detail' && schema.detailReadOnly !== true) {
    const detailHeader = html.match(/<header[^>]*schema-detail-header[^>]*>[\s\S]*?<\/header>/)?.[0] || '';
    if (!detailHeader.includes('data-act="save"')) issues.push(error('Auditable detail header is missing Save action'));
    if (!detailHeader.includes('data-act="submit"')) issues.push(error('Auditable detail header is missing Submit for Audit action'));
    for (const action of ['approve', 'workflow-activity', 'workflow-owner', 'workflow-chart']) {
      if (detailHeader.includes(`data-act="${action}"`)) issues.push(error(`Auditable detail header must not render ${action}`));
    }
  }
  if (schema.workflowActions === false && schema.detailSubmitEnabled === true) {
    const detailHeader = html.match(/<header[^>]*schema-detail-header[^>]*>[\s\S]*?<\/header>/)?.[0] || '';
    const submitButton = detailHeader.match(/<button[^>]*data-act="submit"[^>]*>[\s\S]*?<\/button>/)?.[0] || '';
    const submitText = submitButton.replace(/<[^>]+>/g, '').trim();
    if (submitText !== '提交') issues.push(error('Rendered non-workflow Submit action label must be 提交'));
  }
  if (detailForms.length && !html.includes('data-detail-columns="3"')) issues.push(error('HTML is missing three-column detail layout evidence'));
  if (schema.workflowActions === true && schema.pageType === 'list-detail') {
    const detailHeader = html.match(/<header[^>]*schema-detail-header[^>]*>[\s\S]*?<\/header>/)?.[0] || '';
    for (const action of ['save', 'submit', 'approve', 'workflow-activity', 'workflow-owner', 'workflow-chart']) {
      if (!detailHeader.includes(`data-act="${action}"`)) issues.push(error(`Workflow detail header is missing public action: ${action}`));
    }
  }
  if (hasDeleteMutation(schema)) {
    if (!html.includes('data-delete-confirm')) issues.push(error('HTML is missing the shared Delete confirmation dialog'));
    if (!html.includes("['delete','batch-delete','remove-row'].includes(action)")) issues.push(error('HTML runtime does not intercept delete mutations for confirmation'));
  }
  const requiredFields = [
    ...detailForms.flatMap((form) => (form.fields || []).filter((field) => field.required)),
    ...editableTables.flatMap((table) => (table.columns || []).filter((column) => column.required))
  ];
  for (const field of requiredFields) {
    const code = escapeRegExp(field.code);
    if (!new RegExp(`data-field="${code}"[^>]*\\srequired(?:\\s|>)`).test(html)) issues.push(error(`Required control is missing native validation: ${field.code}`));
  }
  if (requiredFields.length && !html.includes("querySelector('[required]:invalid')")) issues.push(error('HTML runtime is missing Submit required-field validation'));
  if (uploadLists.length && schema.pageType === 'list-detail') {
    if (!html.includes('data-act="remove-row"')) issues.push(error('Attachment list does not render the shared delete action'));
    if (!html.includes("if(['open','get-location','remove-row','add-row','split','create-child','upload','batch-delete'].includes(x.dataset.act))x.disabled=!editable")) {
      issues.push(error('HTML runtime does not bind attachment mutations to detail editability'));
    }
  }
}

const reportPath = `outputs/reports/policy/${schema.domain || 'unknown'}/${schema.pageCode || 'unknown'}.json`;
writeJson(reportPath, {
  pageCode: schema.pageCode,
  domain: schema.domain,
  stage: 'policy-check',
  policyVersion: schema.policyVersion,
  policyProfile: schema.policyProfile,
  effectiveSchemaPath: effectivePath,
  status: issues.some((item) => item.level === 'error') ? 'failed' : 'passed',
  issues
});
console.log(`Policy check report generated: ${reportPath}`);
if (issues.some((item) => item.level === 'error')) process.exit(1);

function walkNodes(nodes, visitor) {
  if (!Array.isArray(nodes)) return;
  for (const node of nodes) {
    if (!node || typeof node !== 'object') continue;
    if (node.component) visitor(node);
    for (const value of Object.values(node)) if (Array.isArray(value)) walkNodes(value, visitor);
  }
}
function error(message) { return { level: 'error', message }; }
function escapeRegExp(value) { return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function validateStatusPlacement(items = [], context = 'component', statusAfterField = '') {
  const statusIndex = items.findIndex((item) => /^(status|state)$/i.test(String(item.code || '')));
  if (statusIndex < 0) return;
  const status = items[statusIndex];
  if (status.label !== '状态') issues.push(error(`${context} business status label must be 状态`));
  const candidates = items.filter((_, index) => index !== statusIndex);
  let identifierIndex = statusAfterField
    ? candidates.findIndex((item) => item.code === statusAfterField)
    : candidates.findIndex((item) => item.component === 'link' && /(No|Code|Id)$/i.test(String(item.code || '')));
  if (identifierIndex < 0) identifierIndex = candidates.findIndex((item) => /^(businessNo|documentNo|receiptNo|orderNo|contractNo|code|id)$/i.test(String(item.code || '')));
  if (identifierIndex < 0) identifierIndex = candidates.findIndex((item) => /(单号|编号)$/.test(String(item.label || '')));
  if (identifierIndex >= 0 && statusIndex !== identifierIndex + 1) issues.push(error(`${context} status must immediately follow the business identifier`));
}
function hasDeleteMutation(schema) {
  const codes = new Set(['delete', 'batch-delete', 'remove-row']);
  if ((schema.pageActions || []).some((action) => codes.has(action.code))) return true;
  let found = false;
  walkNodes([...(schema.regions || []), ...(schema.overlays || [])], (node) => {
    for (const key of ['actions', 'rowActions']) if ((node[key] || []).some((action) => codes.has(action.code))) found = true;
  });
  return found;
}
