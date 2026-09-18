import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import XLSX from 'xlsx';

const [workbookPath = 'inputs/excel/menu/menu-simple.xlsx', outputPath = 'menu/index.html'] = process.argv.slice(2);

if (!fs.existsSync(workbookPath)) {
  throw new Error(`菜单 Excel 不存在: ${workbookPath}`);
}

const workbook = XLSX.readFile(workbookPath);
const schema = readMenuWorkbook(workbook, workbookPath);
const companies = loadCompanies();

const moduleIcons = {
  '项目驾驶舱': 'house',
  '智能体驾驶舱': 'robot',
  '数字员工': 'headset',
  '待办事项': 'list-check',
  '代办事项': 'list-check',
  '跨司协同台账': 'people-arrows',
  '项目前期': 'clipboard-list',
  '项目管理': 'diagram-project',
  '采购管理': 'cart-shopping',
  '收入管理': 'coins',
  '物资管理': 'warehouse',
  '固资管理': 'building-columns',
  '费用报销': 'receipt',
  '成本分析': 'chart-line',
  '主数据': 'database',
  '期末结账': 'calendar-check',
  '报表管理': 'chart-column',
  '使用指南': 'book-open'
};

const modules = new Map();
for (const item of schema.items || []) {
  const moduleName = item.module || '默认模块';
  if (!modules.has(moduleName)) modules.set(moduleName, []);
  modules.get(moduleName).push(item);
}

const menuData = [...modules.entries()].map(([name, items]) => {
  const sorted = items.sort((a, b) => a.order - b.order);
  const enabledItems = sorted.map((item) => ({
    name: item.pageName,
    path: item.path,
    icon: item.icon || 'circle'
  }));
  const isSinglePage = enabledItems.length === 1;
  return {
    name,
    icon: moduleIcons[name] || sorted.find((item) => item.icon)?.icon || 'folder',
    path: isSinglePage ? enabledItems[0].path : '',
    children: isSinglePage ? [] : enabledItems
  };
});

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, renderHtml(schema, menuData, companies), 'utf8');
const unresolved = schema.items.filter((item) => item.path === '#');
console.log(`menu generated: ${outputPath} (${schema.items.length} items)`);
if (unresolved.length) {
  console.warn(`menu warning: ${unresolved.length} items have no page path and remain disabled`);
}

function readMenuWorkbook(sourceWorkbook, sourcePath) {
  const systemRows = sheetRows(sourceWorkbook, '系统信息');
  const menuRows = sheetRows(sourceWorkbook, '菜单明细');
  if (!sourceWorkbook.Sheets['系统信息'] || !sourceWorkbook.Sheets['菜单明细']) {
    throw new Error('菜单 Excel 必须包含“系统信息”和“菜单明细”两个 Sheet');
  }

  const pageSchemaPaths = readPageSchemaPaths();
  const pagePathMap = {
    '项目驾驶舱': 'report/project-lifecycle-dashboard.html',
    '智能体驾驶舱': 'agent-cockpit.html',
    '数字员工': 'digital-employee.html',
    '我的审批': 'my-approval.html',
    '我的任务': 'my-task.html',
    '项目需求': 'project-requirement.html',
    '调研问卷': 'survey-questionnaire.html',
    '项目方案': 'project-proposal.html',
    '项目实施通知': 'project-notice.html',
    '项目类型': 'project-type.html',
    '计划模版': 'plan-template.html',
    '计划模板': 'plan-template.html',
    '项目立项': 'project-setup.html',
    '项目计划': 'project-plan.html',
    '项目进度填报': 'project-progress.html',
    '客户管理': 'customer.html',
    '收入合同': 'income/income-contract-schema.html',
    'WBS任务看板': 'wbs-kanban.html',
    '智能体运营分析': 'project-overview.html',
    '智能体运行监控': 'agent-monitor.html',
    '智能体状态监控': 'agent-status-monitor.html',
    '需求跟踪表': 'requirement-trace.html',
    '使用指南': 'user-guide.html',
    '价差确认': 'cost/purchase-price-variance.html'
  };

  const items = menuRows
    .filter((row) => isEnabled(row['启用状态']) && (row['一级菜单'] || row['模块']))
    .map((row, index) => {
      const module = row['一级菜单'] || row['模块'];
      const pageName = row['二级菜单'] || row['页面'] || module;
      const excelPath = normalizePagePath(row['路径']);
      const resolvedPath = excelPath || pageSchemaPaths.get(pageName) || pagePathMap[pageName] || '#';
      return {
        module,
        pageName,
        path: resolvedPath,
        icon: row['图标'] || '',
        order: Number(row['排序']) || index + 1
      };
    });

  if (!items.length) throw new Error('菜单明细中没有可用菜单');
  const seen = new Set();
  for (const item of items) {
    const key = `${item.module}::${item.pageName}`;
    if (seen.has(key)) throw new Error(`菜单重复: ${item.module} / ${item.pageName}`);
    seen.add(key);
    if (item.path !== '#' && !fs.existsSync(path.join('pages', item.path))) {
      console.warn(`menu warning: page file not found: pages/${item.path}`);
    }
  }

  return {
    systemName: systemRows[0]?.['系统名称'] || 'PMS业财一体化',
    sourceWorkbook: sourcePath.replaceAll('\\', '/'),
    items
  };
}

