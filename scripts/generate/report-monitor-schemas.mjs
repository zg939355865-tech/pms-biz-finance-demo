import { writeJson } from '../lib/file-utils.mjs';

const base = {
  schemaVersion: 'pms-page-schema-v2',
  policyProfile: 'utility-page',
  policyVersion: 'pms-policy-v1',
  domain: 'report',
  module: '报表管理',
  pageType: 'dashboard',
  workflowActions: false,
  toastEnabled: false
};

const resourceReference = (components) => ({
  center: 'prototype-resources/index.html',
  baseline: 'pms-resource-center-v1',
  pageSamples: ['数据看板页', '标准列表页'],
  components: ['PageHeader', ...components]
});

const projectRows = [
  { projectCode: 'PMS2024001', projectName: '广州水务智能控制项目', projectStatus: '已控制', scale: 50, region: '广东省', manager: '张明', startTime: '2024-01-15 08:30:00', endTime: '2027-01-14 18:00:00', remainTime: '245天8时30分', waterType: '市政污水', bioProcess: 'A2O', standard: '一级A', cod: 32, nh3: 2.8, tn: 10, tp: 0.3, aiOs: '曝气智能体', customerCode: 'C001', customerName: '广州水务集团', operator: '广州智能运营公司', owner: '广州水务集团' },
  { projectCode: 'PMS2024002', projectName: '深圳污水处理厂智能改造', projectStatus: '部署中', scale: 40, region: '广东省', manager: '李华', startTime: '2024-03-20 09:00:00', endTime: '2027-03-19 18:00:00', remainTime: '310天9时0分', waterType: '市政污水', bioProcess: 'A2O', standard: '一级A', cod: 28, nh3: 2.5, tn: 9, tp: 0.25, aiOs: '加药智能体', customerCode: 'C002', customerName: '深圳环保科技', operator: '深圳智能环保', owner: '深圳水务局' },
  { projectCode: 'PMS2024003', projectName: '东莞印染废水处理项目', projectStatus: '部署中', scale: 30, region: '广东省', manager: '王芳', startTime: '2024-05-10 10:00:00', endTime: '2026-05-09 18:00:00', remainTime: '365天10时0分', waterType: '工业废水', bioProcess: 'AO', standard: '一级B', cod: 45, nh3: 5.2, tn: 15, tp: 0.5, aiOs: '加碳智能体', customerCode: 'C003', customerName: '东莞印染集团', operator: '东莞环保科技', owner: '东莞印染集团' },
  { projectCode: 'PMS2024004', projectName: '杭州市政污水处理项目', projectStatus: '已控制', scale: 35, region: '浙江省', manager: '刘伟', startTime: '2024-02-01 08:00:00', endTime: '2027-01-31 18:00:00', remainTime: '270天8时0分', waterType: '市政污水', bioProcess: 'A2O', standard: '一级A', cod: 30, nh3: 2.5, tn: 9, tp: 0.28, aiOs: '除磷智能体', customerCode: 'C004', customerName: '杭州水务集团', operator: '杭州智能水务', owner: '杭州市政局' },
  { projectCode: 'PMS2024005', projectName: '苏州工业废水处理项目', projectStatus: '未控制', scale: 28, region: '江苏省', manager: '陈静', startTime: '2024-06-15 09:00:00', endTime: '2026-06-14 18:00:00', remainTime: '400天9时0分', waterType: '工业废水', bioProcess: 'A2O', standard: '一级A', cod: 40, nh3: 4, tn: 12, tp: 0.4, aiOs: '厂网协同智能体', customerCode: 'C005', customerName: '苏州工业园区', operator: '苏州环保工程', owner: '苏州工业园区' },
  { projectCode: 'PMS2024006', projectName: '南京水务智能控制项目', projectStatus: '已到期', scale: 22, region: '江苏省', manager: '周涛', startTime: '2023-01-10 08:00:00', endTime: '2026-01-09 18:00:00', remainTime: '60天8时0分', waterType: '市政污水', bioProcess: 'A2O', standard: '一级B', cod: 38, nh3: 3.8, tn: 11, tp: 0.35, aiOs: '曝气智能体', customerCode: 'C006', customerName: '南京水务集团', operator: '南京智能水务', owner: '南京市水务局' },
  { projectCode: 'PMS2024007', projectName: '青岛化工废水处理项目', projectStatus: '已到期', scale: 18, region: '山东省', manager: '吴燕', startTime: '2023-08-20 10:00:00', endTime: '2026-08-19 18:00:00', remainTime: '100天10时0分', waterType: '工业废水', bioProcess: 'AO', standard: '二级', cod: 55, nh3: 8, tn: 20, tp: 0.8, aiOs: '加药智能体', customerCode: 'C007', customerName: '青岛化工集团', operator: '青岛环保科技', owner: '青岛化工集团' },
  { projectCode: 'PMS2024008', projectName: '济南市政污水处理项目', projectStatus: '已控制', scale: 15, region: '山东省', manager: '孙磊', startTime: '2024-04-05 08:30:00', endTime: '2027-04-04 18:00:00', remainTime: '330天8时30分', waterType: '市政污水', bioProcess: 'A2O', standard: '一级A', cod: 33, nh3: 3, tn: 10, tp: 0.32, aiOs: '加碳智能体', customerCode: 'C008', customerName: '济南水务集团', operator: '济南智能环保', owner: '济南市公用事业局' }
];

