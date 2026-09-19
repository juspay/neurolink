[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPeerArgs

# Type Alias: ProxyPeerArgs

> **ProxyPeerArgs** = `object`

Defined in: [types/proxy.ts:4565](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4565)

## Properties

### action?

> `optional` **action?**: `"add"` \| `"request"` \| `"list"` \| `"status"` \| `"sync"` \| `"receipts"` \| `"net"` \| `"redeem"` \| `"test"` \| `"remove"` \| `"pause"` \| `"resume"` \| `"set"`

Defined in: [types/proxy.ts:4566](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4566)

---

### claim?

> `optional` **claim?**: `boolean`

Defined in: [types/proxy.ts:4581](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4581)

`peer request --claim`: collect a code the lender has authorized.

---

### receiptSecret?

> `optional` **receiptSecret?**: `string`

Defined in: [types/proxy.ts:4583](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4583)

Shared secret for verifying this lender's receipts, when added by hand.

---

### reciprocal?

> `optional` **reciprocal?**: `string`

Defined in: [types/proxy.ts:4585](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4585)

`peer net`: label of the grant this node issued to the same person.

---

### noteValue?

> `optional` **noteValue?**: `string`

Defined in: [types/proxy.ts:4587](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4587)

`peer redeem`: the coin note to present.

---

### check?

> `optional` **check?**: `boolean`

Defined in: [types/proxy.ts:4589](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4589)

`peer redeem --check`: ask the issuer about a note without spending it.

---

### label?

> `optional` **label?**: `string`

Defined in: [types/proxy.ts:4591](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4591)

Local account label for a provisioned credential.

---

### name?

> `optional` **name?**: `string`

Defined in: [types/proxy.ts:4592](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4592)

---

### url?

> `optional` **url?**: `string`

Defined in: [types/proxy.ts:4593](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4593)

---

### token?

> `optional` **token?**: `string`

Defined in: [types/proxy.ts:4594](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4594)

---

### link?

> `optional` **link?**: `string`

Defined in: [types/proxy.ts:4595](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4595)

---

### priority?

> `optional` **priority?**: `number`

Defined in: [types/proxy.ts:4596](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4596)

---

### note?

> `optional` **note?**: `string`

Defined in: [types/proxy.ts:4597](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4597)

---

### json?

> `optional` **json?**: `boolean`

Defined in: [types/proxy.ts:4598](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4598)

---

### dev?

> `optional` **dev?**: `boolean`

Defined in: [types/proxy.ts:4599](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4599)
