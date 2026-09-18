[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPeerArgs

# Type Alias: ProxyPeerArgs

> **ProxyPeerArgs** = `object`

Defined in: [types/proxy.ts:4435](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4435)

## Properties

### action?

> `optional` **action?**: `"add"` \| `"request"` \| `"list"` \| `"status"` \| `"sync"` \| `"receipts"` \| `"net"` \| `"redeem"` \| `"test"` \| `"remove"` \| `"pause"` \| `"resume"` \| `"set"`

Defined in: [types/proxy.ts:4436](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4436)

---

### claim?

> `optional` **claim?**: `boolean`

Defined in: [types/proxy.ts:4451](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4451)

`peer request --claim`: collect a code the lender has authorized.

---

### receiptSecret?

> `optional` **receiptSecret?**: `string`

Defined in: [types/proxy.ts:4453](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4453)

Shared secret for verifying this lender's receipts, when added by hand.

---

### reciprocal?

> `optional` **reciprocal?**: `string`

Defined in: [types/proxy.ts:4455](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4455)

`peer net`: label of the grant this node issued to the same person.

---

### noteValue?

> `optional` **noteValue?**: `string`

Defined in: [types/proxy.ts:4457](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4457)

`peer redeem`: the coin note to present.

---

### check?

> `optional` **check?**: `boolean`

Defined in: [types/proxy.ts:4459](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4459)

`peer redeem --check`: ask the issuer about a note without spending it.

---

### label?

> `optional` **label?**: `string`

Defined in: [types/proxy.ts:4461](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4461)

Local account label for a provisioned credential.

---

### name?

> `optional` **name?**: `string`

Defined in: [types/proxy.ts:4462](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4462)

---

### url?

> `optional` **url?**: `string`

Defined in: [types/proxy.ts:4463](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4463)

---

### token?

> `optional` **token?**: `string`

Defined in: [types/proxy.ts:4464](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4464)

---

### link?

> `optional` **link?**: `string`

Defined in: [types/proxy.ts:4465](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4465)

---

### priority?

> `optional` **priority?**: `number`

Defined in: [types/proxy.ts:4466](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4466)

---

### note?

> `optional` **note?**: `string`

Defined in: [types/proxy.ts:4467](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4467)

---

### json?

> `optional` **json?**: `boolean`

Defined in: [types/proxy.ts:4468](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4468)

---

### dev?

> `optional` **dev?**: `boolean`

Defined in: [types/proxy.ts:4469](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4469)
