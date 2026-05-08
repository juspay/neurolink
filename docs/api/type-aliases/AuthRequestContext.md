[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthRequestContext

# Type Alias: AuthRequestContext

> **AuthRequestContext** = `object`

Defined in: [types/auth.ts:342](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L342)

Authentication request context

## Properties

### method?

> `optional` **method?**: `string`

Defined in: [types/auth.ts:344](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L344)

HTTP method

---

### path?

> `optional` **path?**: `string`

Defined in: [types/auth.ts:346](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L346)

Request URL/path

---

### headers

> **headers**: `Record`\<`string`, `string` \| `string`[] \| `undefined`\>

Defined in: [types/auth.ts:348](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L348)

HTTP request headers

---

### cookies?

> `optional` **cookies?**: `Record`\<`string`, `string`\>

Defined in: [types/auth.ts:350](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L350)

Request cookies

---

### query?

> `optional` **query?**: `Record`\<`string`, `string` \| `string`[] \| `undefined`\>

Defined in: [types/auth.ts:352](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L352)

Query parameters

---

### body?

> `optional` **body?**: `unknown`

Defined in: [types/auth.ts:354](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L354)

Request body (if available)

---

### ip?

> `optional` **ip?**: `string`

Defined in: [types/auth.ts:356](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L356)

IP address

---

### ipAddress?

> `optional` **ipAddress?**: `string`

Defined in: [types/auth.ts:358](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L358)

IP address (alias for session builders that expect this field)

---

### userAgent?

> `optional` **userAgent?**: `string`

Defined in: [types/auth.ts:360](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L360)

Request user agent

---

### requestId?

> `optional` **requestId?**: `string`

Defined in: [types/auth.ts:362](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L362)

Request ID for tracing
