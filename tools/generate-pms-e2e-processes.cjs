const fs = require('fs');
const path = require('path');
const { chromium } = require('D:/Program Files/.codex/skills/mes-ur-generator/node_modules/playwright');

const VERSION = '20260910-V1.1';
const ROOT = path.resolve(`outputs/PMS端到端业务流程/${VERSION}`);
const COLORS = {
  navy: '#0f3b66', blue: '#0f62fe', blueSoft: '#e8f1ff', cyan: '#d9f3f0',
  green: '#defbe6', greenStroke: '#198038', yellow: '#fff4ce', yellowStroke: '#b28600',
  red: '#fff1f1', redStroke: '#da1e28', gray: '#f4f7fb', gray2: '#dde3ea',
  text: '#161616', muted: '#525252', line: '#697077', white: '#ffffff'
};

const diagrams = [
  {
    dir: '00-全景总览', file: '00-PMS业财端到端全景',
    title: 'PMS业财端到端业务全景',
    subtitle: '以项目为共同载体，区分合同约定、业务履约、票据、资金与会计处理',
    lanes: ['项目经营主线', '采购与资源投入', '收入业务结算', '收入开票与资金回收', '库存流转', '固定资产', '财务关账与外围系统'],
    nodes: [
      ['n1',0,0,'项目需求','start'], ['n2',0,1,'调研、方案与\n实施通知'], ['n3',0,2,'项目立项'], ['n4',0,3,'项目计划与\n进度执行'], ['n5',0,7,'项目经营查询','end'],
      ['n6',1,2,'支出合同\n（可选）'], ['n7',1,3,'采购订单\n关联项目'], ['n8',1,4,'采购入库或\n服务结算','decision'], ['n9',1,5,'采购收票'], ['n10',1,6,'付款与\n票款核销'],
      ['n11',2,2,'收入合同与\n收款计划'], ['n12',2,3,'项目结算'],
      ['n13',3,3,'销项开票'], ['n14',3,4,'收款单'], ['n15',3,5,'收款核销'],
      ['n16',4,4,'采购/其他入库\n即时库存与流水'], ['n17',4,5,'物资出库\n项目去向'], ['n18',5,5,'库存转固与\n固资变更'],
      ['n19',6,4,'结账助手\n汇集三域检查'], ['n20',6,5,'期末结算'], ['n21',6,6,'用友凭证同步\n后续联调','external']
    ],
    edges: [
      ['n1','n2'],['n2','n3'],['n3','n4'],['n4','n5'],
      ['n6','n7','可选关联'],['n7','n8'],['n8','n9','履约依据'],['n9','n10'],
      ['n11','n12','业务结算线'],['n11','n13','开票收款线'],['n13','n14'],['n14','n15'],
      ['n16','n17'],['n16','n18','固定资产类'],
      ['n19','n20','全部通过'],['n20','n21','同步步骤','dashed']
    ],
    boundary: '当前原型已覆盖核心业务台账与规则；自动凭证、真实用友接口、成本自动归集、独立验收结项仍需后续开发和验收。'
  },
  {
    dir: '01-项目主线', file: '01-项目需求到项目执行',
    title: '项目需求到项目执行端到端流程',
    subtitle: '项目需求、方案、立项、计划、进度与运营查询共用项目主线',
    lanes: ['需求提出方', '项目管理人员', '审批与责任人', 'PMS项目管理', '经营查询'],
    nodes: [
      ['n1',0,0,'提出项目需求','start'], ['n2',0,1,'填写项目需求\n并提交'],
      ['n3',1,2,'开展调研问卷'], ['n4',1,3,'编制项目方案'], ['n5',1,4,'发布项目\n实施通知'], ['n6',1,5,'项目立项'], ['n7',1,6,'编制项目计划\n与任务分解'], ['n8',1,7,'填报项目进度'],
      ['n9',2,1,'需求审核','decision'], ['n10',2,3,'方案审核','decision'], ['n11',2,6,'任务协同与\n责任跟踪'],
      ['n12',3,1,'生成需求编号\n记录公司关系'], ['n13',3,5,'形成项目主数据'], ['n14',3,7,'汇总WBS状态'],
      ['n15',4,7,'WBS任务看板'], ['n16',4,8,'需求跟踪与\n项目运维记录','end']
    ],
    edges: [
      ['n1','n2'],['n2','n9'],['n9','n12','通过'],['n9','n2','驳回'],['n12','n3'],['n3','n4'],['n4','n10'],['n10','n5','通过'],['n10','n4','驳回'],['n5','n6'],['n6','n13'],['n13','n7'],['n7','n11'],['n11','n8'],['n8','n14'],['n14','n15'],['n15','n16']
    ],
    boundary: '当前覆盖至计划、进度、WBS、需求跟踪和运维查询；独立项目验收、项目结项尚未纳入当前可用范围。'
  },
  {
    dir: '02-采购物资履约', file: '02-采购订单到物资入库',
    title: '采购订单到物资入库端到端流程',
    subtitle: '订单限定采购范围，采购入库确认物资或资产实际履约',
    lanes: ['需求/项目人员', '采购人员', '仓库/验收人员', '审核人员', 'PMS库存'],
    nodes: [
      ['n1',0,0,'形成采购需求','start'], ['n2',0,1,'关联已立项项目'],
      ['n3',1,1,'选择支出合同\n（可选）'], ['n4',1,2,'创建采购订单'], ['n5',1,3,'区分采购类型','decision'],
      ['n6',2,4,'选择已审核\n采购订单行'], ['n7',2,5,'录入到货与\n入库明细'], ['n8',2,6,'提交采购入库'],
      ['n9',3,2,'审核采购订单','decision'], ['n10',3,6,'审核采购入库','decision'],
      ['n11',4,7,'增加即时库存'], ['n12',4,8,'形成出入库流水'], ['n13',4,9,'提供采购收票\n履约来源','end']
    ],
    edges: [
      ['n1','n2'],['n2','n3'],['n3','n4'],['n4','n9'],['n9','n5','通过'],['n9','n4','驳回'],['n5','n6','物资/资产'],['n6','n7'],['n7','n8'],['n8','n10'],['n10','n11','通过'],['n10','n7','驳回'],['n11','n12'],['n12','n13']
    ],
    boundary: '当前采购申请菜单未开放；普通订单保留采购申请字段，紧急订单记录紧急采购原因。库存成本计价、盘点、调拨和独立退货单不在当前范围。'
  },
  {
    dir: '03-采购服务履约', file: '03-采购订单到服务结算',
    title: '采购订单到服务结算端到端流程',
    subtitle: '服务采购不走实物入库，以采购订单行和服务完成事实办理蓝字或红字结算',
    lanes: ['项目/使用部门', '采购人员', '服务验收人员', '红字调整', '审核人员', '后续采购业务'],
    nodes: [
      ['n1',0,0,'提出服务采购需求','start'], ['n2',0,1,'明确项目与\n服务范围'],
      ['n3',1,2,'创建服务类\n采购订单'], ['n4',1,3,'订单审核','decision'],
      ['n5',2,4,'选择已审核\n采购订单行'], ['n6',2,5,'确认服务完成量\n与结算金额'], ['n7',2,6,'结算方向','decision'], ['n8',2,7,'蓝字服务结算'], ['n9',3,7,'红字服务结算','exception'],
      ['n10',4,9,'审核服务结算','decision'],
      ['n11',5,10,'形成采购收票\n可选履约范围'], ['n12',5,11,'保留订单行与\n结算行追溯','end']
    ],
    edges: [
      ['n1','n2'],['n2','n3'],['n3','n4'],['n4','n5','通过'],['n4','n3','驳回'],['n5','n6'],['n6','n7'],['n7','n8','正向'],['n7','n9','冲销/调整'],['n8','n10'],['n9','n10'],['n10','n11','通过'],['n10','n6','驳回'],['n11','n12']
    ],
    boundary: '服务结算确认履约事实，不等同于发票或付款；红字结算必须关联可冲销的原蓝字结算范围。'
  },
  {
    dir: '04-采购收票付款', file: '04-采购收票到付款核销',
    title: '采购收票到付款核销端到端流程',
    subtitle: '发票行匹配订单及履约行，付款单记录现金流，核销建立票款对应',
    lanes: ['采购人员', '采购入库依据', '服务结算依据', '财务应付/发票', '出纳/资金', '审核与核销'],
    nodes: [
      ['n1',0,0,'收到供应商发票','start'], ['n2',0,1,'选择采购订单行'],
      ['n3',1,2,'匹配已审核\n采购入库行'], ['n4',2,2,'匹配已审核\n服务结算行'], ['n5',3,3,'校验数量、金额\n与可收票余额','decision'],
      ['n6',3,4,'形成采购发票行'], ['n7',3,5,'提交并审核\n采购收票'],
      ['n8',4,4,'登记实际付款单'], ['n9',4,5,'提交并审核付款'],
      ['n10',5,6,'选择付款单'], ['n11',5,7,'匹配待核销\n采购发票'], ['n12',5,8,'分配核销金额'], ['n13',5,9,'审核票款核销'], ['n14',5,10,'更新双方\n未核销余额','end']
    ],
    edges: [
      ['n1','n2'],['n2','n3','物资/资产'],['n2','n4','服务'],['n3','n5'],['n4','n5'],['n5','n6','通过'],['n5','n2','超范围'],['n6','n7'],['n8','n9'],['n9','n10'],['n10','n11'],['n11','n12'],['n12','n13'],['n13','n14']
    ],
    boundary: '当前付款单为实际付款直接登记，付款申请未开放；不能表述为已经实现合同付款计划控制或正式应付会计处理。'
  },
  {
    dir: '05-收入结算收款', file: '05-收入合同到收款核销',
    title: '收入合同到收款核销端到端流程',
    subtitle: '合同计划、业务结算、开票事实和实际收款分开记录，最终通过收款核销闭环',
    lanes: ['项目/销售人员', '收入合同管理', '业务结算', '销项开票', '实际收款', '核销与余额'],
    nodes: [
      ['n1',0,0,'确认客户与项目','start'], ['n2',0,1,'维护收入合同\n及服务明细'],
      ['n3',1,2,'维护收款计划'], ['n4',1,3,'合同审核','decision'],
      ['n5',2,4,'按合同计划与项目\n形成项目结算单'], ['n6',2,5,'提交并审核\n项目结算'],
      ['n7',3,4,'按合同收款计划\n形成销项开票'], ['n9',3,6,'审核销项开票'],
      ['n8',4,4,'登记蓝字或\n红字收款单'], ['n14',4,5,'审核收款单'],
      ['n10',5,6,'选择已审核收款单'], ['n11',5,7,'按合同、项目、客户\n匹配待核销发票'], ['n12',5,8,'分配并审核核销'], ['n13',5,9,'更新发票与收款\n未核销余额','end']
    ],
    edges: [
      ['n1','n2'],['n2','n3'],['n3','n4'],['n4','n5','项目结算线'],['n4','n7','开票线'],['n4','n8','收款线'],['n5','n6'],['n7','n9'],['n8','n14'],['n14','n10'],['n9','n11','待核销发票'],['n10','n11'],['n11','n12'],['n12','n13']
    ],
    boundary: '三条业务线当前相关但不强制完全串行；销项开票以合同收款计划为依据，不以项目结算单作为唯一来源。无银行流水自动导入、税控开票和自动凭证。'
  },
  {
    dir: '06-库存流转', file: '06-物资入库到项目出库',
    title: '物资入库到项目出库端到端流程',
    subtitle: '采购入库和其他入库增加库存，项目出库和其他出库减少库存，流水完整记录去向',
    lanes: ['采购/外部来源', '仓库人员', '项目/领用部门', '审核人员', 'PMS库存台账'],
    nodes: [
      ['n1',0,0,'采购入库或\n其他入库','start'],
      ['n2',1,1,'确认库存地点\n与库位'], ['n3',1,2,'录入入库明细'],
      ['n13',3,3,'审核入库','decision'], ['n4',4,4,'增加即时库存'], ['n5',4,5,'生成入库流水'],
      ['n6',2,6,'提出项目领用或\n其他出库需求'], ['n7',2,7,'选择可用库存'], ['n8',2,8,'录入出库数量\n与项目去向'],
      ['n9',3,9,'审核出库','decision'],
      ['n10',4,10,'校验可用数量','decision'], ['n11',4,11,'扣减即时库存'], ['n12',4,12,'生成出库流水\n保留来源与去向','end']
    ],
    edges: [
      ['n1','n2'],['n2','n3'],['n3','n13'],['n13','n4','通过'],['n13','n3','驳回'],['n4','n5'],['n5','n6'],['n6','n7'],['n7','n8'],['n8','n9'],['n9','n10','通过'],['n9','n8','驳回'],['n10','n11','库存充足'],['n10','n7','不足'],['n11','n12']
    ],
    boundary: '当前以数量余额和来源追溯为主；库存成本计价、调拨、盘点和独立退货流程未纳入当前可用范围。'
  },
  {
    dir: '07-固定资产', file: '07-库存转固到固资变更',
    title: '库存转固到固定资产变更端到端流程',
    subtitle: '固定资产类库存逐件转为资产卡片，归属变更保留前后快照且不恢复库存',
    lanes: ['采购与仓库', '资产管理员', '使用部门/项目', '审核人员', 'PMS固资台账'],
    nodes: [
      ['n1',0,0,'固定资产类\n采购入库','start'], ['n2',0,1,'形成可转固\n即时库存'],
      ['n3',1,2,'选择来源库存'], ['n4',1,3,'按库存数量\n逐件生成资产卡片'],
      ['n5',4,4,'扣减来源库存'], ['n6',4,5,'形成一物一卡\n并保留来源'],
      ['n7',2,6,'发生使用部门、人员\n项目或状态变更'], ['n8',1,7,'选择一张资产卡片\n创建固资变更单'], ['n9',1,8,'保存变更前快照\n填写变更后信息'],
      ['n10',3,9,'审核固资变更','decision'], ['n11',4,10,'更新原资产卡片'], ['n12',4,11,'保留变更记录\n不新增卡片、不回库存','end']
    ],
    edges: [
      ['n1','n2'],['n2','n3'],['n3','n4'],['n4','n5'],['n5','n6'],['n6','n7'],['n7','n8'],['n8','n9'],['n9','n10'],['n10','n11','通过'],['n10','n9','驳回'],['n11','n12']
    ],
    boundary: '当前只覆盖库存转固和资产归属信息变更；不执行折旧计算、减值、盘点、报废处置或真实用友资产接口。'
  },
  {
    dir: '08-期末结算', file: '08-业务检查到期末结算',
    title: '业务检查到期末结算端到端流程',
    subtitle: '先由结账助手形成有效检查结论，再执行期末结算和用友同步步骤',
    lanes: ['业务责任人', '结账助手', '财务人员', '期末结算', '异常处理', '用友财务系统'],
    nodes: [
      ['n1',2,0,'进入当前已启动\n会计期间','start'], ['n2',1,1,'检查物资、收入、\n采购业务域'], ['n3',1,2,'是否全部通过','decision'],
      ['n4',1,3,'生成未完成单据、\n原因与责任人','exception'], ['n5',0,4,'穿透源单据处理'], ['n6',1,5,'重新检查'],
      ['n7',2,3,'查看有效检查结论'], ['n8',3,5,'结账前再次校验','decision'], ['n9',3,6,'确认执行期末结算'],
      ['n10',5,7,'同步凭证步骤\n后续真实联调','external'], ['n11',3,8,'同步是否全部成功','decision'], ['n12',3,9,'完成三个业务域\n及期间结账','end'], ['n13',4,9,'记录失败明细\n保持期间可处理','exception']
    ],
    edges: [
      ['n1','n2'],['n2','n3'],['n3','n4','未通过'],['n4','n5'],['n5','n6'],['n6','n3'],['n3','n7','全部通过'],['n7','n8'],['n8','n9','有效'],['n8','n2','数据已变化'],['n9','n10','同步步骤','dashed'],['n10','n11','回写结果','dashed'],['n11','n12','全部成功'],['n11','n13','失败/未知']
    ],
    boundary: '当前检查范围仅物资、收入、采购三个业务域；真实用友接口、凭证模板、科目映射、跨期调整和下一期间自动初始化仍需确认与联调。'
  },
  {
    dir: '09-跨公司协同', file: '09-跨公司需求协同与待办',
    title: '跨公司需求协同与待办端到端流程',
    subtitle: '创建公司、需求来源公司和项目主责公司共同限定提交、跟踪与可见范围',
    lanes: ['需求来源公司', '项目主责公司', '审批/任务责任人', 'PMS协同机制', '异常处理', '我司负责视图', '外发与管理查询'],
    nodes: [
      ['n1',0,0,'创建项目需求','start'], ['n2',0,1,'记录需求来源公司'],
      ['n3',3,2,'记录创建公司\n与项目主责公司'], ['n4',3,3,'提交公司一致性校验','decision'],
      ['n12',4,4,'阻止提交并修正\n公司关系','exception'], ['n5',1,5,'主办、承接或\n外发处理'], ['n6',2,6,'生成我的审批\n与我的任务'], ['n7',2,7,'处理审批和任务'],
      ['n8',3,8,'更新需求与项目进展'], ['n9',5,9,'我司负责视图'], ['n10',6,9,'外发跟踪视图'], ['n11',6,11,'跨公司台账与\n授权进度查询','end']
    ],
    edges: [
      ['n1','n2'],['n2','n3'],['n3','n4'],['n4','n5','至少一方一致'],['n4','n12','不一致'],['n12','n3','修正后重检'],['n5','n6'],['n6','n7'],['n7','n8'],['n8','n9','我司主办/承接'],['n8','n10','我司外发'],['n9','n11'],['n10','n11']
    ],
    boundary: '分类视图不改变数据权限和流程状态；外发跟踪只展示授权范围内业务进展，不开放项目主责公司的内部审批过程。'
  }
];

