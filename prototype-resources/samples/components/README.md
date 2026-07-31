# Component Fragment Library

This directory stores reusable static HTML fragments for the PMS page generation pipeline.

Rules:

- Fragments are not standalone pages.
- Fragments follow Ant Design Pro interaction patterns, but remain static HTML/CSS/JS.
- Generated pages should identify each rendered fragment with `data-component`.
- Component files are the reference structure for generator output and manual review.
- Do not introduce React-only APIs here.

## Schema v2 Contract

- `../../components/component-registry.json` is the authoritative component registry in this resource center.
- `schemas/meta/pms-page-schema-v2.schema.json` defines the page document contract.
- `scripts/generate/page-from-schema.mjs` renders registered components recursively.
- `scripts/check/schema-check.mjs` rejects unknown components, field controls, and column controls.
- Existing fragment files remain visual structure references; Schema is the executable source.

The registry covers layout, form, data display, business, and feedback components. It includes Ant Design-style primitives such as tabs, steps, collapse, form controls, descriptions, tags, badges, progress, timeline, modal, drawer, alert, result, empty, spin, skeleton, and popconfirm, plus the PMS Pro and biz-fin components below.

## Core Components

| Component | File | Usage |
| --- | --- | --- |
| `ProSearchForm` | `pro-search-form.html` | Query/filter area for list, ledger, approval, and report pages. |
| `ProTable` | `pro-table.html` | Dense enterprise data table; defaults to 5 rows per page and horizontal-only table scrolling. |
| `DetailForm` | `detail-form.html` | Detail/read-edit form blocks. |
| `EditableTable` | `editable-table.html` | Line-item editing for plans, invoices, receipts, and cost details. |
| `BizfinChain` | `bizfin-chain.html` | Business-finance trace chain such as project -> contract -> receipt -> voucher. |
| `StatusFlow` | `status-flow.html` | Status lifecycle and approval flow display. |
| `AmountSummary` | `amount-summary.html` | Money and ratio summary strip. |
| `ApprovalPanel` | `approval-panel.html` | Approval decision, comment, and history panel. |
| `ProModalForm` | `pro-modal-form.html` | Lightweight confirmation or auxiliary operation; not a complete add/edit business form. |
| `ProDetailDrawer` | `pro-detail-drawer.html` | Auxiliary preview or settings drawer; primary details use page navigation. |
| `DataSelectModal` | `data-select-modal.html` | Selection modal for project/customer/contract reference data. |
| `UploadList` | `upload-list.html` | Attachment list and upload area. |
| `HistoryTable` | `history-table.html` | Operation or approval history table. |
| `ProTabsDetail` | `pro-tabs-detail.html` | Multi-tab detail page sections; business actions inside a tab are left aligned. |
| `ProFilterTabs` | Schema-generated | List-view classification tabs that apply a base filter to one `ProTable`; search conditions remain available as secondary filters. |
| `ProDescriptionList` | `pro-description-list.html` | Read-only field description list. |
| `ProStatCard` | `pro-stat-card.html` | KPI metric card. |
| `ProChartCard` | `pro-chart-card.html` | Chart card container. |
| `ProTreeTable` | `pro-tree-table.html` | Left tree + right table layout. |
| `ProUploadList` | `pro-upload-list.html` | Attachment upload and file list. |
| `ProTimeline` | `pro-timeline.html` | Process, operation, and approval timeline. |
| `ProBatchToolbar` | `pro-batch-toolbar.html` | Batch operation bar for selected rows. |
| `ProColumnSetting` | `pro-column-setting.html` | Table column visibility and order panel. |
| `ProDataSelectModal` | `pro-data-select-modal.html` | Queryable multi-select reference data modal. |
| `ProResult` | `pro-result.html` | Success, warning, empty, and exception result view. |
| `ProImportPanel` | `pro-import-panel.html` | Import wizard, upload, validation, and result table. |

## Placeholder Convention

Use `{{PLACEHOLDER}}` tokens in fragments:

- `{{FIELDS}}`
- `{{COLUMNS}}`
- `{{ROWS}}`
- `{{ACTIONS}}`
- `{{SUMMARY_ITEMS}}`
- `{{STATUS_NODES}}`
- `{{CHAIN_NODES}}`
- `{{PAGINATION}}`
- `{{TAB_HEADERS}}`
- `{{TAB_PANELS}}`
- `{{TIMELINE_ITEMS}}`
- `{{COLUMN_ITEMS}}`

## List Defaults

