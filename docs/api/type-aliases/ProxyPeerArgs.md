[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPeerArgs

# Type Alias: ProxyPeerArgs

> **ProxyPeerArgs** = `object`

Defined in: [types/proxy.ts:4682](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4682)

## Properties

### action?

> `optional` **action?**: `"add"` \| `"request"` \| `"list"` \| `"status"` \| `"sync"` \| `"receipts"` \| `"net"` \| `"redeem"` \| `"test"` \| `"remove"` \| `"pause"` \| `"resume"` \| `"set"`

Defined in: [types/proxy.ts:4683](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4683)

---

### claim?

> `optional` **claim?**: `boolean`

Defined in: [types/proxy.ts:4698](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4698)

`peer request --claim`: collect a code the lender has authorized.

---

### receiptSecret?

> `optional` **receiptSecret?**: `string`

Defined in: [types/proxy.ts:4700](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4700)

Shared secret for verifying this lender's receipts, when added by hand.

---

### reciprocal?

> `optional` **reciprocal?**: `string`

Defined in: [types/proxy.ts:4702](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4702)

`peer net`: label of the grant this node issued to the same person.

---

### noteValue?

> `optional` **noteValue?**: `string`

Defined in: [types/proxy.ts:4704](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4704)

`peer redeem`: the coin note to present.

---

### check?

> `optional` **check?**: `boolean`

Defined in: [types/proxy.ts:4706](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4706)

`peer redeem --check`: ask the issuer about a note without spending it.

---

### label?

> `optional` **label?**: `string`

Defined in: [types/proxy.ts:4708](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4708)

Local account label for a provisioned credential.

---

### name?

> `optional` **name?**: `string`

Defined in: [types/proxy.ts:4709](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4709)

---

### url?

> `optional` **url?**: `string`

Defined in: [types/proxy.ts:4710](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4710)

---

### token?

> `optional` **token?**: `string`

Defined in: [types/proxy.ts:4711](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4711)

---

### link?

> `optional` **link?**: `string`

Defined in: [types/proxy.ts:4712](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4712)

---

### priority?

> `optional` **priority?**: `number`

Defined in: [types/proxy.ts:4713](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4713)

---

### note?

> `optional` **note?**: `string`

Defined in: [types/proxy.ts:4714](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4714)

---

### json?

> `optional` **json?**: `boolean`

Defined in: [types/proxy.ts:4715](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4715)

---

### dev?

> `optional` **dev?**: `boolean`

Defined in: [types/proxy.ts:4716](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4716)
