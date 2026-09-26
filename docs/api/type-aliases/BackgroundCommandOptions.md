[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BackgroundCommandOptions

# Type Alias: BackgroundCommandOptions

> **BackgroundCommandOptions** = `object`

Per-start options. Only `timeoutMs` and `maxOutputBytes` fall back to the
policy's defaults. The rest have their own omission behaviour: `env`
inherits the parent environment, `label` defaults to `argv[0]`, `sessionId`
resolves from the host's tool context, and `abortSignal` simply has no
fallback.

## Properties

### cwd

> **cwd**: `string`

Working directory. Must resolve inside `BackgroundCommandPolicy.cwdRoot`.

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Wall-clock budget in ms; SIGTERM then SIGKILL.

---

### maxOutputBytes?

> `optional` **maxOutputBytes?**: `number`

Per-stream byte cap; hitting it kills the command with `output-limit`.

---

### env?

> `optional` **env?**: `Record`\<`string`, `string`\>

Environment for the child. When given it REPLACES the parent environment
rather than extending it — the command gets exactly these variables and
nothing else. Omit it to inherit the parent environment, which is what a
repository's own checks normally need.

---

### label?

> `optional` **label?**: `string`

Short human label for logs and the banked artifacts. Defaults to argv[0].

---

### sessionId?

> `optional` **sessionId?**: `string`

Session the command belongs to; scopes the outstanding counters.

---

### abortSignal?

> `optional` **abortSignal?**: `AbortSignal`

Parent cancellation — an aborted parent kills the command.
