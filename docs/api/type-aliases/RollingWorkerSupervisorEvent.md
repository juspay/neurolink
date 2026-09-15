[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingWorkerSupervisorEvent

# Type Alias: RollingWorkerSupervisorEvent

> **RollingWorkerSupervisorEvent** = `object`

Defined in: [types/proxy.ts:3086](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3086)

## Properties

### at

> **at**: `string`

Defined in: [types/proxy.ts:3087](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3087)

---

### type

> **type**: `"activated"` \| `"failure"` \| `"failed_transfer"` \| `"rejected_socket"` \| `"worker_exit"`

Defined in: [types/proxy.ts:3088](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3088)

---

### generation

> **generation**: `number` \| `null`

Defined in: [types/proxy.ts:3094](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3094)

---

### version

> **version**: `string` \| `null`

Defined in: [types/proxy.ts:3095](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3095)

---

### phase?

> `optional` **phase?**: `"startup"` \| `"activation"` \| `"runtime"` \| `"transfer"`

Defined in: [types/proxy.ts:3096](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3096)

---

### reason?

> `optional` **reason?**: `string`

Defined in: [types/proxy.ts:3097](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3097)

---

### workerPid?

> `optional` **workerPid?**: `number`

Defined in: [types/proxy.ts:3098](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3098)

---

### workerProcessInstanceId?

> `optional` **workerProcessInstanceId?**: `string`

Defined in: [types/proxy.ts:3099](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3099)

---

### workerExitCode?

> `optional` **workerExitCode?**: `number` \| `null`

Defined in: [types/proxy.ts:3100](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3100)

---

### workerExitSignal?

> `optional` **workerExitSignal?**: `string` \| `null`

Defined in: [types/proxy.ts:3101](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3101)

---

### supervisorAction?

> `optional` **supervisorAction?**: [`RollingWorkerFailureDetails`](RollingWorkerFailureDetails.md)\[`"supervisorAction"`\]

Defined in: [types/proxy.ts:3102](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3102)