function esc(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function lines(label) { return String(label).split('\n'); }

function nodeStyle(type) {
  if (type === 'start' || type === 'end') return `ellipse;whiteSpace=wrap;html=1;fillColor=${type === 'start' ? COLORS.green : COLORS.red};strokeColor=${type === 'start' ? COLORS.greenStroke : COLORS.redStroke};fontSize=13;fontStyle=1;`;
  if (type === 'decision') return `rhombus;whiteSpace=wrap;html=1;fillColor=${COLORS.yellow};strokeColor=${COLORS.yellowStroke};fontSize=12;fontStyle=1;`;
  if (type === 'exception') return `rounded=1;whiteSpace=wrap;html=1;fillColor=${COLORS.red};strokeColor=${COLORS.redStroke};fontSize=12;`;
  if (type === 'external') return `rounded=1;whiteSpace=wrap;html=1;dashed=1;fillColor=${COLORS.gray};strokeColor=${COLORS.line};fontSize=12;`;
  return `rounded=1;whiteSpace=wrap;html=1;fillColor=${COLORS.blueSoft};strokeColor=${COLORS.blue};fontSize=12;`;
}

function geometry(type, lane, col) {
  const x = 225 + col * 205;
  const laneTop = 140 + lane * 132;
  if (type === 'decision') return { x: x + 8, y: laneTop + 22, w: 154, h: 82 };
  if (type === 'start' || type === 'end') return { x: x + 18, y: laneTop + 34, w: 135, h: 58 };
  return { x, y: laneTop + 29, w: 170, h: 68 };
}

function svgNode(node) {
  const [id, lane, col, label, type = 'process'] = node;
  const g = geometry(type, lane, col);
  let shape;
  if (type === 'decision') shape = `<polygon points="${g.x + g.w/2},${g.y} ${g.x + g.w},${g.y + g.h/2} ${g.x + g.w/2},${g.y + g.h} ${g.x},${g.y + g.h/2}" fill="${COLORS.yellow}" stroke="${COLORS.yellowStroke}" stroke-width="2"/>`;
  else if (type === 'start' || type === 'end') shape = `<ellipse cx="${g.x + g.w/2}" cy="${g.y + g.h/2}" rx="${g.w/2}" ry="${g.h/2}" fill="${type === 'start' ? COLORS.green : COLORS.red}" stroke="${type === 'start' ? COLORS.greenStroke : COLORS.redStroke}" stroke-width="2"/>`;
  else shape = `<rect x="${g.x}" y="${g.y}" width="${g.w}" height="${g.h}" rx="${type === 'external' ? 2 : 7}" fill="${type === 'exception' ? COLORS.red : type === 'external' ? COLORS.gray : COLORS.blueSoft}" stroke="${type === 'exception' ? COLORS.redStroke : type === 'external' ? COLORS.line : COLORS.blue}" stroke-width="2" ${type === 'external' ? 'stroke-dasharray="7 5"' : ''}/>`;
  const ls = lines(label);
  const centerX = g.x + g.w/2;
  const firstY = g.y + g.h/2 - ((ls.length - 1) * 10) + 5;
  const text = `<text x="${centerX}" y="${firstY}" text-anchor="middle" font-family="Microsoft YaHei, Arial" font-size="14" font-weight="${type === 'decision' || type === 'start' || type === 'end' ? 700 : 500}" fill="${COLORS.text}">${ls.map((t,i)=>`<tspan x="${centerX}" dy="${i ? 20 : 0}">${esc(t)}</tspan>`).join('')}</text>`;
  return { id, g, svg: shape + text };
}

function edgePoints(a, b) {
  const ax = a.x + a.w, ay = a.y + a.h/2;
  const bx = b.x, by = b.y + b.h/2;
  if (bx >= ax + 25) {
    const mid = (ax + bx) / 2;
    return [[ax,ay],[mid,ay],[mid,by],[bx,by]];
  }
  const sx = a.x + a.w/2, sy = a.y + a.h;
  const tx = b.x + b.w/2, ty = b.y;
  const bendY = Math.max(sy + 18, Math.min(ty - 18, (sy + ty)/2));
  return [[sx,sy],[sx,bendY],[tx,bendY],[tx,ty]];
}

function edgePath(a,b) {
  const points=edgePoints(a,b);
  return points.slice(1).reduce((d,p,i) => {
    const prev=points[i];
    return d + (p[1]===prev[1] ? ` H${p[0]}` : p[0]===prev[0] ? ` V${p[1]}` : ` L${p[0]} ${p[1]}`);
  },`M${points[0][0]} ${points[0][1]}`);
}

function validateNodeLayout(diagram) {
  const slots = new Map();
  for (const [id,lane,col] of diagram.nodes) {
    const key = `${lane}:${col}`;
    if (slots.has(key)) throw new Error(`${diagram.file}: 节点坐标重叠 ${slots.get(key)} 与 ${id} (${key})`);
    slots.set(key,id);
  }
}

function segmentCrossesRect(a,b,r) {
  const pad=3;
  const left=r.x+pad, right=r.x+r.w-pad, top=r.y+pad, bottom=r.y+r.h-pad;
  if (a[1]===b[1]) {
    const y=a[1], minX=Math.min(a[0],b[0]), maxX=Math.max(a[0],b[0]);
    return y>top && y<bottom && maxX>left && minX<right;
  }
  if (a[0]===b[0]) {
    const x=a[0], minY=Math.min(a[1],b[1]), maxY=Math.max(a[1],b[1]);
    return x>left && x<right && maxY>top && minY<bottom;
  }
  return false;
}

function validateEdgesDoNotCrossNodes(diagram,rendered) {
  const byId=new Map(rendered.map(n=>[n.id,n.g]));
  const crossings=[];
  for (const [from,to] of diagram.edges) {
    const points=edgePoints(byId.get(from),byId.get(to));
    for (const node of rendered) {
      if (node.id===from || node.id===to) continue;
      for (let i=1;i<points.length;i++) {
        if (segmentCrossesRect(points[i-1],points[i],node.g)) {
          crossings.push(`${from}->${to} 穿过 ${node.id}`);
          break;
        }
      }
    }
  }
  if (crossings.length) throw new Error(`${diagram.file}: 连线穿过无关节点：${crossings.join('；')}`);
}

function renderDiagram(diagram) {
  validateNodeLayout(diagram);
  const maxCol = Math.max(...diagram.nodes.map(n => n[2]));
  const width = 430 + (maxCol + 1) * 205;
  const height = 230 + diagram.lanes.length * 132;
  let nextId = 2;
  const idMap = new Map();
  const xml = ['<mxCell id="0"/>','<mxCell id="1" parent="0"/>'];
  diagram.lanes.forEach((lane, i) => {
    const laneId = String(nextId++);
    xml.push(`<mxCell id="${laneId}" value="${esc(lane)}" style="swimlane;horizontal=0;startSize=180;fillColor=${i%2 ? '#f7f9fc' : '#ffffff'};strokeColor=${COLORS.gray2};fontColor=${COLORS.navy};fontSize=13;fontStyle=1;" vertex="1" parent="1"><mxGeometry x="30" y="${140+i*132}" width="${width-60}" height="132" as="geometry"/></mxCell>`);
  });
  diagram.nodes.forEach(node => {
    const [key,lane,col,label,type='process'] = node;
    const cellId = String(nextId++);
    idMap.set(key, cellId);
    const g = geometry(type,lane,col);
    xml.push(`<mxCell id="${cellId}" value="${esc(label).replace(/\n/g,'&#xa;')}" style="${nodeStyle(type)}" vertex="1" parent="1"><mxGeometry x="${g.x}" y="${g.y}" width="${g.w}" height="${g.h}" as="geometry"/></mxCell>`);
  });
  diagram.edges.forEach(([from,to,label='',kind='']) => {
    const edgeId = String(nextId++);
    const dashed = kind === 'dashed' ? 'dashed=1;' : '';
    xml.push(`<mxCell id="${edgeId}" value="${esc(label)}" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;endArrow=block;endFill=1;strokeColor=${COLORS.line};fontSize=11;${dashed}" edge="1" parent="1" source="${idMap.get(from)}" target="${idMap.get(to)}"><mxGeometry relative="1" as="geometry"/></mxCell>`);
  });
  const drawio = `<?xml version="1.0" encoding="UTF-8"?>\n<mxfile host="app.diagrams.net" modified="2026-09-10T00:00:00.000Z" agent="Codex" version="24.7.17"><diagram id="${esc(diagram.file)}" name="Page-1"><mxGraphModel dx="1422" dy="762" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${width}" pageHeight="${height}" math="0" shadow="0"><root>${xml.join('')}</root></mxGraphModel></diagram></mxfile>`;

  const rendered = diagram.nodes.map(svgNode);
  validateEdgesDoNotCrossNodes(diagram,rendered);
  const byId = new Map(rendered.map(n => [n.id,n.g]));
  const laneSvg = diagram.lanes.map((lane,i) => `<rect x="30" y="${140+i*132}" width="${width-60}" height="132" fill="${i%2 ? '#f7f9fc' : '#ffffff'}" stroke="${COLORS.gray2}"/><rect x="30" y="${140+i*132}" width="180" height="132" fill="${i%2 ? '#e8eef6' : '#f2f6fb'}" stroke="${COLORS.gray2}"/><text x="120" y="${206+i*132}" text-anchor="middle" font-family="Microsoft YaHei, Arial" font-size="16" font-weight="700" fill="${COLORS.navy}">${esc(lane)}</text>`).join('');
  const edgeSvg = diagram.edges.map(([from,to,label='',kind='']) => {
    const a=byId.get(from), b=byId.get(to), p=edgePath(a,b);
    const lx=(a.x+a.w+b.x)/2, ly=(a.y+a.h/2+b.y+b.h/2)/2-6;
    return `<path d="${p}" fill="none" stroke="${COLORS.line}" stroke-width="2" ${kind==='dashed'?'stroke-dasharray="7 5"':''} marker-end="url(#arrow)"/>${label?`<rect x="${lx-42}" y="${ly-13}" width="84" height="20" fill="#ffffff" opacity="0.92"/><text x="${lx}" y="${ly+2}" text-anchor="middle" font-family="Microsoft YaHei, Arial" font-size="11" fill="${COLORS.muted}">${esc(label)}</text>`:''}`;
  }).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="#ffffff"/><defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="${COLORS.line}"/></marker></defs><text x="30" y="46" font-family="Microsoft YaHei, Arial" font-size="30" font-weight="700" fill="${COLORS.navy}">${esc(diagram.title)}</text><text x="30" y="78" font-family="Microsoft YaHei, Arial" font-size="15" fill="${COLORS.muted}">${esc(diagram.subtitle)}</text><g transform="translate(${width-650},28)"><rect x="0" y="0" width="14" height="14" rx="3" fill="${COLORS.blueSoft}" stroke="${COLORS.blue}"/><text x="22" y="12" font-family="Microsoft YaHei" font-size="12" fill="${COLORS.muted}">当前业务步骤</text><rect x="125" y="0" width="14" height="14" rx="3" fill="${COLORS.red}" stroke="${COLORS.redStroke}"/><text x="147" y="12" font-family="Microsoft YaHei" font-size="12" fill="${COLORS.muted}">异常/逆向/终点</text><rect x="285" y="0" width="14" height="14" rx="1" fill="${COLORS.gray}" stroke="${COLORS.line}" stroke-dasharray="4 3"/><text x="307" y="12" font-family="Microsoft YaHei" font-size="12" fill="${COLORS.muted}">后续联调能力</text></g>${laneSvg}<g>${edgeSvg}</g><g>${rendered.map(n=>n.svg).join('')}</g><rect x="30" y="${height-66}" width="${width-60}" height="42" rx="4" fill="#f4f7fb" stroke="#dde3ea"/><text x="48" y="${height-40}" font-family="Microsoft YaHei, Arial" font-size="13" fill="${COLORS.muted}">能力边界：${esc(diagram.boundary)}</text></svg>`;
  return { drawio, svg, width, height };
}

function writeIndex() {
  const rows = diagrams.map((d,i) => `| ${String(i).padStart(2,'0')} | ${d.title} | \`${d.dir}/${d.file}.drawio\` | ${d.boundary} |`).join('\n');
  const text = `# PMS端到端业务流程目录\n\n> 版本：${VERSION}  \n> 依据：PMS当前蓝图、Schema、页面范围和《PMS业务系统整体说明》  \n> 口径：只将当前已设计的原型能力画为正式步骤；未开放、后续建设或需联调能力均在图中明确标注。\n\n## 流程目录\n\n| 编号 | 流程 | 可编辑源文件 | 当前能力边界 |\n|---|---|---|---|\n${rows}\n\n## 阅读规则\n\n- 蓝色节点：当前PMS业务步骤。\n- 黄色菱形：审核、校验或业务分流。\n- 红色节点：驳回、冲销、失败等异常/逆向场景或流程终点。\n- 灰色虚线：已经形成方案但仍需开发、接口联调或生产验收的能力。\n- 合同表示约定，入库/服务结算表示履约，发票表示票据，收付款表示资金，凭证表示会计处理，几类事实不得互相替代。\n\n## 交付格式\n\n每张流程图同时提供 Draw.io 可编辑源文件、SVG 矢量图和 PNG 预览图。具体蓝图与 Schema 依据见《流程依据与范围.md》。\n`;
  fs.writeFileSync(path.join(ROOT,'README.md'), text, 'utf8');
}

