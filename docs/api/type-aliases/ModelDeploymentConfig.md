[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelDeploymentConfig

# Type Alias: ModelDeploymentConfig

> **ModelDeploymentConfig** = `object`

Defined in: [types/providers.ts:1744](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1744)

Model deployment configuration

## Properties

### modelName

> **modelName**: `string`

Defined in: [types/providers.ts:1746](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1746)

Model name

---

### endpointName

> **endpointName**: `string`

Defined in: [types/providers.ts:1748](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1748)

Endpoint name

---

### instanceType

> **instanceType**: `string`

Defined in: [types/providers.ts:1750](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1750)

EC2 instance type

---

### initialInstanceCount

> **initialInstanceCount**: `number`

Defined in: [types/providers.ts:1752](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1752)

Initial instance count

---

### modelDataUrl

> **modelDataUrl**: `string`

Defined in: [types/providers.ts:1754](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1754)

Model data S3 location

---

### image

> **image**: `string`

Defined in: [types/providers.ts:1756](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1756)

Container image URI

---

### executionRoleArn

> **executionRoleArn**: `string`

Defined in: [types/providers.ts:1758](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1758)

IAM execution role ARN

---

### tags?

> `optional` **tags?**: `Record`\<`string`, `string`\>

Defined in: [types/providers.ts:1760](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1760)

Resource tags

---

### autoScaling?

> `optional` **autoScaling?**: `object`

Defined in: [types/providers.ts:1762](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1762)

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
