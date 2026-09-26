[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingWorkerSupervisorEvent

# Type Alias: RollingWorkerSupervisorEvent

> **RollingWorkerSupervisorEvent** = `object`

## Properties

### at

> **at**: `string`

---

### type

> **type**: `"activated"` \| `"failure"` \| `"failed_transfer"` \| `"rejected_socket"` \| `"worker_exit"`

---

### generation

> **generation**: `number` \| `null`

---

### version

> **version**: `string` \| `null`

---

### phase?

> `optional` **phase?**: `"startup"` \| `"activation"` \| `"runtime"` \| `"transfer"`

---

### reason?

> `optional` **reason?**: `string`

---

### workerPid?

> `optional` **workerPid?**: `number`

---

### workerProcessInstanceId?

> `optional` **workerProcessInstanceId?**: `string`

---

### workerExitCode?

> `optional` **workerExitCode?**: `number` \| `null`

---

### workerExitSignal?

> `optional` **workerExitSignal?**: `string` \| `null`

---

### supervisorAction?

> `optional` **supervisorAction?**: [`RollingWorkerFailureDetails`](RollingWorkerFailureDetails.md)\[`"supervisorAction"`\]
