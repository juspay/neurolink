[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRestartResult

# Type Alias: ProxyRestartResult

> **ProxyRestartResult** = `object`

Defined in: [types/proxyRestart.ts:23](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyRestart.ts#L23)

Terminal result of a local restart check or worker activation.

## Properties

### ok

> **ok**: `boolean`

Defined in: [types/proxyRestart.ts:24](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyRestart.ts#L24)

---

### phase

> **phase**: `"checked"` \| `"refused"` \| `"failed"` \| `"activated"` \| `"activated_unverified"`

Defined in: [types/proxyRestart.ts:25](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyRestart.ts#L25)

---

### message

> **message**: `string`

Defined in: [types/proxyRestart.ts:31](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyRestart.ts#L31)

---

### supervisorPid

> **supervisorPid**: `number`

Defined in: [types/proxyRestart.ts:32](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyRestart.ts#L32)

---

### previousWorkerPid?

> `optional` **previousWorkerPid?**: `number`

Defined in: [types/proxyRestart.ts:33](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyRestart.ts#L33)

---

### workerPid?

> `optional` **workerPid?**: `number`

Defined in: [types/proxyRestart.ts:34](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyRestart.ts#L34)

---

### version?

> `optional` **version?**: `string`

Defined in: [types/proxyRestart.ts:35](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyRestart.ts#L35)

---

### drainingWorkers

> **drainingWorkers**: `number`

Defined in: [types/proxyRestart.ts:36](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyRestart.ts#L36)

---

### rejectedSocketsDelta?

> `optional` **rejectedSocketsDelta?**: `number`

Defined in: [types/proxyRestart.ts:38](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyRestart.ts#L38)

Observed during handoff/verification; does not attribute the cause.

---

### failedTransfersDelta?

> `optional` **failedTransfersDelta?**: `number`

Defined in: [types/proxyRestart.ts:39](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyRestart.ts#L39)
