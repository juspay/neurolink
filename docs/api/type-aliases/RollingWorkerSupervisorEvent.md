[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingWorkerSupervisorEvent

# Type Alias: RollingWorkerSupervisorEvent

> **RollingWorkerSupervisorEvent** = `object`

Defined in: [types/proxy.ts:3351](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3351)

## Properties

### at

> **at**: `string`

Defined in: [types/proxy.ts:3352](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3352)

---

### type

> **type**: `"activated"` \| `"failure"` \| `"failed_transfer"` \| `"rejected_socket"` \| `"worker_exit"`

Defined in: [types/proxy.ts:3353](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3353)

---

### generation

> **generation**: `number` \| `null`

Defined in: [types/proxy.ts:3359](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3359)

---

### version

> **version**: `string` \| `null`

Defined in: [types/proxy.ts:3360](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3360)

---

### phase?

> `optional` **phase?**: `"startup"` \| `"activation"` \| `"runtime"` \| `"transfer"`

Defined in: [types/proxy.ts:3361](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3361)

---

### reason?

> `optional` **reason?**: `string`

Defined in: [types/proxy.ts:3362](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3362)

---

### workerPid?

> `optional` **workerPid?**: `number`

Defined in: [types/proxy.ts:3363](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3363)

---

### workerProcessInstanceId?

> `optional` **workerProcessInstanceId?**: `string`

Defined in: [types/proxy.ts:3364](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3364)

---

### workerExitCode?

> `optional` **workerExitCode?**: `number` \| `null`

Defined in: [types/proxy.ts:3365](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3365)

---

### workerExitSignal?

> `optional` **workerExitSignal?**: `string` \| `null`

Defined in: [types/proxy.ts:3366](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3366)

---

### supervisorAction?

> `optional` **supervisorAction?**: [`RollingWorkerFailureDetails`](RollingWorkerFailureDetails.md)\[`"supervisorAction"`\]

Defined in: [types/proxy.ts:3367](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3367)
