[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPeerArgs

# Type Alias: ProxyPeerArgs

> **ProxyPeerArgs** = `object`

Defined in: [types/proxy.ts:4057](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4057)

## Properties

### action?

> `optional` **action?**: `"add"` \| `"request"` \| `"list"` \| `"status"` \| `"sync"` \| `"receipts"` \| `"net"` \| `"redeem"` \| `"test"` \| `"remove"` \| `"pause"` \| `"resume"` \| `"set"`

Defined in: [types/proxy.ts:4058](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4058)

---

### claim?

> `optional` **claim?**: `boolean`

Defined in: [types/proxy.ts:4073](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4073)

`peer request --claim`: collect a code the lender has authorized.

---

### receiptSecret?

> `optional` **receiptSecret?**: `string`

Defined in: [types/proxy.ts:4075](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4075)

Shared secret for verifying this lender's receipts, when added by hand.

---

### reciprocal?

> `optional` **reciprocal?**: `string`

Defined in: [types/proxy.ts:4077](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4077)

`peer net`: label of the grant this node issued to the same person.

---

### noteValue?

> `optional` **noteValue?**: `string`

Defined in: [types/proxy.ts:4079](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4079)

`peer redeem`: the coin note to present.

---

### check?

> `optional` **check?**: `boolean`

Defined in: [types/proxy.ts:4081](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4081)

`peer redeem --check`: ask the issuer about a note without spending it.

---

### label?

> `optional` **label?**: `string`

Defined in: [types/proxy.ts:4083](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4083)

Local account label for a provisioned credential.

---

### name?

> `optional` **name?**: `string`

Defined in: [types/proxy.ts:4084](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4084)

---

### url?

> `optional` **url?**: `string`

Defined in: [types/proxy.ts:4085](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4085)

---

### token?

> `optional` **token?**: `string`

Defined in: [types/proxy.ts:4086](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4086)

---

### link?

> `optional` **link?**: `string`

Defined in: [types/proxy.ts:4087](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4087)

---

### priority?

> `optional` **priority?**: `number`

Defined in: [types/proxy.ts:4088](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4088)

---

### note?

> `optional` **note?**: `string`

Defined in: [types/proxy.ts:4089](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4089)

---

### json?

> `optional` **json?**: `boolean`

Defined in: [types/proxy.ts:4090](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4090)

---

### dev?

> `optional` **dev?**: `boolean`

Defined in: [types/proxy.ts:4091](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4091)
