import fs from 'node:fs';
const file='schemas/pages/report/project-lifecycle-dashboard.json';
const schema=JSON.parse(fs.readFileSync(file,'utf8'));
for(const kind of ['requirement','proposal','notice','project']){
 const d=schema.cockpit.dialogs[kind];
 d.columns.splice(d.columns.findIndex(c=>c.field==='status'),0,{label:'当前责任人',field:'currentOwner',align:'left'});
 d.columns.forEach((c,i)=>c.widthPercent=[22,32,16,18,12][i]);d.width=1040;
}
const reviewers=['周建国','林晓','孙颖','郑峰'];
schema.cockpit.records.forEach((r,i)=>{r.currentOwner=r.status==='审核中'?reviewers[i%reviewers.length]:r.kind==='project'&&['未开始','进行中'].includes(r.status)?r.manager:'—';});
schema.cockpit.currentOwnerDefinition='独立演示字段：审核中取当前审批处理人；已审核且未开始/进行中的项目取项目经理；已完成、已终止无待处理责任人，显示—。正式接入时由当前流程任务/业务责任归属提供，不以提出人、编写人或销售负责人替代。';
fs.writeFileSync(file,JSON.stringify(schema,null,2)+'\n');
const runtime='scripts/lib/project-cockpit-runtime.mjs';fs.writeFileSync(runtime,fs.readFileSync(runtime,'utf8').replace("dialogColumns.length === 4 ? 'business'", "dialogColumns.length >= 4 ? 'business'"));
const test='scripts/check/project-lifecycle-dashboard-smoke.mjs';let t=fs.readFileSync(test,'utf8');
for(const label of ['需求提出人','方案编写人','销售负责人','项目经理'])t=t.replaceAll(label+',状态',label+',当前责任人,状态');
t=t.replace('2:560,3:680,4:960','2:560,3:680,4:960,5:1040').replace("getAttribute('colspan')==='4'","getAttribute('colspan')==='5'");
t=t.replace("      if (total !== undefined) {",`      if (total === undefined) {
        const owners=await page.locator('#cockpit-dialog [data-column="currentOwner"]').allTextContents();
        expect(owners.length===5 && owners.every(x=>x.trim()), id+': 当前责任人缺失');
        const pairs=await page.locator('#cockpit-dialog tbody tr').evaluateAll(rows=>rows.map(r=>({status:r.querySelector('[data-column="status"]').textContent,owner:r.querySelector('[data-column="currentOwner"]').textContent})));
        expect(pairs.every(r=>r.status==='审核中'?r.owner!=='—':['已完成','已终止'].includes(r.status)?r.owner==='—':true),id+': 当前责任人状态口径不符');
      }
      if (total !== undefined) {`);
fs.writeFileSync(test,t);
const md='inputs/md/pages/report/project-lifecycle-dashboard.md';let m=fs.readFileSync(md,'utf8');
for(const label of ['需求提出人','方案编写人','销售负责人','项目经理'])m=m.replaceAll(label+'、状态。',label+'、当前责任人、状态。');
m=m.replace('四列业务960px','五列业务1040px').replace('24/44/18/14','22/32/16/18/12');
m+='\n## 当前责任人\n\n- 四类指标卡总数及状态弹窗均在状态前增加当前责任人（currentOwner）。\n- '+schema.cockpit.currentOwnerDefinition+'\n- 汇总弹窗、图表、指标数值、原有字段和分页不变。\n';fs.writeFileSync(md,m);
