[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / SessionConfig

# Type Alias: SessionConfig

> **SessionConfig** = `object`

Defined in: [types/auth.ts:502](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L502)

Session configuration

## Properties

### storage?

> `optional` **storage?**: [`SessionStorageType`](SessionStorageType.md)

Defined in: [types/auth.ts:504](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L504)

Session storage type

---

### duration?

> `optional` **duration?**: `number`

Defined in: [types/auth.ts:506](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L506)

Session duration in seconds

---

### autoRefresh?

> `optional` **autoRefresh?**: `boolean`

Defined in: [types/auth.ts:508](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L508)

Auto-refresh sessions before expiration

---

### refreshThreshold?

> `optional` **refreshThreshold?**: `number`

Defined in: [types/auth.ts:510](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L510)

Refresh threshold in seconds (refresh when this much time remains)

---

### allowMultipleSessions?

> `optional` **allowMultipleSessions?**: `boolean`

Defined in: [types/auth.ts:512](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L512)

Allow multiple sessions per user

---

### maxSessionsPerUser?

> `optional` **maxSessionsPerUser?**: `number`

Defined in: [types/auth.ts:514](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L514)

Maximum sessions per user

---

### prefix?

> `optional` **prefix?**: `string`

Defined in: [types/auth.ts:516](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L516)

Session identifier prefix

---

### customStorage?

> `optional` **customStorage?**: [`SessionStorage`](SessionStorage.md)

Defined in: [types/auth.ts:518](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L518)

Custom session storage implementation

---

### redis?

> `optional` **redis?**: `object`

Defined in: [types/auth.ts:520](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L520)

Redis configuration for distributed sessions

#### url

> **url**: `string`

#### prefix?

> `optional` **prefix?**: `string`

#### ttl?

> `optional` **ttl?**: `number`