const operationAssignments = [
  ['张明', '李涛/王磊', '已配置', '周杰', '10.0.0.101:9090', '曝气智能控制', '宋琳', '何工', '马工'],
  ['李华', '赵凯/陈晨', '配置中', '吴迪', '10.0.0.102:9091', '智能加药控制', '王雪', '秦工', '朱工'],
  ['王芳', '刘洋/孙强', '配置中', '郑峰', '10.0.0.103:9092', '碳源投加控制', '陈亮', '方工', '许工'],
  ['刘伟', '徐涛/何静', '已配置', '胡睿', '10.0.0.104:9093', '除磷智能控制', '赵敏', '沈工', '唐工'],
  ['陈静', '高飞/马超', '未配置', '蒋宁', '10.0.0.105:9094', '厂网协同控制', '周欣', '邓工', '罗工'],
  ['周涛', '唐伟/郭磊', '已配置', '彭宇', '10.0.0.106:9095', '曝气智能控制', '吴倩', '胡工', '袁工'],
  ['吴燕', '韩松/罗浩', '已配置', '沈博', '10.0.0.107:9096', '智能加药控制', '李娜', '顾工', '董工'],
  ['孙磊', '袁航/邓凯', '已配置', '秦峰', '10.0.0.108:9097', '碳源投加控制', '黄婷', '魏工', '薛工']
];

const controlEffectSamples = [
  {
    evaluationStartDate: '2026-04-01', evaluationEndDate: '2026-04-30',
    waterEnergy: 0.3186, blowerEnergy: 0.1853, ammoniaRemovalEnergy: 3.754, codRemovalEnergy: 1.635,
    pacConsumption: 27.8, carbonConsumption: 20.9,
    overallOperationEvaluation: '整体运行平稳，能耗与药耗控制效果良好。',
    createdBy: '林佳', createdTime: '2026-05-06 10:20:00'
  },
  {
    evaluationStartDate: '2026-03-01', evaluationEndDate: '2026-03-31',
    waterEnergy: 0.3298, blowerEnergy: 0.1936, ammoniaRemovalEnergy: 3.886, codRemovalEnergy: 1.708,
    pacConsumption: 29.1, carbonConsumption: 22.5,
    overallOperationEvaluation: '运行状态稳定，各项控制指标符合阶段目标。',
    createdBy: '林佳', createdTime: '2026-04-05 09:15:00'
  }
];

