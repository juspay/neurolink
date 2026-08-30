---
name: github-commenting
description: How to post clean, rich, deduplicated GitHub PR review comments — suggestion blocks, multi-line anchors, markers, formatting rules. Load before posting or fixing any PR comment.
---

# Clean GitHub PR commenting

## Before posting anything

1. List the existing review comments AND issue comments on the pull request first.
2. Every comment you post starts with an invisible marker line: `<!-- yama:<stable-finding-id> -->`. If a marker for the same finding already exists, do NOT post it again — update that comment if it needs fixing, otherwise leave it alone.

## Inline comments

- Anchor to the exact file and line in the DIFF. A line that is not part of the diff cannot hold a comment — anchor to the nearest changed line and say so.
- Multi-line ranges: `start_line` is the first line, `line` is the last; `side` / `start_side` are `RIGHT` for added lines and `LEFT` for deleted ones.
- Tool shapes differ: some GitHub MCP servers post an inline comment in one call; the hosted server may require the pending-review lifecycle (create review → add comments → submit). If a pending review is opened it MUST be submitted — both or neither, never half.

## Suggestion blocks — a fix the author applies in one click

Explain the issue in one or two sentences ABOVE the block, then:

````markdown
```suggestion
the replacement for the entire anchored line range
```
````

- The block's body replaces the WHOLE `start_line..line` range — include every line of the range, exactly indented.
- If the replacement itself contains triple backticks (markdown files, code fences), use a four-backtick outer fence (` ````suggestion `) so GitHub does not close the block early.
- Prefer a suggestion block whenever you propose a concrete code fix - it is the fix the author applies in one click, and an inline comment about a code change should normally carry one. Fall back to prose only when the right code is genuinely uncertain.

## Formatting for humans

- One finding per comment: **severity** (CRITICAL / MAJOR / MINOR), what breaks, why it matters here, and the fix.
- Cite rulebook ids where they apply.
- Evidence longer than ~10 lines goes in a collapsible section: `<details><summary>evidence</summary>…</details>`.
- Prefer short headers, tables and task lists over walls of prose. No emoji noise.

## The one summary comment

Post exactly ONE summary comment (an issue comment on the PR), marker `<!-- yama:summary -->`:

- verdict at the top (**APPROVE** or **NEEDS_WORK**), one sentence of rationale,
- a short table of findings — severity, `file:line`, one-line description,
- what was checked and found clean, so silence is distinguishable from absence.

If a comment with that marker already exists, UPDATE it — never add a second summary.
