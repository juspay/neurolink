[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRollingState

# Type Alias: ProxyRollingState

> **ProxyRollingState** = `object`

Defined in: [types/cli.ts:1000](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1000)

## Properties

### generation

> **generation**: `number`

Defined in: [types/cli.ts:1001](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1001)

---

### active

> **active**: \{ `pid`: `number`; `version`: `string`; `generation`: `number`; \} \| `null`

Defined in: [types/cli.ts:1002](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1002)

---

### candidate

> **candidate**: \{ `pid`: `number`; `expectedVersion`: `string`; `generation`: `number`; \} \| `null`

Defined in: [types/cli.ts:1003](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1003)

---

### draining

> **draining**: `object`[]

Defined in: [types/cli.ts:1008](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1008)

#### pid

> **pid**: `number`

#### version

> **version**: `string`

#### generation

> **generation**: `number`

---

### queuedSockets

> **queuedSockets**: `number`

Defined in: [types/cli.ts:1009](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1009)

---

### pendingTransfers?

> `optional` **pendingTransfers?**: `number`

Defined in: [types/cli.ts:1010](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1010)

---

### rejectedSockets

> **rejectedSockets**: `number`

Defined in: [types/cli.ts:1011](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1011)

---

### failedTransfers

> **failedTransfers**: `number`

Defined in: [types/cli.ts:1012](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1012)

---

### lastFailure

> **lastFailure**: \{ `at`: `string`; `generation`: `number`; `version`: `string`; `phase`: `"startup"` \| `"activation"` \| `"runtime"` \| `"transfer"`; `message`: `string`; `workerPid?`: `number`; `workerExitCode?`: `number` \| `null`; `workerExitSignal?`: `string` \| `null`; `supervisorAction?`: `"none"` \| `"sigkill_after_transfer_failure"` \| `"cancel_socket_replace_before_drain"` \| `"cancel_uncommitted_socket"`; \} \| `null`

Defined in: [types/cli.ts:1013](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1013)