const projectOperationRows = projectRows.map((row, index) => {
  const [technicalOwner, implementationStaff, aiOsConfig, algorithmEngineer, aiOsAddress, controlStrategy, salesOwner, processOwner, automationOwner] = operationAssignments[index];
  return {
    ...row,
    projectManager: row.manager,
    technicalOwner,
    technicalOwners: technicalOwner.split('/'),
    implementationStaff,
    implementationPersonnel: implementationStaff.split('/'),
    aiOsConfig,
    aiOsConfigPersonnel: index % 2 === 0 ? ['赵工', '钱工'] : ['钱工'],
    aiOsConfigPersonnelDisplay: index % 2 === 0 ? '赵工、钱工' : '钱工',
    algorithmEngineer,
    algorithmEngineers: [algorithmEngineer],
    aiOsAddress,
    deployedAgents: index % 3 === 0 ? [row.aiOs, '加碳智能体'] : [row.aiOs],
    controlStrategy,
    intelligentControlStartTime: row.projectStatus === '未控制' ? '' : row.startTime.slice(0, 10),
    intelligentControlEndTime: row.endTime.slice(0, 10),
    remainingUsageTime: row.remainTime,
    effluentCod: row.cod,
    effluentAmmonia: row.nh3,
    effluentTn: row.tn,
    effluentTp: row.tp,
    salesOwner,
    processOwner,
    automationOwner,
    controlEffects: index === 0 ? controlEffectSamples : index === 1 ? [controlEffectSamples[1]] : []
  };
});

const operationRows = [
  ['PMS2024001', '广州水厂', 5, 5, '在线', '192.168.1.101', '8080', '10.0.0.101', '9090', '245天', '2026-05-07 10:30:00'],
  ['PMS2024002', '深圳水厂', 6, 4, '在线', '192.168.1.102', '8081', '10.0.0.102', '9091', '180天', '2026-05-07 09:15:00'],
  ['PMS2024003', '东莞水厂', 0, 8, '离线', '192.168.1.103', '8082', '10.0.0.103', '9092', '90天', '2026-05-06 18:20:00'],
  ['PMS2024004', '杭州水厂', 7, 3, '在线', '192.168.2.101', '8083', '10.0.0.104', '9093', '300天', '2026-05-07 08:45:00'],
  ['PMS2024005', '苏州水厂', 2, 8, '离线', '192.168.2.102', '8084', '10.0.0.105', '9094', '60天', '2026-05-06 14:10:00'],
  ['PMS2024006', '南京水厂', 6, 4, '在线', '192.168.2.103', '8085', '10.0.0.106', '9095', '150天', '2026-05-07 11:00:00'],
  ['PMS2024007', '青岛水厂', 1, 7, '离线', '192.168.3.101', '8086', '10.0.0.107', '9096', '30天', '2026-05-05 16:30:00'],
  ['PMS2024008', '济南水厂', 8, 2, '在线', '192.168.3.102', '8087', '10.0.0.108', '9097', '200天', '2026-05-07 10:00:00'],
  ['PMS2024009', '福州水厂', 5, 3, '在线', '192.168.4.101', '8088', '10.0.0.109', '9098', '400天', '2026-05-07 09:30:00'],
  ['PMS2024010', '厦门水厂', 0, 12, '离线', '192.168.4.102', '8089', '10.0.0.110', '9099', '15天', '2026-05-04 12:00:00'],
  ['PMS2024011', '长沙水厂', 7, 3, '在线', '192.168.5.101', '8090', '10.0.0.111', '9100', '100天', '2026-05-07 08:00:00'],
  ['PMS2024012', '武汉水厂', 0, 6, '未知', '192.168.5.102', '8091', '10.0.0.112', '9101', '50天', '2026-05-07 07:30:00']
].map(([projectCode, projectName, controlledCount, uncontrolledCount, status, serverAddress, vpnPort, aiOsIp, accessPort, remainTime, lastCheckTime]) => ({
  projectCode, projectName, controlledCount, uncontrolledCount, status, serverAddress, vpnPort, aiOsIp, accessPort, remainTime, lastCheckTime
}));

