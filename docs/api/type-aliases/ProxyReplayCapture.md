[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyReplayCapture

# Type Alias: ProxyReplayCapture

> **ProxyReplayCapture** = `object`

One verified body-capture record in a proxy replay bundle.

## Properties

### timestamp

> **timestamp**: `string`

---

### phase

> **phase**: `string`

---

### attempt

> **attempt**: `number` \| `null`

---

### model

> **model**: `string` \| `null`

---

### stream

> **stream**: `boolean` \| `null`

---

### account

> **account**: `string` \| `null`

---

### accountType

> **accountType**: `string` \| `null`

---

### responseStatus

> **responseStatus**: `number` \| `null`

---

### durationMs

> **durationMs**: `number` \| `null`

---

### contentType

> **contentType**: `string` \| `null`

---

### headers

> **headers**: `Record`\<`string`, `string`\>

---

### body

> **body**: `string` \| `null`

---

### bodySha256

> **bodySha256**: `string` \| `null`

---

### bodyTruncated

> **bodyTruncated**: `boolean`

---

### observedBodyBytes

> **observedBodyBytes**: `number` \| `null`

---

### metadata

> **metadata**: [`ProxyReplayJsonRecord`](ProxyReplayJsonRecord.md) \| `null`

---

### source

> **source**: `object`

#### indexFile

> **indexFile**: `string`

#### indexLine

> **indexLine**: `number`

#### artifactPath

> **artifactPath**: `string` \| `null`

---

### issues

> **issues**: `string`[]
