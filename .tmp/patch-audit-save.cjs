// 一次性补丁：四域审核/反审核规范化 + 详情保存按钮归一 + 新增按钮改名
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const P = (p) => path.join(ROOT, p);

const AUDITABLE = [
  ['procurement/expense-contract', 'reviewer', 'reviewedAt', 'direct'],
  ['procurement/purchase-invoice', 'reviewer', 'reviewedAt', 'direct'],
  ['procurement/purchase-order', 'reviewer', 'reviewedAt', 'direct'],
  ['procurement/purchase-receipt', 'auditUser', 'auditTime', 'overlay', 'audit-receipt-modal', 'reverse-receipt-modal'],
  ['procurement/service-settlement', 'auditUser', 'auditTime', 'overlay', 'audit-settlement-modal', 'reverse-settlement-modal'],
  ['income/income-contract-schema', 'reviewer', 'reviewedAt', 'direct'],
  ['income/project-settlement', 'reviewer', 'reviewedAt', 'overlay', 'audit-settlement-modal', 'reverse-settlement-modal'],
  ['income/receipt-reconciliation', 'reviewer', 'reviewedAt', 'overlay', 'audit-reconciliation-modal', 'reverse-reconciliation-modal'],
  ['income/receipt', 'reviewer', 'reviewedAt', 'direct'],
  ['income/sales-invoice', 'reviewer', 'reviewedAt', 'overlay', 'audit-invoice-modal', 'reverse-audit-invoice-modal'],
  ['material/material-outbound', 'auditUser', 'auditTime', 'overlay', 'audit-outbound-modal', 'reverse-outbound-modal'],
  ['material/other-inbound', 'auditUser', 'auditTime', 'overlay', 'audit-other-inbound-modal', 'reverse-other-inbound-modal'],
  ['material/other-outbound', 'auditUser', 'auditTime', 'overlay', 'audit-other-outbound-modal', 'reverse-other-outbound-modal'],
  ['fixed-asset/fixed-asset-return', 'auditor', 'auditedAt', 'overlay', 'audit-fixed-asset-change-modal', 'reverse-fixed-asset-change-modal'],
];

const R1_ONLY = ['material/inventory-location', 'fixed-asset/fixed-asset-ledger'];

function load(rel) { return JSON.parse(fs.readFileSync(P('schemas/pages/' + rel + '.json'), 'utf8')); }
function save(rel, schema) { fs.writeFileSync(P('schemas/pages/' + rel + '.json'), JSON.stringify(schema, null, 2) + '\n', 'utf8'); }

function fixCreateLabel(schema) {
  for (const action of schema.pageActions || []) {
    if (action.code === 'create' && action.label && action.label !== '新增') action.label = '新增';
  }
}

function fixRulesSubmitToSave(schema) {
  const rules = schema.rules || [];
  const seen = new Set();
  const next = [];
  for (const rule of rules) {
    if (rule.action === 'submit') {
      const dup = rules.some((other) => other !== rule && other.action === 'save' && other.type === rule.type);
      if (dup) continue; // 已有同类型 save 规则，丢弃 submit 副本
      rule.action = 'save';
    }
    const key = rule.action + '|' + rule.type + '|' + (rule.id || '');
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(rule);
  }
  schema.rules = next;
}

for (const [rel, by, at, mode, auditOverlay, reverseOverlay] of AUDITABLE) {
  const schema = load(rel);
  schema.policyProfile = 'auditable-list-detail-save';
  schema.createStatus = '新增';
  schema.saveActionLabel = '保存';
  schema.saveDraftEnabled = true;
  schema.detailSaveEnabled = true;
  schema.auditPendingStatus = '新增';
  schema.auditCompletedStatus = '审核';
  schema.reverseAuditNextStatus = '新增';
  fixCreateLabel(schema);
  fixRulesSubmitToSave(schema);

  const actions = schema.pageActions || (schema.pageActions = []);
  const drop = actions.filter((a) => !['audit', 'reverse-audit'].includes(a.code));
  const auditBase = actions.find((a) => a.code === 'audit') || {};
  const reverseBase = actions.find((a) => a.code === 'reverse-audit') || {};
  const auditAction = { ...auditBase, code: 'audit', requiresSingleSelection: true, enabledSelectionStatuses: ['新增'], nextStatus: '审核' };
  const reverseAction = { ...reverseBase, code: 'reverse-audit', requiresSingleSelection: true, enabledSelectionStatuses: ['审核'], nextStatus: '新增' };
  if (mode === 'direct') {
    auditAction.fieldUpdates = { [by]: '管理员', [at]: '$currentDateTime' };
    reverseAction.fieldUpdates = { [by]: '', [at]: '' };
  } else {
    auditAction.target = auditOverlay;
    reverseAction.target = reverseOverlay;
    delete auditAction.fieldUpdates;
    delete reverseAction.fieldUpdates;
    // 弹层确认动作补写/清空审核信息
    for (const overlay of schema.overlays || []) {
      const confirm = (overlay.actions || []).find((a) => a.code === 'confirm-status');
      if (!confirm) continue;
      if (overlay.id === auditOverlay) { confirm.nextStatus = '审核'; confirm.fieldUpdates = { [by]: '管理员', [at]: '$currentDateTime' }; }
      if (overlay.id === reverseOverlay) { confirm.nextStatus = '新增'; confirm.fieldUpdates = { [by]: '', [at]: '' }; }
    }
  }
  schema.pageActions = [auditAction, reverseAction, ...drop];
  save(rel, schema);
  console.log('patched', rel, mode);
}

for (const rel of R1_ONLY) {
  const schema = load(rel);
  fixCreateLabel(schema);
  save(rel, schema);
  console.log('patched', rel, 'label-only');
}
