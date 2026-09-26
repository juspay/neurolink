[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyBodyCaptureEntry

# Type Alias: ProxyBodyCaptureEntry

> **ProxyBodyCaptureEntry** = `object`

Single captured body/headers entry written to disk by the proxy logger.

## Properties

### captureId?

> `optional` **captureId?**: `string`

Unique capture identity shared by its index and every exported chunk.

---

### timestamp

> **timestamp**: `string`

---

### requestId

> **requestId**: `string`

---

### phase

> **phase**: `string`

---

### model

> **model**: `string`

---

### stream

> **stream**: `boolean`

---

### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

---

### body?

> `optional` **body?**: `unknown`

---

### bodySize?

> `optional` **bodySize?**: `number`

---

### sourceTruncated?

> `optional` **sourceTruncated?**: `boolean`

The bounded stream observer omitted a suffix before redaction/processing.

---

### contentType?

> `optional` **contentType?**: `string`

---

### responseStatus?

> `optional` **responseStatus?**: `number`

---

### durationMs?

> `optional` **durationMs?**: `number`

---

### account?

> `optional` **account?**: `string`

---

### accountType?

> `optional` **accountType?**: `string`

---

### attempt?

> `optional` **attempt?**: `number`

---

### traceId?

> `optional` **traceId?**: `string`

---

### spanId?

> `optional` **spanId?**: `string`

---

### traceFlags?

> `optional` **traceFlags?**: `number`

Original OTel sampling flags retained through deferred logging.

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>
