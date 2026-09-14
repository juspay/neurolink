[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingWorkerSupervisorEvent

# Type Alias: RollingWorkerSupervisorEvent

> **RollingWorkerSupervisorEvent** = `object`

Defined in: [types/proxy.ts:3072](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3072)

## Properties

### at

> **at**: `string`

Defined in: [types/proxy.ts:3073](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3073)

---

### type

> **type**: `"activated"` \| `"failure"` \| `"failed_transfer"` \| `"rejected_socket"` \| `"worker_exit"`

Defined in: [types/proxy.ts:3074](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3074)

---

### generation

> **generation**: `number` \| `null`

Defined in: [types/proxy.ts:3080](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3080)

---

### version

> **version**: `string` \| `null`

Defined in: [types/proxy.ts:3081](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3081)

---

### phase?

> `optional` **phase?**: `"startup"` \| `"activation"` \| `"runtime"` \| `"transfer"`

Defined in: [types/proxy.ts:3082](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3082)

---

### reason?

> `optional` **reason?**: `string`

Defined in: [types/proxy.ts:3083](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3083)

---

### workerPid?

> `optional` **workerPid?**: `number`

Defined in: [types/proxy.ts:3084](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3084)

---

### workerProcessInstanceId?

> `optional` **workerProcessInstanceId?**: `string`

Defined in: [types/proxy.ts:3085](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3085)

---

### workerExitCode?

> `optional` **workerExitCode?**: `number` \| `null`

Defined in: [types/proxy.ts:3086](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3086)

---

### workerExitSignal?

> `optional` **workerExitSignal?**: `string` \| `null`

Defined in: [types/proxy.ts:3087](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3087)

---

### supervisorAction?

> `optional` **supervisorAction?**: [`RollingWorkerFailureDetails`](RollingWorkerFailureDetails.md)\[`"supervisorAction"`\]

Defined in: [types/proxy.ts:3088](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3088)
