export function projectCockpitRuntime(config) {
  const $ = (s) => document.querySelector(s);
  const escape = (x) => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const colors = ['var(--color-viz-teal)', 'var(--color-viz-sky)', 'var(--color-viz-purple)', 'var(--color-viz-orange)', 'var(--color-viz-green)'];
  const monthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  const baseDate = new Date();
  const baseMonth = monthKey(baseDate);
  const records = config.records.map(r => ({ ...r, month: monthKey(new Date(baseDate.getFullYear(), baseDate.getMonth() + r.monthOffset, 1)) }));
  const hiddenIndustries = new Set();
  let scoped = [], months = [], dialogRows = [], dialogPage = 1;
  const dialog = $('#cockpit-dialog');
  const group = (rows, field, labels) => (labels || [...new Set(rows.map(r => r[field]))]).map(label => ({ label, value: rows.filter(r => r[field] === label).length }));
  const sorted = (rows, field, limit) => group(rows, field).sort((a,b) => b.value - a.value || a.label.localeCompare(b.label, 'zh-CN')).slice(0, limit);
  const demands = () => scoped.filter(r => r.kind === 'requirement');
  const projects = () => scoped.filter(r => r.kind === 'project');
  function openRows(title, rows) {
    dialogRows = rows;
    dialogPage = 1;
    $('#cockpit-dialog-title').textContent = title;
    renderDialog();
    if (!dialog.open) dialog.showModal();
  }
  function renderDialog() {
    const maxPage = Math.max(1, Math.ceil(dialogRows.length / 5));
    const rows = dialogRows.slice((dialogPage - 1) * 5, dialogPage * 5);
    $('#cockpit-dialog-content').innerHTML = `<table><thead><tr><th>编号</th><th>名称</th><th>月份</th><th>行业 / 省份</th><th>提出人 / 项目经理</th><th>状态</th></tr></thead><tbody>${rows.length ? rows.map(r => `<tr><td>${escape(r.id)}</td><td>${escape(r.name)}</td><td>${r.month}</td><td>${r.industry}<br>${r.province}</td><td>${r.requester} / ${r.manager}</td><td>${r.status}</td></tr>`).join('') : '<tr><td colspan="6" style="text-align:center">当前筛选范围暂无数据</td></tr>'}</tbody></table>`;
    $('#cockpit-dialog-footer').innerHTML = `<span>共 ${dialogRows.length} 条 · 5条/页 · ${dialogPage} / ${maxPage}</span><button data-dialog-page="-1" ${dialogPage === 1 ? 'disabled' : ''}>上一页</button><button data-dialog-page="1" ${dialogPage >= maxPage ? 'disabled' : ''}>下一页</button>`;
  }
  $('#cockpit-dialog-footer').addEventListener('click', e => {
    const button = e.target.closest('[data-dialog-page]');
    if (!button || button.disabled) return;
    dialogPage += Number(button.dataset.dialogPage); renderDialog();
  });
  $('#cockpit-dialog-close').onclick = () => dialog.close();
  dialog.addEventListener('click', e => { if (e.target === dialog && (e.clientX < dialog.getBoundingClientRect().left || e.clientX > dialog.getBoundingClientRect().right || e.clientY < dialog.getBoundingClientRect().top || e.clientY > dialog.getBoundingClientRect().bottom)) dialog.close(); });
  function svgLine(series, total = false) {
    const width = 420, height = 210, left = 30, right = 14, top = 24, bottom = 34;
    const maximum = Math.max(5, Math.ceil(Math.max(...series.flatMap(s => s.values)) / 5) * 5);
    const x = i => left + i * (width - left - right) / 5;
    const y = v => height - bottom - v / maximum * (height - top - bottom);
    const baseline = height - bottom;
    const grid = [0, .25, .5, .75, 1].map(v => `<line x1="${left}" x2="${width-right}" y1="${y(maximum*v)}" y2="${y(maximum*v)}" stroke="var(--color-screen-panel-strong)" stroke-dasharray="3 5"/><text x="${left-8}" y="${y(maximum*v)+4}" text-anchor="end">${Math.round(maximum*v)}</text>`).join('');
    return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${total ? '项目需求' : '行业需求'}最近六个月趋势"><defs><linearGradient id="demand-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="var(--color-viz-teal)" stop-opacity=".26"/><stop offset="100%" stop-color="var(--color-viz-teal)" stop-opacity="0"/></linearGradient></defs>${grid}${months.map((m,i)=>`<text x="${x(i)}" y="${height-9}" text-anchor="middle">${Number(m.slice(5))}月</text>`).join('')}${series.map(s => {
      const points = s.values.map((v,i) => `${x(i)},${y(v)}`).join(' ');
      return `${total ? `<polygon points="${x(0)},${baseline} ${points} ${x(5)},${baseline}" fill="url(#demand-area)"/>` : ''}<polyline points="${points}" fill="none" stroke="${s.color}" stroke-width="${total?3:2}" stroke-linecap="round" stroke-linejoin="round"/>${s.values.map((v,i)=>`<g tabindex="0" role="button" aria-label="${months[i]} ${escape(s.label)} ${v}条" data-chart-click="month" data-month="${months[i]}" data-industry="${total?'':s.label}"><circle cx="${x(i)}" cy="${y(v)}" r="${total?4:3}" fill="${s.color}"/><circle cx="${x(i)}" cy="${y(v)}" r="10" fill="transparent"/><title>${months[i]} · ${s.label}：${v}条</title>${total?`<text class="point-value" x="${x(i)+(i===0?12:0)}" y="${y(v)-12}" text-anchor="middle">${v}</text>`:''}</g>`).join('')}`;
    }).join('')}</svg>`;
  }
  function renderRanks(id, data, field, isProject = false) {
    const max = Math.max(1, ...data.map(d => d.value));
    $(`#${id} .chart-content`).innerHTML = data.length ? `<div class="rank-list">${data.map((d,i) => `<button class="rank-row" data-chart-click="${field}" data-value="${escape(d.label)}" data-project="${isProject}" aria-label="${escape(d.label)} ${d.value}${isProject?'个项目':'条需求'}"><span class="rank-position">${String(i+1).padStart(2,'0')}</span><span><span class="rank-name">${escape(d.label)}</span><div class="rank-track"><div class="rank-fill" style="width:${d.value/max*100}%;--series:${isProject?colors[1]:colors[0]}"></div></div></span><span class="rank-count">${d.value}</span></button>`).join('')}</div>` : '<p class="empty-chart">当前范围暂无数据</p>';
  }
  function render() {
    const selected = baseMonth;
    const [year, month] = selected.split('-').map(Number);
    months = Array.from({length:6}, (_,i)=>monthKey(new Date(year,month-6+i,1)));
    const industry = $('#cockpit-industry').value;
    scoped = records.filter(r => months.includes(r.month) && (!industry || industry === r.industry));
    $('#cockpit-metrics').innerHTML = config.metrics.map((m,i)=> {
      const rows = scoped.filter(r=>r.kind===m.kind);
      return `<article class="cockpit-metric" data-kind="${m.kind}" style="--accent:${colors[i]}"><div class="metric-top"><span>${m.label}</span><span class="metric-index">0${i+1} / ${m.code}</span></div><div class="metric-total"><button data-metric="${m.kind}" aria-label="${m.label}总数 ${rows.length}">${rows.length}</button><span>总数 / ${m.kind==='project'?'个':'条'}</span></div><div class="metric-statuses">${m.statuses.map(s=>`<button data-metric="${m.kind}" data-status="${s}"><b>${rows.filter(r=>r.status===s).length}</b>${s}</button>`).join('')}</div></article>`;
    }).join('');
    const rows = demands();
    const totals = months.map(m => rows.filter(r=>r.month===m).length);
    const last = totals[5];
    $('#trend-headline').innerHTML = `<b>${last}</b><span>本月新增</span>`;
    $('#demand-trend .chart-content').innerHTML = svgLine([{label:'项目需求',values:totals,color:colors[0]}], true);
    $('#industry-legend').innerHTML = config.industries.map((s,i)=>`<button data-series="${s}" aria-pressed="${!hiddenIndustries.has(s)}"><i class="legend-dot" style="--series:${colors[i]}"></i>${s}</button>`).join('');
    const series = config.industries.map((label,i) => ({label,color:colors[i],values:months.map(m=>rows.filter(r=>r.month===m&&r.industry===label).length)})).filter(s=>!hiddenIndustries.has(s.label));
    $('#industry-trend .chart-content').innerHTML = svgLine(series);
    const share = group(rows,'industry',config.industries);
    let sum = 0;
    const gradient = share.map((s,i) => {const start=sum;sum+= rows.length?s.value/rows.length*100:0;return `${colors[i]} ${start}% ${sum}%`;}).join(',');
    $('#industry-share .chart-content').innerHTML = `<div class="donut-wrap"><div class="donut" role="img" aria-label="需求总数 ${rows.length}" style="background:${rows.length?`conic-gradient(${gradient})`:'var(--color-screen-panel-strong)'}"><div class="donut-label"><b>${rows.length}</b><span>需求总数</span></div></div><div class="share-legend">${share.map((s,i)=>`<button data-chart-click="industry" data-value="${s.label}"><i class="legend-dot" style="--series:${colors[i]}"></i>${s.label}<b>${s.value}</b><small>${rows.length?(s.value/rows.length*100).toFixed(0):0}%</small></button>`).join('')}</div></div>`;
    const types = group(rows,'type',config.types);
    const max = Math.max(1,...types.map(t=>t.value));
    $('#type-distribution .chart-content').innerHTML = `<svg viewBox="0 0 320 264" role="img" aria-label="五类智能体需求数量分布"><line x1="8" x2="312" y1="202" y2="202" stroke="var(--color-screen-panel-strong)"/>${types.map((t,i)=> {const x=12+i*62,h=t.value/max*150;const label=t.label.replace('智能体',''); return `<g tabindex="0" role="button" aria-label="${t.label} ${t.value}条" data-chart-click="type" data-value="${t.label}"><rect x="${x}" y="${202-h}" width="38" height="${h}" rx="3" fill="${colors[i]}" opacity=".85"/><rect x="${x-4}" y="26" width="46" height="228" fill="transparent"/><text class="point-value" x="${x+19}" y="${190-h}" text-anchor="middle">${t.value}</text><text x="${x+19}" y="224" text-anchor="middle">${label.length>4?`<tspan x="${x+19}">${label.slice(0,2)}</tspan><tspan x="${x+19}" dy="16">${label.slice(2)}</tspan>`:label}</text><title>${t.label}：${t.value}条</title></g>`;}).join('')}</svg>`;
    renderRanks('province-ranking',sorted(rows,'province',7),'province');
    renderRanks('requester-ranking',sorted(rows,'requester',7),'requester');
    renderRanks('manager-ranking',sorted(projects(),'manager',Infinity),'manager',true);
  }
  $('.cockpit').addEventListener('click', e => {
    const metric = e.target.closest('[data-metric]');
    if (metric) { const name = config.metrics.find(m=>m.kind===metric.dataset.metric).label; openRows(`${name} · ${metric.dataset.status||'全部'}`,scoped.filter(r=>r.kind===metric.dataset.metric&&(!metric.dataset.status||r.status===metric.dataset.status))); return; }
    const series = e.target.closest('[data-series]');
    if (series) {const s=series.dataset.series;hiddenIndustries.has(s)?hiddenIndustries.delete(s):hiddenIndustries.add(s); render();return;}
    const view = e.target.closest('[data-view]');
    if (view) {openRows($(`#${view.dataset.view} h2`).textContent,view.dataset.view==='manager-ranking'?projects():demands());return;}
    const mark = e.target.closest('[data-chart-click]');
    if (!mark) return;
    const key=mark.dataset.chartClick;
    if (key==='month') openRows(`${mark.dataset.month} · ${mark.dataset.industry||'项目需求'}`,demands().filter(r=>r.month===mark.dataset.month&&(!mark.dataset.industry||r.industry===mark.dataset.industry)));
    else openRows(`${mark.dataset.value} · ${mark.dataset.project==='true'?'负责项目':'需求明细'}`,(mark.dataset.project==='true'?projects():demands()).filter(r=>r[key]===mark.dataset.value));
  });
  $('.cockpit').addEventListener('keydown', e=> { if ((e.key==='Enter'||e.key===' ')&&e.target.matches('g[data-chart-click]')) { e.preventDefault();e.target.dispatchEvent(new MouseEvent('click',{bubbles:true})); } });
  $('#cockpit-industry').onchange=render;
  $('#cockpit-reset').onclick=()=>{$('#cockpit-industry').value='';hiddenIndustries.clear();render();};
  render();
}