const agentStatusRows = [
  ['曝气智能体', '控制', '2024-01-15 08:30:00', 'PMS2024001', '广州水务智能控制项目', 'C001', '广州水务集团'],
  ['加药智能体', '未控制', '', 'PMS2024002', '深圳污水处理厂智能改造', 'C002', '深圳环保科技'],
  ['加碳智能体', '未知', '', 'PMS2024003', '东莞印染废水处理项目', 'C003', '东莞印染集团'],
  ['曝气智能体', '控制', '2024-02-01 08:00:00', 'PMS2024004', '杭州水务智能控制项目', 'C004', '杭州水务集团'],
  ['沉淀智能体', '控制', '2024-04-10 09:30:00', 'PMS2024005', '苏州工业园区污水处理', 'C005', '苏州工业园区管理会'],
  ['加药智能体', '未知', '', 'PMS2024006', '南京污水处理升级项目', 'C006', '南京水务科技'],
  ['过滤智能体', '控制', '2024-02-15 08:30:00', 'PMS2024007', '青岛海水淡化项目', 'C007', '青岛水务集团'],
  ['消毒智能体', '未控制', '', 'PMS2024008', '济南供水智能化改造', 'C008', '济南供水公司'],
  ['曝气智能体', '控制', '2024-05-20 08:00:00', 'PMS2024009', '福州排水系统优化', 'C009', '福州排水管理处'],
  ['加药智能体', '未控制', '', 'PMS2024010', '厦门污水处理提标项目', 'C010', '厦门环保集团'],
  ['污泥处理智能体', '控制', '2024-04-01 08:30:00', 'PMS2024011', '长沙污水处理项目', 'C011', '长沙水务投资'],
  ['曝气智能体', '未知', '', 'PMS2024012', '武汉城市污水处理', 'C012', '武汉水务集团'],
  ['加药智能体', '控制', '2024-08-01 08:00:00', 'PMS2024013', '成都污水处理厂扩建', 'C013', '成都排水公司'],
  ['过滤智能体', '控制', '2024-02-01 10:00:00', 'PMS2024001', '广州水务智能控制项目', 'C001', '广州水务集团'],
  ['消毒智能体', '控制', '2024-03-15 08:30:00', 'PMS2024005', '苏州工业园区污水处理', 'C005', '苏州工业园区管理会'],
  ['沉淀智能体', '未控制', '', 'PMS2024010', '厦门污水处理提标项目', 'C010', '厦门环保集团'],
  ['污泥处理智能体', '未知', '', 'PMS2024008', '济南供水智能化改造', 'C008', '济南供水公司'],
  ['加碳智能体', '控制', '2024-07-15 10:30:00', 'PMS2024011', '长沙污水处理项目', 'C011', '长沙水务投资'],
  ['曝气智能体', '未控制', '', 'PMS2024003', '东莞印染废水处理项目', 'C003', '东莞印染集团'],
  ['加药智能体', '控制', '2024-04-20 09:00:00', 'PMS2024012', '武汉城市污水处理', 'C012', '武汉水务集团']
].map(([agentName, status, controlStartTime, projectCode, projectName, customerCode, customerName], index) => ({
  id: index + 1, agentName, status, controlStartTime, projectCode, projectName, customerCode, customerName
}));

