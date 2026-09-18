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
    await page.waitForTimeout(300);

    const search = page.locator('#project-lifecycle-search');
    const table = page.locator('#project-lifecycle-table');
    const visibleRows = table.locator('tbody > tr:visible:not([data-filter-empty-row])');
    const visibleText = await page.locator('body').innerText();

    expect((await page.locator('h1').first().innerText()).trim() === '项目全生命周期驾驶舱', `page@${width}: 页面标题错误`);
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
  expect((await frame.contentFrame().locator('h1').first().innerText()).trim() === '项目全生命周期驾驶舱', '首页未默认打开驾驶舱');
  const reportMenu = menuPage.locator('.menu-primary', { hasText: '报表管理' });
  await reportMenu.click();
  const reportSection = reportMenu.locator('xpath=..');
  expect(await reportSection.locator('.submenu button', { hasText: '项目全生命周期驾驶舱' }).count() === 0, '报表管理仍有重复驾驶舱入口');
  await homeMenu.click();
  await menuPage.waitForTimeout(500);
  expect(await menuPage.locator('#breadcrumbModule').isHidden(), '点击首页后出现重复模块层级');
  expect((await frame.contentFrame().locator('h1').first().innerText()).trim() === '项目全生命周期驾驶舱', '点击首页后未打开驾驶舱');
  await menuPage.screenshot({ path: path.join(reportDir, 'project-lifecycle-dashboard-menu-1440.png'), fullPage: true });
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
console.log('项目全生命周期驾驶舱专项回归通过：务实指标、九阶段分布、图表联动、固定5行分页、1440px/2048px布局、首页默认加载且无重复入口');
