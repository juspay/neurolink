[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingWorkerFailureDetails

# Type Alias: RollingWorkerFailureDetails

> **RollingWorkerFailureDetails** = `object`

Defined in: [types/proxy.ts:2770](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2770)

## Properties

### workerPid?

> `optional` **workerPid?**: `number`

Defined in: [types/proxy.ts:2771](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2771)

---

### workerExitCode?

> `optional` **workerExitCode?**: `number` \| `null`

Defined in: [types/proxy.ts:2772](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2772)

---

### workerExitSignal?

> `optional` **workerExitSignal?**: `string` \| `null`

Defined in: [types/proxy.ts:2773](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2773)

---

### supervisorAction?

> `optional` **supervisorAction?**: `"none"` \| `"sigkill_after_transfer_failure"` \| `"cancel_uncommitted_socket"`

Defined in: [types/proxy.ts:2774](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2774)
