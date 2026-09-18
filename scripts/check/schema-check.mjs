import { readJson, writeJson } from '../lib/file-utils.mjs';
import { componentRegistry, registeredComponents, registeredFieldComponents, registeredColumnComponents, registeredPageTypes, walkComponents } from '../lib/component-registry.mjs';
import { loadEffectiveSchema } from '../lib/policy-engine.mjs';

const schemaPath = process.argv[2];
if (!schemaPath) throw new Error('Usage: node scripts/check/schema-check.mjs <schemas/pages/{domain}/page.json>');
const { schema } = loadEffectiveSchema(schemaPath);
const resourceManifest = readJson('prototype-resources/manifest.json');
const issues = [];

for (const key of ['schemaVersion', 'pageCode', 'pageName', 'domain', 'module', 'pageType', 'template', 'outputPath']) required(schema, key);
required(schema, 'resourceReference');
if (schema.schemaVersion && schema.schemaVersion !== 'pms-page-schema-v2') issues.push(error('schemaVersion must be pms-page-schema-v2'));
if (schema.pageType && !registeredPageTypes.has(schema.pageType)) issues.push(error(`unsupported pageType: ${schema.pageType}`));
if (schema.outputPath && schema.domain && !schema.outputPath.startsWith(`pages/${schema.domain}/`)) issues.push(warning(`outputPath should be under pages/${schema.domain}/`));
if (!schema.menuPath) issues.push(warning('menuPath is recommended for menu binding'));
validateResourceReference(schema.resourceReference);

const hasRegions = Array.isArray(schema.regions) && schema.regions.length > 0;
if (!hasRegions && !Array.isArray(schema.listColumns) && !Array.isArray(schema.detailFields)) issues.push(error('regions is required for Schema v2; legacy flat fields are accepted only for compatibility'));

walkComponents([...(schema.regions || []), ...(schema.overlays || [])], (node, nodePath) => {
  if (!node?.component) return issues.push(error(`${nodePath}.component is required`));
  if (!registeredComponents.has(node.component)) return issues.push(error(`${nodePath}: unsupported component ${node.component}`));
  const requiredProps = componentRegistry.requiredComponentProperties[node.component] || [];
  for (const prop of requiredProps) if (node[prop] === undefined || (Array.isArray(node[prop]) && !node[prop].length)) issues.push(error(`${nodePath}.${prop} is required for ${node.component}`));
  validateFields(node.fields, `${nodePath}.fields`);
  validateFields(node.columns, `${nodePath}.columns`, true);
  validateActions(node.actions, `${nodePath}.actions`);
  validateActions(node.rowActions, `${nodePath}.rowActions`);
  if (['Descriptions', 'ProDescriptionList'].includes(node.component) && node.layoutColumns !== undefined) {
    const columns = Number(node.layoutColumns);
    if (!Number.isInteger(columns) || columns < 1 || columns > 3) issues.push(error(`${nodePath}.layoutColumns must be an integer from 1 to 3`));
  }
  if (node.component === 'ProUploadList' && (node.columns || []).some((column) => column.code === 'documentType' || column.label === '资料类型')) {
    issues.push(error(`${nodePath}.columns must not include attachment document type`));
  }
});

validateFields(schema.queryFields, 'queryFields');
validateFields(schema.listColumns, 'listColumns', true);
validateFields(schema.detailFields, 'detailFields');
validateActions(schema.pageActions || schema.actions, 'pageActions');

const componentNames = new Set();
walkComponents([...(schema.regions || []), ...(schema.overlays || [])], (node) => componentNames.add(node.component));
if (schema.resourceReference && !schema.resourceReference.components?.includes('*')) {
  for (const component of componentNames) if (!schema.resourceReference.components?.includes(component)) issues.push(error(`resourceReference.components does not include ${component}`));
}
if (schema.pageType === 'list' && hasRegions && !componentNames.has('ProTable')) issues.push(warning('list page should include ProTable'));
if (componentNames.has('ProTable') && !componentNames.has('ProSearchForm')) issues.push(warning('table page has no ProSearchForm; confirm that unfiltered access is intended'));
if (!hasBizfinEvidence(schema, componentNames)) issues.push(warning('biz-fin trace component or relation is not configured'));
validatePrimaryListOperations();
validateUiConstraints();

