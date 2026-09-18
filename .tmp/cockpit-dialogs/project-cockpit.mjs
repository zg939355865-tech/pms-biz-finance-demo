import fs from 'node:fs';
import { projectCockpitRuntime } from './project-cockpit-runtime.mjs';

export function renderProjectCockpit(page) {
  const css = fs.readFileSync(new URL('./project-cockpit.css', import.meta.url), 'utf8');
  const panel = (id, title, subtitle, extra = '') => `<section class="cockpit-panel" id="${id}" data-component="ProChartCard"><header class="panel-heading"><div><h2>${title}</h2></div><button class="chart-data" data-view="${id}" aria-label="查看${title}数据">数据 ↗</button></header>${extra}<div class="chart-content"></div></section>`;
  return `<style>${css}</style>
  <div class="cockpit" id="cockpit-root" data-component="Space">
    <header class="cockpit-header"><div class="cockpit-brand"><span class="brand-mark" aria-hidden="true">◈</span><div><div class="eyebrow">项目全生命周期 · 管理总览</div><h1>项目驾驶舱</h1></div></div><div class="cockpit-controls"><label>所属行业<select id="cockpit-industry" aria-label="所属行业"><option value="">全部行业</option>${page.cockpit.industries.map(x => `<option>${x}</option>`).join('')}</select></label><button id="cockpit-reset">重置</button></div></header>
    <section id="cockpit-metrics" class="cockpit-metrics" aria-label="项目指标"></section>
    <div class="cockpit-top-grid">
      ${panel('demand-trend', '项目需求月度趋势', '当月新增需求 · 最近6个月', '<div class="trend-headline" id="trend-headline"></div>')}
      ${panel('industry-trend', '行业需求月度趋势', '五大行业 · 当月新增需求', '<div class="industry-legend" id="industry-legend"></div>')}
      ${panel('industry-share', '行业需求构成', '按唯一需求编号统计')}
    </div>
    <div class="cockpit-bottom-grid">
      ${panel('type-distribution', '需求类型分布', '智能体需求结构 · 单位：条')}
      ${panel('province-ranking', '项目区域需求排名', '按项目所在地省份 · TOP 7')}
      ${panel('requester-ranking', '需求提出人排名', '按提出需求数 · TOP 7')}
      ${panel('manager-ranking', '项目经理负责项目排名', '按负责项目数倒序 · 全部经理')}
    </div>
  </div>
  <dialog id="cockpit-dialog" aria-labelledby="cockpit-dialog-title"><div class="dialog-heading"><div><span class="eyebrow">项目驾驶舱</span><h2 id="cockpit-dialog-title"></h2></div><button id="cockpit-dialog-close" aria-label="关闭">×</button></div><div id="cockpit-dialog-content"></div><footer id="cockpit-dialog-footer"></footer></dialog>
  <script>(${projectCockpitRuntime.toString()})(${JSON.stringify(page.cockpit).replace(/</g, '\\u003c')});</script>`;
}
