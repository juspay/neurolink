---
name: Bug Report
about: Report a bug to help us improve NeuroLink
title: "[BUG] "
labels: "bug, needs-triage"
assignees: ""
---

## Bug Description

A clear and concise description of what the bug is.

## Steps to Reproduce

Steps to reproduce the behavior:

1. Initialize NeuroLink with '...'
2. Call method '...'
3. Pass parameters '...'
4. See error

## Expected Behavior

A clear and concise description of what you expected to happen.

## Actual Behavior

A clear and concise description of what actually happened.

## Environment

Please complete the following information:

- **NeuroLink version:** [e.g., 8.26.1]
- **Node.js version:** [e.g., 18.17.0]
- **Provider:** [e.g., OpenAI, Anthropic, Google AI]
- **Model:** [e.g., gpt-4, claude-3-5-sonnet, gemini-2.0-flash]
- **Operating System:** [e.g., macOS 14.0, Ubuntu 22.04, Windows 11]
- **Package Manager:** [e.g., pnpm, npm, yarn]

## Code Sample

Please provide a minimal code sample that reproduces the issue:

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Minimal reproduction code here
const result = await neurolink.generate({
  input: { text: "test" },
  provider: "openai",
});
```

## Error Output

If applicable, paste the error message or stack trace:

```
Error message here
```

## Additional Context

Add any other context about the problem here:

- Screenshots
- Logs
- Related issues
- Workarounds you've tried
- Configuration files
- Environment variables (redact sensitive values)

## Possible Solution

If you have suggestions on how to fix this bug, please share them here.

## Checklist

- [ ] I have searched existing issues to ensure this is not a duplicate
- [ ] I have provided all required environment information
- [ ] I have included a minimal code sample that reproduces the issue
- [ ] I have redacted any sensitive information (API keys, credentials)
- [ ] I am using a supported version of NeuroLink (see [SECURITY.md](../../SECURITY.md))
