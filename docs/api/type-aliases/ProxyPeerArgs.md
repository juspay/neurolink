[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPeerArgs

# Type Alias: ProxyPeerArgs

> **ProxyPeerArgs** = `object`

Defined in: [types/proxy.ts:4066](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4066)

## Properties

### action?

> `optional` **action?**: `"add"` \| `"request"` \| `"list"` \| `"status"` \| `"sync"` \| `"receipts"` \| `"net"` \| `"redeem"` \| `"test"` \| `"remove"` \| `"pause"` \| `"resume"` \| `"set"`

Defined in: [types/proxy.ts:4067](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4067)

---

### claim?

> `optional` **claim?**: `boolean`

Defined in: [types/proxy.ts:4082](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4082)

`peer request --claim`: collect a code the lender has authorized.

---

### receiptSecret?

> `optional` **receiptSecret?**: `string`

Defined in: [types/proxy.ts:4084](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4084)

Shared secret for verifying this lender's receipts, when added by hand.

---

### reciprocal?

> `optional` **reciprocal?**: `string`

Defined in: [types/proxy.ts:4086](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4086)

`peer net`: label of the grant this node issued to the same person.

---

### noteValue?

> `optional` **noteValue?**: `string`

Defined in: [types/proxy.ts:4088](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4088)

`peer redeem`: the coin note to present.

---

### check?

> `optional` **check?**: `boolean`

Defined in: [types/proxy.ts:4090](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4090)

`peer redeem --check`: ask the issuer about a note without spending it.

---

### label?

> `optional` **label?**: `string`

Defined in: [types/proxy.ts:4092](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4092)

Local account label for a provisioned credential.

---

### name?

> `optional` **name?**: `string`

Defined in: [types/proxy.ts:4093](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4093)

---

### url?

> `optional` **url?**: `string`

Defined in: [types/proxy.ts:4094](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4094)

---

### token?

> `optional` **token?**: `string`

Defined in: [types/proxy.ts:4095](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4095)

---

### link?

> `optional` **link?**: `string`

Defined in: [types/proxy.ts:4096](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4096)

---

### priority?

> `optional` **priority?**: `number`

Defined in: [types/proxy.ts:4097](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4097)

---

### note?

> `optional` **note?**: `string`

Defined in: [types/proxy.ts:4098](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4098)

---

### json?

> `optional` **json?**: `boolean`

Defined in: [types/proxy.ts:4099](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4099)

---

### dev?

> `optional` **dev?**: `boolean`

Defined in: [types/proxy.ts:4100](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4100)
