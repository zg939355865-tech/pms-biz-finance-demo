import fs from 'node:fs';
const file='schemas/pages/report/project-lifecycle-dashboard.json';
const schema=JSON.parse(fs.readFileSync(file,'utf8'));
const columns=(labels,fields)=>labels.map((label,i)=>({label,field:fields[i],align:fields[i]==='value'?'right':fields[i]==='status'?'center':'left'}));
schema.cockpit.dialogs={
 requirement:{columns:columns(['需求编号','需求名称','需求提出人','状态'],['id','name','requester','status'])},
 proposal:{columns:columns(['方案编号','方案名称','方案编写人','状态'],['id','name','author','status'])},
 notice:{columns:columns(['通知单号','通知名称','销售负责人','状态'],['id','name','salesOwner','status'])},
 project:{columns:columns(['项目编码','项目名称','项目经理','状态'],['id','name','manager','status'])},
 'demand-trend':{columns:columns(['月份','需求数量'],['month','value'])},
 'industry-trend':{columns:columns(['月份','需求数量','行业'],['month','value','industry'])},
 'type-distribution':{columns:columns(['需求类型','需求数量'],['label','value'])},
 'province-ranking':{columns:columns(['区域','需求数量'],['label','value'])},
 'requester-ranking':{columns:columns(['需求提出人','需求数量'],['label','value'])},
 'manager-ranking':{columns:columns(['项目经理','项目数量'],['label','value'])}
};
for(const r of schema.cockpit.records){if(r.kind==='proposal')r.author=r.requester;if(r.kind==='notice')r.salesOwner=r.requester;}
schema.cockpit.presentation.showIndustryShareDialog=false;
schema.cockpit.definitions=schema.cockpit.definitions.map(x=>x.replace('点击指标或图表查看对应演示明细，固定5条/页。','指标弹窗展示业务记录；趋势与排名弹窗展示对应汇总数据，固定5条/页；行业需求构成不提供弹窗。'));
fs.writeFileSync(file,JSON.stringify(schema,null,2)+'\n');
const renderFile='scripts/lib/project-cockpit.mjs';
let render=fs.readFileSync(renderFile,'utf8').replace('<button class="chart-data" data-view="${id}" aria-label="查看${title}数据">数据 ↗</button>', '${page.cockpit.dialogs[id] ? `<button class="chart-data" data-view="${id}" aria-label="查看${title}数据">数据 ↗</button>` : \'\'}');
fs.writeFileSync(renderFile,render);
const runtimeFile='scripts/lib/project-cockpit-runtime.mjs';
let runtime=fs.readFileSync(runtimeFile,'utf8').replace('<button data-chart-click="industry" data-value="${s.label}">','<span class="share-item" data-value="${s.label}">').replace("</small></button>`).join('')}</div></div>","</small></span>`).join('')}</div></div>");
fs.writeFileSync(runtimeFile,runtime);
const cssFile='scripts/lib/project-cockpit.css';
fs.writeFileSync(cssFile,fs.readFileSync(cssFile,'utf8').replace('.share-legend button {','.share-legend .share-item {'));
const mdFile='inputs/md/pages/report/project-lifecycle-dashboard.md';
let md=fs.readFileSync(mdFile,'utf8').replace('点击指标或图表查看对应演示明细，固定5条/页。','指标弹窗展示业务记录；趋势与排名弹窗展示对应汇总数据，固定5条/页；行业需求构成不提供弹窗。').replace('指标总数/状态、趋势数据点、行业图例、类型柱、省份/提出人/经理排名均可点击查看对应演示记录。','指标总数/状态展示业务明细；趋势数据点、类型柱、省份/提出人/经理排名展示对应汇总行。行业需求构成移除数据按钮，环形图及图例仅展示。');
md+='\n## 弹窗字段与聚合规则（本次优化）\n\n'+Object.entries(schema.cockpit.dialogs).map(([id,c])=>`- ${id}：${c.columns.map(c=>c.label).join('、')}。`).join('\n')+'\n\n- 月份格式 YYYYMM（如202609），趋势按月份升序；项目需求月度趋势6行，行业需求月度趋势按月份和行业聚合，默认30行，遵循所属行业筛选与系列显隐。\n- 类型按5类枚举统计；区域及提出人取前7名；项目经理展示全部，排名按数量倒序。数据入口打开整组汇总，点击图表项仅显示对应汇总行。\n- 四类指标使用独立人员字段：requester、author、salesOwner、manager。方案编写人及销售负责人补充为独立演示字段，不代表已对接真实数据。\n- 数量右对齐、状态居中；保持固定5条/页、关闭、Escape及分页边界处理。行业需求构成无弹窗，无点击入口。\n';
fs.writeFileSync(mdFile,md);
