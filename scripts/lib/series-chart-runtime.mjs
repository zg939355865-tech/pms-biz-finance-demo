// Only injected for charts declaring series and a search binding.
export function seriesChartRuntime(schema) {
  const charts = (schema.regions || []).filter(node => node.component === 'ProChartCard' && node.series && node.searchId);
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  for (const node of charts) {
    const root = document.getElementById(node.id);
    const search = document.getElementById(node.searchId);
    if (!root || !search) continue;
    const table = node.tableId && document.getElementById(node.tableId);
    let queried = node.queryRequired !== true || node.initialQuery === true;
    function syncSelectionSummary() {
      if (!node.queryRequired) return;
      const multi = search.querySelector('[data-multi-select]');
      const selected = [...multi.querySelectorAll('[data-multi-option]:checked')];
      if (selected.length > 1) {
        const summary = multi.querySelector('[data-multi-values]');
        summary.textContent = `已选择 ${selected.length} 项`;
        summary.title = selected.map(option => option.parentElement.textContent.trim()).join('、');
      }
    }
    syncSelectionSummary();
    search.addEventListener('change', () => setTimeout(syncSelectionSummary, 0));
    function gateRows() {
      if (table) table.querySelectorAll('tbody [data-row-value]').forEach(row => { row.dataset.contextMatch = String(queried); });
    }
    if (!queried && table) {
      gateRows();
      table.querySelectorAll('tbody [data-row-value]').forEach(row => { row.hidden = true; row.dataset.filterMatch = 'false'; });
      const body = table.querySelector('tbody');
      body.querySelector('[data-filter-empty-row]')?.remove();
      const empty = document.createElement('tr');
      empty.dataset.filterEmptyRow = 'true';
      empty.innerHTML = `<td colspan="${table.querySelectorAll('thead th').length}" class="schema-empty-cell">请设置条件后查询</td>`;
      body.append(empty);
      table.querySelector('[data-record-count]').textContent = '共 0 条记录';
      table.querySelectorAll('[data-footer-summary-column]').forEach(cell => {cell.textContent = '0.00';});
      table.querySelectorAll('.pagination button').forEach(button => {button.hidden = true;});
    }
    search.addEventListener('click', event => {
      const action = event.target.closest('[data-act="query"],[data-act="reset"]');
      if (!action || !node.queryRequired) return;
      queried = action.dataset.act === 'query' && [...search.querySelectorAll('.filter-control')].some(field => field.value);
      gateRows();
      if (table) table.querySelectorAll('.pagination button').forEach(button => {button.hidden = false;});
    });
    function render(initialPreview = false) {
      syncSelectionSummary();
      if (table) {
        const rows = [...table.querySelectorAll('tbody [data-row-value]')].filter(row => queried && row.dataset.filterMatch !== 'false').map(row => JSON.parse(row.dataset.rowValue));
        table.querySelectorAll('[data-footer-summary-column]').forEach(cell => {
          const sum = rows.reduce((total, row) => total + Number(row[cell.dataset.footerSummaryColumn] || 0), 0);
          cell.textContent = sum.toLocaleString('zh-CN', {minimumFractionDigits:2,maximumFractionDigits:2});
        });
      }
      if (!queried && !initialPreview) { root.querySelector('.pro-chart-body').innerHTML = '<div class="pro-chart-empty">请设置条件后查询</div>'; return; }
      const value = code => search.querySelector(`[data-field="${code}"]`)?.value || '';
      const selected = value(node.seriesField).split(',').filter(Boolean);
      const start = value(node.periodField + 'Start');
      const end = value(node.periodField + 'End');
      const category = value(node.categoryField);
      const series = node.series.filter(item => !selected.length || selected.includes(item.key)).map(item => ({ ...item,
        points: item.points.filter(point => (!start || point.period >= start) && (!end || point.period <= end))
          .map(point => ({ ...point, value: category ? point.categories[category] : point.value }))
      }));
      const periods = [...new Set(series.flatMap(item => item.points.map(point => point.period)))].sort();
      const body = root.querySelector('.pro-chart-body');
      if (!periods.length) { body.innerHTML = '<div class="pro-chart-empty">暂无符合条件的数据</div>'; return; }
      const width = node.chartWidth || 1200, height = 220, left = 64, bottom = 190;
      const values = series.flatMap(item => item.points.map(point => point.value)).filter(Number.isFinite);
      const min = Math.min(0, ...values), max = Math.max(1, ...values), span = max - min;
      const x = period => periods.length === 1 ? width / 2 : left + periods.indexOf(period) * (width - left - 32) / (periods.length - 1);
      const y = amount => bottom - (amount - min) / span * 160;
      const amount = number => (number / 10000).toLocaleString('zh-CN', { maximumFractionDigits: 2 });
      const grid = [0, 1, 2, 3].map(index => { const v = min + span * index / 3; return `<line x1="${left}" y1="${y(v)}" x2="${width - 32}" y2="${y(v)}"/><text x="${left - 8}" y="${y(v) + 4}" text-anchor="end" style="fill:#64748b;stroke:none;font-size:10px">${amount(v)}</text>`; }).join('');
      const lines = series.map(item => {
        const points = item.points.filter(point => Number.isFinite(point.value));
        return `<g data-series-key="${escape(item.key)}"><polyline style="stroke:${escape(item.color)};fill:none" points="${points.map(point => `${x(point.period)},${y(point.value)}`).join(' ')}"/>${points.map(point => `<circle cx="${x(point.period)}" cy="${y(point.value)}" r="4" style="fill:white;stroke:${escape(item.color)};stroke-width:2"><title>${escape(item.label)} ${point.period}：${amount(point.value)}万元</title></circle>`).join('')}</g>`;
      }).join('');
      body.innerHTML = `<div class="pro-chart-line-wrap"><svg class="pro-chart-line" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escape(node.title)}，单位万元"><g class="pro-chart-grid">${grid}</g>${lines}<g class="pro-chart-axis-labels">${periods.map(period => `<text x="${x(period)}" y="215" text-anchor="middle">${period}</text>`).join('')}</g></svg></div><div class="pro-chart-legend" style="display:flex;flex-wrap:wrap;gap:8px 16px">${series.map(item => `<div class="pro-chart-legend-item"><i style="background:${escape(item.color)}"></i><span>${escape(item.label)}</span></div>`).join('')}</div>`;
      if (node.showLegend === false) body.querySelector('.pro-chart-legend')?.remove();
      if (node.legendPosition === 'right') {
        body.style.display = 'flex';
        body.style.alignItems = 'center';
        body.style.gap = '24px';
        const plot = body.querySelector('.pro-chart-line-wrap');
        plot.style.flex = '1'; plot.style.minWidth = '0';
        const legend = body.querySelector('.pro-chart-legend');
        if (legend) {
          legend.style.flexDirection = 'column'; legend.style.flexWrap = 'nowrap'; legend.style.flex = '0 0 220px'; legend.style.gap = '8px';
          legend.querySelectorAll('span').forEach(label => {label.style.whiteSpace = 'normal'; label.style.overflow = 'visible';});
        }
      }
    }
    search.addEventListener('click', event => {
      const action = event.target.closest('[data-act="query"],[data-act="reset"]');
      if (action) setTimeout(() => {
        const multi = search.querySelector(`[data-field="${node.seriesField}"]`)?.closest('[data-multi-select]');
        if (multi) {
          if (action.dataset.act === 'reset') multi.querySelectorAll('[data-multi-option]').forEach(option => { option.checked = false; });
          multi.querySelector('.schema-multi-options').hidden = true;
          multi.querySelector('[data-act="toggle-multi-select"]').setAttribute('aria-expanded', 'false');
        }
        render();
      }, 0);
    });
    render(node.initialPreview === true);
    if (node.initialQuery === true) search.querySelector('[data-act="query"]')?.click();
  }
}
