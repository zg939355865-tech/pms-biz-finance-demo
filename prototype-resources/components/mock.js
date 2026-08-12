function showMessage(text) {
  if (document.documentElement.dataset.enableToast !== 'true') return;
  const msg = document.createElement('div');
  msg.textContent = text;
  msg.style.position = 'fixed';
  msg.style.top = '16px';
  msg.style.left = '50%';
  msg.style.transform = 'translateX(-50%)';
  msg.style.background = '#fff';
  msg.style.border = '1px solid var(--color-border, #d9d9d9)';
  msg.style.boxShadow = 'var(--shadow-modal, 0 2px 8px rgba(0,0,0,0.15))';
  msg.style.borderRadius = 'var(--radius-base, 6px)';
  msg.style.padding = '8px 16px';
  msg.style.zIndex = '9999';
  document.body.appendChild(msg);
  setTimeout(function () { msg.remove(); }, 1800);
}

document.addEventListener('click', function (event) {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const action = target.dataset.action;
  const messages = {
    query: '查询成功',
    reset: '已重置筛选条件',
    save: '保存成功',
    submit: '提交成功',
    refresh: '刷新成功',
    transfer: '转交成功',
    approve: '处理成功',
    reject: '已驳回'
  };

  if (messages[action]) showMessage(messages[action]);
  if (action === 'delete' && confirm('确认删除该数据吗？')) showMessage('删除成功');
  if (action === 'toggle-modal' || action === 'toggle-drawer') {
    const layer = document.querySelector(target.dataset.target);
    if (layer) layer.hidden = !layer.hidden;
  }
  if (action === 'toggle-dropdown') {
    const menu = target.parentElement.querySelector('.pro-dropdown-menu');
    if (menu) menu.hidden = !menu.hidden;
  }
});

document.querySelectorAll('[data-tabs]').forEach(function (tabs) {
  tabs.addEventListener('click', function (event) {
    const tab = event.target.closest('.pro-tab');
    if (!tab) return;
    tabs.querySelectorAll('.pro-tab').forEach(function (item) {
      item.classList.remove('active');
    });
    tab.classList.add('active');
    if (!tab.dataset.target) return;
    document.querySelectorAll('[data-tab-panel]').forEach(function (panel) {
      panel.hidden = panel.dataset.tabPanel !== tab.dataset.target;
    });
  });
});

document.querySelectorAll('.pro-switch').forEach(function (item) {
  item.setAttribute('role', 'switch');
  item.setAttribute('tabindex', '0');
  function toggle() {
    item.classList.toggle('checked');
    item.setAttribute('aria-checked', item.classList.contains('checked') ? 'true' : 'false');
  }
  item.addEventListener('click', toggle);
  item.addEventListener('keydown', function (event) {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      toggle();
    }
  });
});

document.querySelectorAll('.pro-collapse-header').forEach(function (header) {
  header.addEventListener('click', function () {
    if (header.nextElementSibling) header.nextElementSibling.hidden = !header.nextElementSibling.hidden;
  });
});

document.querySelectorAll('.pro-modal-mask, .pro-drawer-mask').forEach(function (mask) {
  mask.addEventListener('click', function (event) {
    if (event.target === mask || event.target.closest('[data-close]')) mask.hidden = true;
  });
});
