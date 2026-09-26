[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRollingState

# Type Alias: ProxyRollingState

> **ProxyRollingState** = `object`

## Properties

### generation

> **generation**: `number`

---

### active

> **active**: \{ `pid`: `number`; `version`: `string`; `generation`: `number`; \} \| `null`

---

### candidate

> **candidate**: \{ `pid`: `number`; `expectedVersion`: `string`; `generation`: `number`; \} \| `null`

---

### draining

> **draining**: `object`[]

#### pid

> **pid**: `number`

#### version

> **version**: `string`

#### generation

> **generation**: `number`

---

### queuedSockets

> **queuedSockets**: `number`

---

### pendingTransfers?

> `optional` **pendingTransfers?**: `number`

---

### rejectedSockets

> **rejectedSockets**: `number`

---

### failedTransfers

> **failedTransfers**: `number`

---

### lastFailure

> **lastFailure**: \{ `at`: `string`; `generation`: `number`; `version`: `string`; `phase`: `"startup"` \| `"activation"` \| `"runtime"` \| `"transfer"`; `message`: `string`; `workerPid?`: `number`; `workerExitCode?`: `number` \| `null`; `workerExitSignal?`: `string` \| `null`; `supervisorAction?`: `"none"` \| `"sigkill_after_transfer_failure"` \| `"cancel_socket_replace_before_drain"` \| `"cancel_uncommitted_socket"`; \} \| `null`
