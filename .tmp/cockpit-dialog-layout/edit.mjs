import fs from 'node:fs';
const file='schemas/pages/report/project-lifecycle-dashboard.json';
const schema=JSON.parse(fs.readFileSync(file,'utf8'));
for(const config of Object.values(schema.cockpit.dialogs)){
 const n=config.columns.length;
 config.width={2:560,3:680,4:960}[n];
 config.columns.forEach((c,i)=>c.widthPercent={2:[65,35],3:[34,28,38],4:[24,44,18,14]}[n][i]);
}
fs.writeFileSync(file,JSON.stringify(schema,null,2)+'\n');
const template='scripts/lib/project-cockpit.mjs';
fs.writeFileSync(template,fs.readFileSync(template,'utf8').replace('<div><span class="eyebrow">项目驾驶舱</span><h2 id="cockpit-dialog-title"></h2></div>','<h2 id="cockpit-dialog-title"></h2>'));
const css='scripts/lib/project-cockpit.css';
let s=fs.readFileSync(css,'utf8');
const start=s.indexOf('#cockpit-dialog {');
const end=s.indexOf('@media(min-width:1800px)',start);
s=s.slice(0,start)+`#cockpit-dialog { width: min(var(--dialog-width, 680px), calc(100vw - 48px)); max-height: 85vh; padding: 0; border-radius: 12px; border: 1px solid var(--color-screen-panel-strong); background: var(--color-screen-bg); color: var(--color-screen-text); box-shadow: 0 24px 80px var(--color-mask); }
#cockpit-dialog::backdrop { background: var(--color-mask); backdrop-filter: blur(4px); }
#cockpit-dialog .dialog-heading { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 20px 24px; border-bottom: 1px solid var(--color-screen-panel-strong); margin: 0; }
#cockpit-dialog .dialog-heading h2 { margin: 0; font-size: 20px; font-weight: 600; color: var(--color-bg-card); line-height: 28px; }
#cockpit-dialog button { background: var(--color-screen-panel); color: var(--color-screen-text); border: 1px solid var(--color-screen-panel-strong); padding: 0 12px; height: 32px; border-radius: 6px; cursor: pointer; font-size: 12px; white-space: nowrap; }
#cockpit-dialog button:hover:not(:disabled) { background: var(--color-screen-panel-strong); border-color: var(--color-viz-teal); }
#cockpit-dialog button:focus-visible { outline: 2px solid var(--color-viz-teal); outline-offset: 3px; }
#cockpit-dialog button:disabled { opacity: .4; cursor: default; }
#cockpit-dialog #cockpit-dialog-close { width: 36px; height: 36px; border: none; background: transparent; font-size: 24px; padding: 0; flex-shrink: 0; }
#cockpit-dialog-content { margin: 20px 24px 0; min-height: 328px; }
#cockpit-dialog-content table { border-collapse: collapse; table-layout: fixed; width: 100%; font-size: 14px; }
#cockpit-dialog-content th { height: 48px; background: var(--color-screen-panel); color: var(--color-screen-text); font-weight: 400; }
#cockpit-dialog-content td { height: 56px; }
#cockpit-dialog-content td,#cockpit-dialog-content th { padding: 0 16px; border-bottom: 1px solid var(--color-screen-panel-strong); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
#cockpit-dialog-content tbody tr:hover { background: var(--color-screen-panel); }
#cockpit-dialog-content [data-column="value"] { font-size: 16px; font-weight: 600; font-variant-numeric: tabular-nums; color: var(--color-bg-card); }
#cockpit-dialog-content [data-column="month"] { font-variant-numeric: tabular-nums; letter-spacing: .5px; }
#cockpit-dialog-footer { margin: 20px 24px; display: flex; align-items: center; gap: 8px; font-size: 12px; }
#cockpit-dialog-footer .dialog-count { margin-right: auto; }
#cockpit-dialog-footer .dialog-page-number { margin-right: 4px; min-width: 36px; text-align: center; font-variant-numeric: tabular-nums; }
`+s.slice(end);
fs.writeFileSync(css,s);
fs.appendFileSync('inputs/md/pages/report/project-lifecycle-dashboard.md','\n## 弹窗排版优化\n\n- 仅优化数据弹窗，驾驶舱图表卡片不变。两列汇总弹窗560px、三列汇总680px、四列业务960px，按可用视口自适应。\n- 列宽比例分别为65/35、34/28/38、24/44/18/14；保留原字段顺序和对齐语义。\n- 页头仅保留标题与关闭按钮；正文14px、表头48px、数据行56px，长内容省略并可悬停查看全文。\n- 表体保留5行高度，翻页不跳高；记录总数靠左，页码和翻页按钮靠右。字段、数据、聚合、筛选和分页规则不变。\n');
