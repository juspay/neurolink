[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPeerArgs

# Type Alias: ProxyPeerArgs

> **ProxyPeerArgs** = `object`

Defined in: [types/proxy.ts:4662](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4662)

## Properties

### action?

> `optional` **action?**: `"add"` \| `"request"` \| `"list"` \| `"status"` \| `"sync"` \| `"receipts"` \| `"net"` \| `"redeem"` \| `"test"` \| `"remove"` \| `"pause"` \| `"resume"` \| `"set"`

Defined in: [types/proxy.ts:4663](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4663)

---

### claim?

> `optional` **claim?**: `boolean`

Defined in: [types/proxy.ts:4678](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4678)

`peer request --claim`: collect a code the lender has authorized.

---

### receiptSecret?

> `optional` **receiptSecret?**: `string`

Defined in: [types/proxy.ts:4680](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4680)

Shared secret for verifying this lender's receipts, when added by hand.

---

### reciprocal?

> `optional` **reciprocal?**: `string`

Defined in: [types/proxy.ts:4682](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4682)

`peer net`: label of the grant this node issued to the same person.

---

### noteValue?

> `optional` **noteValue?**: `string`

Defined in: [types/proxy.ts:4684](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4684)

`peer redeem`: the coin note to present.

---

### check?

> `optional` **check?**: `boolean`

Defined in: [types/proxy.ts:4686](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4686)

`peer redeem --check`: ask the issuer about a note without spending it.

---

### label?

> `optional` **label?**: `string`

Defined in: [types/proxy.ts:4688](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4688)

Local account label for a provisioned credential.

---

### name?

> `optional` **name?**: `string`

Defined in: [types/proxy.ts:4689](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4689)

---

### url?

> `optional` **url?**: `string`

Defined in: [types/proxy.ts:4690](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4690)

---

### token?

> `optional` **token?**: `string`

Defined in: [types/proxy.ts:4691](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4691)

---

### link?

> `optional` **link?**: `string`

Defined in: [types/proxy.ts:4692](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4692)

---

### priority?

> `optional` **priority?**: `number`

Defined in: [types/proxy.ts:4693](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4693)

---

### note?

> `optional` **note?**: `string`

Defined in: [types/proxy.ts:4694](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4694)

---

### json?

> `optional` **json?**: `boolean`

Defined in: [types/proxy.ts:4695](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4695)

---

### dev?

> `optional` **dev?**: `boolean`

Defined in: [types/proxy.ts:4696](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4696)
