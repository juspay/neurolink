[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPeerArgs

# Type Alias: ProxyPeerArgs

> **ProxyPeerArgs** = `object`

Defined in: [types/proxy.ts:4072](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4072)

## Properties

### action?

> `optional` **action?**: `"add"` \| `"request"` \| `"list"` \| `"status"` \| `"sync"` \| `"receipts"` \| `"net"` \| `"redeem"` \| `"test"` \| `"remove"` \| `"pause"` \| `"resume"` \| `"set"`

Defined in: [types/proxy.ts:4073](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4073)

---

### claim?

> `optional` **claim?**: `boolean`

Defined in: [types/proxy.ts:4088](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4088)

`peer request --claim`: collect a code the lender has authorized.

---

### receiptSecret?

> `optional` **receiptSecret?**: `string`

Defined in: [types/proxy.ts:4090](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4090)

Shared secret for verifying this lender's receipts, when added by hand.

---

### reciprocal?

> `optional` **reciprocal?**: `string`

Defined in: [types/proxy.ts:4092](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4092)

`peer net`: label of the grant this node issued to the same person.

---

### noteValue?

> `optional` **noteValue?**: `string`

Defined in: [types/proxy.ts:4094](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4094)

`peer redeem`: the coin note to present.

---

### check?

> `optional` **check?**: `boolean`

Defined in: [types/proxy.ts:4096](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4096)

`peer redeem --check`: ask the issuer about a note without spending it.

---

### label?

> `optional` **label?**: `string`

Defined in: [types/proxy.ts:4098](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4098)

Local account label for a provisioned credential.

---

### name?

> `optional` **name?**: `string`

Defined in: [types/proxy.ts:4099](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4099)

---

### url?

> `optional` **url?**: `string`

Defined in: [types/proxy.ts:4100](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4100)

---

### token?

> `optional` **token?**: `string`

Defined in: [types/proxy.ts:4101](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4101)

---

### link?

> `optional` **link?**: `string`

Defined in: [types/proxy.ts:4102](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4102)

---

### priority?

> `optional` **priority?**: `number`

Defined in: [types/proxy.ts:4103](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4103)

---

### note?

> `optional` **note?**: `string`

Defined in: [types/proxy.ts:4104](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4104)

---

### json?

> `optional` **json?**: `boolean`

Defined in: [types/proxy.ts:4105](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4105)

---

### dev?

> `optional` **dev?**: `boolean`

Defined in: [types/proxy.ts:4106](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4106)
