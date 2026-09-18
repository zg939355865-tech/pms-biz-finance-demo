import path from 'node:path';
import { readJson, writeJson } from './file-utils.mjs';

const registry = readJson('policies/registry.json');

export function loadEffectiveSchema(schemaPath, options = {}) {
  const source = readJson(schemaPath);
  const profileId = source.policyProfile || inferProfile(source);
  const profilePath = registry.profiles[profileId];
  if (!profilePath) throw new Error(`Unknown policy profile: ${profileId}`);

  const profile = readJson(profilePath);
  const interaction = readJson(registry.defaults.interaction);
  const content = readJson(registry.defaults.content);
  const auditFields = readJson(registry.defaults.auditFields).fields;
  const exceptions = new Set(readJson(registry.exceptions).allowed || []);
  const declaredExceptions = source.policyExceptions || [];
  const invalidExceptions = declaredExceptions.filter((item) => !exceptions.has(item));
  if (invalidExceptions.length) throw new Error(`Unapproved policy exceptions: ${invalidExceptions.join(', ')}`);

  const schema = structuredClone(source);
  const changes = [];
  const detailForms = [];
  setDefault(schema, 'policyProfile', profileId, changes, 'profile.explicit');
  enforceValue(schema, 'policyVersion', registry.version, changes, 'policy.version');
  if (!declaredExceptions.includes('interaction.toast-explicit-feedback')) {
    enforceValue(schema, 'toastEnabled', profile.toastEnabled ?? interaction.toastEnabled, changes, 'interaction.toast');
  }
  enforceValue(schema, 'workflowActions', profile.workflowActions, changes, 'workflow.enabled');
  enforceValue(schema, 'saveDraftEnabled', profile.saveDraft, changes, 'workflow.save-draft');
  if (schema.detailReadOnly !== true) {
    if (profile.detailSaveEnabled !== undefined) {
      enforceValue(schema, 'detailSaveEnabled', profile.detailSaveEnabled, changes, 'detail.save-action');
    }
    if (profile.detailSubmitEnabled !== undefined) {
      enforceValue(schema, 'detailSubmitEnabled', profile.detailSubmitEnabled, changes, 'detail.submit-action');
    }
  }
  if (schema.workflowActions === false && schema.detailSubmitEnabled === true && content.actionLabels?.nonWorkflowSubmit) {
    enforceValue(schema, 'submitActionLabel', content.actionLabels.nonWorkflowSubmit, changes, 'detail.non-workflow-submit-label');
  }
  for (const key of ['detailReviewEnabled', 'detailWorkflowLinksEnabled']) {
    if (profile[key] !== undefined) enforceValue(schema, key, profile[key], changes, `detail.${key}`);
  }

  const detailOnlyFields = new Set(schema.detailOnlyFields || []);
  if (detailOnlyFields.size) {
    for (const node of schema.regions || []) {
      if (node.component === 'ProSearchForm' && content.detailOnlyFields?.excludeFromSearch) {
        removeFields(node, 'fields', detailOnlyFields, changes, 'field-scope.detail-only.search');
      }
      if (node.component === 'ProTable' && content.detailOnlyFields?.excludeFromPrimaryList) {
        removeFields(node, 'columns', detailOnlyFields, changes, 'field-scope.detail-only.primary-list');
      }
    }
  }

  if (content.informationalAlerts?.hideByDefault) {
    schema.regions = pruneInformationalAlerts(schema.regions || [], changes);
    schema.overlays = pruneInformationalAlerts(schema.overlays || [], changes);
  }
  if (content.fieldHelperText?.hideByDefault) {
    removeFieldHelperText(schema, changes);
  }

  const primaryListTable = (schema.regions || []).find((node) => node.component === 'ProTable');
  walkNodes(schema.regions || [], (node) => {
    if (node.component === 'ProSearchForm') {
      enforceValue(node, 'collapsedFieldCount', interaction.searchColumns, changes, 'search.columns');
      enforceValue(node, 'collapsible', interaction.searchCollapsible, changes, 'search.expanded');
      const alignment = primaryListTable?.selectable === true
        ? interaction.searchFirstFieldAlignment?.withSelection
        : interaction.searchFirstFieldAlignment?.withoutSelection;
      enforceValue(node, 'firstFieldAlignment', alignment, changes, 'search.first-field-alignment');
      deleteValue(node, 'alignFirstFieldWithList', changes, 'search.legacy-first-field-alignment');
      enforceStatusAfterIdentifier(node, 'fields', content.statusField, changes, 'status.after-business-identifier.search');
    }
    if (node.component === 'ProTable') {
      if (node.pageSize === undefined || node.pageSize > interaction.tablePageSize) {
        enforceValue(node, 'pageSize', interaction.tablePageSize, changes, 'table.page-size');
      }
      enforceStatusAfterIdentifier(node, 'columns', content.statusField, changes, 'status.after-business-identifier.list');
    }
    if (node.component === 'DetailForm') {
      detailForms.push(node);
      enforceValue(node, 'layoutColumns', interaction.detailColumns, changes, 'detail.three-column-layout');
      enforceStatusAfterIdentifier(node, 'fields', content.statusField, changes, 'status.after-business-identifier.detail');
    }
    if (node.component === 'ProUploadList' && schema.pageType === 'list-detail') {
      if (content.attachmentList?.hideInnerTitle) deleteValue(node, 'title', changes, 'attachment.hide-inner-title');
      enforceValue(node, 'inheritDetailEditability', content.attachmentList?.inheritDetailEditability, changes, 'attachment.inherit-detail-editability');
      enforceValue(node, 'keepOperationColumn', content.attachmentList?.keepOperationColumn, changes, 'attachment.operation-column');
      enforceValue(node, 'operationColumnWidth', content.attachmentList?.operationColumnWidth, changes, 'attachment.operation-column-width');
      enforceJsonValue(node, 'rowActions', content.attachmentList?.rowActions, changes, 'attachment.draft-delete');
    }
    if (node.component === 'EditableTable' && content.editableTable) {
      enforceEditableTableDeleteLabels(node, content.editableTable, changes);
      // Support schema-level pagination and operation column overrides
      if (node.noPagination === true) {
        enforceValue(node, 'pagination', false, changes, 'editable-table.no-pagination');
      }
      if (node.keepOperationColumn === false && (!node.rowActions || node.rowActions.length === 0)) {
        enforceValue(node, 'rowActions', [], changes, 'editable-table.keep-operation-column');
      }
    }
  });
  if (profile.auditFields && schema.auditFields !== false && detailForms.length) {
    injectMissingFields(detailForms[0], auditFields, changes);
  }
  enforceListAuditActions(schema, profile, changes);
  enforcePrimaryBatchDelete(schema, profile, interaction, changes);
  if (hasDeleteMutation(schema)) {
    enforceValue(schema, 'deleteConfirmationEnabled', interaction.deleteConfirmationEnabled, changes, 'delete.confirmation');
  }

  schema.policyTrace = {
    registryVersion: registry.version,
    profile: profileId,
    sourceSchema: path.normalize(schemaPath),
    appliedRules: [...new Set(changes.map((item) => item.rule))],
    changes
  };

  const effectivePath = effectiveSchemaPath(schema);
  if (options.write !== false) writeJson(effectivePath, schema);
  return { schema, source, profile, effectivePath, changes };
}