function sheetRows(sourceWorkbook, sheetName) {
  const sheet = sourceWorkbook.Sheets[sheetName];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' }).map((row) => Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      String(key).trim(),
      typeof value === 'string' ? value.trim() : value
    ])
  ));
}

function isEnabled(value) {
  return value === '' || value == null || !['否', 'N', 'n', 'false', false].includes(value);
}

function normalizePagePath(value = '') {
  return String(value).trim().replaceAll('\\', '/').replace(/^(\.\.\/)?pages\//, '');
}

function readPageSchemaPaths() {
  const schemaDir = path.join('schemas', 'pages');
  const result = new Map();
  if (!fs.existsSync(schemaDir)) return result;
  for (const filePath of listJsonFiles(schemaDir)) {
    const pageSchema = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!pageSchema.pageName) continue;
    const output = pageSchema.outputPath || `pages/${pageSchema.module || 'project'}/${pageSchema.pageCode}.html`;
    result.set(pageSchema.pageName, normalizePagePath(output));
    if (pageSchema.menuPath) {
      const menuName = String(pageSchema.menuPath).split('/').pop().trim();
      if (menuName) result.set(menuName, normalizePagePath(output));
    }
  }
  return result;
}

function listJsonFiles(dirPath) {
  const result = [];
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      result.push(...listJsonFiles(fullPath));
    } else if (entry.name.endsWith('.json')) {
      result.push(fullPath);
    }
  }
  return result;
}