function writeSourceMap() {
  const text = `# 流程依据与范围\n\n## 总体口径\n\n- 总体依据：\`inputs/方案/PMS业务系统整体说明/PMS业务系统整体说明_20260909.md\`。\n- 当前实现口径：蓝图、Schema、有效 Schema 和已生成页面共同构成当前静态原型依据。\n- 能力边界：原型页面和规则不等同于生产上线；用友接口、自动凭证、成本归集等需后续开发、联调和验收。\n\n## 流程来源映射\n\n| 流程 | 主要蓝图依据 | 主要 Schema 依据 | 口径 |\n|---|---|---|---|\n| PMS业财端到端全景 | PMS业务系统整体说明 | \`schemas/pages/\` 当前页面集合 | 当前总体设计与分阶段边界 |\n| 项目需求到项目执行 | \`inputs/md/pages/project/\` 下项目需求、调研、方案、通知、立项、计划、进度蓝图 | \`schemas/pages/project/\`、\`schemas/pages/report/wbs-task-board.json\` | 当前覆盖到执行和查询，不含独立验收结项 |\n| 采购订单到物资入库 | \`purchase-order.md\`、\`purchase-receipt.md\` | \`schemas/pages/procurement/purchase-order.json\`、\`purchase-receipt.json\` | 当前采购申请菜单未开放 |\n| 采购订单到服务结算 | \`purchase-order.md\`、\`service-settlement.md\` | \`schemas/pages/procurement/purchase-order.json\`、\`service-settlement.json\` | 服务履约以订单行和结算行为粒度 |\n| 采购收票到付款核销 | \`purchase-invoice.md\`、\`payment-order.md\`、\`invoice-payment-reconciliation.md\` | 对应采购、支出 Schema | 当前付款为实际付款登记，付款申请未开放 |\n| 收入合同到收款核销 | 收入合同、项目结算、销项开票、收款、收款核销蓝图 | \`schemas/pages/income/\` | 结算、开票、收款为相关但不强制完全串行的事实线 |\n| 物资入库到项目出库 | 即时库存、出入库流水、物资出库、其他出入库蓝图 | \`schemas/pages/material/\` | 当前以数量与来源追溯为主 |\n| 库存转固到固资变更 | 即时库存、固定资产台账、固资变更蓝图 | \`schemas/pages/material/current-inventory.json\`、\`schemas/pages/fixed-asset/\` | 当前不执行折旧、减值和处置核算 |\n| 业务检查到期末结算 | \`closing-assistant.md\`、\`period-close.md\`、\`accounting-period.md\` | \`schemas/pages/period-close/\`、\`schemas/pages/master-data/accounting-period.json\` | 当前检查范围为物资、收入、采购 |\n| 跨公司需求协同与待办 | 项目需求及跨公司协同方案 | \`schemas/pages/project/project-requirement.json\`、\`schemas/pages/todo/\` | 分类视图不改变权限，外发仅看授权进展 |\n`;
  fs.writeFileSync(path.join(ROOT,'流程依据与范围.md'), text, 'utf8');
}

