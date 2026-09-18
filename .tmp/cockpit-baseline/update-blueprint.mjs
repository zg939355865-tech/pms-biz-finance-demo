import fs from 'node:fs';
const file='inputs/md/pages/report/project-lifecycle-dashboard.md';
const old=fs.readFileSync('.tmp/cockpit-baseline/project-lifecycle-dashboard.md','utf8');
const schema=JSON.parse(fs.readFileSync('schemas/pages/report/project-lifecycle-dashboard.json','utf8'));
const current=`# 项目驾驶舱页面蓝图

## 本次设计（2026-09-10）

- 状态：按用户明确提出的七类内容实施。
- 页面编码：\`project-lifecycle-dashboard\`；菜单：项目驾驶舱。
- 输出：\`pages/report/project-lifecycle-dashboard.html\`。
- 主体采用深蓝大屏主题，青蓝强调、白色关键数值、弱分隔线；使用共享资源中心中的屏幕色与图表色 Token，不改变菜单及其他业务页面。
- 资源中心：\`prototype-resources/index.html\`，\`pms-resource-center-v1\`。
- 参考样例：数据看板页、标准列表页；组件映射：PageHeader、ProStatCard、ProChartCard、Space、ProSearchForm、ProTable、Tag。差异：用户明确要求驾驶舱视觉，主体采用页面专用深色布局；原有标准查询与明细保留在底部折叠区。

## 1. 主体结构

1. 页头：项目驾驶舱、演示数据标识、统计截至月份、所属行业、重置。
2. 指标卡：项目需求（总数/审核中/已完成/已终止）、项目方案（总数/审核中/已完成/已终止）、项目实施通知（总数/审核中/已完成）、项目立项（总数/审核中/未开始/进行中/已完成）。
3. 第一排：项目需求月度面积折线图、五行业月度折线图、行业需求环形构成图。
4. 第二排：需求类型柱状图、省份需求排名前7、需求提出人排名前7、项目经理负责项目数倒序排名（全部经理）。
5. 底部：统计口径入口、可展开的生命周期明细与查询。

## 2. 枚举及数据粒度

- 行业：污水厂、水泥、钢铁、化工、光伏。
- 需求类型：曝气智能体、进水提升泵智能体、加活性炭智能体、内回流智能体、排泥智能体。横轴可简写，图形可访问名称和明细保留完整语义。
- 省份：项目所在地省份；人员：需求发起人、项目主责经理。
- 主体数据来源：正式 Schema 的 \`cockpit.records\`。四类记录分别按唯一单据编号去重，需求图表只统计需求记录，经理排名只统计立项记录。
- 演示总数：需求186、方案84、通知62、立项48。所有主体图表实时从同一记录集聚合，不直接写死图表总量。

## 3. 统计口径

${schema.cockpit.definitions.map((x,i)=>`${i+1}. ${x}`).join('\n')}

## 4. 交互与边界

- 修改截至月份或行业：同步重新计算四组指标及七张图表；重置恢复访问当月及全部行业。
- 趋势始终显示连续6个月；图例控制行业系列显隐，不改变指标总量。
- 指标总数/状态、趋势数据点、行业图例、类型柱、省份/提出人/经理排名均可点击查看对应演示记录。
- 明细弹窗支持关闭、Escape、上一页/下一页，固定5条/页；空数据保留表头并显示提示。
- 零记录时总数为0，趋势补零，环形图显示空环，排名显示空提示；避免除零、NaN、Infinity。
- 主体演示记录不伪造已存在的业务详情链接；底部旧样例继续使用原有真实页面入口。
- 页面无审批、编辑、删除或财务记账操作。

## 5. 生成和验收

- 标准命令：\`node scripts/generate/page-from-schema.mjs schemas/pages/report/project-lifecycle-dashboard.json\`。
- 页面专用渲染：\`scripts/lib/project-cockpit.mjs\`、\`project-cockpit.css\`、\`project-cockpit-runtime.mjs\`；仅在目标页面且配置了 \`cockpit\` 时启用。
- 检查目标页面 Schema、Policy、HTML、专项交互以及1440px/2048px直接页面和菜单 iframe；保留旧明细断言。
- 不修改其他页面、菜单、公共样式或原有单据状态定义。

---

## 附录：底部生命周期明细的原有基线

以下内容记录保留的独立生命周期样例与交互；其中原页头、顶部指标及图表现位于折叠区，不作为本次主体驾驶舱的统计口径。

`;
fs.writeFileSync(file,current+old.replace(/^# 项目全生命周期驾驶舱页面蓝图/,'### 原生命周期明细蓝图'));
