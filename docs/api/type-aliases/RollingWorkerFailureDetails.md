[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingWorkerFailureDetails

# Type Alias: RollingWorkerFailureDetails

> **RollingWorkerFailureDetails** = `object`

Defined in: [types/proxy.ts:3317](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3317)

## Properties

### workerPid?

> `optional` **workerPid?**: `number`

Defined in: [types/proxy.ts:3318](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3318)

---

### workerExitCode?

> `optional` **workerExitCode?**: `number` \| `null`

Defined in: [types/proxy.ts:3319](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3319)

---

### workerExitSignal?

> `optional` **workerExitSignal?**: `string` \| `null`

Defined in: [types/proxy.ts:3320](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3320)

---

### supervisorAction?

> `optional` **supervisorAction?**: `"none"` \| `"sigkill_after_transfer_failure"` \| `"cancel_socket_replace_before_drain"` \| `"cancel_uncommitted_socket"`

Defined in: [types/proxy.ts:3321](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3321)
