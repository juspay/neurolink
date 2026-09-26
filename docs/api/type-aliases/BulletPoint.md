[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BulletPoint

# Type Alias: BulletPoint

> **BulletPoint** = `object`

Bullet point with optional sub-bullets and styling
Maps to: addText with bullet: true option

HYBRID APPROACH: AI can optionally specify formatting, otherwise hardcoded defaults apply.
Priority: bullet-level > slide-level > type-defaults > theme-defaults

## Properties

### text

> **text**: `string`

---

### subBullets?

> `optional` **subBullets?**: `string`[]

---

### icon?

> `optional` **icon?**: `string`

Icon code for custom bullet (Unicode). Ex: "2713" for checkmark

---

### emphasis?

> `optional` **emphasis?**: `boolean`

Highlight/emphasis for this bullet

---

### fontSize?

> `optional` **fontSize?**: `number`

Font size override (default calculated based on bullet count)

---

### bulletStyle?

> `optional` **bulletStyle?**: [`BulletStyle`](BulletStyle.md)

Bullet style override (default based on slide type)

---

### color?

> `optional` **color?**: `string`

Text color override (hex, e.g., "#FF0000")

---

### bold?

> `optional` **bold?**: `boolean`

Bold text override
