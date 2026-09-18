const s = require('../schemas/pages/income/income-contract-schema.json');
const form = s.regions.find((r) => r.id === 'contract-form');
const fields = form.tabs.find((t) => t.key === 'basic').children.find((c) => c.component === 'DetailForm').fields;
for (const code of ['contractLevel', 'parentContract', 'status', 'reviewer', 'reviewedAt', 'subtype', 'expiryDate']) {
  const f = fields.find((x) => x.code === code);
  console.log(code + ':', f ? JSON.stringify(f) : 'MISSING');
}
console.log('\napprovalOverlay:', JSON.stringify(s.approvalOverlay), '| policyProfile:', s.policyProfile);
console.log('detailReviewEnabled:', JSON.stringify(s.detailReviewEnabled));
console.log('workflowActions present:', Object.prototype.hasOwnProperty.call(s, 'workflowActions'));