function enforceListAuditActions(schema, profile, changes) {
  if (!profile.listAuditActions || schema.pageType !== 'list-detail') return;
  const primaryTable = (schema.regions || []).find((node) => node.component === 'ProTable');
  if (!primaryTable) return;
  const statusCode = primaryTable.statusCode || 'status';
  const statusValues = new Set();
  const search = (schema.regions || []).find((node) => node.component === 'ProSearchForm');
  const searchStatus = (search?.fields || []).find((field) => field.code === statusCode);
  for (const option of searchStatus?.options || []) statusValues.add(String(typeof option === 'string' ? option : option.value));
  for (const row of schema.mockData?.[primaryTable.dataSource] || []) if (row[statusCode]) statusValues.add(String(row[statusCode]));
  const statuses = [...statusValues];
  const pendingStatus = schema.auditPendingStatus || statuses.find((status) => /^待/.test(status)) || '待审核';
  const completedStatus = schema.auditCompletedStatus || statuses.find((status) => /^已/.test(status)) || '已审核';
  const reverseStatus = schema.reverseAuditNextStatus || profile.reverseAuditNextStatus || '草稿';
  const actions = Array.isArray(schema.pageActions) ? schema.pageActions : [];
  const auditSource = actions.find((action) => action.code === 'audit') || {};
  const reverseSource = actions.find((action) => action.code === 'reverse-audit') || {};
  const auditAction = {
    ...auditSource,
    code: 'audit',
    label: '审核',
    type: 'primary',
    requiresSingleSelection: true,
    enabledSelectionStatuses: [pendingStatus],
    nextStatus: completedStatus
  };
  const reverseAction = {
    ...reverseSource,
    code: 'reverse-audit',
    label: '反审核',
    requiresSingleSelection: true,
    enabledSelectionStatuses: [completedStatus],
    nextStatus: reverseStatus
  };
  const rest = actions.filter((action) => !['audit', 'reverse-audit'].includes(action.code));
  enforceJsonValue(schema, 'pageActions', [auditAction, reverseAction, ...rest], changes, 'list.audit-actions.page-level');
  if (Array.isArray(schema.detailActions)) {
    const retained = schema.detailActions.filter((action) => !/^反?审核/.test(String(action.label || '')) && !['audit', 'reverse-audit'].includes(action.code));
    if (retained.length !== schema.detailActions.length) {
      const previous = schema.detailActions;
      schema.detailActions = retained;
      changes.push({ rule: 'list.audit-actions.remove-detail', target: 'detailActions', action: 'override', previous, value: retained });
    }
  }
}

