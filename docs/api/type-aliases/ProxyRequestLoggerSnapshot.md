[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRequestLoggerSnapshot

# Type Alias: ProxyRequestLoggerSnapshot

> **ProxyRequestLoggerSnapshot** = `object`

## Properties

### diskEnabled?

> `optional` **diskEnabled?**: `boolean`

---

### otel?

> `optional` **otel?**: `ReturnType`\<`getProxyOtelLogSnapshot`\>

---

### bodyCapture?

> `optional` **bodyCapture?**: [`ProxyBodyCaptureWorkerSnapshot`](ProxyBodyCaptureWorkerSnapshot.md)

---

### bodyCapturePolicy?

> `optional` **bodyCapturePolicy?**: [`ProxyBodyCapturePolicySnapshot`](ProxyBodyCapturePolicySnapshot.md)

---

### enabled

> **enabled**: `boolean`

---

### requests

> **requests**: [`ProxyRequestLogSinkSnapshot`](ProxyRequestLogSinkSnapshot.md)

---

### attempts

> **attempts**: [`ProxyRequestLogSinkSnapshot`](ProxyRequestLogSinkSnapshot.md)

---

### debug

> **debug**: [`ProxyRequestLogSinkSnapshot`](ProxyRequestLogSinkSnapshot.md)
