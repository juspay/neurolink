[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPeerArgs

# Type Alias: ProxyPeerArgs

> **ProxyPeerArgs** = `object`

Defined in: [types/proxy.ts:3965](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3965)

## Properties

### action?

> `optional` **action?**: `"add"` \| `"request"` \| `"list"` \| `"status"` \| `"sync"` \| `"receipts"` \| `"net"` \| `"redeem"` \| `"test"` \| `"remove"` \| `"pause"` \| `"resume"` \| `"set"`

Defined in: [types/proxy.ts:3966](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3966)

---

### claim?

> `optional` **claim?**: `boolean`

Defined in: [types/proxy.ts:3981](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3981)

`peer request --claim`: collect a code the lender has authorized.

---

### receiptSecret?

> `optional` **receiptSecret?**: `string`

Defined in: [types/proxy.ts:3983](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3983)

Shared secret for verifying this lender's receipts, when added by hand.

---

### reciprocal?

> `optional` **reciprocal?**: `string`

Defined in: [types/proxy.ts:3985](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3985)

`peer net`: label of the grant this node issued to the same person.

---

### noteValue?

> `optional` **noteValue?**: `string`

Defined in: [types/proxy.ts:3987](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3987)

`peer redeem`: the coin note to present.

---

### check?

> `optional` **check?**: `boolean`

Defined in: [types/proxy.ts:3989](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3989)

`peer redeem --check`: ask the issuer about a note without spending it.

---

### label?

> `optional` **label?**: `string`

Defined in: [types/proxy.ts:3991](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3991)

Local account label for a provisioned credential.

---

### name?

> `optional` **name?**: `string`

Defined in: [types/proxy.ts:3992](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3992)

---

### url?

> `optional` **url?**: `string`

Defined in: [types/proxy.ts:3993](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3993)

---

### token?

> `optional` **token?**: `string`

Defined in: [types/proxy.ts:3994](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3994)

---

### link?

> `optional` **link?**: `string`

Defined in: [types/proxy.ts:3995](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3995)

---

### priority?

> `optional` **priority?**: `number`

Defined in: [types/proxy.ts:3996](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3996)

---

### note?

> `optional` **note?**: `string`

Defined in: [types/proxy.ts:3997](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3997)

---

### json?

> `optional` **json?**: `boolean`

Defined in: [types/proxy.ts:3998](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3998)

---

### dev?

> `optional` **dev?**: `boolean`

Defined in: [types/proxy.ts:3999](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3999)
