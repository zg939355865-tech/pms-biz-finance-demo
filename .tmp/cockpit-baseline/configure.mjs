import fs from 'node:fs';
const file='schemas/pages/report/project-lifecycle-dashboard.json';
const schema=JSON.parse(fs.readFileSync(file,'utf8'));
const industries=['污水厂','水泥','钢铁','化工','光伏'];
const types=['曝气智能体','进水提升泵智能体','加活性炭智能体','内回流智能体','排泥智能体'];
const provinces=['湖南省','江苏省','广东省','湖北省','浙江省','山东省','河北省','河南省','四川省'];
const people=['张伟','李娜','王磊','刘洋','陈晨','杨帆','赵敏','周杰','吴桐'];
const managers=['张磊','李志强','王海','陈俊','刘明','赵宇','杨帆','周宁'];
const metrics=[
  {kind:'requirement',label:'项目需求',code:'DEMAND',statuses:['审核中','已完成','已终止'],counts:[28,148,10]},
  {kind:'proposal',label:'项目方案',code:'PLAN',statuses:['审核中','已完成','已终止'],counts:[16,62,6]},
  {kind:'notice',label:'项目实施通知',code:'NOTICE',statuses:['审核中','已完成'],counts:[10,52]},
  {kind:'project',label:'项目立项',code:'PROJECT',statuses:['审核中','未开始','进行中','已完成'],counts:[6,8,27,7]}
];
const demandMonths=[18,24,27,32,38,47].flatMap((n,i)=>Array(n).fill(i-5));
const managerSlots=[13,9,7,6,5,4,3,1].flatMap((n,i)=>Array(n).fill(managers[i]));
const typeSlots=[72,46,31,23,14].flatMap((n,i)=>Array(n).fill(types[i]));
const requesterSlots=[38,32,27,23,20,17,13,10,6].flatMap((n,i)=>Array(n).fill(people[i]));
const provinceSlots=[42,35,28,23,19,15,11,8,5].flatMap((n,i)=>Array(n).fill(provinces[i]));
const records=[];
for(const m of metrics){
 const statuses=m.counts.flatMap((n,i)=>Array(n).fill(m.statuses[i]));
 for(let i=0;i<statuses.length;i++){
   const base=i%10;
   const industry=industries[base<4?0:base<6?1:base<8?2:base===8?3:4];
   records.push({id:`${{requirement:'XQ',proposal:'FA',notice:'TZ',project:'XM'}[m.kind]}-DEMO-${String(i+1).padStart(4,'0')}`,kind:m.kind,name:`${industry}${types[i%5].replace('智能体','')} · ${m.label}${String(i+1).padStart(3,'0')}`,monthOffset:m.kind==='requirement'?demandMonths[i]:i%6-5,industry,type:types[(i*7+Math.floor(i/9))%5],province:provinces[Math.floor(Math.sqrt(i*4))%9],requester:people[Math.floor(i/7)%9],manager:m.kind==='project'?managerSlots[i]:managers[i%8],status:statuses[(i*5)%statuses.length]});
 }
}
for (const [i,r] of records.filter(r=>r.kind==='requirement').entries()) {
  r.type=typeSlots[(i*5)%186]; r.requester=requesterSlots[(i*7)%186]; r.province=provinceSlots[(i*11)%186];
  r.name=`${r.industry}${r.type.replace('智能体','')} · 项目需求${String(i+1).padStart(3,'0')}`;
}
schema.pageName='项目驾驶舱';
schema.menuPath='项目驾驶舱';
schema.businessScenario='以项目需求、方案、实施通知和立项为核心，分析近六个月的行业、省份、提出人、需求类型及项目经理责任分布。';
schema.cockpit={industries,types,metrics:metrics.map(({counts,...m})=>m),records,definitions:[
 '本页面使用独立演示数据，不代表真实业务业绩。所有主体指标与图表均从同一组演示记录聚合；月份随访问当月平移。',
 '统计范围：所选截至月份及前5个月。趋势按各月新增需求计算，缺失月份补零；截至月份内的数据为该月已收录数据，未必是完整自然月。环比上月为0时显示“—”。',
 '项目需求、项目方案、项目实施通知：“已完成”在本驾驶舱表示审批已完成。项目立项先判断审核中；审核完成后按项目执行状态计入未开始、进行中、已完成，四类互斥。',
 '总数按唯一单据编号统计；正式接入时总数应包含草稿、退回等其他状态，指标卡列出的状态子项不一定覆盖总数。当前样例只覆盖卡片列出的状态。',
 '行业按需求所属行业、省份按项目所在地、提出人按需求发起人统计；本样例每条需求只归属一个行业、一个省份和一个需求类型。正式数据未分类项应另列，不能静默丢弃。',
 '省份和需求提出人取需求数前7名；同数按名称排序。项目经理排名按负责项目数倒序展示全部经理，包括审核中的立项，每个项目只归属一位主责经理。',
 '行业趋势图例可切换系列显示，不改变统计范围；页头行业筛选作用于全部主体指标和图表。点击指标或图表查看对应演示明细，固定5条/页。',
 '底部生命周期明细保留原有独立12条样例及查询、图表联动、业务页面下钻，不与主体演示统计混算。'
]};
fs.writeFileSync(file,JSON.stringify(schema,null,2)+'\n');
