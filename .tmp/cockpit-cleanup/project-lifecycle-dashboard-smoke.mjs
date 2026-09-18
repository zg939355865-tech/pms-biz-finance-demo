import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '../lib/playwright-smoke.mjs';

const errors = [];
const expect = (condition, message) => { if (!condition) errors.push(message); };
const reportDir = path.resolve('outputs/reports/visual/report/project-lifecycle-dashboard');
fs.mkdirSync(reportDir, { recursive: true });
expect(!fs.existsSync(path.resolve('pages/process-guide.html')), '流程指引页面文件仍然存在');

const browser = await chromium.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
});

try {
  for (const width of [1440, 2048]) {
    const page = await browser.newPage({ viewport: { width, height: 1100 } });
    page.setDefaultTimeout(10000);
    page.on('pageerror', (error) => errors.push(`page@${width}: ${error.message}`));
    await page.route(/^https?:/, (route) => route.abort());
    await page.goto(pathToFileURL(path.resolve('pages/report/project-lifecycle-dashboard.html')).href, { waitUntil: 'domcontentloaded' });
    await page.locator('.page-loading').waitFor({ state: 'hidden' });

    expect(await page.locator('.cockpit-metric').count() === 4, `page@${width}: 主体指标分组必须为4组`);
    expect(await page.locator('.cockpit-panel').count() === 7, `page@${width}: 主体图表必须为7张`);
    const metricTotals = await page.locator('.metric-total button').allTextContents();
    expect(metricTotals.join(',') === '186,84,62,48', `page@${width}: 主体总数错误 ${metricTotals}`);
    expect(await page.locator('.metric-statuses button').count() === 12, `page@${width}: 指标状态数量错误`);
    expect(await page.locator('#demand-trend [data-chart-click="month"]').count() === 6, `page@${width}: 需求趋势不是6个月`);
    expect(await page.locator('#industry-trend [data-chart-click="month"]').count() === 30, `page@${width}: 行业趋势不是5组6个月`);
    expect(await page.locator('#province-ranking .rank-row').count() === 7, `page@${width}: 省份不是前7名`);
    expect(await page.locator('#requester-ranking .rank-row').count() === 7, `page@${width}: 提出人不是前7名`);
    const managerCounts = (await page.locator('#manager-ranking .rank-count').allTextContents()).map(Number);
    expect(managerCounts.join(',') === '13,9,7,6,5,4,3,1', `page@${width}: 项目经理未按负责项目数倒序`);
    expect(managerCounts.reduce((a,b)=>a+b,0) === 48, '项目经理负责数量与立项总数不一致');
    const industryCounts = (await page.locator('.share-legend b').allTextContents()).map(Number);
    expect(industryCounts.reduce((a,b)=>a+b,0) === 186, '行业构成与需求总数不一致');
    expect(await page.locator('#type-distribution [data-chart-click="type"]').count() === 5, '需求类型必须为5项');
    expect(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)), `page@${width}: 主体横向溢出`);
    await page.screenshot({ path: path.join(reportDir, `project-cockpit-${width}.png`), fullPage: true });
    if (width === 1440) {
      await page.locator('.metric-total [data-metric="requirement"]').click();
      expect(await page.locator('#cockpit-dialog tbody tr').count() === 5, '指标下钻未固定5行');
      const firstId = await page.locator('#cockpit-dialog tbody tr').first().innerText();
      await page.locator('[data-dialog-page="1"]').click();
      expect((await page.locator('#cockpit-dialog tbody tr').first().innerText()) !== firstId, '指标下钻翻页未生效');
      await page.keyboard.press('Escape');
      await page.locator('#industry-share [data-value="污水厂"]').click();
      expect((await page.locator('#cockpit-dialog-footer').innerText()).includes(`共 ${industryCounts[0]} 条`), '行业下钻数量不一致');
      await page.locator('#cockpit-dialog-close').click();
      await page.locator('#industry-legend [data-series="污水厂"]').click();
      expect(await page.locator('#industry-trend [data-chart-click="month"]').count() === 24, '行业系列开关未生效');
      await page.locator('#cockpit-industry').selectOption('污水厂');
      expect((await page.locator('.metric-total button').first().innerText()) === String(industryCounts[0]), '行业筛选未联动指标');
      await page.locator('#cockpit-month').fill('2100-01');
      await page.locator('#cockpit-month').dispatchEvent('change');
      expect((await page.locator('.metric-total button').allTextContents()).every(x=>x==='0'), '无数据月份未清零');
      expect(!(await page.locator('.cockpit').innerHTML()).match(/NaN|Infinity/), '空数据图表产生无效数值');
      await page.locator('#cockpit-reset').click();
      expect((await page.locator('.metric-total button').first().innerText()) === '186', '重置未恢复主体');
    }
    await page.locator('.cockpit-legacy summary').click();

    const search = page.locator('#project-lifecycle-search');
    const table = page.locator('#project-lifecycle-table');
    const visibleRows = table.locator('tbody > tr:visible:not([data-filter-empty-row])');
    const visibleText = await page.locator('body').innerText();

    expect((await page.locator('h1').first().innerText()).trim() === '项目驾驶舱', `page@${width}: 页面标题错误`);
    expect(await search.locator('.form-item').count() === 9, `page@${width}: 查询条件或操作数量错误`);
    expect(await page.locator('#project-lifecycle-stats .pro-stat-card').count() === 8, `page@${width}: 顶部指标不是8项`);
    expect(await page.locator('#lifecycle-stage-chart [data-act="chart-filter"]').count() === 9, `page@${width}: 生命周期阶段不是9个`);
    expect(await page.locator('.pro-chart-body[data-chart-type="bar"]').count() === 1, `page@${width}: 生命周期条形图未生成`);
    expect(await page.locator('.pro-chart-body[data-chart-type="donut"]').count() === 1, `page@${width}: 项目状态环形图未生成`);
    expect(!visibleText.includes('健康度') && !visibleText.includes('综合评分') && !visibleText.includes('风险等级'), `page@${width}: 页面仍显示模糊评分指标`);
    expect(!visibleText.includes('合同金额') && !visibleText.includes('项目成本') && !visibleText.includes('预算金额') && !visibleText.includes('凭证金额'), `page@${width}: 页面仍显示财务指标`);
    expect(await visibleRows.count() === 5, `page@${width}: 首页不是固定5行`);
    expect((await table.locator('[data-record-count]').innerText()).trim() === '共 12 条记录', `page@${width}: 明细总数错误`);
    expect(await table.getByText('5条/页', { exact: true }).count() === 1, `page@${width}: 缺少5条/页标识`);
    expect(await table.locator('.pro-table-footer select').count() === 0, `page@${width}: 出现页容量下拉框`);
    expect((await visibleRows.first().locator('[data-column="cumulativeProgress"]').innerText()).trim() === '', `page@${width}: 前期事项伪造了进度值`);

    const layout = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('#project-lifecycle-charts > .pro-chart-card')].map((element) => {
        const box = element.getBoundingClientRect();
        return { x: box.x, y: box.y, width: box.width };
      });
      return {
        pageHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        innerVerticalScroll: [...document.querySelectorAll('.pro-table-scroll')].some((element) => ['auto', 'scroll'].includes(getComputedStyle(element).overflowY) && element.scrollHeight > element.clientHeight + 1),
        cards,
      };
    });
    expect(!layout.pageHorizontalOverflow, `page@${width}: 页面级横向溢出`);
    expect(!layout.innerVerticalScroll, `page@${width}: 表格出现内部纵向滚动`);
    expect(layout.cards.length === 2 && Math.abs(layout.cards[0].y - layout.cards[1].y) < 2, `page@${width}: 两张图表未并排 ${JSON.stringify(layout.cards)}`);
    expect(layout.cards.every((card) => card.width >= 580), `page@${width}: 图表卡宽度不足`);

    if (width === 1440) {
      const lifecycleButton = page.locator('#lifecycle-stage-chart [data-filter-value="运营维护"]');
      await lifecycleButton.click();
      expect(await lifecycleButton.evaluate((element) => element.classList.contains('is-active')), '生命周期图表筛选未激活');
      expect((await search.locator('[data-field="lifecycleStage"]').inputValue()) === '运营维护', '生命周期图表未回写查询条件');
      expect((await table.locator('[data-record-count]').innerText()).trim() === '共 3 条记录', '生命周期图表未联动明细');

      await search.locator('[data-act="reset"]').click();
      expect((await table.locator('[data-record-count]').innerText()).trim() === '共 12 条记录', '重置未恢复明细');

      const statusButton = page.locator('#project-status-chart [data-filter-value="进行中"]');
      await statusButton.click();
      expect((await search.locator('[data-field="projectStatus"]').inputValue()) === '进行中', '项目状态图表未回写查询条件');
      expect((await table.locator('[data-record-count]').innerText()).trim() === '共 3 条记录', '项目状态图表未联动明细');

      await search.locator('[data-act="reset"]').click();
      await table.locator('[data-act="page-next"]').click();
      expect((await visibleRows.first().locator('[data-column="lifecycleCode"]').innerText()).trim() === 'XM202608250002', '第二页首行记录错误');
    }

    await page.screenshot({ path: path.join(reportDir, `project-lifecycle-dashboard-${width}.png`), fullPage: true });
    await page.close();
  }

  const menuPage = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  menuPage.setDefaultTimeout(10000);
  await menuPage.route(/^https?:/, (route) => route.abort());
  await menuPage.goto(pathToFileURL(path.resolve('menu/index.html')).href, { waitUntil: 'domcontentloaded' });
  const homeMenu = menuPage.locator('.menu-primary', { hasText: '项目驾驶舱' });
  expect(await homeMenu.count() === 1, '首页菜单数量错误');
  expect(await homeMenu.getAttribute('data-path') === 'report/project-lifecycle-dashboard.html', '首页菜单路径错误');
  expect(await menuPage.getByText('流程指引', { exact: true }).count() === 0, '流程指引菜单仍然存在');
  expect(await menuPage.locator('#breadcrumbModule').isHidden(), '首页面包屑出现重复模块层级');
  expect(await menuPage.locator('#breadcrumbModuleSeparator').isHidden(), '首页面包屑出现重复分隔符');
  expect(await menuPage.locator('#breadcrumbPage').isHidden(), '首页面包屑出现重复层级');
  const frame = menuPage.locator('#contentFrame');
  await frame.waitFor({ state: 'visible' });
  await menuPage.waitForTimeout(300);
  expect((await frame.contentFrame().locator('h1').first().innerText()).trim() === '项目驾驶舱', '首页未默认打开驾驶舱');
  const reportMenu = menuPage.locator('.menu-primary', { hasText: '报表管理' });
  await reportMenu.click();
  const reportSection = reportMenu.locator('xpath=..');
  expect(await reportSection.locator('.submenu button', { hasText: '项目全生命周期驾驶舱' }).count() === 0, '报表管理仍有重复驾驶舱入口');
  await homeMenu.click();
  await menuPage.waitForTimeout(500);
  expect(await menuPage.locator('#breadcrumbModule').isHidden(), '点击首页后出现重复模块层级');
  expect((await frame.contentFrame().locator('h1').first().innerText()).trim() === '项目驾驶舱', '点击首页后未打开驾驶舱');
  await frame.contentFrame().locator('.page-loading').waitFor({ state: 'hidden' });
  expect(!(await frame.contentFrame().locator('html').evaluate(el=>el.scrollWidth>el.clientWidth+1)), '1440px iframe横向溢出');
  await menuPage.screenshot({ path: path.join(reportDir, 'project-lifecycle-dashboard-menu-1440.png'), fullPage: true });
  await menuPage.setViewportSize({ width: 2048, height: 1200 });
  await frame.contentFrame().locator('.page-loading').waitFor({ state: 'hidden' });
  expect(await frame.contentFrame().locator('.cockpit-metric').count() === 4, '2048px菜单入口主体指标缺失');
  expect(!(await frame.contentFrame().locator('html').evaluate(el=>el.scrollWidth>el.clientWidth+1)), '2048px iframe横向溢出');
  await menuPage.screenshot({ path: path.join(reportDir, 'project-cockpit-menu-2048.png'), fullPage: true });
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
console.log('项目驾驶舱专项回归通过：四组指标、七张图表、六个月趋势、排名与聚合一致、筛选与明细分页、空数据、原生命周期交互、1440px/2048px及菜单入口');
