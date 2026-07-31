# Ant Design Pro Style Template Index

This index maps page types and business components to the static templates used by the PMS HTML generation pipeline.

## Page Templates

| Page Type | Template | Typical Menus |
| --- | --- | --- |
| `list` | `list-page.html` | Contract, customer, invoice, receipt, approval and ledger lists. |
| `workflow-detail` | `detail-page.html` | Workflow documents sharing add, draft, review and completed states. |
| `non-workflow-detail` | `non-workflow-detail-page.html` | Forms without approval, providing return, save and submit. |
| `ledger-tab-detail` | `ledger-tab-detail-page.html` | Ledger details with basic data, related data and business extension tabs. |
| `tree-table` | `tree-table-page.html` | Organization, location, project type, WBS and account hierarchy. |
| `master-data-config` | `master-data-config-page.html` | Dictionary, category, parameter and rule master data. |
| `relation-config` | `relation-config-page.html` | Project, contract, accounting dimension and mapping relationships. |
| `data-select-modal` | `data-select-modal.html` | Search, select, paginate and confirm reference data. |
| `component-gallery` | `component-gallery.html` | Registered base, feedback and Pro component coverage. |
| `state-matrix` | `state-matrix.html` | Loading, empty, error, disabled, permission and exception states. |

## Component Fragments

| Schema Component | Fragment | Notes |
| --- | --- | --- |
| `ProSearchForm` | `components/pro-search-form.html` | 4-column query form with search/reset/advanced actions. |
| `ProTable` | `components/pro-table.html` | Table + bottom-right pagination; standard business lists do not show refresh, fullscreen, or column-setting tools, show one row per real business status or 5 rows without status, and use horizontal-only scrolling. |
| `DetailForm` | `components/detail-form.html` | Three-column sectioned detail fields inside a single content panel. |
| `EditableTable` | `components/editable-table.html` | Editable line item table. |
| `BizfinChain` | `components/bizfin-chain.html` | Project -> contract -> budget -> receipt -> voucher. |
| `StatusFlow` | `components/status-flow.html` | Lifecycle or approval state sequence. |
| `AmountSummary` | `components/amount-summary.html` | Money, ratio, and progress summary. |
| `ApprovalPanel` | `components/approval-panel.html` | Approval decision and comment area. |
| `ProModalForm` | `components/pro-modal-form.html` | Lightweight confirmation or auxiliary operation only; full business forms use page detail views. |
| `ProDetailDrawer` | `components/pro-detail-drawer.html` | Right-side detail drawer. |
| `ProTabsDetail` | `components/pro-tabs-detail.html` | Single-panel multi-tab detail area; nested section cards remove duplicate borders and shadows, and tab-level business actions align left. |
| `ProDescriptionList` | `components/pro-description-list.html` | Read-only description fields. |
| `ProStatCard` | `components/pro-stat-card.html` | Single KPI card. |
| `ProChartCard` | `components/pro-chart-card.html` | Chart container. |
| `ProTreeTable` | `components/pro-tree-table.html` | Left tree + right table. |
| `ProUploadList` | `components/pro-upload-list.html` | Upload and attachment table. |
| `ProTimeline` | `components/pro-timeline.html` | Process timeline. |
| `ProBatchToolbar` | `components/pro-batch-toolbar.html` | Batch operation bar. |
| `ProColumnSetting` | `components/pro-column-setting.html` | Table column settings. |
| `ProDataSelectModal` | `components/pro-data-select-modal.html` | Reference data selector. |
| `ProResult` | `components/pro-result.html` | Operation result block. |
| `ProImportPanel` | `components/pro-import-panel.html` | Import workflow panel. |

## Selection Rules

- First match one of the ten page structures above; do not create a new page structure when an existing one fits.
- List and detail pages use the same 56px title/action row height.
- List pages use a four-column query panel. When a row has fewer than four filters, actions occupy the remaining cells and align right; lists show one row per status or five rows when no status exists.
- Table headers across all page samples use the shared 14px regular-weight secondary-text style; page schemas must not add local bold header overrides.
- Page actions are right aligned in the title row, standard business lists omit table utility tools, tab-level business actions are left aligned, and row actions use text links.
- Identifier links replace row-level view and edit buttons. Workflow drafts open editable detail, other workflow statuses open read-only detail, and non-workflow records open editable detail.
- Wide business lists fix the selection column and first identifier column at the left edge with opaque backgrounds, while the delete-only operation column stays fixed at the right edge.
- Delete remains visible on every row; only draft workflow rows are enabled, while non-workflow rows are enabled by default.
- Search labels must fit without clipping; range controls must stay inside their grid cell, and ordinary project filters use a registered `Select` instead of an input-plus-button picker.
- Workflow details share one HTML across add, draft, review and completed states; only draft is editable.
- Review-state headers expose one `审核` entry. `驳回` and `审核通过` are decisions in the detail-page approval panel, never duplicate header actions.
- Modal and drawer components are reserved for reference-data selection, column settings, and lightweight confirmation; they must not contain complete business add/edit/detail forms.
- Non-workflow details omit workflow actions and approval history.
- Ledger detail pages use a single tab panel with three equal-width fields per row.
- Active tab labels are not repeated as inner section headings. Short tab tables omit pagination, and approval history is opened from the workflow action area instead of a duplicate tab.
- Select, add, split and similar actions inside a tab use the left side of the tab content toolbar; only page-level actions use the right side of the header.
- Tree-table pages keep the hierarchy on the left and query/table content on the right.
- Configuration pages distinguish stable master data from cross-object relationship mappings.
- Selection modals always include query, selection state, pagination, cancel and confirm.
- Every generated Schema must declare the matched template path and only use registered components.

## Static Delivery Boundary

These templates borrow Ant Design Pro information architecture and interaction patterns, but they are not React components. They are static HTML templates for iframe delivery and direct browser opening.
