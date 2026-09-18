[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingWorkerFailureDetails

# Type Alias: RollingWorkerFailureDetails

> **RollingWorkerFailureDetails** = `object`

Defined in: [types/proxy.ts:3100](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3100)

## Properties

### workerPid?

> `optional` **workerPid?**: `number`

Defined in: [types/proxy.ts:3101](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3101)

---

### workerExitCode?

> `optional` **workerExitCode?**: `number` \| `null`

Defined in: [types/proxy.ts:3102](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3102)

---

### workerExitSignal?

> `optional` **workerExitSignal?**: `string` \| `null`

Defined in: [types/proxy.ts:3103](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3103)

---

### supervisorAction?

> `optional` **supervisorAction?**: `"none"` \| `"sigkill_after_transfer_failure"` \| `"cancel_socket_replace_before_drain"` \| `"cancel_uncommitted_socket"`

Defined in: [types/proxy.ts:3104](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3104)
