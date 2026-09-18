import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '../lib/playwright-smoke.mjs';

const errors = [];
const expect = (condition, message) => { if (!condition) errors.push(message); };
const reportDir = path.resolve('outputs/reports/visual/cost');
fs.mkdirSync(reportDir, { recursive: true });

const cases = [
  {
    code: 'project', page: 'pages/cost/project-cost-analysis.html', title: '项目成本', table: '#project-cost-table', search: '#project-cost-search',
    identifier: 'projectCode', expectedIdentifier: 'PRJ2026001', drawer: '[data-overlay="project-cost-drawer"]', drawerName: '华中智能工厂一期',
    descriptionCode: 'projectCode', detailTable: '#project-source-detail-table', filterField: 'costCategory', filterValue: '成本调整'
  },
  {
    code: 'department', page: 'pages/cost/department-cost-analysis.html', title: '部门成本', table: '#department-cost-table', search: '#department-cost-search',
    identifier: 'departmentCode', expectedIdentifier: 'D001', drawer: '[data-overlay="department-cost-drawer"]', drawerName: '项目交付部',
    descriptionCode: 'departmentCode', detailTable: '#department-source-detail-table', filterField: 'costCategory', filterValue: '成本调整'
  }
];
const requestedCase = process.argv[2];
const activeCases = requestedCase ? cases.filter((item) => item.code === requestedCase) : cases;
if (requestedCase && !activeCases.length) throw new Error(`未知成本分析检查范围: ${requestedCase}`);

