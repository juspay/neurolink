[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRestartResult

# Type Alias: ProxyRestartResult

> **ProxyRestartResult** = `object`

Terminal result of a local restart check or worker activation.

## Properties

### ok

> **ok**: `boolean`

---

### phase

> **phase**: `"checked"` \| `"refused"` \| `"failed"` \| `"activated"` \| `"activated_unverified"`

---

### message

> **message**: `string`

---

### supervisorPid

> **supervisorPid**: `number`

---

### previousWorkerPid?

> `optional` **previousWorkerPid?**: `number`

---

### workerPid?

> `optional` **workerPid?**: `number`

---

### version?

> `optional` **version?**: `string`

---

### drainingWorkers

> **drainingWorkers**: `number`

---

### rejectedSocketsDelta?

> `optional` **rejectedSocketsDelta?**: `number`

Observed during handoff/verification; does not attribute the cause.

---

### failedTransfersDelta?

> `optional` **failedTransfersDelta?**: `number`
