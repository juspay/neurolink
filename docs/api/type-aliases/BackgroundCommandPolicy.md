[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BackgroundCommandPolicy

# Type Alias: BackgroundCommandPolicy

> **BackgroundCommandPolicy** = `object`

Defined in: [types/backgroundCommand.ts:53](https://github.com/juspay/neurolink/blob/release/src/lib/types/backgroundCommand.ts#L53)

What a host permits. There is no default policy: without one every start is
refused, because "run whatever the model asks" is not a defensible default
for a primitive that executes processes.

## Properties

### allowedExecutables

> **allowedExecutables**: `string`[]

Defined in: [types/backgroundCommand.ts:59](https://github.com/juspay/neurolink/blob/release/src/lib/types/backgroundCommand.ts#L59)

Executables that may be started, matched EXACTLY against `argv[0]` — no
basename fallback, so allowlisting `git` never permits `/tmp/evil/git`.
Required, and an empty list refuses everything.

---

### allowlist?

> `optional` **allowlist?**: (`argv`, `cwd`) => [`BackgroundCommandAllowDecision`](BackgroundCommandAllowDecision.md)

Defined in: [types/backgroundCommand.ts:65](https://github.com/juspay/neurolink/blob/release/src/lib/types/backgroundCommand.ts#L65)

Final say after the allowlist and the sandbox have passed. Return `true`
to allow, or a string that is handed to the caller as the refusal reason
(so put the recovery step in it).

#### Parameters

##### argv

`string`[]

##### cwd

`string`

#### Returns

[`BackgroundCommandAllowDecision`](BackgroundCommandAllowDecision.md)

---

### cwdRoot

> **cwdRoot**: `string`

Defined in: [types/backgroundCommand.ts:70](https://github.com/juspay/neurolink/blob/release/src/lib/types/backgroundCommand.ts#L70)

Sandbox root. The resolved REAL cwd (symlinks followed) must be this
directory or inside it.

---

### defaultTimeoutMs?

> `optional` **defaultTimeoutMs?**: `number`

Defined in: [types/backgroundCommand.ts:72](https://github.com/juspay/neurolink/blob/release/src/lib/types/backgroundCommand.ts#L72)

Wall-clock budget when the caller names none. Default 120_000.

---

### maxOutputBytes?

> `optional` **maxOutputBytes?**: `number`

Defined in: [types/backgroundCommand.ts:74](https://github.com/juspay/neurolink/blob/release/src/lib/types/backgroundCommand.ts#L74)

Per-stream byte cap when the caller names none. Default 10_485_760.
