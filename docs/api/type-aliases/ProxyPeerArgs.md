[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPeerArgs

# Type Alias: ProxyPeerArgs

> **ProxyPeerArgs** = `object`

Defined in: [types/proxy.ts:4086](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4086)

## Properties

### action?

> `optional` **action?**: `"add"` \| `"request"` \| `"list"` \| `"status"` \| `"sync"` \| `"receipts"` \| `"net"` \| `"redeem"` \| `"test"` \| `"remove"` \| `"pause"` \| `"resume"` \| `"set"`

Defined in: [types/proxy.ts:4087](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4087)

---

### claim?

> `optional` **claim?**: `boolean`

Defined in: [types/proxy.ts:4102](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4102)

`peer request --claim`: collect a code the lender has authorized.

---

### receiptSecret?

> `optional` **receiptSecret?**: `string`

Defined in: [types/proxy.ts:4104](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4104)

Shared secret for verifying this lender's receipts, when added by hand.

---

### reciprocal?

> `optional` **reciprocal?**: `string`

Defined in: [types/proxy.ts:4106](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4106)

`peer net`: label of the grant this node issued to the same person.

---

### noteValue?

> `optional` **noteValue?**: `string`

Defined in: [types/proxy.ts:4108](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4108)

`peer redeem`: the coin note to present.

---

### check?

> `optional` **check?**: `boolean`

Defined in: [types/proxy.ts:4110](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4110)

`peer redeem --check`: ask the issuer about a note without spending it.

---

### label?

> `optional` **label?**: `string`

Defined in: [types/proxy.ts:4112](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4112)

Local account label for a provisioned credential.

---

### name?

> `optional` **name?**: `string`

Defined in: [types/proxy.ts:4113](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4113)

---

### url?

> `optional` **url?**: `string`

Defined in: [types/proxy.ts:4114](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4114)

---

### token?

> `optional` **token?**: `string`

Defined in: [types/proxy.ts:4115](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4115)

---

### link?

> `optional` **link?**: `string`

Defined in: [types/proxy.ts:4116](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4116)

---

### priority?

> `optional` **priority?**: `number`

Defined in: [types/proxy.ts:4117](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4117)

---

### note?

> `optional` **note?**: `string`

Defined in: [types/proxy.ts:4118](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4118)

---

### json?

> `optional` **json?**: `boolean`

Defined in: [types/proxy.ts:4119](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4119)

---

### dev?

> `optional` **dev?**: `boolean`

Defined in: [types/proxy.ts:4120](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4120)
