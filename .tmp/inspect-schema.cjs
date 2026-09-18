const s = require('../schemas/pages/income/income-contract-schema.json');
const pick = (a) => a && ({
  code: a.code,
  requiresSingleSelection: a.requiresSingleSelection,
  enabledSelectionStatuses: a.enabledSelectionStatuses,
  enabledSelectionWhen: a.enabledSelectionWhen,
  nextStatus: a.nextStatus,
  fieldUpdates: a.fieldUpdates
});
for (const code of ['audit', 'reverse-audit', 'close-contract']) {
  console.log(JSON.stringify(pick(s.pageActions.find((a) => a.code === code))));
}
console.log('--- props ---');
console.log('submitNextStatus', s.submitNextStatus, '| auditPendingStatus', s.auditPendingStatus,
  '| auditCompletedStatus', s.auditCompletedStatus, '| reverseAuditNextStatus', s.reverseAuditNextStatus);
console.log('--- search options ---');
const search = s.regions.find((r) => r.id === 'contract-search');
console.log('status', JSON.stringify(search.fields.find((f) => f.code === 'status').options));
console.log('businessStatus', JSON.stringify(search.fields.find((f) => f.code === 'businessStatus').options));
console.log('--- mockData coverage ---');
const c = s.mockData.contracts;
console.log('status', JSON.stringify([...new Set(c.map((x) => x.status))]));
console.log('businessStatus', JSON.stringify([...new Set(c.map((x) => x.businessStatus))]));