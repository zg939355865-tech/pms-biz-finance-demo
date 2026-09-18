import fs from 'node:fs';
const moneyFields = ['serviceCost','materialCost','expenseCost','laborCost','depreciationCost','indirectCost','adjustmentAmount','collectedCost','directCost','projectAttributedCost','publicCost','amount','costAmount','projectCost'];
const categories = {'服务采购':'serviceCost','物资消耗':'materialCost','费用报销':'expenseCost','人工成本':'laborCost','折旧摊销':'depreciationCost','间接费用':'indirectCost','成本调整':'adjustmentAmount'};
for (const kind of ['project','department']) {
  const file = `schemas/pages/cost/${kind}-cost-analysis.json`;
  const s = JSON.parse(fs.readFileSync(file));
  fs.writeFileSync(`.tmp/department-cost-update/${kind}-before-annual.json`,JSON.stringify(s));
  const [search,chart,table] = s.regions;
  Object.assign(search,{labelAlign:'left',labelWidth:96,searchPaddingLeft:16});
  delete search.fields[0].span;
  Object.assign(search.fields[0],{startValue:'2026-01',endValue:'2026-12'});
  search.fields[1].value = search.fields[1].options.slice(0,2).map(o => typeof o === 'string' ? o : o.value);
  Object.assign(chart,{showLegend:true,legendPosition:'right',queryRequired:true,tableId:table.id});
  const originals = table.rows;
  const scale = (obj,ratio,period) => {
    if(Array.isArray(obj)) return obj.map(v=>scale(v,ratio,period));
    if(!obj || typeof obj !== 'object') return obj;
    return Object.fromEntries(Object.entries(obj).map(([key,value])=>{
      if(moneyFields.includes(key)&&typeof value==='number') return [key,+(value*ratio).toFixed(2)];
      if(key==='id') return [key,`${value}-${period}`];
      if(typeof value==='string'&&/^(2026-09|202609)/.test(value)) return [key,value.replace('2026-09',period).replace('202609',period.replace('-','')).replace(/-30(?= |$)/,'-28')];
      if(key==='periodMonth') return [key,period.slice(5)];
      return [key,scale(value,ratio,period)];
    }));
  };
  table.rows = Array.from({length:12},(_,m)=>originals.map((row,index)=>{
    const period=`2026-${String(m+1).padStart(2,'0')}`;
    const ratio=m===8?1:0.45+m*0.055+(index%3)*0.012;
    const result=scale(row,ratio,period);
    result.collectedCost=+Object.values(categories).reduce((sum,key)=>sum+(result[key]||0),0).toFixed(2);
    if(kind==='department') result.projectAttributedCost=+(result.collectedCost-result.publicCost).toFixed(2);
    if(kind==='project') result.directCost=+(result.collectedCost-result.indirectCost-result.adjustmentAmount).toFixed(2);
    return result;
  })).flat();
  chart.series = originals.map((row,index)=>({key:row[chart.seriesField],label:chart.series[index].label,color:chart.series[index].color,
    points:table.rows.filter(r=>r[chart.seriesField]===row[chart.seriesField]).map(r=>({period:r.yearPeriod,value:r.collectedCost,categories:Object.fromEntries(Object.entries(categories).map(([label,key])=>[label,r[key]]))}))}));
  fs.writeFileSync(file,JSON.stringify(s,null,2)+'\n');
  const bp=`inputs/md/pages/cost/${kind}-cost-analysis.md`;
  let text=fs.readFileSync(bp,'utf8');
  text=text.replaceAll('默认当前会计期间至当前会计期间','默认 2026-01 至 2026-12').replaceAll('默认从当前会计期间到当前会计期间','默认 2026-01 至 2026-12').replaceAll('不显示图例，曲线按部门查询条件显示','图例在右侧纵向排列，曲线按部门查询条件显示').replaceAll('移除趋势图图例','趋势图图例在右侧纵向排列');
  text+='\n### 2026-09-10 统一查询与年度演示（覆盖此前默认展示规则）\n\n- 两页查询条件统一为左对齐，标签宽96px、左侧内边距16px，字段布局一致。\n- 初次进入只预填条件、不展示结果；演示预选前两个项目/部门，会计期间为2026-01至2026-12，点击查询后展示。\n- 重置清空条件和结果；未输入任何条件时不加载数据。\n- 按2026年12个月准备静态演示数据，列表按会计期间与项目/部门形成独立记录，趋势金额与对应列表一致。\n- 图例在趋势图右侧上下排列，仅显示本次查询对应的项目/部门。\n';
  fs.writeFileSync(bp,text);
}
