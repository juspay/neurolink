[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingWorkerSupervisorEvent

# Type Alias: RollingWorkerSupervisorEvent

> **RollingWorkerSupervisorEvent** = `object`

Defined in: [types/proxy.ts:3111](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3111)

## Properties

### at

> **at**: `string`

Defined in: [types/proxy.ts:3112](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3112)

---

### type

> **type**: `"activated"` \| `"failure"` \| `"failed_transfer"` \| `"rejected_socket"` \| `"worker_exit"`

Defined in: [types/proxy.ts:3113](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3113)

---

### generation

> **generation**: `number` \| `null`

Defined in: [types/proxy.ts:3119](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3119)

---

### version

> **version**: `string` \| `null`

Defined in: [types/proxy.ts:3120](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3120)

---

### phase?

> `optional` **phase?**: `"startup"` \| `"activation"` \| `"runtime"` \| `"transfer"`

Defined in: [types/proxy.ts:3121](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3121)

---

### reason?

> `optional` **reason?**: `string`

Defined in: [types/proxy.ts:3122](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3122)

---

### workerPid?

> `optional` **workerPid?**: `number`

Defined in: [types/proxy.ts:3123](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3123)

---

### workerProcessInstanceId?

> `optional` **workerProcessInstanceId?**: `string`

Defined in: [types/proxy.ts:3124](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3124)

---

### workerExitCode?

> `optional` **workerExitCode?**: `number` \| `null`

Defined in: [types/proxy.ts:3125](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3125)

---

### workerExitSignal?

> `optional` **workerExitSignal?**: `string` \| `null`

Defined in: [types/proxy.ts:3126](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3126)

---

### supervisorAction?

> `optional` **supervisorAction?**: [`RollingWorkerFailureDetails`](RollingWorkerFailureDetails.md)\[`"supervisorAction"`\]

Defined in: [types/proxy.ts:3127](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3127)
