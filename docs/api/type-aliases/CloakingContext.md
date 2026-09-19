[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CloakingContext

# Type Alias: CloakingContext

> **CloakingContext** = `object`

Defined in: [types/proxy.ts:382](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L382)

Context passed through the cloaking pipeline.

## Properties

### request

> **request**: [`CloakingRequest`](CloakingRequest.md)

Defined in: [types/proxy.ts:383](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L383)

---

### account

> **account**: [`CloakingAccount`](CloakingAccount.md)

Defined in: [types/proxy.ts:384](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L384)

---

### config

> **config**: `object`

Defined in: [types/proxy.ts:385](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L385)

#### mode

> **mode**: [`CloakingMode`](CloakingMode.md)

#### plugins

> **plugins**: `Record`\<`string`, `unknown`\>

---

### response?

> `optional` **response?**: `object`

Defined in: [types/proxy.ts:389](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L389)

#### headers

> **headers**: `Record`\<`string`, `string`\>

#### body

> **body**: `unknown`
