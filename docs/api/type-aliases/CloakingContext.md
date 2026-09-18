[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CloakingContext

# Type Alias: CloakingContext

> **CloakingContext** = `object`

Defined in: [types/proxy.ts:377](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L377)

Context passed through the cloaking pipeline.

## Properties

### request

> **request**: [`CloakingRequest`](CloakingRequest.md)

Defined in: [types/proxy.ts:378](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L378)

---

### account

> **account**: [`CloakingAccount`](CloakingAccount.md)

Defined in: [types/proxy.ts:379](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L379)

---

### config

> **config**: `object`

Defined in: [types/proxy.ts:380](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L380)

#### mode

> **mode**: [`CloakingMode`](CloakingMode.md)

#### plugins

> **plugins**: `Record`\<`string`, `unknown`\>

---

### response?

> `optional` **response?**: `object`

Defined in: [types/proxy.ts:384](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L384)

#### headers

> **headers**: `Record`\<`string`, `string`\>

#### body

> **body**: `unknown`