const projectOverview = {
  ...base,
  pageCode: 'agent-operation-analysis',
  pageName: '智能体运营分析',
  menuPath: '报表管理/智能体运营分析',
  template: 'list-detail-page',
  pageType: 'list-detail',
  outputPath: 'pages/project-overview.html',
  businessScenario: '按项目查看运营信息，并由售后服务人员按评估周期新增和维护控制效果指标。',
  resourceReference: resourceReference(['ProSearchForm', 'ProTable', 'EditableTable', 'Tag', 'Popconfirm', 'ProTabsDetail', 'DetailForm', 'Upload', 'ProModalForm']),
  deleteConfirmationEnabled: true,
  primaryListReadOnly: true,
  primaryListSelectionAllowed: true,
  detailReadOnly: true,
  detailEditableStatuses: ['草稿', '已控制', '部署中', '未控制', '已到期'],
  saveDraftEnabled: false,
  detailSaveEnabled: false,
  detailSubmitEnabled: false,
  uiConstraints: {
    listPageSize: 5,
    detailFormColumns: 3,
    tabSectionTitles: false,
    effectCardsPerRow: 1,
    effectMetricColumns: 3
  },
  detailOnlyFields: [
    'evaluationStartDate', 'evaluationEndDate', 'waterEnergy', 'blowerEnergy', 'ammoniaRemovalEnergy',
    'codRemovalEnergy', 'pacConsumption', 'carbonConsumption', 'overallOperationEvaluation', 'createdBy', 'createdTime'
  ],
  pageActions: [{ code: 'open-control-time-adjustment', label: '智控时间调整', type: 'primary', icon: 'fa-calendar-days', target: 'control-time-adjustment-modal', requiresSingleSelection: true }],
  regions: [
    {
      id: 'operation-search',
      component: 'ProSearchForm',
      collapsible: false,
      fields: [
        { code: 'projectName', label: '项目名称', component: 'input', placeholder: '请输入项目名称' },
        { code: 'projectStatus', label: '项目状态', component: 'select', placeholder: '全部', options: ['部署中', '未控制', '已控制', '已到期'] }
      ]
    },
    {
      id: 'operation-table',
      component: 'ProTable',
      pageSize: 5,
      selectable: true,
      keepOperationColumn: true,
      operationColumnWidth: 104,
      rowActions: [{ code: 'view', label: '详情', type: 'link', icon: 'fa-eye' }],
      columns: [
        { code: 'projectName', label: '项目名称', component: 'text', width: 220, fixed: 'left' },
        { code: 'region', label: '区域', component: 'text', width: 112, align: 'center' },
        { code: 'scale', label: '运营规模（万吨/日）', component: 'number', width: 168 },
        { code: 'projectStatus', label: '项目状态', component: 'tag', width: 104 },
        { code: 'projectManager', label: '项目经理', component: 'text', width: 112 },
        { code: 'technicalOwner', label: '技术负责人', component: 'text', width: 120 },
        { code: 'implementationStaff', label: '实施人员', component: 'text', width: 152 },
        { code: 'aiOsConfigPersonnelDisplay', label: 'AI-OS配置人员', component: 'text', width: 152 },
        { code: 'algorithmEngineer', label: '算法工程师', component: 'text', width: 120 },
        { code: 'salesOwner', label: '销售负责人', component: 'text', width: 120 },
        { code: 'intelligentControlStartTime', label: '控制开始时间', component: 'date', format: 'date', width: 152, sortable: true }
      ],
      rows: projectOperationRows
    },
    {
      id: 'operation-detail',
      component: 'ProTabsDetail',
      tabs: [
        {
          key: 'basic', label: '基础信息',
          children: [
            {
              id: 'operation-basic-form',
              component: 'DetailForm',
              layoutColumns: 3,
              flushCard: true,
              showTitle: false,
              fields: [
                { code: 'projectCode', label: '项目编码', component: 'input', readonly: true },
                { code: 'projectName', label: '项目名称', component: 'input', readonly: true },
                { code: 'region', label: '区域', component: 'input', readonly: true },
                { code: 'scale', label: '运营规模（万吨/日）', component: 'input', readonly: true },
                { code: 'projectStatus', label: '项目状态', component: 'input', readonly: true },
                { code: 'waterType', label: '污水类型', component: 'input', readonly: true },
                { code: 'bioProcess', label: '生化工艺', component: 'input', readonly: true },
                { code: 'standard', label: '排放标准', component: 'input', readonly: true },
                { code: 'effluentCod', label: '出水COD（mg/L）', component: 'input', readonly: true },
                { code: 'effluentAmmonia', label: '出水氨氮（mg/L）', component: 'input', readonly: true },
                { code: 'effluentTn', label: '出水总氮（mg/L）', component: 'input', readonly: true },
                { code: 'effluentTp', label: '出水总磷（mg/L）', component: 'input', readonly: true },
                { code: 'customerCode', label: '客户编码', component: 'input', readonly: true },
                { code: 'customerName', label: '客户名称', component: 'input', readonly: true },
                { code: 'owner', label: '业主单位', component: 'input', readonly: true },
                { code: 'operator', label: '运营单位', component: 'input', readonly: true }
              ]
            }
          ]
        },
        {
          key: 'team-config', label: '团队&配置',
          children: [
            {
              id: 'operation-team-form', component: 'DetailForm', layoutColumns: 3, flushCard: true, showTitle: false,
              fields: [
                { code: 'projectManager', label: '项目经理', component: 'input', readonly: true },
                { code: 'salesOwner', label: '销售负责人', component: 'input', readonly: true },
                { code: 'technicalOwners', label: '技术负责人', component: 'multi-select', options: ['张明', '李华', '王芳', '刘伟', '陈静'] },
                { code: 'implementationPersonnel', label: '实施人员', component: 'multi-select', options: ['李涛', '王磊', '赵凯', '陈晨', '刘洋', '孙强'] },
                { code: 'aiOsConfigPersonnel', label: 'AI-OS配置人员', component: 'multi-select', options: ['赵工', '钱工', '孙工', '周工'] },
                { code: 'algorithmEngineers', label: '算法工程师', component: 'multi-select', options: ['周杰', '吴迪', '郑峰', '胡睿', '蒋宁'] }
              ]
            },
            {
              id: 'operation-config-form', component: 'DetailForm', layoutColumns: 3, flushCard: true, dividerTop: true, showTitle: false,
              fields: [
                { code: 'aiOsAddress', label: 'AI-OS地址', component: 'input' },
                { code: 'deployedAgents', label: '已部署智能体', component: 'multi-select', readonly: true, displayOnly: true, options: ['曝气智能体', '加药智能体', '加碳智能体', '除磷智能体', '厂网协同智能体'] },
                { code: 'intelligentControlStartTime', label: '智控开始时间', component: 'date', required: true },
                { code: 'intelligentControlEndTime', label: '智控结束时间', component: 'date', required: true },
                { code: 'remainingUsageTime', label: '剩余使用时长', component: 'input', readonly: true }
              ]
            }
          ]
        }
      ]
    }
  ],
  overlays: [
    {
      id: 'control-time-adjustment-modal',
      component: 'ProModalForm',
      title: '智控时间调整',
      layoutColumns: 1,
      fields: [
        { code: 'adjustedControlStartTime', label: '智控开始时间', component: 'date', required: true },
        { code: 'adjustedControlEndTime', label: '智控结束时间', component: 'date', required: true }
      ],
      actions: [
        { code: 'close', label: '取消' },
        { code: 'confirm-control-time-adjustment', label: '确定', type: 'primary', icon: 'fa-check' }
      ]
    }
  ]
};

