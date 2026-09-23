[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CloakingContext

# Type Alias: CloakingContext

> **CloakingContext** = `object`

Defined in: [types/proxy.ts:408](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L408)

Context passed through the cloaking pipeline.

## Properties

### request

> **request**: [`CloakingRequest`](CloakingRequest.md)

Defined in: [types/proxy.ts:409](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L409)

---

### account

> **account**: [`CloakingAccount`](CloakingAccount.md)

Defined in: [types/proxy.ts:410](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L410)

---

### config

> **config**: `object`

Defined in: [types/proxy.ts:411](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L411)

#### mode

> **mode**: [`CloakingMode`](CloakingMode.md)

#### plugins

> **plugins**: `Record`\<`string`, `unknown`\>

---

### response?

> `optional` **response?**: `object`

Defined in: [types/proxy.ts:415](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L415)

#### headers

> **headers**: `Record`\<`string`, `string`\>

#### body

> **body**: `unknown`
