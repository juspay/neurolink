[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AdsImageAuditClient

# Type Alias: AdsImageAuditClient

> **AdsImageAuditClient** = `object`

Configure once; each invocation supplies only merchant/competitor input.

## Properties

### generate

> **generate**: (`options`) => `Promise`\<[`GenerateResult`](GenerateResult.md)\>

#### Parameters

##### options

[`GenerateOptions`](GenerateOptions.md)

#### Returns

`Promise`\<[`GenerateResult`](GenerateResult.md)\>

---

### decide

> **decide**: (`options`) => `Promise`\<[`DecisionResult`](DecisionResult.md)\>

#### Parameters

##### options

[`DecisionOptions`](DecisionOptions.md)

#### Returns

`Promise`\<[`DecisionResult`](DecisionResult.md)\>