// 控制效果作为项目详情的独立页签维护；主列表只保留详情入口。
const operationDetailRegion = projectOverview.regions.find((region) => region.id === 'operation-detail');
const controlEffectDetailTable = {
  id: 'control-effect-detail-table',
  component: 'EditableTable',
  displayMode: 'cards',
  cardsPerRow: 1,
  metricColumns: 3,
  flushCard: true,
  dividerTop: true,
  showTitle: false,
  dataSource: 'controlEffects',
  trendChart: {
    enabled: true,
    defaultMetric: 'waterEnergy',
    defaultType: 'bar',
    exportFormat: 'png'
  },
  rows: [],
  emptyDescription: '暂无控制效果记录',
  actions: [{ code: 'add-effect-card', label: '新增控制效果', type: 'primary', icon: 'fa-plus' }],
  dateFields: [
    { code: 'evaluationStartDate', label: '开始日期', component: 'date', required: true },
    { code: 'evaluationEndDate', label: '结束日期', component: 'date', required: true }
  ],
  metrics: [
    { code: 'waterEnergy', label: '吨水电耗', unit: 'kWh/m³' },
    { code: 'blowerEnergy', label: '吨水风机电耗', unit: 'kWh/m³' },
    { code: 'ammoniaRemovalEnergy', label: '去除单位氨氮电耗', unit: 'kWh/kg' },
    { code: 'codRemovalEnergy', label: '去除单位COD电耗', unit: 'kWh/kg' },
    { code: 'pacConsumption', label: '吨水PAC药耗', unit: 'kg/千吨水' },
    { code: 'carbonConsumption', label: '吨水碳源药耗', unit: 'kg/千吨水' }
  ],
  evaluationField: { code: 'overallOperationEvaluation', label: '整体运行效果评估', component: 'textarea', required: true },
  auditFields: [
    { code: 'createdBy', label: '新增人员' },
    { code: 'createdTime', label: '新增时间' }
  ],
  columns: [
    { code: 'evaluationStartDate', label: '开始日期', component: 'date', required: true },
    { code: 'evaluationEndDate', label: '结束日期', component: 'date', required: true },
    { code: 'waterEnergy', label: '吨水电耗', component: 'number', required: true },
    { code: 'blowerEnergy', label: '吨水风机电耗', component: 'number', required: true },
    { code: 'ammoniaRemovalEnergy', label: '去除单位氨氮电耗', component: 'number', required: true },
    { code: 'codRemovalEnergy', label: '去除单位COD电耗', component: 'number', required: true },
    { code: 'pacConsumption', label: '吨水PAC药耗', component: 'number', required: true },
    { code: 'carbonConsumption', label: '吨水碳源药耗', component: 'number', required: true },
    { code: 'overallOperationEvaluation', label: '整体运行效果评估', component: 'text', required: true },
    { code: 'createdBy', label: '新增人员', component: 'text', readonly: true },
    { code: 'createdTime', label: '新增时间', component: 'text', readonly: true }
  ]
};
operationDetailRegion.tabs.push({
  key: 'effect',
  label: '控制效果',
  children: [
    {
      id: 'operation-effect-summary-form', component: 'DetailForm', layoutColumns: 3, flushCard: true, showTitle: false,
      fields: [
        { code: 'controlStrategy', label: '控制策略', component: 'textarea', span: 3 },
        { code: 'acceptanceReport', label: '验收报告', component: 'upload', actionLabel: '上传附件', span: 3 }
      ]
    },
    controlEffectDetailTable
  ]
});

