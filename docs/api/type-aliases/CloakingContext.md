[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CloakingContext

# Type Alias: CloakingContext

> **CloakingContext** = `object`

Defined in: [types/proxy.ts:376](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L376)

Context passed through the cloaking pipeline.

## Properties

### request

> **request**: [`CloakingRequest`](CloakingRequest.md)

Defined in: [types/proxy.ts:377](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L377)

---

### account

> **account**: [`CloakingAccount`](CloakingAccount.md)

Defined in: [types/proxy.ts:378](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L378)

---

### config

> **config**: `object`

Defined in: [types/proxy.ts:379](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L379)

#### mode

> **mode**: [`CloakingMode`](CloakingMode.md)

#### plugins

> **plugins**: `Record`\<`string`, `unknown`\>

---

### response?

> `optional` **response?**: `object`

Defined in: [types/proxy.ts:383](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L383)

#### headers

> **headers**: `Record`\<`string`, `string`\>

#### body

> **body**: `unknown`
