[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CloakingContext

# Type Alias: CloakingContext

> **CloakingContext** = `object`

Defined in: [types/proxy.ts:370](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L370)

Context passed through the cloaking pipeline.

## Properties

### request

> **request**: [`CloakingRequest`](CloakingRequest.md)

Defined in: [types/proxy.ts:371](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L371)

---

### account

> **account**: [`CloakingAccount`](CloakingAccount.md)

Defined in: [types/proxy.ts:372](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L372)

---

### config

> **config**: `object`

Defined in: [types/proxy.ts:373](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L373)

#### mode

> **mode**: [`CloakingMode`](CloakingMode.md)

#### plugins

> **plugins**: `Record`\<`string`, `unknown`\>

---

### response?

> `optional` **response?**: `object`

Defined in: [types/proxy.ts:377](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L377)

#### headers

> **headers**: `Record`\<`string`, `string`\>

#### body

> **body**: `unknown`