const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
try {
  for (const testCase of activeCases) {
    for (const width of [1440, 2048]) {
      const page = await browser.newPage({ viewport: { width, height: 1100 } });
      page.setDefaultTimeout(10000);
      page.on('pageerror', (error) => errors.push(`${testCase.code}@${width}: ${error.message}`));
      await page.route(/^https?:/, (route) => route.abort());
      await page.goto(pathToFileURL(path.resolve(testCase.page)).href, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(350);

      const table = page.locator(testCase.table);
      const search = page.locator(testCase.search);
      const visibleRows = table.locator('tbody > tr:visible:not([data-filter-empty-row])');
      expect((await page.locator('h1').first().innerText()).trim() === testCase.title, `${testCase.code}@${width}: 页面标题错误`);
      expect(await page.locator('.pro-chart-body[data-chart-type="donut"]').count() === 0, `${testCase.code}@${width}: 仍显示成本构成图`);
      expect(await page.locator('.pro-chart-body[data-chart-type="line"],.pro-chart-body[data-chart-type="bar"]').count() === 1, `${testCase.code}@${width}: 对比或趋势图未生成`);
      expect(await page.locator('.pro-chart-body .pro-chart-empty').count() === 0, `${testCase.code}@${width}: 仍显示图表占位符`);
      expect(await visibleRows.count() === 5, `${testCase.code}@${width}: 首屏不是固定5行`);
      expect((await table.locator('[data-record-count]').innerText()).trim() === '共 12 条记录', `${testCase.code}@${width}: 汇总记录数错误`);
      expect(await table.getByText('5条/页', { exact: true }).count() === 1, `${testCase.code}@${width}: 缺少固定5条/页标识`);
      expect(await table.locator('.pro-table-footer select').count() === 0, `${testCase.code}@${width}: 出现分页条数下拉框`);
      expect((await visibleRows.first().locator(`[data-column="${testCase.identifier}"]`).innerText()).trim() === testCase.expectedIdentifier, `${testCase.code}@${width}: 首行标识错误`);

      if (testCase.code === 'project') {
        const searchLabels = await search.locator('.form-label').allInnerTexts();
        expect(JSON.stringify(searchLabels) === JSON.stringify(['会计期间范围', '项目', '成本类型']), `${testCase.code}@${width}: 查询条件或顺序错误`);
        const currentAccountingPeriod = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
        const periodStart = search.locator('input[data-field="accountingPeriodRangeStart"][data-range-bound="start"]');
        const periodEnd = search.locator('input[data-field="accountingPeriodRangeEnd"][data-range-bound="end"]');
        expect(await periodStart.getAttribute('type') === 'month' && await periodEnd.getAttribute('type') === 'month', `${testCase.code}@${width}: 会计期间范围未使用月份范围控件`);
        expect(await periodStart.inputValue() === currentAccountingPeriod && await periodEnd.inputValue() === currentAccountingPeriod, `${testCase.code}@${width}: 会计期间范围未默认当前会计期间`);
        const projectSelect = search.locator('[data-multi-select]');
        expect(await projectSelect.count() === 1, `${testCase.code}@${width}: 项目查询条件不是下拉框`);
        expect((await projectSelect.locator('.schema-multi-options label span').nth(0).innerText()).trim() === 'PRJ2026001 华中智能工厂一期', `${testCase.code}@${width}: 项目下拉未展示编码和名称`);
        const searchLayout = await search.evaluate((element) => {
          const searchRect = element.getBoundingClientRect();
          const firstLabelRect = element.querySelector('.form-label').getBoundingClientRect();
          const firstLabel = element.querySelector('.form-label');
          return { leftInset: Math.round(firstLabelRect.left - searchRect.left), labelClipped: firstLabel.scrollWidth > firstLabel.clientWidth + 1 };
        });
        expect(searchLayout.leftInset <= 24, `${testCase.code}@${width}: 查询区左侧留白仍过大`);
        expect(!searchLayout.labelClipped, `${testCase.code}@${width}: 会计期间范围标签被截断`);
        expect(await page.locator('#project-cost-stats').count() === 0, `${testCase.code}@${width}: 仍显示项目成本指标卡`);
        expect(await page.locator('#project-cost-category-chart').count() === 0, `${testCase.code}@${width}: 仍显示成本类别构成图`);
        const trendAndSearchWidths = await page.evaluate(() => ({
          search: Math.round(document.querySelector('#project-cost-search').getBoundingClientRect().width),
          trend: Math.round(document.querySelector('#project-cost-trend-chart').getBoundingClientRect().width)
        }));
        expect(Math.abs(trendAndSearchWidths.search - trendAndSearchWidths.trend) <= 1, `${testCase.code}@${width}: 趋势图未独占整行`);
        expect((await page.locator('#project-cost-trend-chart .section-title').innerText()).trim() === '项目成本趋势', `${testCase.code}@${width}: 趋势图标题错误`);
        expect(await table.locator('.pro-table-subtitle').count() === 0, `${testCase.code}@${width}: 项目成本汇总仍显示说明`);
        expect((await table.locator('.section-title').innerText()).trim() === '项目成本列表', '项目成本列表标题错误');
        expect(await table.getByRole('button', {name:'导出', exact:true}).count() === 1, '缺少导出按钮');
        const frozen = await table.evaluate(root => {
          const scroll = root.querySelector('.pro-table-scroll');
          const cells = [...root.querySelectorAll('tbody tr:first-child td')].slice(0, 3);
          const before = cells.map(cell => cell.getBoundingClientRect().x);
          scroll.scrollLeft = 600;
          const after = cells.map(cell => cell.getBoundingClientRect().x);
          scroll.scrollLeft = 0;
          return before.every((value, i) => Math.abs(value - after[i]) < 1);
        });
        expect(frozen, '前三列横向滚动后未固定');

        const tableHeaders = await table.locator('thead th').allInnerTexts();
        expect(JSON.stringify(tableHeaders) === JSON.stringify(['年度-会计期间', '项目编码', '项目名称', '项目状态', '项目经理', '成本总计', '服务采购', '物资消耗', '费用报销', '人工成本', '折旧摊销', '间接费用']), `${testCase.code}@${width}: 项目成本汇总字段或顺序错误`);
        expect((await visibleRows.first().locator('[data-column="yearPeriod"]').innerText()).trim() === '2026-09', `${testCase.code}@${width}: 年度-会计期间格式错误`);
        const summaryCodes = await table.locator('tfoot [data-footer-summary-column]').evaluateAll((cells) => cells.map((cell) => cell.getAttribute('data-footer-summary-column')));
        expect(JSON.stringify(summaryCodes) === JSON.stringify(['collectedCost', 'serviceCost', 'materialCost', 'expenseCost', 'laborCost', 'depreciationCost', 'indirectCost']), `${testCase.code}@${width}: 合计字段错误`);
      }

      if (testCase.code === 'department') {
        const searchLabels = await search.locator('.form-label').allInnerTexts();
        expect(JSON.stringify(searchLabels) === JSON.stringify(['会计期间范围', '部门', '成本类型']), `${testCase.code}@${width}: 查询条件或顺序错误`);
        const currentAccountingPeriod = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
        expect(await search.locator('[data-field="accountingPeriodRangeStart"]').inputValue() === currentAccountingPeriod, `${testCase.code}@${width}: 会计期间范围起始值不是当前会计期间`);
        expect(await search.locator('[data-field="accountingPeriodRangeEnd"]').inputValue() === currentAccountingPeriod, `${testCase.code}@${width}: 会计期间范围结束值不是当前会计期间`);
        expect(await search.locator('[data-field="accountingPeriodRangeStart"]').evaluate((element) => element.getBoundingClientRect().width >= 140) && await search.locator('[data-field="accountingPeriodRangeEnd"]').evaluate((element) => element.getBoundingClientRect().width >= 140), `${testCase.code}@${width}: 会计期间范围控件宽度不足`);
        expect(await search.locator('[data-field="accountingPeriodRangeStart"]').getAttribute('required') === null && await search.locator('[data-field="accountingPeriodRangeEnd"]').getAttribute('required') === null, `${testCase.code}@${width}: 会计期间范围不允许为空`);
        expect(await search.locator('[data-multi-select] [data-field="departmentName"]').count() === 1, `${testCase.code}@${width}: 部门查询条件不是下拉多选`);
        expect(await page.locator('#department-cost-stats').count() === 0, `${testCase.code}@${width}: 指标区未去除`);
        expect(await page.locator('#department-cost-category-chart').count() === 0, `${testCase.code}@${width}: 部门成本构成图未去除`);
        expect((await page.locator('#department-cost-trend-chart .section-title').innerText()).trim() === '部门成本趋势', `${testCase.code}@${width}: 趋势图标题错误`);
        expect((await table.locator('.section-title').innerText()).trim() === '部门成本列表', '部门成本列表标题错误');
        expect(await table.getByRole('button', {name:'导出', exact:true}).count() === 1, '部门成本列表缺少导出按钮');
        const frozen = await table.evaluate(root => {
          const scroll = root.querySelector('.pro-table-scroll');
          const cells = [...root.querySelectorAll('thead th')].slice(0, 3).concat([...root.querySelectorAll('tbody tr:first-child td')].slice(0, 3));
          const previousWidth = scroll.style.width;
          scroll.style.width = '900px';
          const before = cells.map(cell => cell.getBoundingClientRect().x);
          scroll.scrollLeft = 600;
          const after = cells.map(cell => cell.getBoundingClientRect().x);
          const sticky = cells.every(cell => getComputedStyle(cell).position === 'sticky');
          const didScroll = scroll.scrollLeft > 0;
          scroll.scrollLeft = 0;
          scroll.style.width = previousWidth;
          return didScroll && sticky && before.every((value, i) => Math.abs(value - after[i]) < 1);
        });
        expect(frozen, `department@${width}: 前三列标题或内容未固定`);
        const trendAndSearchWidths = await page.evaluate(() => ({
          search: Math.round(document.querySelector('#department-cost-search').getBoundingClientRect().width),
          trend: Math.round(document.querySelector('#department-cost-trend-chart').getBoundingClientRect().width),
          plot: Math.round(document.querySelector('#department-cost-trend-chart .pro-chart-grid line').getBoundingClientRect().width)
        }));
        expect(Math.abs(trendAndSearchWidths.search - trendAndSearchWidths.trend) <= 1, `${testCase.code}@${width}: 趋势图未独占整行`);
        expect(trendAndSearchWidths.plot >= trendAndSearchWidths.trend * 0.7, `${testCase.code}@${width}: 趋势图绘图区宽度不足`);
        expect(await table.locator('.pro-table-subtitle').count() === 0, `${testCase.code}@${width}: 部门成本汇总仍显示说明`);
        const tableHeaders = await table.locator('thead th').allInnerTexts();
        expect(JSON.stringify(tableHeaders) === JSON.stringify(['年度-会计期间', '部门编码', '部门名称', '成本总计', '服务采购', '物资消耗', '费用报销', '人工成本', '折旧摊销', '间接费用']), `${testCase.code}@${width}: 部门成本汇总字段或顺序错误`);
        expect((await visibleRows.first().locator('[data-column="yearPeriod"]').innerText()).trim() === '2026-09', `${testCase.code}@${width}: 年度-会计期间格式错误`);
        const summaryCodes = await table.locator('tfoot [data-footer-summary-column]').evaluateAll((cells) => cells.map((cell) => cell.getAttribute('data-footer-summary-column')));
        expect(JSON.stringify(summaryCodes) === JSON.stringify(['collectedCost', 'serviceCost', 'materialCost', 'expenseCost', 'laborCost', 'depreciationCost', 'indirectCost']), `${testCase.code}@${width}: 合计字段错误`);
      }

      const metrics = await page.evaluate(() => ({
        pageHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        innerVerticalScroll: [...document.querySelectorAll('.pro-table-scroll')].some((el) => ['auto', 'scroll'].includes(getComputedStyle(el).overflowY) && el.scrollHeight > el.clientHeight + 1)
      }));
      expect(!metrics.pageHorizontalOverflow, `${testCase.code}@${width}: 页面级横向溢出`);
      expect(!metrics.innerVerticalScroll, `${testCase.code}@${width}: 表格出现内部纵向滚动`);

      if (width === 1440) {
        if (testCase.code === 'project') {
          await search.locator('[data-field="accountingPeriodRangeStart"]').fill('');
          await search.locator('[data-field="accountingPeriodRangeEnd"]').fill('');
          await search.locator('[data-act="query"]').click();
          expect((await table.locator('[data-record-count]').innerText()).trim() === '共 12 条记录', `${testCase.code}: 会计期间范围清空后未恢复全部列表`);
          await search.locator('[data-act="toggle-multi-select"]').click();
          await search.locator('[data-multi-option][value="PRJ2026002"]').check();
          await search.locator('[data-act="query"]').click();
          expect((await table.locator('[data-record-count]').innerText()).trim() === '共 1 条记录', `${testCase.code}: 项目下拉筛选未生效`);
          expect((await visibleRows.first().locator('[data-column="projectCode"]').innerText()).trim() === 'PRJ2026002', `${testCase.code}: 项目下拉筛选结果错误`);
          await page.waitForTimeout(100);
          expect(await page.locator('[data-series-key]').count() === 1, '单选项目未显示一条线');
          await search.locator('[data-act="toggle-multi-select"]').click();
          await search.locator('[data-multi-option][value="PRJ2026001"]').check();
          await search.locator('[data-act="query"]').click();
          await page.waitForTimeout(50);
          expect(await page.locator('[data-series-key]').count() === 2, '两项目未显示两条线');
          expect((await table.locator('[data-record-count]').innerText()).trim() === '共 2 条记录', '多项目列表筛选失败');
          await search.locator('[data-field="accountingPeriodRangeStart"]').fill('2030-01');
          await search.locator('[data-field="accountingPeriodRangeEnd"]').fill('2030-02');
          await search.locator('[data-act="query"]').click();
          await page.waitForTimeout(50);
          expect(await page.locator('.pro-chart-empty').count() === 1, '期间无数据未显示空状态');
          await search.locator('[data-act="reset"]').click();
          await page.waitForTimeout(100);
          expect(await search.locator('[data-multi-option]:checked').count() === 0, '重置未清除项目复选状态');
          expect(await page.locator('[data-series-key]').count() === 12, '重置未恢复全部项目曲线');
        } else {
          const departmentMulti = search.locator('[data-multi-select]');
          await departmentMulti.locator('[data-act="toggle-multi-select"]').click();
          await departmentMulti.locator('[data-multi-option]').nth(0).check();
          await departmentMulti.locator('[data-multi-option]').nth(1).check();
          await search.locator('[data-act="query"]').click();
          expect((await table.locator('[data-record-count]').innerText()).trim() === '共 2 条记录', `${testCase.code}: 部门多选筛选未生效`);
          await page.waitForTimeout(80);
          expect(await page.locator('[data-series-key]').count() === 2, '两部门未显示两条曲线');
          expect(JSON.stringify(await page.locator('[data-series-key]').evaluateAll(items => items.map(item => item.dataset.seriesKey))) === JSON.stringify(['项目交付部', '技术研发部']), '部门曲线身份错误');
          await departmentMulti.locator('[data-act="toggle-multi-select"]').click();
          await departmentMulti.locator('[data-multi-option]').nth(0).uncheck();
          await search.locator('[data-act="query"]').click();
          await page.waitForTimeout(80);
          expect(await page.locator('[data-series-key]').count() === 1, '单部门未显示一条曲线');
          await departmentMulti.locator('[data-act="toggle-multi-select"]').click();
          await departmentMulti.locator('[data-multi-option]').nth(1).uncheck();
          await search.locator('[data-field="accountingPeriodRangeStart"]').fill('');
          await search.locator('[data-field="accountingPeriodRangeEnd"]').fill('');
          await search.locator('[data-act="query"]').click();
          expect((await table.locator('[data-record-count]').innerText()).trim() === '共 12 条记录', `${testCase.code}: 会计期间范围清空后未恢复全部列表`);
          await page.waitForTimeout(80);
          expect(await page.locator('[data-series-key]').count() === 12, '未选部门时未展示全部曲线');
          expect(await page.locator('[data-series-key]').first().locator('circle').count() === 6, '清空期间未展示完整月份趋势');
          await search.locator('[data-field="accountingPeriodRangeStart"]').fill('2030-01');
          await search.locator('[data-field="accountingPeriodRangeEnd"]').fill('2030-02');
          await search.locator('[data-act="query"]').click();
          await page.waitForTimeout(80);
          expect(await page.locator('#department-cost-trend-chart .pro-chart-empty').count() === 1, '无数据期间未显示空状态');
          await search.locator('[data-act="reset"]').click();
          await page.waitForTimeout(80);
          expect(await departmentMulti.locator('[data-multi-option]:checked').count() === 0, '重置未清除部门选择');
          expect(await page.locator('[data-series-key]').count() === 12, '重置未恢复全部部门曲线');
          await search.locator('[data-field="accountingPeriodRangeStart"]').fill(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);
          await search.locator('[data-field="accountingPeriodRangeEnd"]').fill(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);
          await search.locator('[data-act="query"]').click();
          if (await departmentMulti.locator('[data-act="toggle-multi-select"]').getAttribute('aria-expanded') === 'true') await departmentMulti.locator('[data-act="toggle-multi-select"]').click();
        }

        await table.locator(`tbody > tr:not([hidden]) [data-column="${testCase.identifier}"] a`).first().click();
        const drawer = page.locator(testCase.drawer);
        expect(await drawer.isVisible(), `${testCase.code}: 明细抽屉未打开`);
        expect((await drawer.locator('.pro-drawer-header h2').innerText()).includes(testCase.drawerName), `${testCase.code}: 抽屉标题未绑定所选行`);
        expect((await drawer.locator(`[data-description-field="${testCase.descriptionCode}"]`).innerText()).trim() === testCase.expectedIdentifier, `${testCase.code}: 概览未绑定所选行`);
        await drawer.locator('[data-tab="source"]').click();
        expect(await drawer.locator(testCase.detailTable).isVisible(), `${testCase.code}: 来源明细页签未显示`);
        expect(await drawer.locator(`${testCase.detailTable} tbody > tr:not([data-empty-row])`).count() >= 5, `${testCase.code}: 来源明细未按行穿透`);
        await page.screenshot({ path: path.join(reportDir, `${testCase.code}-cost-analysis-drawer-1440.png`), fullPage: true });
        await drawer.locator('[data-act="close"]').last().click();
      }

      await page.screenshot({ path: path.join(reportDir, `${testCase.code}-cost-analysis-${width}.png`), fullPage: true });
      await page.close();
    }
  }

  const menuPage = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await menuPage.route(/^https?:/, (route) => route.abort());
  await menuPage.goto(pathToFileURL(path.resolve('menu/index.html')).href, { waitUntil: 'domcontentloaded' });
  const costMenu = menuPage.locator('.menu-primary', { hasText: '成本分析' });
  await costMenu.click();
  const section = costMenu.locator('xpath=..');
  const projectItem = section.locator('.submenu button', { hasText: '项目成本' });
  const departmentItem = section.locator('.submenu button', { hasText: '部门成本' });
  expect(await projectItem.getAttribute('data-path') === 'cost/project-cost-analysis.html', 'menu: 项目成本路径错误');
  expect(await departmentItem.getAttribute('data-path') === 'cost/department-cost-analysis.html', 'menu: 部门成本路径错误');
  await (requestedCase === 'project' ? projectItem : departmentItem).click();
  await menuPage.waitForTimeout(250);
  const expectedMenuPath = requestedCase === 'project' ? 'cost/project-cost-analysis.html' : 'cost/department-cost-analysis.html';
  expect((await menuPage.locator('#contentFrame').getAttribute('src'))?.endsWith(expectedMenuPath), `menu: ${requestedCase === 'project' ? '项目成本' : '部门成本'}未进入 iframe`);
  await menuPage.close();
} catch (error) {
  errors.push(error.stack || error.message);
} finally {
  await browser.close();
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
const scopeLabel = requestedCase === 'project' ? '项目成本' : requestedCase === 'department' ? '部门成本' : '项目/部门成本';
console.log(`成本分析专项回归通过：${scopeLabel}查询筛选、固定5行分页、穿透、1440px/2048px布局及菜单入口均有效`);
