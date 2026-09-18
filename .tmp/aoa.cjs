const fs=require('fs'),path=require('path');
const a = JSON.parse(fs.readFileSync(path.resolve('schemas/pages/report/agent-operation-analysis.json'),'utf8'));
const tabs = a.regions.find(r=>r.component==='ProTabsDetail').tabs;
for (const t of tabs) {
  console.log('tab:', t.key, t.label, '->', (t.children||[]).map(c=>c.component+'#'+(c.id||'')).join(', '));
  for (const c of t.children||[]) {
    if (c.trendChart) { const tc={...c.trendChart}; if(tc.data) tc.data='('+tc.data.length+' pts)'; console.log('   trendChart:', JSON.stringify(tc).slice(0,500)); }
    if (c.columns) console.log('   columns:', c.columns.map(x=>x.code).join(', '));
  }
}
const tbl=a.regions.find(r=>r.component==='ProTable');
console.log('table cols:', (tbl.columns||[]).map(c=>c.code+':'+(c.component||'text')).join(', '));
console.log('table actions:', JSON.stringify(tbl.actions||[]), '| rowActions:', JSON.stringify((tbl.rowActions||[]).map(r=>r.code)));
console.log('pageActions:', JSON.stringify((a.pageActions||[]).map(p=>p.code+'('+p.label+')')));