const agentMonitor = {
  ...base,
  pageCode: 'agent-run-monitor',
  pageName: '智能体运行监控',
  menuPath: '报表管理/智能体运行监控',
  template: 'dashboard-page',
  outputPath: 'pages/agent-monitor.html',
  businessScenario: '监控各项目智能体在线状态、控制数量、授权余量和最近检测时间。',
  resourceReference: resourceReference(['ProSearchForm', 'ProMonitorCardGrid', 'Tag', 'ProModalForm', 'Form']),
  pageActions: [],
  regions: [
    {
      id: 'monitor-search',
      component: 'ProSearchForm',
      fields: [
        { code: 'projectKeyword', label: '项目编码或名称', component: 'input', filterCodes: ['projectCode', 'projectName'] },
        { code: 'status', label: '运行状态', component: 'select', options: ['在线', '离线', '未知'] }
      ]
    },
    {
      id: 'monitor-card-grid',
      component: 'ProMonitorCardGrid',
      pageSize: 4,
      detailNavigation: { path: 'agent-monitor-detail.html', pageName: '智能体运行详情', queryMap: { code: 'projectCode' } },
      cardActions: [
        { code: 'vpn', label: 'VPN配置', target: 'vpn-modal' },
        { code: 'exception', label: '离线原因', target: 'exception-modal' },
        { code: 'detect', label: '检测' }
      ],
      rows: operationRows
    }
  ],
  overlays: [
    {
      id: 'exception-modal',
      component: 'ProModalForm',
      title: '异常记录',
      fields: [
        { code: 'offlineTime', label: '最近离线时间', component: 'input', readonly: true, value: '2026-05-06 14:10:00' },
        { code: 'reason', label: '离线原因', component: 'input', readonly: true, value: 'VPN链路中断或服务器无响应' },
        { code: 'recoverTime', label: '恢复时间', component: 'input', readonly: true, value: '待恢复' }
      ],
      actions: [{ code: 'close', label: '关闭' }]
    },
    {
      id: 'vpn-modal',
      component: 'ProModalForm',
      title: 'VPN配置',
      fields: [
        { code: 'serverAddress', label: '服务器地址', component: 'input', value: '192.168.1.101' },
        { code: 'vpnPort', label: 'VPN端口', component: 'input', value: '8080' },
        { code: 'loginAccount', label: '登录账号', component: 'input', value: 'admin' },
        { code: 'loginPassword', label: '登录密码', component: 'input', value: '******' },
        { code: 'aiOsIp', label: 'AI-OS IP', component: 'input', value: '10.0.0.101' },
        { code: 'accessPort', label: '访问端口', component: 'input', value: '9090' }
      ],
      actions: [{ code: 'close', label: '取消' }, { code: 'submit', label: '保存', type: 'primary' }]
    }
  ]
};

