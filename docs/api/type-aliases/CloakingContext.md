[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CloakingContext

# Type Alias: CloakingContext

> **CloakingContext** = `object`

Defined in: [types/proxy.ts:388](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L388)

Context passed through the cloaking pipeline.

## Properties

### request

> **request**: [`CloakingRequest`](CloakingRequest.md)

Defined in: [types/proxy.ts:389](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L389)

---

### account

> **account**: [`CloakingAccount`](CloakingAccount.md)

Defined in: [types/proxy.ts:390](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L390)

---

### config

> **config**: `object`

Defined in: [types/proxy.ts:391](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L391)

#### mode

> **mode**: [`CloakingMode`](CloakingMode.md)

#### plugins

> **plugins**: `Record`\<`string`, `unknown`\>

---

### response?

> `optional` **response?**: `object`

Defined in: [types/proxy.ts:395](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L395)

#### headers

> **headers**: `Record`\<`string`, `string`\>

#### body

> **body**: `unknown`
