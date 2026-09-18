// 物资三页 Schema 补丁：审核/反审核改直改模式（参照 expense-contract），移除审核弹窗 overlay
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const P = (p) => path.join(ROOT, p);

const targets = [
  'material/material-outbound',
  'material/other-outbound',
  'material/other-inbound'
];

// 备份
const backupDir = path.join(__dirname, 'schema-backup-audit-direct');
fs.mkdirSync(backupDir, { recursive: true });

for (const rel of targets) {
  const fp = P('schemas/pages/' + rel + '.json');
  const raw = fs.readFileSync(fp, 'utf8');
  fs.writeFileSync(path.join(backupDir, rel.replaceAll('/', '__') + '.json'), raw);
  const schema = JSON.parse(raw);

  const dropIds = [];
  const audit = (schema.pageActions || []).find((a) => a.code === 'audit');
  const reverse = (schema.pageActions || []).find((a) => a.code === 'reverse-audit');
  if (!audit || !reverse) { console.log('FAIL: ' + rel + ' missing audit actions'); continue; }

  // 从弹窗 confirm-status 动作迁移 fieldUpdates
  const auditModal = (schema.overlays || []).find((o) => o.id === audit.target);
  const reverseModal = (schema.overlays || []).find((o) => o.id === reverse.target);
  const auditConfirm = auditModal && (auditModal.actions || []).find((a) => a.code === 'confirm-status');
  const reverseConfirm = reverseModal && (reverseModal.actions || []).find((a) => a.code === 'confirm-status');

  delete audit.target;
  delete reverse.target;
  if (auditConfirm && auditConfirm.fieldUpdates) audit.fieldUpdates = auditConfirm.fieldUpdates;
  if (reverseConfirm && reverseConfirm.fieldUpdates) reverse.fieldUpdates = reverseConfirm.fieldUpdates;

  if (auditModal) dropIds.push(auditModal.id);
  if (reverseModal) dropIds.push(reverseModal.id);
  schema.overlays = (schema.overlays || []).filter((o) => !dropIds.includes(o.id));

  fs.writeFileSync(fp, JSON.stringify(schema, null, 2) + '\n', 'utf8');
  console.log('OK:', rel, '| audit.fieldUpdates =', JSON.stringify(audit.fieldUpdates), '| dropped overlays:', dropIds.join(','));
}
