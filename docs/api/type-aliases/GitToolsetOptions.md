[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / GitToolsetOptions

# Type Alias: GitToolsetOptions

> **GitToolsetOptions** = `object`

Defined in: [types/gitTools.ts:30](https://github.com/juspay/neurolink/blob/release/src/lib/types/gitTools.ts#L30)

Options for `NeuroLink.registerGitTools()`.

## Properties

### repoRoot

> **repoRoot**: `string`

Defined in: [types/gitTools.ts:35](https://github.com/juspay/neurolink/blob/release/src/lib/types/gitTools.ts#L35)

Repository root. Every git tool runs here, and every path argument must
resolve inside it.

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Defined in: [types/gitTools.ts:37](https://github.com/juspay/neurolink/blob/release/src/lib/types/gitTools.ts#L37)

Wall-clock budget per git invocation (ms). Default 60_000.

---

### maxOutputBytes?

> `optional` **maxOutputBytes?**: `number`

Defined in: [types/gitTools.ts:39](https://github.com/juspay/neurolink/blob/release/src/lib/types/gitTools.ts#L39)

Byte cap per stream. Default 33_554_432 (a big diff is still a diff).

---

### previewChars?

> `optional` **previewChars?**: `number`

Defined in: [types/gitTools.ts:41](https://github.com/juspay/neurolink/blob/release/src/lib/types/gitTools.ts#L41)

Characters of output returned inline. Default 2000, hard cap 4000.

---

### gitExecutable?

> `optional` **gitExecutable?**: `string`

Defined in: [types/gitTools.ts:43](https://github.com/juspay/neurolink/blob/release/src/lib/types/gitTools.ts#L43)

Executable to run. Default "git"; name an absolute path to pin it.
