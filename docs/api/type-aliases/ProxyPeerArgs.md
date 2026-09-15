[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPeerArgs

# Type Alias: ProxyPeerArgs

> **ProxyPeerArgs** = `object`

Defined in: [types/proxy.ts:4410](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4410)

## Properties

### action?

> `optional` **action?**: `"add"` \| `"request"` \| `"list"` \| `"status"` \| `"sync"` \| `"receipts"` \| `"net"` \| `"redeem"` \| `"test"` \| `"remove"` \| `"pause"` \| `"resume"` \| `"set"`

Defined in: [types/proxy.ts:4411](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4411)

---

### claim?

> `optional` **claim?**: `boolean`

Defined in: [types/proxy.ts:4426](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4426)

`peer request --claim`: collect a code the lender has authorized.

---

### receiptSecret?

> `optional` **receiptSecret?**: `string`

Defined in: [types/proxy.ts:4428](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4428)

Shared secret for verifying this lender's receipts, when added by hand.

---

### reciprocal?

> `optional` **reciprocal?**: `string`

Defined in: [types/proxy.ts:4430](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4430)

`peer net`: label of the grant this node issued to the same person.

---

### noteValue?

> `optional` **noteValue?**: `string`

Defined in: [types/proxy.ts:4432](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4432)

`peer redeem`: the coin note to present.

---

### check?

> `optional` **check?**: `boolean`

Defined in: [types/proxy.ts:4434](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4434)

`peer redeem --check`: ask the issuer about a note without spending it.

---

### label?

> `optional` **label?**: `string`

Defined in: [types/proxy.ts:4436](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4436)

Local account label for a provisioned credential.

---

### name?

> `optional` **name?**: `string`

Defined in: [types/proxy.ts:4437](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4437)

---

### url?

> `optional` **url?**: `string`

Defined in: [types/proxy.ts:4438](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4438)

---

### token?

> `optional` **token?**: `string`

Defined in: [types/proxy.ts:4439](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4439)

---

### link?

> `optional` **link?**: `string`

Defined in: [types/proxy.ts:4440](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4440)

---

### priority?

> `optional` **priority?**: `number`

Defined in: [types/proxy.ts:4441](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4441)

---

### note?

> `optional` **note?**: `string`

Defined in: [types/proxy.ts:4442](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4442)

---

### json?

> `optional` **json?**: `boolean`

Defined in: [types/proxy.ts:4443](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4443)

---

### dev?

> `optional` **dev?**: `boolean`

Defined in: [types/proxy.ts:4444](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4444)
