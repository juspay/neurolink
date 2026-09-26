[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPeerArgs

# Type Alias: ProxyPeerArgs

> **ProxyPeerArgs** = `object`

Defined in: [types/proxy.ts:4757](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4757)

## Properties

### action?

> `optional` **action?**: `"add"` \| `"request"` \| `"list"` \| `"status"` \| `"sync"` \| `"receipts"` \| `"net"` \| `"redeem"` \| `"test"` \| `"remove"` \| `"pause"` \| `"resume"` \| `"set"`

Defined in: [types/proxy.ts:4758](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4758)

---

### claim?

> `optional` **claim?**: `boolean`

Defined in: [types/proxy.ts:4773](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4773)

`peer request --claim`: collect a code the lender has authorized.

---

### receiptSecret?

> `optional` **receiptSecret?**: `string`

Defined in: [types/proxy.ts:4775](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4775)

Shared secret for verifying this lender's receipts, when added by hand.

---

### reciprocal?

> `optional` **reciprocal?**: `string`

Defined in: [types/proxy.ts:4777](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4777)

`peer net`: label of the grant this node issued to the same person.

---

### noteValue?

> `optional` **noteValue?**: `string`

Defined in: [types/proxy.ts:4779](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4779)

`peer redeem`: the coin note to present.

---

### check?

> `optional` **check?**: `boolean`

Defined in: [types/proxy.ts:4781](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4781)

`peer redeem --check`: ask the issuer about a note without spending it.

---

### label?

> `optional` **label?**: `string`

Defined in: [types/proxy.ts:4783](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4783)

Local account label for a provisioned credential.

---

### name?

> `optional` **name?**: `string`

Defined in: [types/proxy.ts:4784](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4784)

---

### url?

> `optional` **url?**: `string`

Defined in: [types/proxy.ts:4785](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4785)

---

### token?

> `optional` **token?**: `string`

Defined in: [types/proxy.ts:4786](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4786)

---

### link?

> `optional` **link?**: `string`

Defined in: [types/proxy.ts:4787](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4787)

---

### priority?

> `optional` **priority?**: `number`

Defined in: [types/proxy.ts:4788](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4788)

---

### note?

> `optional` **note?**: `string`

Defined in: [types/proxy.ts:4789](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4789)

---

### json?

> `optional` **json?**: `boolean`

Defined in: [types/proxy.ts:4790](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4790)

---

### dev?

> `optional` **dev?**: `boolean`

Defined in: [types/proxy.ts:4791](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4791)
