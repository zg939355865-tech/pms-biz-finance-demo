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
    const contracts = [
      ['requirement','需求编号,需求名称,需求提出人,状态',186],
      ['proposal','方案编号,方案名称,方案编写人,状态',84],
      ['notice','通知单号,通知名称,销售负责人,状态',62],
      ['project','项目编码,项目名称,项目经理,状态',48],
      ['demand-trend','月份,需求数量',6,186],
      ['industry-trend','月份,需求数量,行业',30,186],
      ['type-distribution','需求类型,需求数量',5,186],
      ['province-ranking','区域,需求数量',7,173],
      ['requester-ranking','需求提出人,需求数量',7,170],
      ['manager-ranking','项目经理,项目数量',8,48],
    ];
    for (const [id, headers, count, total] of contracts) {
      await page.locator(total === undefined ? `.metric-total [data-metric="${id}"]` : `[data-view="${id}"]`).click();
      expect((await page.locator('#cockpit-dialog th').allTextContents()).join(',') === headers, `${id}@${width}: 弹窗字段不匹配`);
      expect((await page.locator('#cockpit-dialog-footer').innerText()).includes(`共 ${count} 条`), `${id}: 行数错误`);
      expect(await page.locator('#cockpit-dialog tbody tr').count() === Math.min(5,count), `${id}: 固定5行分页错误`);
      expect(!(await page.locator('#cockpit-dialog').evaluate(el=>el.scrollWidth>el.clientWidth+1)), `${id}@${width}: 弹窗横向溢出`);
      if (id === 'proposal' || id === 'industry-trend') await page.screenshot({path:path.join(reportDir,`dialog-${id}-${width}.png`)});
      if (total !== undefined) {
        let sum = 0, collected = [];
        while (true) {
          collected.push(...await page.locator('#cockpit-dialog tbody tr').allTextContents());
          sum += (await page.locator('#cockpit-dialog [data-column="value"]').allTextContents()).map(Number).reduce((a,b)=>a+b,0);
          const monthCells = await page.locator('#cockpit-dialog [data-column="month"]').allTextContents();
          expect(monthCells.every(m=>/^\d{6}$/.test(m)), `${id}: 月份不是YYYYMM`);
          if (await page.locator('[data-dialog-page="1"]').isDisabled()) break;
          await page.locator('[data-dialog-page="1"]').click();
        }
        expect(sum===total && collected.length===count, `${id}: 汇总及翻页数据不一致 ${sum}/${collected.length}`);
      }
      await page.keyboard.press('Escape');
    }
    if (width === 1440) {
      await page.locator('.metric-total [data-metric="requirement"]').click();
      expect(await page.locator('#cockpit-dialog tbody tr').count() === 5, '指标下钻未固定5行');
      const firstId = await page.locator('#cockpit-dialog tbody tr').first().innerText();
      await page.locator('[data-dialog-page="1"]').click();
      expect((await page.locator('#cockpit-dialog tbody tr').first().innerText()) !== firstId, '指标下钻翻页未生效');
      await page.keyboard.press('Escape');
      await page.locator('#industry-share [data-value="污水厂"]').click();
      expect(await page.locator('#cockpit-dialog').isHidden(), '行业构成仍打开弹窗');
      expect(await page.locator('#industry-share button, #industry-share [role="button"], #industry-share [data-chart-click]').count() === 0, '行业构成仍有弹窗入口');
      for (const [selector, label, value] of [
        ['#demand-trend [data-chart-click="month"]', null, '47'],
        ['#type-distribution [data-value="曝气智能体"]', '曝气智能体', '72'],
        ['#province-ranking [data-value="湖南省"]', '湖南省', '42'],
        ['#requester-ranking [data-value="张伟"]', '张伟', '38'],
        ['#manager-ranking [data-value="张磊"]', '张磊', '13'],
      ]) {
        await page.locator(selector).last().click();
        expect(await page.locator('#cockpit-dialog tbody tr').count() === 1, '单图表项未展示单行汇总');
        expect((await page.locator('#cockpit-dialog [data-column="value"]').innerText()) === value, '单图表项汇总数量错误');
        if(label) expect((await page.locator('#cockpit-dialog [data-column="label"]').innerText()) === label, '单图表项分组错误');
        await page.locator('#cockpit-dialog-close').click();
      }
      await page.locator('[data-metric="proposal"][data-status="审核中"]').click();
      expect((await page.locator('#cockpit-dialog [data-column="status"]').allTextContents()).every(x=>x==='审核中'), '状态指标筛选失效');
      expect((await page.locator('#cockpit-dialog th').allTextContents()).join(',') === '方案编号,方案名称,方案编写人,状态', '状态弹窗未沿用业务字段');
      await page.keyboard.press('Escape');
      await page.locator('#industry-legend [data-series="污水厂"]').click();
      expect(await page.locator('#industry-trend [data-chart-click="month"]').count() === 24, '行业系列开关未生效');
      await page.locator('#cockpit-industry').selectOption('污水厂');
      expect((await page.locator('.metric-total button').first().innerText()) === String(industryCounts[0]), '行业筛选未联动指标');
      await page.locator('#industry-legend [data-series="污水厂"]').click();
      await page.locator('[data-view="industry-trend"]').click();
      expect((await page.locator('#cockpit-dialog-footer').innerText()).includes('共 6 条'), '行业筛选未作用于汇总弹窗');
      expect((await page.locator('#cockpit-dialog [data-column="industry"]').allTextContents()).every(x=>x==='污水厂'), '行业汇总混入其他行业');
      await page.keyboard.press('Escape');
      await page.locator('#cockpit-industry').evaluate(el=>el.add(new Option('无匹配测试行业','无匹配测试行业')));
      await page.locator('#cockpit-industry').selectOption('无匹配测试行业');
      expect((await page.locator('.metric-total button').allTextContents()).every(x=>x==='0'), '无数据行业未清零');
      expect(!(await page.locator('.cockpit').innerHTML()).match(/NaN|Infinity/), '空数据图表产生无效数值');
      await page.locator('.metric-total [data-metric="notice"]').click();
      expect(await page.locator('#cockpit-dialog td').getAttribute('colspan')==='4', '业务空表列数错误');
      await page.keyboard.press('Escape');
      await page.locator('[data-view="province-ranking"]').click();
      expect(await page.locator('#cockpit-dialog td').getAttribute('colspan')==='2', '汇总空表列数错误');
      await page.keyboard.press('Escape');
      await page.locator('#cockpit-reset').click();
      expect((await page.locator('.metric-total button').first().innerText()) === '186', '重置未恢复主体');
    }
    expect(await page.locator('.demo-badge, #cockpit-month, .panel-heading p, .trend-headline em, .cockpit-footnote, .cockpit-legacy, #cockpit-definitions').count() === 0, '标红控件或说明仍存在');
    const visibleText = await page.locator('body').innerText();
    for (const text of ['需求洞察 · 项目推进 · 责任分布','各类别均为智能体需求','生命周期明细与查询','统计口径','演示数据']) expect(!visibleText.includes(text), '标红文案仍存在：'+text);
    expect((await page.locator('h1').first().innerText()).trim() === '项目驾驶舱', '标题发生变化');
    expect(await page.locator('#cockpit-range, .cockpit-context').count() === 0, '标红的日期范围及行业说明仍存在');
    expect((await page.locator('#trend-headline').innerText()).replace(/\s/g, '') === '47本月新增', '本月新增被修改');
    expect(!visibleText.includes('健康度') && !visibleText.includes('综合评分') && !visibleText.includes('风险等级'), '页面出现模糊评分');
    expect(!visibleText.includes('合同金额') && !visibleText.includes('项目成本') && !visibleText.includes('预算金额') && !visibleText.includes('凭证金额'), '页面出现财务指标');
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
console.log('项目驾驶舱专项回归通过：四组指标、七张图表、六个月趋势、排名与聚合一致、筛选与明细分页、空数据、标红内容移除、1440px/2048px及菜单入口');
