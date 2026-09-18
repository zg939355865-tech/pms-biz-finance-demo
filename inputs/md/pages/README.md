# Page Blueprints

Authoritative writing standard:

```text
rules/page-blueprint-standard.md
rules/page-blueprint-template.md
```

This directory contains AI-generated page blueprints.

Rules:

- Organize by business domain: `inputs/md/pages/{domain}/`.
- One menu function must have one Markdown blueprint.
- The Markdown body is for user review.
- Blueprints only contain content that the user needs to review: page type, regions, fields, actions, status, rules, and page relationships.
- AI converts the confirmed blueprint directly into the formal Schema v2. Users do not need to write JSON blocks in Markdown.
- Every blueprint must copy the 16 top-level sections and fixed subsections from `rules/page-blueprint-template.md` exactly; page-specific differences stay inside those sections as body content.

Path mapping:

```text
inputs/md/pages/{domain}/{page-code}.md
schemas/pages/{domain}/{page-code}.json
pages/{domain}/{page-code}.html
```