const agentStatusMonitor = {
  ...base,
  pageCode: 'agent-status-monitor',
  pageName: '智能体状态监控',
  menuPath: '报表管理/智能体状态监控',
  template: 'dashboard-page',
  outputPath: 'pages/agent-status-monitor.html',
  businessScenario: '按智能体和项目查看控制状态、控制开始时间及客户归属。',
  resourceReference: resourceReference(['ProSearchForm', 'ProStatCard', 'ProTable', 'Tag']),
  pageActions: [],
  regions: [
    {
      id: 'status-search',
      component: 'ProSearchForm',
      fields: [
        { code: 'keyword', label: '智能体名称或项目名称', component: 'input', filterCodes: ['agentName', 'projectName'] },
        { code: 'status', label: '控制状态', component: 'select', options: ['控制', '未控制', '未知'] }
      ]
    },
    {
      id: 'status-stats',
      component: 'ProStatCard',
      items: [
        { label: '智能体总数', value: '20', meta: '覆盖 13 个项目' },
        { label: '控制中', value: '11', meta: '控制率 55%' },
        { label: '未控制', value: '5', meta: '需确认启用计划' },
        { label: '未知状态', value: '4', meta: '等待状态同步' }
      ]
    },
    {
      id: 'status-table',
      component: 'ProTable',
      title: '智能体控制明细',
      pageSize: 5,
      selectable: false,
      rowActions: [],
      columns: [
        { code: 'agentName', label: '智能体名称', component: 'text', width: 176 },
        { code: 'status', label: '控制状态', component: 'tag', width: 104 },
        { code: 'controlStartTime', label: '控制开始时间', component: 'datetime', width: 168 },
        { code: 'projectCode', label: '项目编码', component: 'text', width: 176 },
        { code: 'projectName', label: '项目名称', component: 'text', width: 220 },
        { code: 'customerCode', label: '客户编码', component: 'text', width: 128 },
        { code: 'customerName', label: '客户名称', component: 'text', width: 200 }
      ],
      rows: agentStatusRows
    }
  ]
};

writeJson('schemas/pages/report/agent-operation-analysis.json', projectOverview);
writeJson('schemas/pages/report/agent-run-monitor.json', agentMonitor);
writeJson('schemas/pages/report/agent-status-monitor.json', agentStatusMonitor);

console.log('Report monitor schemas generated.');
