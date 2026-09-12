[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelDeploymentConfig

# Type Alias: ModelDeploymentConfig

> **ModelDeploymentConfig** = `object`

Defined in: [types/providers.ts:1760](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1760)

Model deployment configuration

## Properties

### modelName

> **modelName**: `string`

Defined in: [types/providers.ts:1762](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1762)

Model name

---

### endpointName

> **endpointName**: `string`

Defined in: [types/providers.ts:1764](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1764)

Endpoint name

---

### instanceType

> **instanceType**: `string`

Defined in: [types/providers.ts:1766](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1766)

EC2 instance type

---

### initialInstanceCount

> **initialInstanceCount**: `number`

Defined in: [types/providers.ts:1768](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1768)

Initial instance count

---

### modelDataUrl

> **modelDataUrl**: `string`

Defined in: [types/providers.ts:1770](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1770)

Model data S3 location

---

### image

> **image**: `string`

Defined in: [types/providers.ts:1772](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1772)

Container image URI

---

### executionRoleArn

> **executionRoleArn**: `string`

Defined in: [types/providers.ts:1774](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1774)

IAM execution role ARN

---

### tags?

> `optional` **tags?**: `Record`\<`string`, `string`\>

Defined in: [types/providers.ts:1776](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1776)

Resource tags

---

### autoScaling?

> `optional` **autoScaling?**: `object`

Defined in: [types/providers.ts:1778](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1778)

Auto scaling configuration

#### minCapacity

> **minCapacity**: `number`

#### maxCapacity

> **maxCapacity**: `number`

#### targetValue

> **targetValue**: `number`

#### scaleUpCooldown

> **scaleUpCooldown**: `number`

#### scaleDownCooldown

> **scaleDownCooldown**: `number`