function enforceEditableTableDeleteLabels(node, defaults, changes) {
  if (Array.isArray(node.actions)) {
    const actions = node.actions.map((action) => action.code === 'batch-delete'
      ? {
        ...action,
        label: /^删除选中(?:明细|.+行)$/.test(String(action.label || ''))
          ? action.label
          : defaults.batchDeleteLabel || '删除选中明细',
      }
      : action);
    enforceJsonValue(node, 'actions', actions, changes, 'editable-table.batch-delete-label');
  }
  if (Array.isArray(node.rowActions) && node.rowActions.some((action) => action.code === 'remove-row')) {
    const rowActions = node.rowActions.map((action) => action.code === 'remove-row'
      ? { ...action, ...(defaults.rowDeleteAction || { label: '删除' }) }
      : action);
    enforceJsonValue(node, 'rowActions', rowActions, changes, 'editable-table.row-delete-label');
  }
}

function enforceStatusAfterIdentifier(node, key, defaults, changes, rule) {
  if (!defaults?.placeAfterBusinessIdentifier || !Array.isArray(node[key])) return;
  const items = node[key];
  const statusIndex = items.findIndex((item) => /^(status|state)$/i.test(String(item.code || '')));
  if (statusIndex < 0) return;
  const status = { ...items[statusIndex] };
  if (defaults.normalizeLabel && status.label !== defaults.normalizeLabel) status.label = defaults.normalizeLabel;
  const candidates = items.filter((_, index) => index !== statusIndex);
  let identifierIndex = node.statusAfterField
    ? candidates.findIndex((item) => item.code === node.statusAfterField)
    : candidates.findIndex((item) => item.component === 'link' && /(No|Code|Id)$/i.test(String(item.code || '')));
  if (identifierIndex < 0) identifierIndex = candidates.findIndex((item) => /^(businessNo|documentNo|receiptNo|orderNo|contractNo|code|id)$/i.test(String(item.code || '')));
  if (identifierIndex < 0) identifierIndex = candidates.findIndex((item) => /(单号|编号)$/.test(String(item.label || '')));
  if (identifierIndex < 0) return;
  const reordered = [...candidates.slice(0, identifierIndex + 1), status, ...candidates.slice(identifierIndex + 1)];
  enforceJsonValue(node, key, reordered, changes, rule);
}

function enforcePrimaryBatchDelete(schema, profile, interaction, changes) {
  if (!interaction.batchDeleteEnabled || !['list', 'list-detail'].includes(schema.pageType)) return;
  const table = (schema.regions || []).find((node) => node.component === 'ProTable');
  if (!table) return;
  const rowDelete = (table.rowActions || []).find((action) => action.code === 'delete');
  if (!rowDelete) return;

  const workflow = profile.workflowActions === true;
  const auditable = profile.id === 'auditable-list-detail';
  const saveAuditable = profile.id === 'auditable-list-detail-save';
  const selectableStatuses = schema.primarySelectionAllStatuses === true ? undefined : auditable || saveAuditable ? undefined : workflow ? ['草稿'] : rowDelete.enabledStatuses;
  const batchDeleteStatuses = workflow || auditable ? ['草稿'] : rowDelete.enabledStatuses;
  enforceValue(table, 'selectable', true, changes, 'list.batch-delete.selection');
  if (selectableStatuses?.length) {
    enforceJsonValue(table, 'selectableStatuses', selectableStatuses, changes, 'list.batch-delete.status-scope');
  } else if (auditable || saveAuditable || schema.primarySelectionAllStatuses === true) {
    deleteValue(table, 'selectableStatuses', changes, 'list.audit.selection-all-statuses');
  }
  if (Array.isArray(table.actions) && table.actions.some((action) => action.code === 'batch-delete')) {
    table.actions = table.actions.filter((action) => action.code !== 'batch-delete');
    changes.push({ rule: 'list.batch-delete.page-level', target: `${table.id || 'primary-table'}.actions.batch-delete`, action: 'remove' });
  }

  const standardAction = {
    code: 'batch-delete',
    label: '批量删除',
    type: 'danger',
    ghost: true,
    requiresSelection: true,
    ...(batchDeleteStatuses?.length ? { enabledSelectionStatuses: batchDeleteStatuses } : {})
  };
  const actions = Array.isArray(schema.pageActions) ? schema.pageActions : [];
  const rest = actions.filter((action) => action.code !== 'batch-delete');
  enforceJsonValue(schema, 'pageActions', [standardAction, ...rest], changes, 'list.batch-delete.page-level');
}

