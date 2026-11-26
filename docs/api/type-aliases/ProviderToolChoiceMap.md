[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderToolChoiceMap

# Type Alias: ProviderToolChoiceMap

> **ProviderToolChoiceMap** = `object`

How one wire spells a NeuroLink tool choice. The input is a string
("auto" / "none" / "required"), a `{ type: mode }` object or
`{ type: "tool", toolName }`. A `null` output sends nothing, so the
provider default applies.

## Properties

### modes

> **modes**: `Partial`\<`Record`\<`"auto"` \| `"none"` \| `"required"`, [`ProviderRuleJsonValue`](ProviderRuleJsonValue.md)\>\>

Output per mode. A mode left out counts as unknown.

---

### acceptStrings

> **acceptStrings**: `boolean`

Whether the bare strings "auto" / "none" / "required" are read as modes.

---

### acceptModeObjects

> **acceptModeObjects**: `boolean`

Whether `{ type: "auto" | "none" | "required" }` objects are read as modes.

---

### tool

> **tool**: [`ProviderRuleJsonValue`](ProviderRuleJsonValue.md)

Output for `{ type: "tool", toolName }`; the string "{toolName}" becomes the wire tool name.

---

### toolRequiresName

> **toolRequiresName**: `boolean`

A tool choice with an empty or missing toolName counts as unknown.

---

### passthroughStrings?

> `optional` **passthroughStrings?**: `boolean`

Strings that are not read as modes are sent unchanged.

---

### fallback

> **fallback**: [`ProviderRuleJsonValue`](ProviderRuleJsonValue.md)

Output for anything else.
