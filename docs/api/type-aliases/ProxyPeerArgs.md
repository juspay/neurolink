[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPeerArgs

# Type Alias: ProxyPeerArgs

> **ProxyPeerArgs** = `object`

Defined in: [types/proxy.ts:4817](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4817)

## Properties

### action?

> `optional` **action?**: `"add"` \| `"request"` \| `"list"` \| `"status"` \| `"sync"` \| `"receipts"` \| `"net"` \| `"redeem"` \| `"test"` \| `"remove"` \| `"pause"` \| `"resume"` \| `"set"`

Defined in: [types/proxy.ts:4818](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4818)

---

### claim?

> `optional` **claim?**: `boolean`

Defined in: [types/proxy.ts:4833](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4833)

`peer request --claim`: collect a code the lender has authorized.

---

### receiptSecret?

> `optional` **receiptSecret?**: `string`

Defined in: [types/proxy.ts:4835](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4835)

Shared secret for verifying this lender's receipts, when added by hand.

---

### reciprocal?

> `optional` **reciprocal?**: `string`

Defined in: [types/proxy.ts:4837](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4837)

`peer net`: label of the grant this node issued to the same person.

---

### noteValue?

> `optional` **noteValue?**: `string`

Defined in: [types/proxy.ts:4839](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4839)

`peer redeem`: the coin note to present.

---

### check?

> `optional` **check?**: `boolean`

Defined in: [types/proxy.ts:4841](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4841)

`peer redeem --check`: ask the issuer about a note without spending it.

---

### label?

> `optional` **label?**: `string`

Defined in: [types/proxy.ts:4843](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4843)

Local account label for a provisioned credential.

---

### name?

> `optional` **name?**: `string`

Defined in: [types/proxy.ts:4844](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4844)

---

### url?

> `optional` **url?**: `string`

Defined in: [types/proxy.ts:4845](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4845)

---

### token?

> `optional` **token?**: `string`

Defined in: [types/proxy.ts:4846](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4846)

---

### link?

> `optional` **link?**: `string`

Defined in: [types/proxy.ts:4847](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4847)

---

### priority?

> `optional` **priority?**: `number`

Defined in: [types/proxy.ts:4848](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4848)

---

### note?

> `optional` **note?**: `string`

Defined in: [types/proxy.ts:4849](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4849)

---

### json?

> `optional` **json?**: `boolean`

Defined in: [types/proxy.ts:4850](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4850)

---

### dev?

> `optional` **dev?**: `boolean`

Defined in: [types/proxy.ts:4851](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4851)