function hasDeleteMutation(schema) {
  const deleteCodes = new Set(['delete', 'batch-delete', 'remove-row', 'remove-issue-card']);
  if ((schema.pageActions || []).some((action) => deleteCodes.has(action.code))) return true;
  let found = false;
  walkNodes([...(schema.regions || []), ...(schema.overlays || [])], (node) => {
    if (found) return;
    for (const key of ['actions', 'rowActions']) {
      if ((node[key] || []).some((action) => deleteCodes.has(action.code))) found = true;
    }
  });
  return found;
}

export function effectiveSchemaPath(schema) {
  return `outputs/effective-schemas/${schema.domain || 'unknown'}/${schema.pageCode || 'unknown'}.json`;
}

export function inferProfile(schema) {
  if (schema.pageCode === 'my-approval') return 'approval-workbench';
  if (schema.pageCode === 'component-gallery') return 'utility-page';
  if (schema.pageType === 'list-detail') {
    return schema.workflowActions === false ? 'non-workflow-list-detail' : 'workflow-list-detail';
  }
  if (schema.pageType === 'list') return 'business-list';
  return registry.defaultProfile;
}

function injectMissingFields(node, defaults, changes) {
  node.fields ||= [];
  const existing = new Set(node.fields.map((field) => field.code));
  for (const field of defaults) {
    if (existing.has(field.code)) continue;
    node.fields.push(structuredClone(field));
    changes.push({ rule: 'detail.audit-fields', target: `DetailForm.fields.${field.code}`, action: 'add' });
  }
}

function setDefault(target, key, value, changes, rule) {
  if (value === undefined || target[key] !== undefined) return;
  target[key] = structuredClone(value);
  changes.push({ rule, target: key, action: 'default', value });
}

function removeFields(node, key, codes, changes, rule) {
  if (!Array.isArray(node[key])) return;
  const removed = node[key].filter((item) => codes.has(item.code));
  if (!removed.length) return;
  node[key] = node[key].filter((item) => !codes.has(item.code));
  for (const item of removed) changes.push({ rule, target: `${node.id || node.component}.${key}.${item.code}`, action: 'remove' });
}

function deleteValue(target, key, changes, rule) {
  if (target[key] === undefined) return;
  const previous = target[key];
  delete target[key];
  changes.push({ rule, target: `${target.id || target.component}.${key}`, action: 'remove', previous });
}

function enforceJsonValue(target, key, value, changes, rule) {
  if (value === undefined || JSON.stringify(target[key]) === JSON.stringify(value)) return;
  const previous = target[key];
  target[key] = structuredClone(value);
  changes.push({ rule, target: `${target.id || target.component}.${key}`, action: previous === undefined ? 'default' : 'override', ...(previous === undefined ? {} : { previous }), value });
}

function enforceValue(target, key, value, changes, rule) {
  if (value === undefined || target[key] === value) return;
  const previous = target[key];
  target[key] = structuredClone(value);
  changes.push({
    rule,
    target: key,
    action: previous === undefined ? 'default' : 'override',
    ...(previous === undefined ? {} : { previous }),
    value
  });
}

function walkNodes(nodes, visitor) {
  if (!Array.isArray(nodes)) return;
  for (const node of nodes) {
    if (!node || typeof node !== 'object') continue;
    if (node.component) visitor(node);
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) walkNodes(value, visitor);
    }
  }
}

function pruneInformationalAlerts(nodes, changes) {
  if (!Array.isArray(nodes)) return nodes;
  return nodes.flatMap((node) => {
    if (!node || typeof node !== 'object') return [node];
    if (node.component === 'Alert' && (node.type || 'info') === 'info' && node.persistent !== true) {
      changes.push({ rule: 'content.hide-informational-alert', target: node.id || node.message || 'Alert', action: 'remove' });
      return [];
    }
    const clone = node;
    for (const [key, value] of Object.entries(clone)) {
      if (Array.isArray(value)) clone[key] = pruneInformationalAlerts(value, changes);
    }
    return [clone];
  });
}

function removeFieldHelperText(value, changes, parentPath = 'schema') {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => removeFieldHelperText(item, changes, `${parentPath}[${index}]`));
    return;
  }
  if (Array.isArray(value.fields)) {
    value.fields.forEach((field, index) => {
      if (!field || typeof field !== 'object' || field.help === undefined) return;
      const previous = field.help;
      delete field.help;
      changes.push({
        rule: 'content.hide-field-helper-text',
        target: `${parentPath}.fields.${field.code || index}.help`,
        action: 'remove',
        previous
      });
    });
  }
  for (const [key, child] of Object.entries(value)) {
    if (key === 'fields') continue;
    if (child && typeof child === 'object') removeFieldHelperText(child, changes, `${parentPath}.${key}`);
  }
}
