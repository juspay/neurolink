[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingWorkerFailureDetails

# Type Alias: RollingWorkerFailureDetails

> **RollingWorkerFailureDetails** = `object`

Defined in: [types/proxy.ts:3407](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3407)

## Properties

### workerPid?

> `optional` **workerPid?**: `number`

Defined in: [types/proxy.ts:3408](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3408)

---

### workerExitCode?

> `optional` **workerExitCode?**: `number` \| `null`

Defined in: [types/proxy.ts:3409](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3409)

---

### workerExitSignal?

> `optional` **workerExitSignal?**: `string` \| `null`

Defined in: [types/proxy.ts:3410](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3410)

---

### supervisorAction?

> `optional` **supervisorAction?**: `"none"` \| `"sigkill_after_transfer_failure"` \| `"cancel_socket_replace_before_drain"` \| `"cancel_uncommitted_socket"`

Defined in: [types/proxy.ts:3411](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3411)
