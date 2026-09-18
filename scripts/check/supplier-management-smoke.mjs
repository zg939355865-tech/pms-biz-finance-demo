import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '../lib/playwright-smoke.mjs';

const htmlPath = process.argv[2] || 'pages/supplier.html';
const absolutePath = path.resolve(htmlPath);
const reportDir = path.resolve('outputs/reports/visual/master-data');
fs.mkdirSync(reportDir, { recursive: true });

const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
page.setDefaultTimeout(5000);
const errors = [];
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
const expect = (condition, message) => { if (!condition) errors.push(message); };
const same = (actual, expected, message) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) errors.push(`${message}: ${JSON.stringify(actual)}`);
};

await page.goto(pathToFileURL(absolutePath).href, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(250);
await page.evaluate(() => {
  window.__supplierMessages = [];
  const original = window.EAMPage?.message;
  window.EAMPage.message = (message, type) => {
    window.__supplierMessages.push(String(message));
    if (original) original.call(window.EAMPage, message, type);
  };
});

const list = page.locator('[data-page-view="list"]');
const detail = page.locator('[data-page-view="detail"]');
const table = list.locator('#supplier-table');
expect(await list.isVisible(), '供应商列表未显示');
expect(await table.locator('tbody > tr[data-row-value]').count() === 12, '供应商样例数据应为12条');
expect(await table.locator('tbody > tr[data-row-value]:visible').count() === 5, '供应商首屏必须固定显示5条');
expect((await list.locator('[data-record-count]').textContent())?.trim() === '共 12 条记录', '供应商总记录数不正确');
expect(await list.locator('.pro-table-footer select').count() === 0, '列表不应出现分页条数选择器');
expect(await list.locator('[data-column="status"]').count() === 0, '供应商列表不应保留启用停用状态');
same(await list.locator('#supplier-search .form-label').allTextContents().then((labels) => labels.map((label) => label.trim())), ['供应商编码或名称', '供应商分类', '供应商等级'], '查询字段顺序不匹配');
same(await table.locator('thead th').allTextContents().then((labels) => labels.map((label) => label.trim()).filter((label) => label && label !== '操作')), ['供应商编码', '供应商名称', '供应商简称', '供应商分类', '供应商等级', '创建人', '创建时间'], '列表字段顺序不匹配');
expect(await list.locator('[data-field="admissionCompany"], [data-column="admissionCompaniesText"]').count() === 0, '列表及查询不应保留准入公司');

await list.locator('[data-field="supplierLevel"]').selectOption('A');
await list.locator('[data-act="query"]').click();
expect((await list.locator('[data-record-count]').textContent())?.trim() === '共 4 条记录', '按供应商等级筛选不正确');
await list.locator('[data-act="reset"]').click();
await list.locator('[data-field="supplierKeyword"]').fill('SUP00018');
await list.locator('[data-act="query"]').click();
expect((await list.locator('[data-record-count]').textContent())?.trim() === '共 1 条记录', '供应商编码查询不正确');
await list.locator('[data-act="reset"]').click();

await table.locator('[data-column="supplierCode"] a[data-act="edit"]').first().click();
expect(await detail.isVisible(), '供应商详情未显示');
same(await detail.locator('[data-tab]').allTextContents().then((labels) => labels.map((label) => label.trim())), ['基础信息', '财务信息', '银行信息', '联系人'], '详情页签顺序不匹配');
expect(await detail.locator('[data-field="company"]').count() === 1, '所属公司字段应且仅应出现一次');
expect(await detail.locator('[data-field="unifiedSocialCreditCode"]').getAttribute('required') === null, '统一社会信用代码不应必填');
expect(await detail.locator('[data-field="admissionCompanies"]').count() === 0, '基础信息不应保留准入公司');
expect(await detail.locator('[data-field="supplierLevel"]').getAttribute('required') !== null, '供应商等级应必填');
same(await detail.locator('[data-tab-panel="basic-info"] .form-label').allTextContents().then((labels) => labels.map((label) => label.trim())), ['供应商编码', '供应商名称', '供应商简称', '供应商类型', '供应商等级', '供应商分类', '统一社会信用代码', '法定代表人', '注册地址', '经营地址', '创建人', '创建时间', '更新人', '更新时间', '所属公司', '备注'], '基础信息字段顺序不匹配');
expect(await detail.locator('[data-field="status"]').count() === 0, '基础信息不应保留供应商启用停用状态');

await detail.locator('[data-tab="finance-info"]').click();
expect(await detail.locator('[data-field="financeSupplierCode"]').isDisabled(), '财务供应商编码应为财务系统回传只读字段');
same(await detail.locator('[data-tab-panel="finance-info"] .form-label').allTextContents().then((labels) => labels.map((label) => label.trim())), ['财务供应商编码', '发票类型', '结算币别', '付款方式', '账期（天）'], '财务信息字段顺序不匹配');
expect(await detail.locator('[data-field="taxpayerName"], [data-field="taxpayerId"], [data-field="invoiceAddress"], [data-field="invoicePhone"]').count() === 0, '财务信息仍包含已移除字段');
expect(!await detail.locator('[data-field="settlementCurrency"]').isDisabled(), '结算币别应支持下拉选择');
expect(await detail.locator('[data-field="settlementCurrency"]').inputValue() === 'CNY', '结算币别默认值应为CNY');
same(await detail.locator('[data-field="paymentTermDays"] option:not([value=""])').allTextContents(), ['0', '30', '60', '90', '120'], '账期选项不匹配');
await page.screenshot({ path: path.join(reportDir, 'supplier-detail-finance.png'), fullPage: true });
await detail.locator('[data-tab="bank-info"]').click();
expect(await detail.locator('[data-data-source="bankAccounts"] tbody > tr[data-row-value]').count() === 2, '银行信息未按供应商带出');
same(await detail.locator('[data-data-source="bankAccounts"] thead th').allTextContents().then((labels) => labels.map((label) => label.trim()).filter((label) => label && !['序号', '操作'].includes(label))), ['开户银行', '银行账号', '账户名称', '国家', '账户币别'], '银行信息字段顺序不匹配');
await detail.locator('[data-data-source="bankAccounts"] [data-act="add-row"]').click();
const newBankRow = detail.locator('[data-data-source="bankAccounts"] tbody > tr[data-new-row="true"]').first();
expect(await newBankRow.locator('[data-field="country"]').inputValue() === '中国', '新增银行账户国家默认值不是中国');
expect(await newBankRow.locator('[data-field="accountCurrency"]').inputValue() === 'CNY', '新增银行账户币别默认值不是CNY');
await page.screenshot({ path: path.join(reportDir, 'supplier-detail-bank.png'), fullPage: true });
await detail.locator('[data-tab="contacts"]').click();
expect(await detail.locator('[data-data-source="contacts"] tbody > tr[data-row-value]').count() === 2, '联系人信息未按供应商带出');
same(await detail.locator('[data-data-source="contacts"] thead th').allTextContents().then((labels) => labels.map((label) => label.trim()).filter((label) => label && !['序号', '操作'].includes(label))), ['联系人', '职务', '手机号码', '固定电话', '邮箱'], '联系人字段顺序不匹配');
await page.screenshot({ path: path.join(reportDir, 'supplier-detail-contacts.png'), fullPage: true });
await detail.locator('.schema-detail-header [data-act="back-list"]').click();

await list.locator('[data-act="create"]').click();
await detail.locator('[data-field="supplierCode"]').fill('SUP00018');
await detail.locator('[data-act="submit"]').click();
expect(await detail.isVisible(), '集团范围内编码重复时不应提交返回列表');
expect(await page.evaluate(() => window.__supplierMessages.some((message) => message.includes('供应商编码在集团范围内不能重复'))), '未触发集团范围内供应商编码唯一性校验');

await detail.locator('[data-field="supplierCode"]').fill('SUP00999');
await detail.locator('[data-field="supplierName"]').fill('原型验证供应商');
await detail.locator('[data-field="shortName"]').fill('原型验证');
await detail.locator('[data-field="supplierType"]').selectOption('企业');
await detail.locator('[data-field="supplierLevel"]').selectOption('A');
await detail.locator('[data-field="supplierCategory"]').selectOption('服务供应商');
await detail.locator('[data-tab="finance-info"]').click();
await detail.locator('[data-field="invoiceType"]').selectOption('普票');
await detail.locator('[data-field="paymentMethod"]').selectOption('电汇');
await detail.locator('[data-act="submit"]').click();
expect(await detail.isVisible(), '未维护银行和联系人时不应提交返回列表');
expect(await page.evaluate(() => window.__supplierMessages.some((message) => message.includes('至少维护一条银行账户'))), '未触发银行账户必填校验');

await detail.locator('[data-tab="basic-info"]').click();
await page.screenshot({ path: path.join(reportDir, 'supplier-detail-basic.png'), fullPage: true });
await detail.locator('.schema-detail-header [data-act="back-list"]').click();
await page.screenshot({ path: path.join(reportDir, 'supplier-list.png'), fullPage: true });
for (const width of [1440, 2048]) {
  await page.setViewportSize({ width, height: 1000 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(!overflow, `${width}px视口出现页面级横向滚动`);
}

await browser.close();
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('Supplier management smoke passed.');