const reportPath = `outputs/reports/schema/${schema.domain || 'unknown'}/${schema.pageCode || 'unknown'}.json`;
writeJson(reportPath, { pageCode: schema.pageCode, domain: schema.domain, stage: 'schema-check', registryVersion: componentRegistry.version, status: issues.some((x) => x.level === 'error') ? 'failed' : 'passed', issues });
console.log(`Schema check report generated: ${reportPath}`);
if (issues.some((x) => x.level === 'error')) process.exit(1);

function validateFields(fields, fieldPath, column = false) {
  if (fields === undefined) return;
  if (!Array.isArray(fields)) return issues.push(error(`${fieldPath} must be an array`));
  fields.forEach((field, index) => {
    if (!field.code) issues.push(error(`${fieldPath}[${index}].code is required`));
    if (!field.label) issues.push(error(`${fieldPath}[${index}].label is required`));
    const type = field.component || (column ? 'text' : 'input');
    const registry = column ? registeredColumnComponents : registeredFieldComponents;
    if (!registry.has(type)) issues.push(error(`${fieldPath}[${index}]: unsupported ${column ? 'column' : 'field'} component ${type}`));
    if (field.requiredWhen && typeof field.requiredWhen !== 'object') issues.push(error(`${fieldPath}[${index}].requiredWhen must be an object`));
    if (field.visibleWhen && typeof field.visibleWhen !== 'object') issues.push(error(`${fieldPath}[${index}].visibleWhen must be an object`));
    if (field.signByFieldValue && (typeof field.signByFieldValue !== 'object' || !field.signByFieldValue.field || field.signByFieldValue.negativeValue === undefined)) issues.push(error(`${fieldPath}[${index}].signByFieldValue must define field and negativeValue`));
  });
}

