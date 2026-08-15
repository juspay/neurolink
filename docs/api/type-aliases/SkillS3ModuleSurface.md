[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / SkillS3ModuleSurface

# Type Alias: SkillS3ModuleSurface

> **SkillS3ModuleSurface** = `object`

Defined in: [types/skills.ts:187](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/skills.ts#L187)

Structural surface of the lazily-required @aws-sdk/client-s3 module —
only the pieces the S3 skill store touches (same pattern as
HippocampusModule for the optional memory peer).

## Properties

### S3Client

> **S3Client**: (`config`) => `object`

Defined in: [types/skills.ts:188](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/skills.ts#L188)

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

Defined in: [types/skills.ts:191](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/skills.ts#L191)

#### Parameters

##### input

`Record`\<`string`, `unknown`\>

#### Returns

`unknown`

---

### PutObjectCommand

> **PutObjectCommand**: (`input`) => `unknown`

Defined in: [types/skills.ts:192](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/skills.ts#L192)

#### Parameters

##### input

`Record`\<`string`, `unknown`\>

#### Returns

`unknown`

---

### DeleteObjectCommand

> **DeleteObjectCommand**: (`input`) => `unknown`

Defined in: [types/skills.ts:193](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/skills.ts#L193)

#### Parameters

##### input

`Record`\<`string`, `unknown`\>

#### Returns

`unknown`

---

### ListObjectsV2Command

> **ListObjectsV2Command**: (`input`) => `unknown`

Defined in: [types/skills.ts:194](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/skills.ts#L194)

#### Parameters

##### input

`Record`\<`string`, `unknown`\>

#### Returns

`unknown`
