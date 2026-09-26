[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / GitToolRuntimeSettings

# Type Alias: GitToolRuntimeSettings

> **GitToolRuntimeSettings** = `object`

Resolved git toolset settings for one host.

Deliberately not marked internal: it is the return type of
`configureGitTools`, so it is named by an emitted declaration. Marking it
would make `stripInternal` delete the type without touching the import that
references it, leaving a .d.ts that fails to compile for any consumer using
`skipLibCheck: false`. (Note that the tag is matched as plain text anywhere
in the doc comment, so it cannot even be named here to explain itself.)

## Properties

### repoRoot

> **repoRoot**: `string`

---

### timeoutMs

> **timeoutMs**: `number`

---

### maxOutputBytes

> **maxOutputBytes**: `number`

---

### previewChars

> **previewChars**: `number`

---

### gitExecutable

> **gitExecutable**: `string`
