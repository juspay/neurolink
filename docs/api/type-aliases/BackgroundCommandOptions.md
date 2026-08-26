[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BackgroundCommandOptions

# Type Alias: BackgroundCommandOptions

> **BackgroundCommandOptions** = `object`

Defined in: [types/backgroundCommand.ts:84](https://github.com/juspay/neurolink/blob/release/src/lib/types/backgroundCommand.ts#L84)

Per-start options. Only `timeoutMs` and `maxOutputBytes` fall back to the
policy's defaults. The rest have their own omission behaviour: `env`
inherits the parent environment, `label` defaults to `argv[0]`, `sessionId`
resolves from the host's tool context, and `abortSignal` simply has no
fallback.

## Properties

### cwd

> **cwd**: `string`

Defined in: [types/backgroundCommand.ts:86](https://github.com/juspay/neurolink/blob/release/src/lib/types/backgroundCommand.ts#L86)

Working directory. Must resolve inside `BackgroundCommandPolicy.cwdRoot`.

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Defined in: [types/backgroundCommand.ts:88](https://github.com/juspay/neurolink/blob/release/src/lib/types/backgroundCommand.ts#L88)

Wall-clock budget in ms; SIGTERM then SIGKILL.

---

### maxOutputBytes?

> `optional` **maxOutputBytes?**: `number`

Defined in: [types/backgroundCommand.ts:90](https://github.com/juspay/neurolink/blob/release/src/lib/types/backgroundCommand.ts#L90)

Per-stream byte cap; hitting it kills the command with `output-limit`.

---

### env?

> `optional` **env?**: `Record`\<`string`, `string`\>

Defined in: [types/backgroundCommand.ts:97](https://github.com/juspay/neurolink/blob/release/src/lib/types/backgroundCommand.ts#L97)

Environment for the child. When given it REPLACES the parent environment
rather than extending it — the command gets exactly these variables and
nothing else. Omit it to inherit the parent environment, which is what a
repository's own checks normally need.

---

### label?

> `optional` **label?**: `string`

Defined in: [types/backgroundCommand.ts:99](https://github.com/juspay/neurolink/blob/release/src/lib/types/backgroundCommand.ts#L99)

Short human label for logs and the banked artifacts. Defaults to argv[0].

---

### sessionId?

> `optional` **sessionId?**: `string`

Defined in: [types/backgroundCommand.ts:101](https://github.com/juspay/neurolink/blob/release/src/lib/types/backgroundCommand.ts#L101)

Session the command belongs to; scopes the outstanding counters.

---

### abortSignal?

> `optional` **abortSignal?**: `AbortSignal`

Defined in: [types/backgroundCommand.ts:103](https://github.com/juspay/neurolink/blob/release/src/lib/types/backgroundCommand.ts#L103)

Parent cancellation — an aborted parent kills the command.
