[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / BulletPoint

# Type Alias: BulletPoint

> **BulletPoint** = `object`

Defined in: [types/ppt.ts:268](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ppt.ts#L268)

Bullet point with optional sub-bullets and styling
Maps to: addText with bullet: true option

HYBRID APPROACH: AI can optionally specify formatting, otherwise hardcoded defaults apply.
Priority: bullet-level > slide-level > type-defaults > theme-defaults

## Properties

### text

> **text**: `string`

Defined in: [types/ppt.ts:269](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ppt.ts#L269)

---

### subBullets?

> `optional` **subBullets?**: `string`[]

Defined in: [types/ppt.ts:270](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ppt.ts#L270)

---

### icon?

> `optional` **icon?**: `string`

Defined in: [types/ppt.ts:272](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ppt.ts#L272)

Icon code for custom bullet (Unicode). Ex: "2713" for checkmark

---

### emphasis?

> `optional` **emphasis?**: `boolean`

Defined in: [types/ppt.ts:274](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ppt.ts#L274)

Highlight/emphasis for this bullet

---

### fontSize?

> `optional` **fontSize?**: `number`

Defined in: [types/ppt.ts:278](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ppt.ts#L278)

Font size override (default calculated based on bullet count)

---

### bulletStyle?

> `optional` **bulletStyle?**: [`BulletStyle`](BulletStyle.md)

Defined in: [types/ppt.ts:280](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ppt.ts#L280)

Bullet style override (default based on slide type)

---

### color?

> `optional` **color?**: `string`

Defined in: [types/ppt.ts:282](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ppt.ts#L282)

Text color override (hex, e.g., "#FF0000")

---

### bold?

> `optional` **bold?**: `boolean`

Defined in: [types/ppt.ts:284](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ppt.ts#L284)

Bold text override
