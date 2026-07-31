(function () {
  'use strict';

  function ensureToastContainer() {
    var container = document.querySelector('.page-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'page-toast-container';
      container.setAttribute('aria-live', 'polite');
      document.body.appendChild(container);
    }
    return container;
  }

  function showMessage(message, type) {
    if (document.documentElement.dataset.enableToast !== 'true') return;
    var toast = document.createElement('div');
    toast.className = 'page-toast page-toast-' + (type || 'info');
    toast.textContent = String(message || '操作完成');
    ensureToastContainer().appendChild(toast);
    window.setTimeout(function () {
      toast.classList.add('leaving');
      window.setTimeout(function () { toast.remove(); }, 200);
    }, 2600);
  }

  function addInitialLoading() {
    var loading = document.createElement('div');
    loading.className = 'page-loading';
    loading.innerHTML = '<span class="page-loading-spinner"></span><span>加载中...</span>';
    document.body.appendChild(loading);
    window.requestAnimationFrame(function () {
      window.setTimeout(function () { loading.classList.add('hidden'); }, 120);
      window.setTimeout(function () { loading.remove(); }, 340);
    });
  }

  function ensureEmptyStates() {
    document.querySelectorAll('table tbody').forEach(function (tbody) {
      if (tbody.children.length > 0 || tbody.querySelector('[v-if], [v-for]')) return;
      var table = tbody.closest('table');
      var columns = table && table.querySelectorAll('thead th').length || 1;
      var row = document.createElement('tr');
      row.className = 'page-empty-row';
      row.innerHTML = '<td colspan="' + columns + '"><div class="empty">暂无数据</div></td>';
      tbody.appendChild(row);
    });
  }

  function bindOperationLoading() {
    document.addEventListener('click', function (event) {
      var button = event.target.closest('button');
      if (!button || button.disabled) return;
      var text = button.textContent.replace(/\s+/g, '');
      if (!/查询|保存|提交|删除|作废|导入|导出|通过|驳回|接单|完成/.test(text)) return;
      window.setTimeout(function () {
        if (!button.isConnected) return;
        button.setAttribute('aria-busy', 'true');
        button.classList.add('btn-loading-state');
        window.setTimeout(function () {
          button.removeAttribute('aria-busy');
          button.classList.remove('btn-loading-state');
        }, 480);
      }, 0);
    }, true);
  }

  function bindDetailModeRules() {
    var workflowPage = /(?:consignment-(?:inbound|outbound|return|settlement)|equipment-(?:scrap|transfer)|purchase-apply|inventory-(?:adjust|check|transfer)|inbound-mgmt|internal-move|outbound-mgmt|sparepart-apply|warehouse-return|project-(?:init|exec|archive)|fault-workorder|outsource-repair|hazard-(?:register|rectify))\.html$/i.test(location.pathname);
    document.addEventListener('click', function (event) {
      var button = event.target.closest('button');
      if (button && /新增|新建/.test(button.textContent)) {
        document.body.classList.remove('system-flow-readonly');
      }

      var cell = event.target.closest('.system-detail-link, .col-link');
      if (!cell || !workflowPage) return;
      var table = cell.closest('table');
      var row = cell.closest('tr');
      if (!table || !row) return;
      var headers = Array.from(table.querySelectorAll('thead tr:first-child th'));
      var statusIndex = headers.findIndex(function (header) {
        return header.textContent.trim() === '状态';
      });
      var status = statusIndex >= 0 && row.children[statusIndex]
        ? row.children[statusIndex].textContent.trim()
        : '';
      document.body.classList.toggle('system-flow-readonly', status !== '草稿');
      window.setTimeout(function () {
        if (!document.body.classList.contains('system-flow-readonly')) return;
        document.querySelectorAll('input, select, textarea').forEach(function (control) {
          if (!control.closest('.search-bar')) control.disabled = true;
        });
      }, 0);
    }, true);
  }

  function normalizeRestoredListActions() {
    document.querySelectorAll('.restored-page .page').forEach(function (page) {
      var header = page.querySelector(':scope > .page-header');
      var primaryActions = page.querySelector('.restored-toolbar-primary');
      var toolbar = page.querySelector('.restored-toolbar');
      if (header && primaryActions && primaryActions.dataset.placementNormalized !== 'true') {
        primaryActions.dataset.placementNormalized = 'true';
        primaryActions.classList.add('pro-page-actions', 'system-page-actions');
        header.appendChild(primaryActions);
      }
      if (toolbar && !toolbar.querySelector('.restored-toolbar-primary')) {
        toolbar.classList.add('system-table-tools-only');
      }

      page.querySelectorAll('table').forEach(function (table) {
        var headers = Array.from(table.querySelectorAll('thead tr:first-child th'));
        var statusIndex = headers.findIndex(function (headerCell) {
          return /^(?:流程)?状态$/.test(headerCell.textContent.trim());
        });
        if (statusIndex < 0) return;
        table.querySelectorAll('tbody tr').forEach(function (row) {
          var status = row.children[statusIndex] ? row.children[statusIndex].textContent.trim() : '';
          var rowSelect = row.querySelector('[data-row-select]');
          if (rowSelect) rowSelect.disabled = status !== '草稿';
          row.querySelectorAll('[data-action="edit"], [data-action="delete"]').forEach(function (button) {
            var allowed = status === '草稿';
            button.disabled = !allowed;
            button.setAttribute('aria-disabled', String(!allowed));
            if (!allowed) button.title = '仅草稿状态可操作';
          });
        });
      });
    });
  }

  function bindRestoredBatchActions() {
    function sync(page) {
      var selected = page.querySelectorAll('[data-row-select]:checked:not(:disabled)').length;
      page.querySelectorAll('[data-action="批量删除"]').forEach(function (button) {
        button.disabled = selected === 0;
      });
    }
    document.querySelectorAll('.restored-page .page').forEach(sync);
    document.addEventListener('change', function (event) {
      if (!event.target.matches('[data-row-select], [data-select-all]')) return;
      var page = event.target.closest('.page');
      if (page) window.setTimeout(function () { sync(page); }, 0);
    });
  }

  function convertRestoredFormModalsToViews() {
    var page = document.querySelector('.restored-page .page');
    if (!page || page.dataset.detailNavigationReady === 'true') return;
    var mask = document.querySelector('.modal-mask');
    var modal = mask && mask.querySelector('.restored-modal');
    var body = modal && modal.querySelector('.modal-body');
    var originalTitle = modal && modal.querySelector('.modal-title');
    if (!mask || !modal || !body || !originalTitle || !/新增|新建|编辑|查看|详情/.test(originalTitle.textContent)) return;

    page.dataset.detailNavigationReady = 'true';
    var pageTitle = (page.querySelector(':scope > .page-header .page-title') || {}).textContent || '业务单据';
    var listChildren = Array.from(page.children);
    var detailView = document.createElement('section');
    detailView.className = 'restored-detail-view';
    detailView.hidden = true;
    detailView.setAttribute('data-page-view', 'detail');
    detailView.innerHTML =
      '<header class="page-header pro-page-header restored-detail-header" data-component="PageHeader">' +
        '<div><h1 class="page-title" data-restored-detail-title></h1></div>' +
        '<div class="pro-page-actions">' +
          '<button class="btn" type="button" data-restored-detail-action="back"><i class="fas fa-arrow-left"></i> 返回列表</button>' +
          '<button class="btn btn-primary" type="button" data-restored-detail-action="save"><i class="fas fa-floppy-disk"></i> 保存</button>' +
        '</div>' +
      '</header>' +
      '<section class="card restored-detail-card" data-component="DetailForm"></section>';
    var detailCard = detailView.querySelector('.restored-detail-card');
    body.classList.remove('modal-body');
    body.classList.add('restored-detail-body');
    detailCard.appendChild(body);
    page.appendChild(detailView);
    mask.remove();

    function showList() {
      listChildren.forEach(function (element) { element.hidden = false; });
      detailView.hidden = true;
      document.body.classList.remove('restored-detail-active');
      window.scrollTo(0, 0);
    }

    function rowStatus(button) {
      var row = button.closest('tr');
      var table = row && row.closest('table');
      if (!row || !table) return '';
      var headers = Array.from(table.querySelectorAll('thead tr:first-child th'));
      var index = headers.findIndex(function (header) { return /^(?:流程)?状态$/.test(header.textContent.trim()); });
      return index >= 0 && row.children[index] ? row.children[index].textContent.trim() : '';
    }

    function showDetail(mode, sourceButton) {
      var status = sourceButton ? rowStatus(sourceButton) : '';
      if (mode === 'edit' && status && status !== '草稿') mode = 'view';
      var readOnly = mode === 'view';
      listChildren.forEach(function (element) { element.hidden = true; });
      detailView.hidden = false;
      document.body.classList.add('restored-detail-active');
      detailView.querySelector('[data-restored-detail-title]').textContent =
        (mode === 'new' ? '新增' : mode === 'edit' ? '编辑' : '查看') + pageTitle;
      detailView.querySelector('[data-restored-detail-action="save"]').hidden = readOnly;
      detailView.querySelectorAll('input, select, textarea').forEach(function (control) {
        if (!control.dataset.restoredInitialReadonly) {
          control.dataset.restoredInitialReadonly = control.readOnly || control.disabled ? 'true' : 'false';
        }
        control.disabled = readOnly || control.dataset.restoredInitialReadonly === 'true';
      });
      window.scrollTo(0, 0);
    }

    document.addEventListener('click', function (event) {
      var button = event.target.closest('button');
      if (!button) return;
      var detailAction = button.dataset.restoredDetailAction;
      var action = button.dataset.action;
      if (detailAction === 'back') {
        event.preventDefault();
        event.stopImmediatePropagation();
        showList();
        return;
      }
      if (detailAction === 'save') {
        event.preventDefault();
        event.stopImmediatePropagation();
        showList();
        return;
      }
      if (!/^(?:新增|新建|edit|view)$/.test(action || '')) return;
      if (!button.closest('.restored-page')) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      showDetail(/新增|新建/.test(action) ? 'new' : action === 'edit' ? 'edit' : 'view', button);
    }, true);
  }

  function normalizePageStructure() {
    document.querySelectorAll(
      '.breadcrumb, .breadcrumbs, .page-breadcrumb, .pro-breadcrumb, #breadcrumb, .page-context, .page-flow-summary'
    ).forEach(function (element) {
      element.remove();
    });

    document.querySelectorAll('table').forEach(function (table) {
      var headers = Array.from(table.querySelectorAll('thead tr:first-child th'));
      if (!headers.length) return;
      headers.forEach(function (header, index) {
        if (!/^操作(?:栏)?$/.test(header.textContent.trim())) return;
        if (table.closest('[data-keep-operation-column="true"]')) return;
        if (table.closest('.detail-section, .detail-card, .modal, .drawer')) return;
        header.classList.add('system-operation-column');
        table.querySelectorAll('tbody tr').forEach(function (row) {
          if (row.children[index]) row.children[index].classList.add('system-operation-column');
        });
      });

      var identifierIndex = headers.findIndex(function (header) {
        return /(?:编码|编号|单号|工单号|申请单号|订单号|记录号|ID)$/i.test(header.textContent.trim());
      });
      if (identifierIndex < 0) return;
      if (table.closest('[data-identifier-clickable="false"]')) return;
      table.querySelectorAll('tbody tr').forEach(function (row) {
        var cell = row.children[identifierIndex];
        if (cell) cell.classList.add('system-detail-link');
      });
    });

    document.querySelectorAll('.card-title, .section-title, .detail-section-title, .sub-title, h2, h3, h4').forEach(function (heading) {
      if (!/基础信息|基本信息|系统信息|单据信息|业务信息|申请信息|验收信息|计划信息/.test(heading.textContent)) return;
      var section = heading.closest(
        '.card, .panel, .detail-section, .detail-card, .form-section, .section-card, .modal-body, .page-container'
      );
      if (!section) return;
      section.classList.add('system-basic-info');
      var grid = section.querySelector('.form-grid, .detail-grid, .description-grid, .info-grid, .pro-description-list');
      if (grid) {
        grid.classList.add('system-basic-info-grid');
        grid.classList.add('detail-form-grid');
      }
      var detailTable = section.querySelector('.detail-table');
      if (detailTable) {
        detailTable.classList.add('system-basic-info-table');
        detailTable.querySelectorAll('td').forEach(function (cell) {
          if (!cell.textContent.trim() && cell.children.length === 0) cell.remove();
        });
        detailTable.querySelectorAll('td[colspan]').forEach(function (cell) {
          if (Number(cell.getAttribute('colspan')) <= 1) return;
          var label = cell.previousElementSibling;
          if (label && label.classList.contains('dt-label')) {
            var labelsBefore = Array.from(detailTable.querySelectorAll('.dt-label')).indexOf(label);
            var fieldSlot = labelsBefore % 3;
            label.classList.add('system-wide-label');
            cell.classList.add('system-wide-value');
            cell.style.gridColumn = 'span ' + (5 - fieldSlot * 2);
          }
        });
      }
    });

    document.querySelectorAll('.modal-overlay').forEach(function (overlay) {
      var title = overlay.querySelector('.modal-title, .modal-header h3, .modal-header h2');
      if (!title) return;
      var text = title.textContent.trim();
      if (/新增|新建|编辑|详情/.test(text) && !/选择|确认删除|确认作废/.test(text)) {
        overlay.classList.add('system-detail-page-modal');
        var body = overlay.querySelector('.modal-body');
        if (body && body.querySelector('.form-row, .detail-grid, .description-grid, .info-grid')) {
          var formGrid = body.querySelector('.detail-grid, .description-grid, .info-grid');
          (formGrid || body).classList.add('detail-form-grid');
        }
      }
    });
  }

  function replaceButtonText(button, source, target) {
    Array.from(button.childNodes).forEach(function (node) {
      if (node.nodeType === Node.TEXT_NODE && node.nodeValue.indexOf(source) >= 0) {
        node.nodeValue = node.nodeValue.replace(source, target);
      }
    });
  }

  function normalizeWorkflowStructure() {
    document.querySelectorAll('button').forEach(function (button) {
      if (button.textContent.indexOf('流程历史') >= 0) {
        replaceButtonText(button, '流程历史', '流程图');
      }
    });

    document.querySelectorAll('.detail-section-title, .card-title, .section-title').forEach(function (title) {
      var text = title.textContent.trim();
      var section = title.closest('.detail-section, .detail-card, .card, .section-card');
      if (!section) return;

      if (text === '当前处理信息') {
        section.hidden = true;
        section.classList.add('system-duplicate-process-section');
        return;
      }

      if (text !== '流程历史' || section.dataset.workflowNormalized === 'true') return;
      title.textContent = '流程图';
      section.dataset.workflowNormalized = 'true';

      var table = section.querySelector('table');
      if (!table) return;
      var rows = Array.from(table.querySelectorAll('tbody tr')).filter(function (row) {
        return row.children.length > 1 && !row.hidden;
      });
      var graph = document.createElement('div');
      graph.className = 'system-workflow-graph';

      rows.forEach(function (row, index) {
        var cells = row.children;
        var nodeName = cells[0] ? cells[0].textContent.trim() : '流程节点';
        var handler = cells[1] ? cells[1].textContent.trim() : '-';
        var result = cells[4] ? cells[4].textContent.trim() : '';
        var status = /已完成|通过|完成|已关闭/.test(result)
          ? 'done'
          : (/处理中|待处理|待审批|进行中/.test(result) ? 'current' : '');
        var node = document.createElement('div');
        node.className = 'system-workflow-node ' + status;
        node.innerHTML =
          '<span class="system-workflow-marker">' + (status === 'done' ? '✓' : String(index + 1)) + '</span>' +
          '<strong>' + nodeName + '</strong>' +
          '<small>' + (handler || '-') + (result ? ' · ' + result : '') + '</small>';
        graph.appendChild(node);
        if (index < rows.length - 1) {
          var connector = document.createElement('span');
          connector.className = 'system-workflow-connector ' + (status === 'done' ? 'done' : '');
          graph.appendChild(connector);
        }
      });

      if (!rows.length) {
        graph.innerHTML = '<div class="empty">暂无流程记录</div>';
      }
      title.insertAdjacentElement('afterend', graph);
      var wrapper = table.closest('.eam-table-wrapper, .table-scroll') || table;
      wrapper.hidden = true;
    });
  }

  function applyUrlMode() {
    var mode = new URLSearchParams(location.search).get('mode');
    if (!/^(view|process)$/.test(mode || '')) return;
    document.body.classList.add('page-mode-' + mode);
    window.setTimeout(function () {
      document.querySelectorAll('input, select, textarea').forEach(function (control) {
        if (!control.closest('.search-bar')) control.disabled = true;
      });
    }, 0);
  }

  window.EAMPage = {
    message: showMessage,
    loading: function (active, text) {
      var loading = document.querySelector('.page-loading');
      if (active) {
        if (!loading) addInitialLoading();
        loading = document.querySelector('.page-loading');
        if (loading) {
          loading.classList.remove('hidden');
          var label = loading.querySelector('span:last-child');
          if (label) label.textContent = text || '加载中...';
        }
      } else if (loading) {
        loading.classList.add('hidden');
      }
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    if (/(?:dashboard|screen)\.html$/i.test(location.pathname)) {
      document.body.classList.add('page-screen');
    }
    addInitialLoading();
    ensureEmptyStates();
    bindOperationLoading();
    bindDetailModeRules();
    applyUrlMode();
    normalizePageStructure();
    normalizeWorkflowStructure();
    normalizeRestoredListActions();
    bindRestoredBatchActions();
    convertRestoredFormModalsToViews();
    var observer = new MutationObserver(function () {
      normalizePageStructure();
      normalizeWorkflowStructure();
      normalizeRestoredListActions();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
})();
