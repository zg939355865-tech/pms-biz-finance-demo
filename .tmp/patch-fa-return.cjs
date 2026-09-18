const fs=require('fs');
const P=__dirname+'/../schemas/pages/fixed-asset/fixed-asset-return.json';
const s=JSON.parse(fs.readFileSync(P,'utf8'));
const tabs=s.regions[2].tabs[0];
const [basic,before,after]=tabs.children;
// 1) 状态选项去重，仅保留 新增/审核
let cnt=0;
for(const f of basic.fields){ if(f.code==='status'&&Array.isArray(f.options)){ f.options=['新增','审核']; cnt++; } }
const search=s.regions[0];
for(const f of search.fields){ if(f.code==='status'&&Array.isArray(f.options)){ f.options=['新增','审核']; cnt++; } }
console.log('status options patched:', cnt);
// 2) 审核/反审核去除弹窗，直接写入/清空审核人、审核时间
const au=s.pageActions.find(a=>a.code==='audit');
delete au.target;
au.fieldUpdates={auditor:'管理员',auditedAt:'$currentDateTime'};
const rv=s.pageActions.find(a=>a.code==='reverse-audit');
delete rv.target;
rv.fieldUpdates={auditor:'',auditedAt:''};
// 3) 移除两个确认弹窗 overlay
const beforeLen=s.overlays.length;
s.overlays=s.overlays.filter(o=>!['audit-fixed-asset-change-modal','reverse-fixed-asset-change-modal'].includes(o.id));
console.log('overlays removed:', beforeLen-s.overlays.length);
// 4) 变更前/变更后标题
before.title='变更前';
after.title='变更后';
fs.writeFileSync(P,JSON.stringify(s));
console.log('written');
