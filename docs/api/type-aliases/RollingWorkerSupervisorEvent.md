[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingWorkerSupervisorEvent

# Type Alias: RollingWorkerSupervisorEvent

> **RollingWorkerSupervisorEvent** = `object`

Defined in: [types/proxy.ts:3348](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3348)

## Properties

### at

> **at**: `string`

Defined in: [types/proxy.ts:3349](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3349)

---

### type

> **type**: `"activated"` \| `"failure"` \| `"failed_transfer"` \| `"rejected_socket"` \| `"worker_exit"`

Defined in: [types/proxy.ts:3350](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3350)

---

### generation

> **generation**: `number` \| `null`

Defined in: [types/proxy.ts:3356](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3356)

---

### version

> **version**: `string` \| `null`

Defined in: [types/proxy.ts:3357](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3357)

---

### phase?

> `optional` **phase?**: `"startup"` \| `"activation"` \| `"runtime"` \| `"transfer"`

Defined in: [types/proxy.ts:3358](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3358)

---

### reason?

> `optional` **reason?**: `string`

Defined in: [types/proxy.ts:3359](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3359)

---

### workerPid?

> `optional` **workerPid?**: `number`

Defined in: [types/proxy.ts:3360](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3360)

---

### workerProcessInstanceId?

> `optional` **workerProcessInstanceId?**: `string`

Defined in: [types/proxy.ts:3361](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3361)

---

### workerExitCode?

> `optional` **workerExitCode?**: `number` \| `null`

Defined in: [types/proxy.ts:3362](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3362)

---

### workerExitSignal?

> `optional` **workerExitSignal?**: `string` \| `null`

Defined in: [types/proxy.ts:3363](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3363)

---

### supervisorAction?

> `optional` **supervisorAction?**: [`RollingWorkerFailureDetails`](RollingWorkerFailureDetails.md)\[`"supervisorAction"`\]

Defined in: [types/proxy.ts:3364](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3364)
