[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingWorkerFailureDetails

# Type Alias: RollingWorkerFailureDetails

> **RollingWorkerFailureDetails** = `object`

Defined in: [types/proxy.ts:3230](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3230)

## Properties

### workerPid?

> `optional` **workerPid?**: `number`

Defined in: [types/proxy.ts:3231](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3231)

---

### workerExitCode?

> `optional` **workerExitCode?**: `number` \| `null`

Defined in: [types/proxy.ts:3232](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3232)

---

### workerExitSignal?

> `optional` **workerExitSignal?**: `string` \| `null`

Defined in: [types/proxy.ts:3233](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3233)

---

### supervisorAction?

> `optional` **supervisorAction?**: `"none"` \| `"sigkill_after_transfer_failure"` \| `"cancel_socket_replace_before_drain"` \| `"cancel_uncommitted_socket"`

Defined in: [types/proxy.ts:3234](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3234)
