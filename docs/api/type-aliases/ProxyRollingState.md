[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRollingState

# Type Alias: ProxyRollingState

> **ProxyRollingState** = `object`

Defined in: [types/cli.ts:995](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L995)

## Properties

### generation

> **generation**: `number`

Defined in: [types/cli.ts:996](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L996)

---

### active

> **active**: \{ `pid`: `number`; `version`: `string`; `generation`: `number`; \} \| `null`

Defined in: [types/cli.ts:997](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L997)

---

### candidate

> **candidate**: \{ `pid`: `number`; `expectedVersion`: `string`; `generation`: `number`; \} \| `null`

Defined in: [types/cli.ts:998](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L998)

---

### draining

> **draining**: `object`[]

Defined in: [types/cli.ts:1003](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1003)

#### pid

> **pid**: `number`

#### version

> **version**: `string`

#### generation

> **generation**: `number`

---

### queuedSockets

> **queuedSockets**: `number`

Defined in: [types/cli.ts:1004](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1004)

---

### pendingTransfers?

> `optional` **pendingTransfers?**: `number`

Defined in: [types/cli.ts:1005](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1005)

---

### rejectedSockets

> **rejectedSockets**: `number`

Defined in: [types/cli.ts:1006](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1006)

---

### failedTransfers

> **failedTransfers**: `number`

Defined in: [types/cli.ts:1007](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1007)

---

### lastFailure

> **lastFailure**: \{ `at`: `string`; `generation`: `number`; `version`: `string`; `phase`: `"startup"` \| `"activation"` \| `"runtime"` \| `"transfer"`; `message`: `string`; `workerPid?`: `number`; `workerExitCode?`: `number` \| `null`; `workerExitSignal?`: `string` \| `null`; `supervisorAction?`: `"none"` \| `"sigkill_after_transfer_failure"` \| `"cancel_socket_replace_before_drain"` \| `"cancel_uncommitted_socket"`; \} \| `null`

Defined in: [types/cli.ts:1008](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1008)
