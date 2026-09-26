[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BackgroundCommandPolicy

# Type Alias: BackgroundCommandPolicy

> **BackgroundCommandPolicy** = `object`

What a host permits. There is no default policy: without one every start is
refused, because "run whatever the model asks" is not a defensible default
for a primitive that executes processes.

## Properties

### allowedExecutables

> **allowedExecutables**: `string`[]

Executables that may be started, matched EXACTLY against `argv[0]` — no
basename fallback, so allowlisting `git` never permits `/tmp/evil/git`.
Required, and an empty list refuses everything.

---

### allowlist?

> `optional` **allowlist?**: (`argv`, `cwd`) => [`BackgroundCommandAllowDecision`](BackgroundCommandAllowDecision.md)

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

Sandbox root. The resolved REAL cwd (symlinks followed) must be this
directory or inside it.

---

### defaultTimeoutMs?

> `optional` **defaultTimeoutMs?**: `number`

Wall-clock budget when the caller names none. Default 120_000.

---

### maxOutputBytes?

> `optional` **maxOutputBytes?**: `number`

Per-stream byte cap when the caller names none. Default 10_485_760.