function renderHtml(schema, menuData, companies) {
  const systemName = schema.systemName || 'PMS业财一体化系统';
  const defaultPageInfo = findFirstPage(menuData) || {
    moduleName: '项目驾驶舱',
    pageName: '项目驾驶舱',
    path: 'report/project-lifecycle-dashboard.html'
  };
  const defaultPage = '../pages/' + defaultPageInfo.path;
  const companyOptions = companies
    .map((company, index) => `<option value="${escapeHtml(company)}"${index === 0 ? ' selected' : ''}>${escapeHtml(company)}</option>`)
    .join('');
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(systemName)}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css">
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      height: 100vh;
      overflow: hidden;
      background: #f1f5f9;
      color: #1e293b;
      font-family: "Microsoft YaHei", "PingFang SC", Arial, sans-serif;
      font-size: 14px;
    }
    .shell { display: flex; height: 100vh; }
    .sidebar {
      width: 232px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      background: #1e3a5f;
      color: #fff;
      overflow: hidden;
    }
    .brand {
      height: 60px;
      display: flex;
      align-items: center;
      padding: 0 18px;
      border-bottom: 1px solid rgba(255,255,255,.12);
      font-size: 16px;
      font-weight: 600;
      flex-shrink: 0;
    }
    .menu {
      flex: 1;
      min-height: 0;
      padding: 8px 0;
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: rgba(255,255,255,.28) transparent;
    }
    .menu::-webkit-scrollbar { width: 6px; }
    .menu::-webkit-scrollbar-thumb { border-radius: 6px; background: rgba(255,255,255,.28); }
    .menu-primary {
      width: 100%;
      height: 44px;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 0 16px;
      border: 0;
      background: transparent;
      color: rgba(255,255,255,.78);
      text-align: left;
      cursor: pointer;
    }
    .menu-primary:hover, .menu-primary.active { background: rgba(255,255,255,.10); color: #fff; }
    .menu-primary i:first-child { width: 18px; text-align: center; }
    .menu-primary .arrow { margin-left: auto; transition: transform .2s ease; font-size: 11px; }
    .menu-section.open .arrow { transform: rotate(90deg); }
    .submenu { display: none; background: rgba(0,0,0,.14); padding: 4px 0; }
    .menu-section.open .submenu { display: block; }
    .submenu button {
      width: 100%;
      height: 38px;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 16px 0 44px;
      border: 0;
      background: transparent;
      color: rgba(255,255,255,.68);
      text-align: left;
      cursor: pointer;
    }
    .submenu button:hover, .submenu button.active { background: rgba(255,255,255,.10); color: #fff; }
    .main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .topbar {
      height: 60px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 18px;
      background: #fff;
      border-bottom: 1px solid #e2e8f0;
    }
    .breadcrumb { display: flex; align-items: center; gap: 8px; min-width: 0; font-size: 14px; }
    .breadcrumb-home { color: #64748b; }
    .breadcrumb-separator { color: #cbd5e1; }
    .breadcrumb-current { min-width: 0; overflow: hidden; color: #1e293b; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
    .topbar-actions { display: flex; align-items: center; gap: 16px; min-width: 0; }
    .company-select-wrap { position: relative; display: flex; align-items: center; }
    .company-select-wrap > i { position: absolute; left: 12px; z-index: 1; color: #64748b; pointer-events: none; }
    .company-select {
      width: min(360px, 34vw);
      height: 36px;
      padding: 0 34px 0 34px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      outline: none;
      background: #fff;
      color: #334155;
      font: inherit;
      cursor: pointer;
    }
    .company-select:hover { border-color: #94a3b8; }
    .company-select:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,.12); }
    .user-menu { position: relative; }
    .user {
      display: flex;
      min-height: 40px;
      align-items: center;
      gap: 8px;
      padding: 4px 8px;
      border: 0;
      border-radius: 6px;
      background: transparent;
      color: #64748b;
      cursor: pointer;
    }
    .user:hover, .user[aria-expanded="true"] { background: #f1f5f9; color: #334155; }
    .user:focus-visible, .menu-primary:focus-visible, .submenu button:focus-visible, .logout-button:focus-visible {
      outline: 2px solid #3b82f6;
      outline-offset: -2px;
    }
    .user .fa-angle-down { font-size: 11px; transition: transform .2s ease; }
    .user[aria-expanded="true"] .fa-angle-down { transform: rotate(180deg); }
    .avatar {
      width: 28px;
      height: 28px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: #2563eb;
      color: #fff;
      font-size: 12px;
    }
    .user-dropdown {
      position: absolute;
      z-index: 30;
      top: calc(100% + 8px);
      right: 0;
      width: 152px;
      padding: 6px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: #fff;
      box-shadow: 0 10px 24px rgba(15, 23, 42, .12);
    }
    .user-dropdown[hidden] { display: none; }
    .logout-button {
      width: 100%;
      height: 36px;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 0 12px;
      border: 0;
      border-radius: 6px;
      background: transparent;
      color: #ef4444;
      text-align: left;
      cursor: pointer;
    }
    .logout-button:hover { background: #fef2f2; }
    .content { flex: 1; min-height: 0; padding: 12px; }
    iframe {
      width: 100%;
      height: 100%;
      border: 0;
      border-radius: 8px;
      background: #fff;
      box-shadow: 0 1px 2px rgba(0,0,0,.05);
    }
  </style>
</head>
<body>
  <div class="shell">
    <aside class="sidebar">
      <div class="brand">${escapeHtml(systemName)}</div>
      <nav class="menu" id="menu"></nav>
    </aside>
    <main class="main">
      <header class="topbar">
        <nav class="breadcrumb" aria-label="面包屑">
          <span class="breadcrumb-home"><i class="fas fa-house"></i> 项目驾驶舱</span>
          <span class="breadcrumb-separator" id="breadcrumbModuleSeparator">/</span>
          <span id="breadcrumbModule">${escapeHtml(defaultPageInfo.moduleName)}</span>
          <span class="breadcrumb-separator" id="breadcrumbPageSeparator">/</span>
          <span class="breadcrumb-current" id="breadcrumbPage">${escapeHtml(defaultPageInfo.pageName)}</span>
        </nav>
        <div class="topbar-actions">
          <label class="company-select-wrap">
            <span hidden>当前公司</span>
            <i class="fas fa-building"></i>
            <select class="company-select" id="companySelect" aria-label="选择公司">${companyOptions}</select>
          </label>
          <div class="user-menu">
            <button class="user" id="userMenuTrigger" type="button" aria-expanded="false" aria-haspopup="menu">
              <span class="avatar">管</span><span>管理员</span><i class="fas fa-angle-down" aria-hidden="true"></i>
            </button>
            <div class="user-dropdown" id="userDropdown" role="menu" hidden>
              <button class="logout-button" id="logoutButton" type="button" role="menuitem">
                <i class="fas fa-right-from-bracket" aria-hidden="true"></i><span>退出登录</span>
              </button>
            </div>
          </div>
        </div>
      </header>
      <section class="content">
        <iframe id="contentFrame" src="${escapeHtml(defaultPage)}"></iframe>
      </section>
    </main>
  </div>
  <script>
    const menuData = ${JSON.stringify(menuData, null, 6)};
    const menuRoot = document.getElementById('menu');
    const frame = document.getElementById('contentFrame');
    const breadcrumbModule = document.getElementById('breadcrumbModule');
    const breadcrumbModuleSeparator = document.getElementById('breadcrumbModuleSeparator');
    const breadcrumbPage = document.getElementById('breadcrumbPage');
    const breadcrumbPageSeparator = document.getElementById('breadcrumbPageSeparator');
    const companySelect = document.getElementById('companySelect');

    function pageSrc(path) {
      if (!path || path === '#') return '';
      return path.startsWith('../') ? path : '../pages/' + path;
    }

    function updateBreadcrumb(moduleName, pageName) {
      const isHome = moduleName === '项目驾驶舱';
      const isSinglePage = moduleName === pageName;
      breadcrumbModule.textContent = moduleName;
      breadcrumbPage.textContent = pageName;
      breadcrumbModule.hidden = isHome;
      breadcrumbModuleSeparator.hidden = isHome;
      breadcrumbPage.hidden = isHome || isSinglePage;
      breadcrumbPageSeparator.hidden = isHome || isSinglePage;
    }

    function openPage(moduleName, name, path) {
      const src = pageSrc(path);
      if (!src) return;
      frame.src = src;
      updateBreadcrumb(moduleName, name);
      document.querySelectorAll('.submenu button, .menu-primary').forEach((el) => el.classList.remove('active'));
      const menuPath = path.split(/[?#]/)[0];
      const active = document.querySelector('[data-path="' + CSS.escape(menuPath) + '"]');
      if (active) active.classList.add('active');
    }

    function renderMenu() {
      menuRoot.innerHTML = '';
      menuData.forEach((menu, index) => {
        const section = document.createElement('section');
        section.className = 'menu-section';
        if (index === 0 && menu.children.length) section.classList.add('open');

        const primary = document.createElement('button');
        primary.type = 'button';
        primary.className = 'menu-primary';
        primary.dataset.path = menu.path || '';
        primary.innerHTML = '<i class="fas fa-' + (menu.icon || 'folder') + '"></i><span>' + menu.name + '</span>' + (menu.children.length ? '<i class="fas fa-chevron-right arrow"></i>' : '');
        primary.addEventListener('click', () => {
          if (!menu.children.length) {
            openPage(menu.name, menu.name, menu.path);
            return;
          }
          section.classList.toggle('open');
        });
        section.appendChild(primary);

        if (menu.children.length) {
          const submenu = document.createElement('div');
          submenu.className = 'submenu';
          menu.children.forEach((child) => {
            const item = document.createElement('button');
            item.type = 'button';
            item.dataset.path = child.path || '';
            item.innerHTML = '<span>' + child.name + '</span>';
            item.addEventListener('click', () => openPage(menu.name, child.name, child.path));
            submenu.appendChild(item);
          });
          section.appendChild(submenu);
        }
        menuRoot.appendChild(section);
      });
    }

    renderMenu();
    updateBreadcrumb(${JSON.stringify(defaultPageInfo.moduleName)}, ${JSON.stringify(defaultPageInfo.pageName)});

    window.addEventListener('message', (event) => {
      const message = event.data || {};
      if (message.type !== 'pms-open-page' || !message.path) return;
      openPage(message.moduleName || message.pageName || '', message.pageName || message.moduleName || '', message.path);
    });

    const savedCompany = localStorage.getItem('pms-current-company');
    if (savedCompany && [...companySelect.options].some((option) => option.value === savedCompany)) {
      companySelect.value = savedCompany;
    }
    companySelect.addEventListener('change', () => {
      localStorage.setItem('pms-current-company', companySelect.value);
    });

    const userMenuTrigger = document.getElementById('userMenuTrigger');
    const userDropdown = document.getElementById('userDropdown');

    function closeUserMenu() {
      userDropdown.hidden = true;
      userMenuTrigger.setAttribute('aria-expanded', 'false');
    }

    userMenuTrigger.addEventListener('click', (event) => {
      event.stopPropagation();
      const opening = userDropdown.hidden;
      userDropdown.hidden = !opening;
      userMenuTrigger.setAttribute('aria-expanded', String(opening));
    });

    document.addEventListener('click', closeUserMenu);
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeUserMenu();
    });

    document.getElementById('logoutButton').addEventListener('click', () => {
      localStorage.removeItem('pms-login-state');
      window.location.href = 'login.html';
    });
  </script>
</body>
</html>
`;
}

function findFirstPage(menuData) {
  for (const menu of menuData) {
    if (menu.path && menu.path !== '#') {
      return { moduleName: menu.name, pageName: menu.name, path: menu.path };
    }
    const child = menu.children.find((item) => item.path && item.path !== '#');
    if (child) return { moduleName: menu.name, pageName: child.name, path: child.path };
  }
  return null;
}

function loadCompanies() {
  const sourceDir = path.resolve('docs', '财务需求');
  if (!fs.existsSync(sourceDir)) return [];

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    if (!entry.isFile() || !/\.xlsx?$/i.test(entry.name)) continue;
    const workbook = XLSX.readFile(path.join(sourceDir, entry.name));
    const sheet = workbook.Sheets['编码规则-统一范围'];
    if (!sheet) continue;

    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    const header = rows.find((row) => row.includes('公司名称'));
    const companyColumn = header?.indexOf('公司名称') ?? -1;
    if (companyColumn < 1) continue;

    const result = rows
      .filter((row) => /^[A-Z0-9]{15,20}$/.test(String(row[companyColumn - 1]).trim()))
      .map((row) => String(row[companyColumn]).trim())
      .filter(Boolean);
    if (result.length) return [...new Set(result)];
  }

  return [];
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
