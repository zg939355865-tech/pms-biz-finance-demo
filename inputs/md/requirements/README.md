# Raw Requirement Inputs

Use this directory for short user requirements.

Rules:

- One file can cover one business loop or one requirement batch.
- Do not split raw input mechanically by menu.
- Keep user wording and business context intact.
- AI will split this into one blueprint Markdown file per menu function under `inputs/md/pages/{domain}/`.

Example:

```text
I need contract, invoice, and receipt management.
Contracts are linked to projects and customers.
Invoices come from contracts.
Receipts are linked to invoices.
Show contract amount, invoiced amount, received amount, and outstanding amount.
```
