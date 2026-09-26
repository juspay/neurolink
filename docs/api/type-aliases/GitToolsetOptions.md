[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / GitToolsetOptions

# Type Alias: GitToolsetOptions

> **GitToolsetOptions** = `object`

Options for `NeuroLink.registerGitTools()`.

## Properties

### repoRoot

> **repoRoot**: `string`

Repository root. Every git tool runs here, and every path argument must
resolve inside it.

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Wall-clock budget per git invocation (ms). Default 60_000.

---

### maxOutputBytes?

> `optional` **maxOutputBytes?**: `number`

Byte cap per stream. Default 33_554_432 (a big diff is still a diff).

---

### previewChars?

> `optional` **previewChars?**: `number`

Characters of output returned inline. Default 2000, hard cap 4000.

---

### gitExecutable?

> `optional` **gitExecutable?**: `string`

Executable to run. Default "git"; name an absolute path to pin it.