- `list-page.html` removes the duplicated iframe body padding and keeps a compact 12px top inset.
- `ProTable` uses 5 rows per page by default.
- Primary business lists with no more than 6 business columns automatically use the shared balanced-column layout; headers and values are centered to avoid uneven empty gaps. Wider lists keep semantic alignment and internal horizontal scrolling.
- `ProTable` assigns semantic default widths instead of equal widths: sequence 72px, status 104px, people 128px, numeric 112px, date 136px, datetime 168px, code 176px, name 200px, general text 160px, and long descriptions 280px. Plain text overflows with an ellipsis and exposes the full value through the native hover title. Override with `columns[].width`; use `columns[].ellipsis: false` only when full inline display is explicitly required.
- Primary document lists with a status field show one representative row for each status; primary lists without status show at most 5 rows.
- Standard business lists do not display refresh, fullscreen, or column-setting tools. Add a table toolbar only for an explicit business command.
- Wide tables scroll horizontally inside the table region; vertical table scrolling is disabled. The selection column and first identifier link column remain fixed left with opaque backgrounds, and the operation column remains fixed right.
- Query forms keep a four-column baseline. For one to three filters, the action group fills the remaining cells and aligns right; multi-row forms apply the same rule to the final row.
- All sample table headers use the shared enterprise typography tokens: 14px, regular 400 weight, secondary text color, and zero letter spacing.
- Tab content uses registered `DetailForm`, `EditableTable`, and `ProTable` components without repeating the active tab name as an inner section title.
- Tab-level actions such as select, add, and split are placed at the left edge of the content toolbar; page-level primary actions remain right aligned in the page header.
- Short related-data tables with at most 5 prototype rows set `pagination: false`; pagination remains available for real paged datasets.
- Approval records are opened from the workflow action area and are not duplicated as a detail tab.
- Row selection does not insert a selected-count prompt bar or change the table height.
- Primary business lists use the shared square checkbox selection. Actions that operate on exactly one record declare `requiresSingleSelection`; radio selection is reserved for explicit single-select data modals.
- When workflow status drives permissions but is not a requested visible column, declare `ProTable.statusCode`; the generated row keeps the hidden status for review, reverse-review, delete permissions, and detail mode.
- Shared row and batch deletion update the table record counter immediately.
- Destructive batch actions remain disabled until an eligible row is selected; document schemas may restrict selection to draft statuses.
- System-generated records use `systemGenerated: true`: omit create and delete actions and the operation column. Review/reverse-review uses shared single-selection actions in the page header, enabled only when the selected row is in the matching source status.
- Page-level create, batch, export, submit and review actions belong at the right side of the title row. Standard business lists omit refresh, fullscreen and column-setting tools. Row actions use compact text links.
- Business maintenance lists use `keepOperationColumn: true`; the fixed operation column contains delete only.
- The identifier link is the only list entry for viewing or editing: workflow drafts open editable detail, other workflow statuses open read-only detail, and non-workflow records open editable detail.
- Every business maintenance list renders a fixed-right delete-only operation column. Workflow rows enable delete only for `草稿`; other statuses keep delete visible but disabled. Non-workflow lists enable delete for every row.
- Read-only reports, monitoring tables, selection dialogs, and detail sub-tables do not inherit the business-list delete rule.
- Add, edit, view, and review processing use list/detail page switching. Complete business forms must not open in a modal or drawer.
- Workflow detail headers follow status actions: draft = back/save/submit; review = workflow links/back/review. Reject and approve decisions belong in the detail-page approval panel; completed = workflow links/back.
- Empty controls in view-only or otherwise read-only details render blank instead of showing input placeholders such as `请输入` or `请选择`; editable create and draft modes restore their configured placeholders.
- Opening a detail from a list create action starts with empty business fields and never reuses schema sample data or another record. Only system-initialized draft/project status, creator, creation time, and current company values remain. Read-only fields populated from an upstream picker stay empty until a selection is confirmed. Opening a draft edit restores the record's existing values.

## Historical Page Compatibility

- Specialized historical dashboards and monitoring pages use `legacy-page-bridge.css` and `legacy-page-bridge.js` to consume public tokens, controls, table semantics, and long-text hover behavior without replacing their domain-specific chart layout.
- New business maintenance pages must use formal Schema and registered components. A bridged historical page must migrate to Schema when its page structure is redesigned.
- The project Harness audits every delivered page at 1440px and 2048px and rejects missing public style references, missing menu targets, blank pages, runtime errors, or page-level horizontal overflow.
