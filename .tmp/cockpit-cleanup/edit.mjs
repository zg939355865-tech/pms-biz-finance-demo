import fs from 'node:fs';
function edit(file,fn){fs.writeFileSync(file,fn(fs.readFileSync(file,'utf8')));}
edit('scripts/lib/project-cockpit.mjs',s=>s.replace('renderProjectCockpit(page, legacy)','renderProjectCockpit(page)').replace('<p>${subtitle}</p>','').replace('<div class="cockpit">','<div class="cockpit" id="cockpit-root" data-component="Space">').replace('<span class="demo-badge">演示数据</span><label>统计截至<input type="month" id="cockpit-month" aria-label="统计截至月份"></label>','').replace('<span><i></i>需求洞察 · 项目推进 · 责任分布</span>','').replace(/    <footer class="cockpit-footnote">.*?<\/footer>\r?\n/,'').replace(/  <details class="cockpit-legacy">.*?<\/details>\r?\n/,''));
edit('scripts/lib/project-cockpit-runtime.mjs',s=>s.replace("  const monthControl = $('#cockpit-month');\n  monthControl.value = baseMonth;\n",'').replace(/  \$\('#cockpit-definitions'\)\.onclick = \(\) => \{[\s\S]*?\n  \};\n/,'').replace('const selected = monthControl.value || baseMonth;','const selected = baseMonth;').replace(/    const last = totals\[5\], previous = totals\[4\];\n    const difference = .*?;\n/,'    const last = totals[5];\n').replace('<em>环比 ${difference}</em>','').replace('<div style="font-size:12px;color:var(--muted);text-align:center">各类别均为智能体需求</div>','').replace('  monthControl.onchange=render;\n','').replace('monthControl.value=baseMonth;',''));
edit('scripts/lib/project-cockpit.css',s=>s.replace('.cockpit-context { display: flex; justify-content: space-between;', '.cockpit-context { display: flex; justify-content: flex-end;'));
const file='schemas/pages/report/project-lifecycle-dashboard.json';
const schema=JSON.parse(fs.readFileSync(file,'utf8'));
schema.archivedLifecycle={regions:schema.regions,metricDefinitions:schema.metricDefinitions};
schema.regions=[{id:'cockpit-root',component:'Space',children:[]}];
delete schema.metricDefinitions;
schema.cockpit.presentation={monthMode:'current-month',showDemoBadge:false,showContextDescription:false,showChartSubtitles:false,showMonthComparison:false,showTypeFootnote:false,showStatisticsFooter:false,showDefinitionsEntry:false,showLifecycleSection:false};
schema.cockpit.definitions=schema.cockpit.definitions.filter(x=>!x.startsWith('底部生命周期')).map(x=>x.replace('所选截至月份','访问当月').replace('环比上月为0时显示“—”。',''));
fs.writeFileSync(file,JSON.stringify(schema,null,2)+'\n');
edit('scripts/check/project-lifecycle-dashboard-smoke.mjs',s=>{
 s=s.replace("      await page.locator('#cockpit-month').fill('2100-01');\n      await page.locator('#cockpit-month').dispatchEvent('change');", "      await page.locator('#cockpit-industry').evaluate(el=>el.add(new Option('无匹配测试行业','无匹配测试行业')));\n      await page.locator('#cockpit-industry').selectOption('无匹配测试行业');");
 const start=s.indexOf("    await page.locator('.cockpit-legacy summary').click();");
 const end=s.indexOf('    await page.close();',start);
 if(start<0||end<0)throw Error('旧区域检查边界未找到');
 s=s.slice(0,start)+`    expect(await page.locator('.demo-badge, #cockpit-month, .panel-heading p, .trend-headline em, .cockpit-footnote, .cockpit-legacy, #cockpit-definitions').count() === 0, '标红控件或说明仍存在');
    const visibleText = await page.locator('body').innerText();
    for (const text of ['需求洞察 · 项目推进 · 责任分布','各类别均为智能体需求','生命周期明细与查询','统计口径','演示数据']) expect(!visibleText.includes(text), '标红文案仍存在：'+text);
    expect((await page.locator('h1').first().innerText()).trim() === '项目驾驶舱', '标题发生变化');
    expect(await page.locator('#cockpit-range').isVisible(), '未标红的日期范围被移除');
    expect(await page.locator('#trend-headline').innerText() === '47本月新增', '本月新增被修改');
    expect(!visibleText.includes('健康度') && !visibleText.includes('综合评分') && !visibleText.includes('风险等级'), '页面出现模糊评分');
    expect(!visibleText.includes('合同金额') && !visibleText.includes('项目成本') && !visibleText.includes('预算金额') && !visibleText.includes('凭证金额'), '页面出现财务指标');
`+s.slice(end);
 return s.replace('原生命周期交互、','标红内容移除、').replace('无数据月份未清零','无数据行业未清零');
});
edit('inputs/md/pages/report/project-lifecycle-dashboard.md',s=>{
 const archive=s.indexOf('## 附录：底部生命周期明细的原有基线');
 if(archive>=0)s=s.slice(0,archive)+'## 历史配置\n\n原生命周期区域仅归档在 Schema 的 `archivedLifecycle` 中，不再生成页面入口或内容。\n';
 return s.replace('原有标准查询与明细保留在底部折叠区','按本次标红要求移除原有标准查询与明细区域').replace('项目驾驶舱、演示数据标识、统计截至月份、所属行业、重置','项目驾驶舱、所属行业、重置；保留右侧日期范围').replace('5. 底部：统计口径入口、可展开的生命周期明细与查询。','5. 移除所有图表副标题、环比、需求类型图脚注、底部统计说明及统计口径入口。').replaceAll('所选截至月份','访问当月').replace('环比上月为0时显示“—”。','').replace(/8\. 底部生命周期明细.*\r?\n/,'').replace('修改截至月份或行业','修改行业').replace('；底部旧样例继续使用原有真实页面入口','').replace('；保留旧明细断言','；追加标红内容移除断言');
});
