[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingWorkerSupervisorEvent

# Type Alias: RollingWorkerSupervisorEvent

> **RollingWorkerSupervisorEvent** = `object`

Defined in: [types/proxy.ts:3241](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3241)

## Properties

### at

> **at**: `string`

Defined in: [types/proxy.ts:3242](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3242)

---

### type

> **type**: `"activated"` \| `"failure"` \| `"failed_transfer"` \| `"rejected_socket"` \| `"worker_exit"`

Defined in: [types/proxy.ts:3243](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3243)

---

### generation

> **generation**: `number` \| `null`

Defined in: [types/proxy.ts:3249](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3249)

---

### version

> **version**: `string` \| `null`

Defined in: [types/proxy.ts:3250](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3250)

---

### phase?

> `optional` **phase?**: `"startup"` \| `"activation"` \| `"runtime"` \| `"transfer"`

Defined in: [types/proxy.ts:3251](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3251)

---

### reason?

> `optional` **reason?**: `string`

Defined in: [types/proxy.ts:3252](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3252)

---

### workerPid?

> `optional` **workerPid?**: `number`

Defined in: [types/proxy.ts:3253](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3253)

---

### workerProcessInstanceId?

> `optional` **workerProcessInstanceId?**: `string`

Defined in: [types/proxy.ts:3254](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3254)

---

### workerExitCode?

> `optional` **workerExitCode?**: `number` \| `null`

Defined in: [types/proxy.ts:3255](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3255)

---

### workerExitSignal?

> `optional` **workerExitSignal?**: `string` \| `null`

Defined in: [types/proxy.ts:3256](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3256)

---

### supervisorAction?

> `optional` **supervisorAction?**: [`RollingWorkerFailureDetails`](RollingWorkerFailureDetails.md)\[`"supervisorAction"`\]

Defined in: [types/proxy.ts:3257](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3257)
