[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelDeploymentConfig

# Type Alias: ModelDeploymentConfig

> **ModelDeploymentConfig** = `object`

Defined in: [types/providers.ts:1757](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1757)

Model deployment configuration

## Properties

### modelName

> **modelName**: `string`

Defined in: [types/providers.ts:1759](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1759)

Model name

---

### endpointName

> **endpointName**: `string`

Defined in: [types/providers.ts:1761](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1761)

Endpoint name

---

### instanceType

> **instanceType**: `string`

Defined in: [types/providers.ts:1763](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1763)

EC2 instance type

---

### initialInstanceCount

> **initialInstanceCount**: `number`

Defined in: [types/providers.ts:1765](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1765)

Initial instance count

---

### modelDataUrl

> **modelDataUrl**: `string`

Defined in: [types/providers.ts:1767](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1767)

Model data S3 location

---

### image

> **image**: `string`

Defined in: [types/providers.ts:1769](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1769)

Container image URI

---

### executionRoleArn

> **executionRoleArn**: `string`

Defined in: [types/providers.ts:1771](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1771)

IAM execution role ARN

---

### tags?

> `optional` **tags?**: `Record`\<`string`, `string`\>

Defined in: [types/providers.ts:1773](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1773)

Resource tags

---

### autoScaling?

> `optional` **autoScaling?**: `object`

Defined in: [types/providers.ts:1775](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1775)

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
