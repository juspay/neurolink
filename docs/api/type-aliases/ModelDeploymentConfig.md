[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelDeploymentConfig

# Type Alias: ModelDeploymentConfig

> **ModelDeploymentConfig** = `object`

Defined in: [types/providers.ts:1818](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1818)

Model deployment configuration

## Properties

### modelName

> **modelName**: `string`

Defined in: [types/providers.ts:1820](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1820)

Model name

---

### endpointName

> **endpointName**: `string`

Defined in: [types/providers.ts:1822](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1822)

Endpoint name

---

### instanceType

> **instanceType**: `string`

Defined in: [types/providers.ts:1824](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1824)

EC2 instance type

---

### initialInstanceCount

> **initialInstanceCount**: `number`

Defined in: [types/providers.ts:1826](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1826)

Initial instance count

---

### modelDataUrl

> **modelDataUrl**: `string`

Defined in: [types/providers.ts:1828](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1828)

Model data S3 location

---

### image

> **image**: `string`

Defined in: [types/providers.ts:1830](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1830)

Container image URI

---

### executionRoleArn

> **executionRoleArn**: `string`

Defined in: [types/providers.ts:1832](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1832)

IAM execution role ARN

---

### tags?

> `optional` **tags?**: `Record`\<`string`, `string`\>

Defined in: [types/providers.ts:1834](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1834)

Resource tags

---

### autoScaling?

> `optional` **autoScaling?**: `object`

Defined in: [types/providers.ts:1836](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1836)

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