function validateActions(actions, actionPath) {
  if (actions === undefined) return;
  if (!Array.isArray(actions)) return issues.push(error(`${actionPath} must be an array`));
  actions.forEach((action, index) => { if (!action.code && !action.event) issues.push(error(`${actionPath}[${index}].code is required`)); if (!action.label) issues.push(error(`${actionPath}[${index}].label is required`)); });
}
function validateUiConstraints() {
  const constraints = schema.uiConstraints;
  if (!constraints) return;
  const nodes = [];
  walkComponents([...(schema.regions || []), ...(schema.overlays || [])], (node, nodePath) => nodes.push({ node, nodePath }));

  if (constraints.listPageSize !== undefined) {
    const primaryTable = (schema.regions || []).find((node) => node.component === 'ProTable');
    if (!primaryTable) issues.push(error('uiConstraints.listPageSize requires a primary ProTable'));
    else if (Number(primaryTable.pageSize) !== Number(constraints.listPageSize)) issues.push(error(`primary ProTable.pageSize must be ${constraints.listPageSize}`));
  }

  if (constraints.detailFormColumns !== undefined) {
    const forms = nodes.filter(({ node }) => node.component === 'DetailForm');
    forms.forEach(({ node, nodePath }) => {
      if (Number(node.layoutColumns) !== Number(constraints.detailFormColumns)) issues.push(error(`${nodePath}.layoutColumns must be ${constraints.detailFormColumns}`));
    });
  }

  if (constraints.tabSectionTitles === false) {
    nodes.filter(({ node }) => node.component === 'ProTabsDetail').forEach(({ node, nodePath }) => {
      (node.tabs || []).forEach((tab, tabIndex) => (tab.children || []).forEach((child, childIndex) => {
        if (child.title) issues.push(error(`${nodePath}.tabs[${tabIndex}].children[${childIndex}].title must be omitted when tabSectionTitles is false`));
        if (child.showTitle !== false) issues.push(error(`${nodePath}.tabs[${tabIndex}].children[${childIndex}].showTitle must be false when tabSectionTitles is false`));
      }));
    });
  }

  const cardTables = nodes.filter(({ node }) => node.component === 'EditableTable' && node.displayMode === 'cards');
  if (constraints.effectCardsPerRow !== undefined) cardTables.forEach(({ node, nodePath }) => {
    if (Number(node.cardsPerRow) !== Number(constraints.effectCardsPerRow)) issues.push(error(`${nodePath}.cardsPerRow must be ${constraints.effectCardsPerRow}`));
  });
  if (constraints.effectMetricColumns !== undefined) cardTables.forEach(({ node, nodePath }) => {
    if (Number(node.metricColumns) !== Number(constraints.effectMetricColumns)) issues.push(error(`${nodePath}.metricColumns must be ${constraints.effectMetricColumns}`));
  });
}
function validatePrimaryListOperations() {
  if (!['list', 'list-detail'].includes(schema.pageType)) return;
  const primaryTables = (schema.regions || []).filter((node) => node.component === 'ProTable');
  if (schema.pageCode === 'my-task') {
    walkComponents(schema.regions || [], (node) => {
      if (node.component === 'ProTable' && !primaryTables.includes(node)) primaryTables.push(node);
    });
  }
  primaryTables.forEach((table) => {
    const tablePath = `regions.${table.id || 'ProTable'}`;
    const isApprovalWorkbench = schema.pageCode === 'my-approval';
    const isReadOnlyTaskWorkbench = schema.pageCode === 'my-task';
    if (isApprovalWorkbench) {
      const handleActions = (table.rowActions || []).filter((action) => action.code === 'handle' && !action.event && !action.target);
      const businessNoColumn = (table.columns || []).find((column) => column.code === 'businessNo');
      if (handleActions.length !== 1 || (table.rowActions || []).length !== 1) issues.push(error(`${tablePath}.rowActions must contain exactly one handle action`));
      if (!businessNoColumn || businessNoColumn.component === 'link' || businessNoColumn.link) issues.push(error(`${tablePath}.businessNo must be plain text`));
      if (table.representativeByStatus !== false) issues.push(error(`${tablePath}.representativeByStatus must be false`));
      if (table.identifierClickable !== false) issues.push(error(`${tablePath}.identifierClickable must be false`));
      if (table.keepOperationColumn !== true) issues.push(error(`${tablePath}.keepOperationColumn must be true`));
      return;
    }
    if (isReadOnlyTaskWorkbench) {
      const rowActions = table.rowActions || [];
      if (table.id === 'project-proposal-task-table') {
        const handleActions = rowActions.filter((action) => action.code === 'handle' && action.target);
        const overlayIds = new Set((schema.overlays || []).map((overlay) => overlay.id));
        if (handleActions.length !== 1 || rowActions.length !== 1) issues.push(error(`${tablePath}.rowActions must contain exactly one handle action`));
        if (handleActions.some((action) => !overlayIds.has(action.target))) issues.push(error(`${tablePath}.handle target must reference an existing overlay`));
      } else {
        const viewActions = rowActions.filter((action) => action.code === 'view' && action.target);
        const overlayIds = new Set((schema.overlays || []).map((overlay) => overlay.id));
        if (viewActions.length !== 1 || rowActions.length !== 1) issues.push(error(`${tablePath}.rowActions must contain exactly one read-only view modal action`));
        if (viewActions.some((action) => !overlayIds.has(action.target))) issues.push(error(`${tablePath}.view target must reference an existing overlay`));
      }
      if ((table.columns || []).some((column) => column.link || column.component === 'link')) issues.push(error(`${tablePath}.columns must use plain text for the read-only task workbench`));
      if (table.identifierClickable !== false) issues.push(error(`${tablePath}.identifierClickable must be false`));
      if (table.keepOperationColumn !== true) issues.push(error(`${tablePath}.keepOperationColumn must be true`));
      if (table.selectable !== false) issues.push(error(`${tablePath}.selectable must be false`));
      return;
    }
    if (schema.primaryListReadOnly === true) {
      const allowedActions = new Set(['view', 'toggle-control-effect']);
      const unsupportedActions = (table.rowActions || []).filter((action) => !allowedActions.has(action.code || action.event));
      if ((schema.pageActions || []).some((action) => ['create', 'delete', 'batch-delete'].includes(action.code || action.event))) issues.push(error('read-only primary lists must not expose create or delete page actions'));
      if (unsupportedActions.length) issues.push(error(`${tablePath}.rowActions contains a destructive or unsupported action for a read-only primary list`));
      if (table.selectable !== false && schema.primaryListSelectionAllowed !== true) issues.push(error(`${tablePath}.selectable must be false for a read-only primary list unless primaryListSelectionAllowed is true`));
      if ((table.rowActions || []).length && table.keepOperationColumn !== true) issues.push(error(`${tablePath}.keepOperationColumn must be true when read-only row actions are present`));
      return;
    }
    if (schema.systemGenerated === true) {
      const actionCodes = [...(schema.pageActions || []), ...(table.actions || [])].map((action) => action.code || action.event);
      if ((schema.pageActions || []).some((action) => action.code === 'create')) issues.push(error('system-generated pages must not expose a create page action'));
      if ((table.rowActions || []).length) issues.push(error(`${tablePath}.rowActions must be empty for system-generated records`));
      if (table.keepOperationColumn === true) issues.push(error(`${tablePath}.keepOperationColumn must be false for system-generated records without row actions`));
      if (table.selectable !== true) issues.push(error(`${tablePath}.selectable must be true for review and reverse-review actions`));
      if ([...(schema.pageActions || []), ...(table.actions || [])].some((action) => !action.requiresSingleSelection)) issues.push(error('system-generated review actions must require a single selected row'));
      if (JSON.stringify(actionCodes) !== JSON.stringify(['audit', 'reverse-audit'])) issues.push(error(`system-generated review actions must contain audit and reverse-audit in order`));
      return;
    }
    if (table.inlineEditMode === true) {
      const inlineActions = (table.rowActions || []).map((action) => action.code || action.event);
      if (JSON.stringify(inlineActions) !== JSON.stringify(['edit-row'])) issues.push(error(`${tablePath}.rowActions must contain exactly one edit-row action for inline-edit primary lists`));
      if (!(table.columns || []).some((column) => column.editable === true)) issues.push(error(`${tablePath}.columns must include at least one editable column for inline-edit mode`));
      if (table.keepOperationColumn !== true) issues.push(error(`${tablePath}.keepOperationColumn must be true`));
      return;
    }
    const deleteAction = (table.rowActions || []).find((action) => action.code === 'delete' || action.event === 'delete');
    const navigationActions = (table.rowActions || []).filter((action) => action.navigation);
    const unsupportedActions = (table.rowActions || []).filter((action) => !['delete'].includes(action.code || action.event) && !action.navigation);
    const hasWorkflowStatus = Boolean(table.statusCode) || (table.columns || []).some((column) => /^(status|state)$/i.test(column.code || ''));
    if (!deleteAction) issues.push(error(`${tablePath}.rowActions must include delete`));
    if (unsupportedActions.length) issues.push(error(`${tablePath}.rowActions may only include delete and read-only navigation actions; use the identifier link for view or edit`));
    if ((table.rowActions || []).filter((action) => action.code === 'delete' || action.event === 'delete').length !== 1) issues.push(error(`${tablePath}.rowActions must contain exactly one delete action`));
    if (navigationActions.some((action) => !action.navigation.path || !action.navigation.pageName)) issues.push(error(`${tablePath}.navigation actions must define path and pageName`));
    if (!(table.columns || []).some((column) => column.link || column.component === 'link')) issues.push(error(`${tablePath}.columns must include an identifier link for view or edit`));
    if (table.keepOperationColumn !== true) issues.push(error(`${tablePath}.keepOperationColumn must be true`));
    const expectedDeleteStatuses = schema.primaryDeleteEnabledStatuses || (hasWorkflowStatus ? ['草稿'] : []);
    if (hasWorkflowStatus && deleteAction && JSON.stringify(deleteAction.enabledStatuses || []) !== JSON.stringify(expectedDeleteStatuses)) issues.push(error(`${tablePath}.delete must set enabledStatuses to ${JSON.stringify(expectedDeleteStatuses)}`));
    if (!hasWorkflowStatus && deleteAction?.enabledStatuses?.length) issues.push(error(`${tablePath}.delete must remain enabled for non-workflow lists`));
  });
}
function validateResourceReference(reference) {
  if (!reference || typeof reference !== 'object') return;
  if (reference.center !== 'prototype-resources/index.html') issues.push(error('resourceReference.center must be prototype-resources/index.html'));
  if (reference.baseline !== resourceManifest.version) issues.push(error(`resourceReference.baseline must be ${resourceManifest.version}`));
  if (!Array.isArray(reference.pageSamples)) issues.push(error('resourceReference.pageSamples must be an array'));
  if (!Array.isArray(reference.components) || !reference.components.length) issues.push(error('resourceReference.components must be a non-empty array'));
}
function hasBizfinEvidence(page, names) { return names.has('BizfinChain') || (page.bizfinChain || page.bizfinLinks || page.relations || []).length > 0; }
function required(obj, key) { if (!obj[key]) issues.push(error(`${key} is required`)); }
function error(message) { return { level: 'error', message }; }
function warning(message) { return { level: 'warning', message }; }
