[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPeerArgs

# Type Alias: ProxyPeerArgs

> **ProxyPeerArgs** = `object`

Defined in: [types/proxy.ts:4396](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4396)

## Properties

### action?

> `optional` **action?**: `"add"` \| `"request"` \| `"list"` \| `"status"` \| `"sync"` \| `"receipts"` \| `"net"` \| `"redeem"` \| `"test"` \| `"remove"` \| `"pause"` \| `"resume"` \| `"set"`

Defined in: [types/proxy.ts:4397](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4397)

---

### claim?

> `optional` **claim?**: `boolean`

Defined in: [types/proxy.ts:4412](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4412)

`peer request --claim`: collect a code the lender has authorized.

---

### receiptSecret?

> `optional` **receiptSecret?**: `string`

Defined in: [types/proxy.ts:4414](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4414)

Shared secret for verifying this lender's receipts, when added by hand.

---

### reciprocal?

> `optional` **reciprocal?**: `string`

Defined in: [types/proxy.ts:4416](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4416)

`peer net`: label of the grant this node issued to the same person.

---

### noteValue?

> `optional` **noteValue?**: `string`

Defined in: [types/proxy.ts:4418](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4418)

`peer redeem`: the coin note to present.

---

### check?

> `optional` **check?**: `boolean`

Defined in: [types/proxy.ts:4420](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4420)

`peer redeem --check`: ask the issuer about a note without spending it.

---

### label?

> `optional` **label?**: `string`

Defined in: [types/proxy.ts:4422](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4422)

Local account label for a provisioned credential.

---

### name?

> `optional` **name?**: `string`

Defined in: [types/proxy.ts:4423](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4423)

---

### url?

> `optional` **url?**: `string`

Defined in: [types/proxy.ts:4424](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4424)

---

### token?

> `optional` **token?**: `string`

Defined in: [types/proxy.ts:4425](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4425)

---

### link?

> `optional` **link?**: `string`

Defined in: [types/proxy.ts:4426](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4426)

---

### priority?

> `optional` **priority?**: `number`

Defined in: [types/proxy.ts:4427](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4427)

---

### note?

> `optional` **note?**: `string`

Defined in: [types/proxy.ts:4428](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4428)

---

### json?

> `optional` **json?**: `boolean`

Defined in: [types/proxy.ts:4429](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4429)

---

### dev?

> `optional` **dev?**: `boolean`

Defined in: [types/proxy.ts:4430](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4430)
