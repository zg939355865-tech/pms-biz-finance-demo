const P=__dirname+'/../schemas/pages/fixed-asset/fixed-asset-return.json';
const s=require(P);
const recs=s.mockData.records;
console.log('count:', recs.length);
console.log('statuses:', [...new Set(recs.map(r=>r.status))].join(','));
recs.forEach((r,i)=>console.log(i, r.changeNo, r.status, 'auditor='+(r.auditor||''), 'auditedAt='+(r.auditedAt||'')));
