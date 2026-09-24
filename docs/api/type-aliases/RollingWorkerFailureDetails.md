[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingWorkerFailureDetails

# Type Alias: RollingWorkerFailureDetails

> **RollingWorkerFailureDetails** = `object`

Defined in: [types/proxy.ts:3340](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3340)

## Properties

### workerPid?

> `optional` **workerPid?**: `number`

Defined in: [types/proxy.ts:3341](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3341)

---

### workerExitCode?

> `optional` **workerExitCode?**: `number` \| `null`

Defined in: [types/proxy.ts:3342](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3342)

---

### workerExitSignal?

> `optional` **workerExitSignal?**: `string` \| `null`

Defined in: [types/proxy.ts:3343](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3343)

---

### supervisorAction?

> `optional` **supervisorAction?**: `"none"` \| `"sigkill_after_transfer_failure"` \| `"cancel_socket_replace_before_drain"` \| `"cancel_uncommitted_socket"`

Defined in: [types/proxy.ts:3344](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3344)
