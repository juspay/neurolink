[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / GitToolRuntimeSettings

# Type Alias: GitToolRuntimeSettings

> **GitToolRuntimeSettings** = `object`

Defined in: [types/gitTools.ts:83](https://github.com/juspay/neurolink/blob/release/src/lib/types/gitTools.ts#L83)

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

Defined in: [types/gitTools.ts:84](https://github.com/juspay/neurolink/blob/release/src/lib/types/gitTools.ts#L84)

---

### timeoutMs

> **timeoutMs**: `number`

Defined in: [types/gitTools.ts:85](https://github.com/juspay/neurolink/blob/release/src/lib/types/gitTools.ts#L85)

---

### maxOutputBytes

> **maxOutputBytes**: `number`

Defined in: [types/gitTools.ts:86](https://github.com/juspay/neurolink/blob/release/src/lib/types/gitTools.ts#L86)

---

### previewChars

> **previewChars**: `number`

Defined in: [types/gitTools.ts:87](https://github.com/juspay/neurolink/blob/release/src/lib/types/gitTools.ts#L87)

---

### gitExecutable

> **gitExecutable**: `string`

Defined in: [types/gitTools.ts:88](https://github.com/juspay/neurolink/blob/release/src/lib/types/gitTools.ts#L88)
