import { writeJson } from '../lib/file-utils.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');

const profileTemplates = {
  'auditable-list-detail': {
    policyProfile: 'auditable-list-detail',
    pageType: 'list-detail',
    template: 'tabs-detail-page',
    workflowActions: false,
    saveDraftEnabled: false,
    detailSaveEnabled: false,
    detailSubmitEnabled: true,
    detailReviewEnabled: false,
    detailWorkflowLinksEnabled: false,
    detailEditableStatuses: ['待审核'],
    pageActions: [
      { code: 'audit', label: '审核', requiresSingleSelection: true, enabledSelectionStatuses: ['待审核'], nextStatus: '已审核' },
      { code: 'reverse-audit', label: '反审核', requiresSingleSelection: true, enabledSelectionStatuses: ['已审核'], nextStatus: '待审核' }
    ]
  },
  'workflow-list-detail': {
    policyProfile: 'workflow-list-detail',
    pageType: 'list-detail',
    template: 'tabs-detail-page',
    workflowActions: true,
    saveDraftEnabled: true,
    detailSaveEnabled: true,
    detailSubmitEnabled: true,
    detailReviewEnabled: true,
    detailWorkflowLinksEnabled: true,
    detailEditableStatuses: ['草稿', '退回']
  },
  'list-only': {
    policyProfile: 'standard-list',
    pageType: 'list',
    template: 'list-page',
    workflowActions: false,
    saveDraftEnabled: false
  }
};

const schemaTemplate = {
  schemaVersion: 'pms-page-schema-v2',
  policyVersion: 'pms-policy-v1',
  pageCode: '',
  pageName: '',
  domain: '',
  module: '',
  menuPath: '',
  outputPath: '',
  businessScenario: '',
  uiConstraints: {
    listPageSize: 5,
    detailFormColumns: 3,
    noPageSizeSelector: true,
    desktopOnly: true,
    noBusinessPageVerticalScroll: true
  },
  resourceReference: {
    center: 'prototype-resources/index.html',
    baseline: 'pms-resource-center-v1',
    pageSamples: ['列表详情一体', '业务表单'],
    components: ['PageHeader', 'ProSearchForm', 'ProTable', 'ProTabsDetail', 'DetailForm', 'EditableTable', 'Tag']
  },
  regions: [
    {
      id: 'search',
      component: 'ProSearchForm',
      collapsible: false,
      fields: []
    },
    {
      id: 'table',
      component: 'ProTable',
      dataSource: 'list',
      pageSize: 5,
      selectable: true,
      keepOperationColumn: false,
      rowActions: [],
      columns: []
    },
    {
      id: 'detail',
      component: 'ProTabsDetail',
      tabs: [
        {
          key: 'basic',
          label: '基础信息',
          children: [
            {
              id: 'basic-form',
              component: 'DetailForm',
              showTitle: false,
              layoutColumns: 3,
              fields: []
            }
          ]
        }
      ]
    }
  ],
  mockData: {
    list: [],
    detail: {}
  }
};

function generateSchema(pageName, domain, module, profileType) {
  const pageCode = pageName.toLowerCase().replace(/[\s　]+/g, '-').replace(/[^\w一-龥-]/g, '');
  const template = profileTemplates[profileType] || profileTemplates['auditable-list-detail'];

  const schema = {
    ...schemaTemplate,
    pageCode,
    pageName,
    domain: domain || 'cost',
    module: module || '',
    menuPath: `${module || domain}/${pageName}`,
    outputPath: `pages/${domain}/${pageCode}.html`,
    ...template
  };

  return schema;
}

// CLI usage
const args = process.argv.slice(2);
const pageName = args[0];
const domain = args[1] || 'cost';
const module = args[2] || '';
const profileType = args[3] || 'auditable-list-detail';

if (!pageName) {
  console.log('Usage: node scripts/generate/schema-init.mjs <page-name> [domain] [module] [profile-type]');
  console.log('');
  console.log('Profile types:');
  console.log('  auditable-list-detail - 可审核列表详情页（默认）');
  console.log('  workflow-list-detail  - 流程列表详情页');
  console.log('  list-only             - 仅列表页');
  console.log('');
  console.log('Examples:');
  console.log('  npm run schema:init -- "价差确认" cost 成本核算 auditable-list-detail');
  console.log('  npm run schema:init -- "采购订单" procurement 采购管理 workflow-list-detail');
  process.exit(1);
}

const schema = generateSchema(pageName, domain, module, profileType);
const outputPath = path.join(projectRoot, 'schemas', 'pages', domain, `${schema.pageCode}.json`);

writeJson(outputPath, schema);
console.log(`Schema generated: ${outputPath}`);
console.log(`Next steps:`);
console.log(`  1. Edit schema fields in: schemas/pages/${domain}/${schema.pageCode}.json`);
console.log(`  2. Run: npm run verify:quick -- schemas/pages/${domain}/${schema.pageCode}.json`);
console.log(`  3. Run: npm run verify:full -- schemas/pages/${domain}/${schema.pageCode}.json`);
