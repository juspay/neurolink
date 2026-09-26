[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CloakingContext

# Type Alias: CloakingContext

> **CloakingContext** = `object`

Context passed through the cloaking pipeline.

## Properties

### request

> **request**: [`CloakingRequest`](CloakingRequest.md)

---

### account

> **account**: [`CloakingAccount`](CloakingAccount.md)

---

### config

> **config**: `object`

#### mode

> **mode**: [`CloakingMode`](CloakingMode.md)

#### plugins

> **plugins**: `Record`\<`string`, `unknown`\>

---

### response?

> `optional` **response?**: `object`

#### headers

> **headers**: `Record`\<`string`, `string`\>

#### body

> **body**: `unknown`
