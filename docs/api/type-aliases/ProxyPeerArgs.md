[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPeerArgs

# Type Alias: ProxyPeerArgs

> **ProxyPeerArgs** = `object`

## Properties

### action?

> `optional` **action?**: `"add"` \| `"request"` \| `"list"` \| `"status"` \| `"sync"` \| `"receipts"` \| `"net"` \| `"redeem"` \| `"test"` \| `"remove"` \| `"pause"` \| `"resume"` \| `"set"`

---

### claim?

> `optional` **claim?**: `boolean`

`peer request --claim`: collect a code the lender has authorized.

---

### receiptSecret?

> `optional` **receiptSecret?**: `string`

Shared secret for verifying this lender's receipts, when added by hand.

---

### reciprocal?

> `optional` **reciprocal?**: `string`

`peer net`: label of the grant this node issued to the same person.

---

### noteValue?

> `optional` **noteValue?**: `string`

`peer redeem`: the coin note to present.

---

### check?

> `optional` **check?**: `boolean`

`peer redeem --check`: ask the issuer about a note without spending it.

---

### label?

> `optional` **label?**: `string`

Local account label for a provisioned credential.

---

### name?

> `optional` **name?**: `string`

---

### url?

> `optional` **url?**: `string`

---

### token?

> `optional` **token?**: `string`

---

### link?

> `optional` **link?**: `string`

---

### priority?

> `optional` **priority?**: `number`

---

### note?

> `optional` **note?**: `string`

---

### json?

> `optional` **json?**: `boolean`

---

### dev?

> `optional` **dev?**: `boolean`
