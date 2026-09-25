[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingWorkerSupervisorEvent

# Type Alias: RollingWorkerSupervisorEvent

> **RollingWorkerSupervisorEvent** = `object`

Defined in: [types/proxy.ts:3416](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3416)

## Properties

### at

> **at**: `string`

Defined in: [types/proxy.ts:3417](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3417)

---

### type

> **type**: `"activated"` \| `"failure"` \| `"failed_transfer"` \| `"rejected_socket"` \| `"worker_exit"`

Defined in: [types/proxy.ts:3418](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3418)

---

### generation

> **generation**: `number` \| `null`

Defined in: [types/proxy.ts:3424](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3424)

---

### version

> **version**: `string` \| `null`

Defined in: [types/proxy.ts:3425](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3425)

---

### phase?

> `optional` **phase?**: `"startup"` \| `"activation"` \| `"runtime"` \| `"transfer"`

Defined in: [types/proxy.ts:3426](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3426)

---

### reason?

> `optional` **reason?**: `string`

Defined in: [types/proxy.ts:3427](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3427)

---

### workerPid?

> `optional` **workerPid?**: `number`

Defined in: [types/proxy.ts:3428](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3428)

---

### workerProcessInstanceId?

> `optional` **workerProcessInstanceId?**: `string`

Defined in: [types/proxy.ts:3429](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3429)

---

### workerExitCode?

> `optional` **workerExitCode?**: `number` \| `null`

Defined in: [types/proxy.ts:3430](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3430)

---

### workerExitSignal?

> `optional` **workerExitSignal?**: `string` \| `null`

Defined in: [types/proxy.ts:3431](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3431)

---

### supervisorAction?

> `optional` **supervisorAction?**: [`RollingWorkerFailureDetails`](RollingWorkerFailureDetails.md)\[`"supervisorAction"`\]

Defined in: [types/proxy.ts:3432](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3432)