function validateDrawio(file, xml) {
  const ids = [...xml.matchAll(/<mxCell id="(\d+)"/g)].map(m => Number(m[1]));
  const unique = new Set(ids);
  if (ids.length !== unique.size) throw new Error(`${file}: mxCell ID重复`);
  for (let i=0;i<ids.length;i++) if (ids[i] !== i) throw new Error(`${file}: mxCell ID不连续，位置${i}=${ids[i]}`);
  if (!xml.startsWith('<?xml') || !xml.includes('</mxfile>')) throw new Error(`${file}: XML结构不完整`);
  if (/value="[^"]*\\n/.test(xml)) throw new Error(`${file}: value属性包含字面\\n`);
}

async function main() {
  fs.mkdirSync(ROOT,{recursive:true});
  writeIndex();
  writeSourceMap();
  const built=[];
  for (const diagram of diagrams) {
    const outDir=path.join(ROOT,diagram.dir);
    fs.mkdirSync(outDir,{recursive:true});
    const result=renderDiagram(diagram);
    validateDrawio(diagram.file,result.drawio);
    fs.writeFileSync(path.join(outDir,`${diagram.file}.drawio`),result.drawio,'utf8');
    fs.writeFileSync(path.join(outDir,`${diagram.file}.svg`),result.svg,'utf8');
    built.push({diagram,outDir,...result});
  }
  const browser=await chromium.launch({headless:true});
  try {
    for (const item of built) {
      const page=await browser.newPage({viewport:{width:Math.min(item.width,2400),height:Math.min(item.height,1200)},deviceScaleFactor:1});
      await page.setContent(`<html><body style="margin:0;background:#fff">${item.svg}</body></html>`);
      await page.locator('svg').screenshot({path:path.join(item.outDir,`${item.diagram.file}.png`)});
      await page.close();
      console.log(`generated: ${item.diagram.dir}/${item.diagram.file}`);
    }
  } finally {
    await browser.close();
  }
  console.log(`output: ${ROOT}`);
}

main().catch(err=>{ console.error(err); process.exit(1); });
