[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRollingState

# Type Alias: ProxyRollingState

> **ProxyRollingState** = `object`

Defined in: [types/cli.ts:981](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L981)

## Properties

### generation

> **generation**: `number`

Defined in: [types/cli.ts:982](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L982)

---

### active

> **active**: \{ `pid`: `number`; `version`: `string`; `generation`: `number`; \} \| `null`

Defined in: [types/cli.ts:983](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L983)

---

### candidate

> **candidate**: \{ `pid`: `number`; `expectedVersion`: `string`; `generation`: `number`; \} \| `null`

Defined in: [types/cli.ts:984](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L984)

---

### draining

> **draining**: `object`[]

Defined in: [types/cli.ts:989](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L989)

#### pid

> **pid**: `number`

#### version

> **version**: `string`

#### generation

> **generation**: `number`

---

### queuedSockets

> **queuedSockets**: `number`

Defined in: [types/cli.ts:990](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L990)

---

### rejectedSockets

> **rejectedSockets**: `number`

Defined in: [types/cli.ts:991](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L991)

---

### failedTransfers

> **failedTransfers**: `number`

Defined in: [types/cli.ts:992](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L992)

---

### lastFailure

> **lastFailure**: \{ `at`: `string`; `generation`: `number`; `version`: `string`; `phase`: `"startup"` \| `"activation"` \| `"runtime"` \| `"transfer"`; `message`: `string`; `workerPid?`: `number`; `workerExitCode?`: `number` \| `null`; `workerExitSignal?`: `string` \| `null`; `supervisorAction?`: `"none"` \| `"sigkill_after_transfer_failure"`; \} \| `null`

Defined in: [types/cli.ts:993](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L993)
