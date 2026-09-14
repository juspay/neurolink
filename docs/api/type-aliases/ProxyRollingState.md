[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRollingState

# Type Alias: ProxyRollingState

> **ProxyRollingState** = `object`

Defined in: [types/cli.ts:983](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L983)

## Properties

### generation

> **generation**: `number`

Defined in: [types/cli.ts:984](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L984)

---

### active

> **active**: \{ `pid`: `number`; `version`: `string`; `generation`: `number`; \} \| `null`

Defined in: [types/cli.ts:985](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L985)

---

### candidate

> **candidate**: \{ `pid`: `number`; `expectedVersion`: `string`; `generation`: `number`; \} \| `null`

Defined in: [types/cli.ts:986](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L986)

---

### draining

> **draining**: `object`[]

Defined in: [types/cli.ts:991](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L991)

#### pid

> **pid**: `number`

#### version

> **version**: `string`

#### generation

> **generation**: `number`

---

### queuedSockets

> **queuedSockets**: `number`

Defined in: [types/cli.ts:992](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L992)

---

### pendingTransfers?

> `optional` **pendingTransfers?**: `number`

Defined in: [types/cli.ts:993](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L993)

---

### rejectedSockets

> **rejectedSockets**: `number`

Defined in: [types/cli.ts:994](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L994)

---

### failedTransfers

> **failedTransfers**: `number`

Defined in: [types/cli.ts:995](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L995)

---

### lastFailure

> **lastFailure**: \{ `at`: `string`; `generation`: `number`; `version`: `string`; `phase`: `"startup"` \| `"activation"` \| `"runtime"` \| `"transfer"`; `message`: `string`; `workerPid?`: `number`; `workerExitCode?`: `number` \| `null`; `workerExitSignal?`: `string` \| `null`; `supervisorAction?`: `"none"` \| `"sigkill_after_transfer_failure"` \| `"cancel_socket_replace_before_drain"` \| `"cancel_uncommitted_socket"`; \} \| `null`

Defined in: [types/cli.ts:996](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L996)
