[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPeerArgs

# Type Alias: ProxyPeerArgs

> **ProxyPeerArgs** = `object`

Defined in: [types/proxy.ts:4285](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4285)

## Properties

### action?

> `optional` **action?**: `"add"` \| `"request"` \| `"list"` \| `"status"` \| `"sync"` \| `"receipts"` \| `"net"` \| `"redeem"` \| `"test"` \| `"remove"` \| `"pause"` \| `"resume"` \| `"set"`

Defined in: [types/proxy.ts:4286](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4286)

---

### claim?

> `optional` **claim?**: `boolean`

Defined in: [types/proxy.ts:4301](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4301)

`peer request --claim`: collect a code the lender has authorized.

---

### receiptSecret?

> `optional` **receiptSecret?**: `string`

Defined in: [types/proxy.ts:4303](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4303)

Shared secret for verifying this lender's receipts, when added by hand.

---

### reciprocal?

> `optional` **reciprocal?**: `string`

Defined in: [types/proxy.ts:4305](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4305)

`peer net`: label of the grant this node issued to the same person.

---

### noteValue?

> `optional` **noteValue?**: `string`

Defined in: [types/proxy.ts:4307](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4307)

`peer redeem`: the coin note to present.

---

### check?

> `optional` **check?**: `boolean`

Defined in: [types/proxy.ts:4309](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4309)

`peer redeem --check`: ask the issuer about a note without spending it.

---

### label?

> `optional` **label?**: `string`

Defined in: [types/proxy.ts:4311](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4311)

Local account label for a provisioned credential.

---

### name?

> `optional` **name?**: `string`

Defined in: [types/proxy.ts:4312](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4312)

---

### url?

> `optional` **url?**: `string`

Defined in: [types/proxy.ts:4313](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4313)

---

### token?

> `optional` **token?**: `string`

Defined in: [types/proxy.ts:4314](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4314)

---

### link?

> `optional` **link?**: `string`

Defined in: [types/proxy.ts:4315](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4315)

---

### priority?

> `optional` **priority?**: `number`

Defined in: [types/proxy.ts:4316](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4316)

---

### note?

> `optional` **note?**: `string`

Defined in: [types/proxy.ts:4317](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4317)

---

### json?

> `optional` **json?**: `boolean`

Defined in: [types/proxy.ts:4318](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4318)

---

### dev?

> `optional` **dev?**: `boolean`

Defined in: [types/proxy.ts:4319](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4319)
