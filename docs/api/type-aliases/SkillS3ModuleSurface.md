[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SkillS3ModuleSurface

# Type Alias: SkillS3ModuleSurface

> **SkillS3ModuleSurface** = `object`

Structural surface of the lazily-required @aws-sdk/client-s3 module —
only the pieces the S3 skill store touches (same pattern as
HippocampusModule for the optional memory peer).

## Properties

### S3Client

> **S3Client**: (`config`) => `object`

#### Parameters

##### config

`Record`\<`string`, `unknown`\>

#### Returns

`object`

##### send

> **send**: (`command`) => `Promise`\<`unknown`\>

###### Parameters

###### command

`unknown`

###### Returns

`Promise`\<`unknown`\>

---

### GetObjectCommand

> **GetObjectCommand**: (`input`) => `unknown`

#### Parameters

##### input

`Record`\<`string`, `unknown`\>

#### Returns

`unknown`

---

### PutObjectCommand

> **PutObjectCommand**: (`input`) => `unknown`

#### Parameters

##### input

`Record`\<`string`, `unknown`\>

#### Returns

`unknown`

---

### DeleteObjectCommand

> **DeleteObjectCommand**: (`input`) => `unknown`

#### Parameters

##### input

`Record`\<`string`, `unknown`\>

#### Returns

`unknown`

---

### ListObjectsV2Command

> **ListObjectsV2Command**: (`input`) => `unknown`

#### Parameters

##### input

`Record`\<`string`, `unknown`\>

#### Returns

`unknown`
