[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPeerArgs

# Type Alias: ProxyPeerArgs

> **ProxyPeerArgs** = `object`

Defined in: [types/proxy.ts:4807](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4807)

## Properties

### action?

> `optional` **action?**: `"add"` \| `"request"` \| `"list"` \| `"status"` \| `"sync"` \| `"receipts"` \| `"net"` \| `"redeem"` \| `"test"` \| `"remove"` \| `"pause"` \| `"resume"` \| `"set"`

Defined in: [types/proxy.ts:4808](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4808)

---

### claim?

> `optional` **claim?**: `boolean`

Defined in: [types/proxy.ts:4823](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4823)

`peer request --claim`: collect a code the lender has authorized.

---

### receiptSecret?

> `optional` **receiptSecret?**: `string`

Defined in: [types/proxy.ts:4825](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4825)

Shared secret for verifying this lender's receipts, when added by hand.

---

### reciprocal?

> `optional` **reciprocal?**: `string`

Defined in: [types/proxy.ts:4827](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4827)

`peer net`: label of the grant this node issued to the same person.

---

### noteValue?

> `optional` **noteValue?**: `string`

Defined in: [types/proxy.ts:4829](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4829)

`peer redeem`: the coin note to present.

---

### check?

> `optional` **check?**: `boolean`

Defined in: [types/proxy.ts:4831](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4831)

`peer redeem --check`: ask the issuer about a note without spending it.

---

### label?

> `optional` **label?**: `string`

Defined in: [types/proxy.ts:4833](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4833)

Local account label for a provisioned credential.

---

### name?

> `optional` **name?**: `string`

Defined in: [types/proxy.ts:4834](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4834)

---

### url?

> `optional` **url?**: `string`

Defined in: [types/proxy.ts:4835](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4835)

---

### token?

> `optional` **token?**: `string`

Defined in: [types/proxy.ts:4836](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4836)

---

### link?

> `optional` **link?**: `string`

Defined in: [types/proxy.ts:4837](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4837)

---

### priority?

> `optional` **priority?**: `number`

Defined in: [types/proxy.ts:4838](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4838)

---

### note?

> `optional` **note?**: `string`

Defined in: [types/proxy.ts:4839](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4839)

---

### json?

> `optional` **json?**: `boolean`

Defined in: [types/proxy.ts:4840](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4840)

---

### dev?

> `optional` **dev?**: `boolean`

Defined in: [types/proxy.ts:4841](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4841)
