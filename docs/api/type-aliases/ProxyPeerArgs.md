[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPeerArgs

# Type Alias: ProxyPeerArgs

> **ProxyPeerArgs** = `object`

Defined in: [types/proxy.ts:4685](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4685)

## Properties

### action?

> `optional` **action?**: `"add"` \| `"request"` \| `"list"` \| `"status"` \| `"sync"` \| `"receipts"` \| `"net"` \| `"redeem"` \| `"test"` \| `"remove"` \| `"pause"` \| `"resume"` \| `"set"`

Defined in: [types/proxy.ts:4686](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4686)

---

### claim?

> `optional` **claim?**: `boolean`

Defined in: [types/proxy.ts:4701](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4701)

`peer request --claim`: collect a code the lender has authorized.

---

### receiptSecret?

> `optional` **receiptSecret?**: `string`

Defined in: [types/proxy.ts:4703](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4703)

Shared secret for verifying this lender's receipts, when added by hand.

---

### reciprocal?

> `optional` **reciprocal?**: `string`

Defined in: [types/proxy.ts:4705](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4705)

`peer net`: label of the grant this node issued to the same person.

---

### noteValue?

> `optional` **noteValue?**: `string`

Defined in: [types/proxy.ts:4707](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4707)

`peer redeem`: the coin note to present.

---

### check?

> `optional` **check?**: `boolean`

Defined in: [types/proxy.ts:4709](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4709)

`peer redeem --check`: ask the issuer about a note without spending it.

---

### label?

> `optional` **label?**: `string`

Defined in: [types/proxy.ts:4711](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4711)

Local account label for a provisioned credential.

---

### name?

> `optional` **name?**: `string`

Defined in: [types/proxy.ts:4712](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4712)

---

### url?

> `optional` **url?**: `string`

Defined in: [types/proxy.ts:4713](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4713)

---

### token?

> `optional` **token?**: `string`

Defined in: [types/proxy.ts:4714](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4714)

---

### link?

> `optional` **link?**: `string`

Defined in: [types/proxy.ts:4715](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4715)

---

### priority?

> `optional` **priority?**: `number`

Defined in: [types/proxy.ts:4716](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4716)

---

### note?

> `optional` **note?**: `string`

Defined in: [types/proxy.ts:4717](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4717)

---

### json?

> `optional` **json?**: `boolean`

Defined in: [types/proxy.ts:4718](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4718)

---

### dev?

> `optional` **dev?**: `boolean`

Defined in: [types/proxy.ts:4719](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4719)
