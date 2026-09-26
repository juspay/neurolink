[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareArgs

# Type Alias: ProxyShareArgs

> **ProxyShareArgs** = `object`

## Properties

### action?

> `optional` **action?**: [`ProxyShareCliAction`](ProxyShareCliAction.md)

---

### value?

> `optional` **value?**: `string`

Positional argument for actions that take one, e.g. `share url <url>`.

---

### clear?

> `optional` **clear?**: `boolean`

`share url --clear`: forget this node's recorded public address.

---

### peer?

> `optional` **peer?**: `string`

---

### fromAccount?

> `optional` **fromAccount?**: `string`

Lender account a complete share is minted from, for drift auditing.

---

### code?

> `optional` **code?**: `string`

Authorization code from the lender's browser, for split provisioning.

---

### ttl?

> `optional` **ttl?**: `string`

`share note`: how long the note stays redeemable.

---

### memo?

> `optional` **memo?**: `string`

`share note`: free-text note carried on the coin note itself.

---

### offlineGrace?

> `optional` **offlineGrace?**: `string`

Complete-mode lease shape.

---

### heartbeat?

> `optional` **heartbeat?**: `string`

---

### leaseTtl?

> `optional` **leaseTtl?**: `string`

---

### publicUrl?

> `optional` **publicUrl?**: `string`

Public URL this node is reachable at, used to mint a share link.

---

### level?

> `optional` **level?**: `string`

---

### preset?

> `optional` **preset?**: `string`

---

### ledger?

> `optional` **ledger?**: `string`

---

### coins?

> `optional` **coins?**: `number`

---

### refill?

> `optional` **refill?**: `string`

---

### maxSlice?

> `optional` **maxSlice?**: `string`

---

### maxSlicePerAccount?

> `optional` **maxSlicePerAccount?**: `string`

---

### reserve?

> `optional` **reserve?**: `string`

---

### spillover?

> `optional` **spillover?**: `string`

---

### models?

> `optional` **models?**: `string`[]

---

### accounts?

> `optional` **accounts?**: `string`[]

---

### rate?

> `optional` **rate?**: `string`

---

### concurrency?

> `optional` **concurrency?**: `number`

---

### schedule?

> `optional` **schedule?**: `string`

---

### expires?

> `optional` **expires?**: `string`

---

### note?

> `optional` **note?**: `string`

---

### to?

> `optional` **to?**: `string`

---

### json?

> `optional` **json?**: `boolean`

---

### dev?

> `optional` **dev?**: `boolean`
