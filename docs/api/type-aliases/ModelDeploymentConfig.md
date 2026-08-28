[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelDeploymentConfig

# Type Alias: ModelDeploymentConfig

> **ModelDeploymentConfig** = `object`

Defined in: [types/providers.ts:1747](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1747)

Model deployment configuration

## Properties

### modelName

> **modelName**: `string`

Defined in: [types/providers.ts:1749](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1749)

Model name

---

### endpointName

> **endpointName**: `string`

Defined in: [types/providers.ts:1751](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1751)

Endpoint name

---

### instanceType

> **instanceType**: `string`

Defined in: [types/providers.ts:1753](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1753)

EC2 instance type

---

### initialInstanceCount

> **initialInstanceCount**: `number`

Defined in: [types/providers.ts:1755](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1755)

Initial instance count

---

### modelDataUrl

> **modelDataUrl**: `string`

Defined in: [types/providers.ts:1757](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1757)

Model data S3 location

---

### image

> **image**: `string`

Defined in: [types/providers.ts:1759](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1759)

Container image URI

---

### executionRoleArn

> **executionRoleArn**: `string`

Defined in: [types/providers.ts:1761](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1761)

IAM execution role ARN

---

### tags?

> `optional` **tags?**: `Record`\<`string`, `string`\>

Defined in: [types/providers.ts:1763](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1763)

Resource tags

---

### autoScaling?

> `optional` **autoScaling?**: `object`

Defined in: [types/providers.ts:1765](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1765)

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
