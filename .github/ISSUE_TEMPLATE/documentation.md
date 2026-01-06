---
name: Documentation Issue
about: Report missing, incorrect, or unclear documentation
title: "[DOCS] "
labels: "documentation, needs-triage"
assignees: ""
---

## Documentation Issue Type

Please select the type of documentation issue:

- [ ] Missing documentation
- [ ] Incorrect/outdated information
- [ ] Unclear or confusing explanation
- [ ] Broken link
- [ ] Code example doesn't work
- [ ] Typo or formatting issue
- [ ] Other (please describe)

## Location

**Where is the documentation issue?**

- **File/Page:** [e.g., docs/features/hitl.md, README.md]
- **Section:** [e.g., "Quick Start", "API Reference"]
- **URL:** [if applicable, e.g., https://neurolink.dev/docs/features/hitl]
- **Line number:** [if applicable]

## Current Documentation

**What does the current documentation say?**

Paste the relevant section or provide a quote:

```
Current documentation text here
```

## Problem Description

**What is the issue?**

A clear and concise description of what's wrong:

- What's missing?
- What's incorrect?
- What's confusing?
- What doesn't work?

## Suggested Improvement

**How should it be fixed?**

Provide your suggested improvement:

```markdown
Suggested documentation text or structure here
```

Or describe what should be added/changed:

- [ ] Add code example
- [ ] Update explanation
- [ ] Add visual diagram
- [ ] Fix broken link
- [ ] Add cross-reference
- [ ] Other: [describe]

## Code Example (if applicable)

**If the issue involves a code example that doesn't work:**

```typescript
// Code that doesn't work as documented
import { NeuroLink } from "@juspay/neurolink";

// What the docs show
const result = await neurolink.generate(...);

// What actually works (if you found a workaround)
const actualResult = await neurolink.generateCorrectly(...);
```

## Expected Information

**What information were you looking for?**

Describe what you were trying to accomplish and what information you needed:

- Task: [e.g., "Set up Redis persistence"]
- Question: [e.g., "How to configure Redis with TLS"]
- Expected to find: [e.g., "Complete Redis configuration options"]

## Context

**Additional context**

- How did you arrive at this documentation? (Google search, navigation, link, etc.)
- What was your goal?
- What's your experience level? (Beginner, Intermediate, Advanced)
- Is this blocking your work?

## Related Documentation

**Are there other places where this should be documented?**

List any related pages that might need updates:

- [ ] README.md
- [ ] Quick Start Guide
- [ ] API Reference
- [ ] CLI Documentation
- [ ] Code comments (JSDoc)
- [ ] Other: [specify]

## Impact

**Who would benefit from this documentation improvement?**

- [ ] New users getting started
- [ ] Developers implementing specific features
- [ ] Enterprise users evaluating NeuroLink
- [ ] Contributors to the project
- [ ] All users

## Checklist

- [ ] I have searched existing issues to ensure this is not a duplicate
- [ ] I have specified the exact location of the documentation issue
- [ ] I have clearly described what's wrong and what should be improved
- [ ] I have checked if this affects multiple documentation pages
- [ ] I am willing to submit a PR to fix this (optional)
