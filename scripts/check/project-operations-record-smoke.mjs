import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '../lib/playwright-smoke.mjs';

const errors = [];
const expect = (condition, message) => { if (!condition) errors.push(message); };
const reportDir = path.resolve('outputs/reports/visual/report');
fs.mkdirSync(reportDir, { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });

try {
  for (const width of [1440, 2048]) {
    const page = await browser.newPage({ viewport: { width, height: 1100 } });
    page.setDefaultTimeout(10000);
    page.on('pageerror', (error) => errors.push(`page@${width}: ${error.message}`));
    await page.route(/^https?:/, (route) => route.abort());
    await page.goto(pathToFileURL(path.resolve('pages/report/project-operations-record.html')).href, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(300);

    const list = page.locator('#project-operations-record-table');
    const detail = page.locator('[data-page-view="detail"]');
    const issueCards = detail.locator('[data-display-mode="issue-cards"]');
    const search = page.locator('#project-operations-record-search');

    expect((await page.locator('.schema-master-header .page-title').innerText()).trim() === '项目列表', `page@${width}: 左侧标题错误`);
    expect(await page.locator('.schema-master-header [data-master-count]').count() === 0, `page@${width}: 左侧标题仍显示统计数量`);
    expect(await page.locator('[data-workspace-layout="master-detail"]').count() === 1, `page@${width}: 未生成主从工作台布局`);
    expect(await search.locator('.form-label').count() === 0, `page@${width}: 搜索框仍显示字段标签`);
    expect(await search.locator('[data-field="projectCustomerKeyword"][placeholder="搜索项目名称 / 客户名称"]').count() === 1, `page@${width}: 项目/客户搜索框错误`);
    expect(await search.locator('[data-act="query"],[data-act="reset"]').count() === 0, `page@${width}: 搜索区仍显示查询或重置按钮`);
    expect((await list.locator('thead th').allTextContents()).map((v) => v.trim()).join(',') === '项目名称,客户名称', `page@${width}: 左侧列表字段错误`);
    expect(await list.locator('[data-row-select]').count() === 0, `page@${width}: 项目列表仍显示整单选择框`);
    expect(await list.locator('tbody > tr:visible:not([data-filter-empty-row])').count() === 5, `page@${width}: 项目列表首屏不是5条`);
    expect((await list.locator('[data-record-count]').innerText()).trim() === '共 6 条记录', `page@${width}: 项目总数错误`);
    expect(await page.locator('[data-act="create"],[data-act="edit-current"],[data-act="refresh-current"],[data-act="submit"],[data-act="batch-delete"],#project-operations-record-table [data-act="delete"]').count() === 0, `page@${width}: 仍存在整单增删改操作`);
    expect(await detail.locator('[data-component="DetailForm"], [data-tab="basic"]').count() === 0, `page@${width}: 基础信息区域仍存在`);
    expect((await detail.locator('[data-detail-title]').innerText()).trim() === '广州水务智能控制项目', `page@${width}: 首个项目未默认选中`);
    expect((await detail.locator('[data-detail-subtitle]').innerText()).trim() === '广州市净水有限公司', `page@${width}: 右侧客户名称错误`);
    expect(await issueCards.locator('[data-issue-card]').count() === 2, `page@${width}: 初始问题卡片数量错误`);
    expect(await issueCards.locator('.schema-issue-list-header [data-record-count]').count() === 0, `page@${width}: 问题记录标题仍显示统计数量`);
    expect(await detail.locator('.schema-master-detail-actions [data-target="add-issue-modal"]').count() === 1, `page@${width}: 新增问题未放在右上角`);
    expect(await detail.locator('.schema-master-detail-actions [data-target="ai-analysis-modal"]').count() === 1, `page@${width}: 缺少AI数字员工分析按钮`);
    expect((await issueCards.locator('[data-issue-card]').first().innerText()).includes('发行日期'), `page@${width}: 问题卡片缺少发行日期`);
    expect((await issueCards.locator('[data-issue-card]').first().innerText()).includes('创建人'), `page@${width}: 问题卡片缺少创建人`);
    expect((await issueCards.locator('[data-issue-card]').first().innerText()).includes('问题描述：'), `page@${width}: 问题卡片缺少问题描述`);
    expect((await issueCards.locator('[data-issue-card]').first().innerText()).includes('解决方案：'), `page@${width}: 问题卡片缺少解决方案`);

    const metrics = await page.evaluate(() => ({
      pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      innerVerticalScroll: [...document.querySelectorAll('.pro-table-scroll')].some((el) => ['auto', 'scroll'].includes(getComputedStyle(el).overflowY) && el.scrollHeight > el.clientHeight + 1),
      projectRowHeight: document.querySelector('#project-operations-record-table tbody tr:not([hidden])')?.getBoundingClientRect().height || 0
    }));
    expect(!metrics.pageOverflow, `page@${width}: 页面横向溢出`);
    expect(!metrics.innerVerticalScroll, `page@${width}: 项目列表出现内部纵向滚动`);
    expect(metrics.projectRowHeight <= 96, `page@${width}: 左侧项目卡片高度仍过高（${metrics.projectRowHeight}px）`);

    if (width === 1440) {
      const keyword = search.locator('[data-field="projectCustomerKeyword"]');
      await keyword.fill('深圳污水处理厂');
      expect((await list.locator('[data-record-count]').innerText()).trim() === '共 1 条记录', '项目查询失败');
      await keyword.fill('广州市净水有限公司');
      expect((await list.locator('[data-record-count]').innerText()).trim() === '共 1 条记录', '客户查询失败');
      await keyword.fill('');

      await list.locator('tbody tr:not([hidden]) [data-column="projectName"] a').nth(1).click();
      expect((await detail.locator('[data-detail-title]').innerText()).trim() === '深圳污水处理厂智能改造', '点击项目未切换右侧标题');
      expect((await detail.locator('[data-detail-subtitle]').innerText()).trim() === '深圳市水务（集团）有限公司', '点击项目未切换客户名称');
      expect(await issueCards.locator('[data-issue-card]').count() === 1, '点击项目未切换问题卡片');

      await detail.locator('[data-target="add-issue-modal"]').click();
      const addModal = page.locator('[data-overlay="add-issue-modal"]');
      expect(await addModal.isVisible(), '新增问题弹窗未打开');
      await page.screenshot({ path: path.join(reportDir, 'project-operations-record-add-modal-1440.png'), fullPage: true });
      await addModal.locator('[data-field="releaseDate"]').fill('2026-09-09');
      await addModal.locator('[data-field="problemDescription"]').fill('新增问题演示');
      await addModal.locator('[data-field="solution"]').fill('新增解决方案演示');
      expect(await addModal.locator('[data-field="creator"]').inputValue() === '运维专员-林佳', '新增问题未自动带出创建人');
      await addModal.locator('[data-act="confirm-add-issue"]').click();
      expect(await addModal.isHidden(), '确认新增后弹窗未关闭');
      expect(await issueCards.locator('[data-issue-card]').count() === 2, '确认新增后问题卡片数量错误');
      expect((await issueCards.innerText()).includes('新增解决方案演示'), '确认新增后卡片内容未展示');

      await detail.locator('[data-target="ai-analysis-modal"]').click();
      const analysisModal = page.locator('[data-overlay="ai-analysis-modal"]');
      expect(await analysisModal.isVisible(), 'AI数字员工分析弹窗未打开');
      expect((await analysisModal.innerText()).includes('分析过程'), 'AI分析弹窗缺少分析过程');
      expect((await analysisModal.innerText()).includes('汇总问题记录'), 'AI分析弹窗缺少过程步骤');
      expect((await analysisModal.innerText()).includes('分析结果'), 'AI分析弹窗缺少分析结果');
      expect((await analysisModal.innerText()).includes('综合结论'), 'AI分析弹窗缺少综合结论');
      await page.screenshot({ path: path.join(reportDir, 'project-operations-record-ai-analysis-modal-1440.png'), fullPage: true });
      await analysisModal.locator('[data-act="close"]').last().click();

      await issueCards.locator('[data-act="remove-issue-card"]').first().click();
      await page.locator('[data-delete-confirm] [data-act="confirm-delete"]').click();
      expect(await issueCards.locator('[data-issue-card]').count() === 1, '删除问题卡片失败');
      await page.screenshot({ path: path.join(reportDir, 'project-operations-record-cards-1440.png'), fullPage: true });
    }

    if (width === 2048) await page.screenshot({ path: path.join(reportDir, 'project-operations-record-cards-2048.png'), fullPage: true });
    await page.close();
  }

  const menuPage = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  menuPage.setDefaultTimeout(10000);
  await menuPage.route(/^https?:/, (route) => route.abort());
  await menuPage.goto(pathToFileURL(path.resolve('menu/index.html')).href, { waitUntil: 'domcontentloaded' });
  const reportMenu = menuPage.locator('.menu-primary', { hasText: '报表管理' });
  await reportMenu.click();
  const section = reportMenu.locator('xpath=..');
  const item = section.locator('.submenu button', { hasText: '项目运维记录' });
  expect(await item.getAttribute('data-path') === 'report/project-operations-record.html', '菜单路径错误');
  await item.click();
  const frame = menuPage.locator('#contentFrame');
  await frame.waitFor({ state: 'visible' });
  await menuPage.waitForTimeout(300);
  expect(await frame.contentFrame().locator('[data-workspace-layout="master-detail"]').count() === 1, 'iframe 未打开项目问题记录工作台');
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
console.log('项目运维记录专项回归通过：项目/客户即时搜索、紧凑项目导航、问题弹窗新增删除、AI分析过程与结果、分页及菜单入口均有效');
