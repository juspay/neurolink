[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRollingState

# Type Alias: ProxyRollingState

> **ProxyRollingState** = `object`

Defined in: [types/cli.ts:1006](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1006)

## Properties

### generation

> **generation**: `number`

Defined in: [types/cli.ts:1007](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1007)

---

### active

> **active**: \{ `pid`: `number`; `version`: `string`; `generation`: `number`; \} \| `null`

Defined in: [types/cli.ts:1008](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1008)

---

### candidate

> **candidate**: \{ `pid`: `number`; `expectedVersion`: `string`; `generation`: `number`; \} \| `null`

Defined in: [types/cli.ts:1009](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1009)

---

### draining

> **draining**: `object`[]

Defined in: [types/cli.ts:1014](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1014)

#### pid

> **pid**: `number`

#### version

> **version**: `string`

#### generation

> **generation**: `number`

---

### queuedSockets

> **queuedSockets**: `number`

Defined in: [types/cli.ts:1015](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1015)

---

### pendingTransfers?

> `optional` **pendingTransfers?**: `number`

Defined in: [types/cli.ts:1016](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1016)

---

### rejectedSockets

> **rejectedSockets**: `number`

Defined in: [types/cli.ts:1017](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1017)

---

### failedTransfers

> **failedTransfers**: `number`

Defined in: [types/cli.ts:1018](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1018)

---

### lastFailure

> **lastFailure**: \{ `at`: `string`; `generation`: `number`; `version`: `string`; `phase`: `"startup"` \| `"activation"` \| `"runtime"` \| `"transfer"`; `message`: `string`; `workerPid?`: `number`; `workerExitCode?`: `number` \| `null`; `workerExitSignal?`: `string` \| `null`; `supervisorAction?`: `"none"` \| `"sigkill_after_transfer_failure"` \| `"cancel_socket_replace_before_drain"` \| `"cancel_uncommitted_socket"`; \} \| `null`

Defined in: [types/cli.ts:1019](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1019)
