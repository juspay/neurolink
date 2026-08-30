[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPeerArgs

# Type Alias: ProxyPeerArgs

> **ProxyPeerArgs** = `object`

Defined in: [types/proxy.ts:4035](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4035)

## Properties

### action?

> `optional` **action?**: `"add"` \| `"request"` \| `"list"` \| `"status"` \| `"sync"` \| `"receipts"` \| `"net"` \| `"redeem"` \| `"test"` \| `"remove"` \| `"pause"` \| `"resume"` \| `"set"`

Defined in: [types/proxy.ts:4036](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4036)

---

### claim?

> `optional` **claim?**: `boolean`

Defined in: [types/proxy.ts:4051](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4051)

`peer request --claim`: collect a code the lender has authorized.

---

### receiptSecret?

> `optional` **receiptSecret?**: `string`

Defined in: [types/proxy.ts:4053](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4053)

Shared secret for verifying this lender's receipts, when added by hand.

---

### reciprocal?

> `optional` **reciprocal?**: `string`

Defined in: [types/proxy.ts:4055](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4055)

`peer net`: label of the grant this node issued to the same person.

---

### noteValue?

> `optional` **noteValue?**: `string`

Defined in: [types/proxy.ts:4057](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4057)

`peer redeem`: the coin note to present.

---

### check?

> `optional` **check?**: `boolean`

Defined in: [types/proxy.ts:4059](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4059)

`peer redeem --check`: ask the issuer about a note without spending it.

---

### label?

> `optional` **label?**: `string`

Defined in: [types/proxy.ts:4061](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4061)

Local account label for a provisioned credential.

---

### name?

> `optional` **name?**: `string`

Defined in: [types/proxy.ts:4062](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4062)

---

### url?

> `optional` **url?**: `string`

Defined in: [types/proxy.ts:4063](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4063)

---

### token?

> `optional` **token?**: `string`

Defined in: [types/proxy.ts:4064](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4064)

---

### link?

> `optional` **link?**: `string`

Defined in: [types/proxy.ts:4065](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4065)

---

### priority?

> `optional` **priority?**: `number`

Defined in: [types/proxy.ts:4066](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4066)

---

### note?

> `optional` **note?**: `string`

Defined in: [types/proxy.ts:4067](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4067)

---

### json?

> `optional` **json?**: `boolean`

Defined in: [types/proxy.ts:4068](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4068)

---

### dev?

> `optional` **dev?**: `boolean`

Defined in: [types/proxy.ts:4069](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4069)
