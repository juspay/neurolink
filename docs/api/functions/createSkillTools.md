[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / createSkillTools

# Function: createSkillTools()

> **createSkillTools**(`resolveManager`, `options?`): `Record`\<`string`, `Tool`\>

Defined in: [skills/skillTools.ts:275](https://github.com/juspay/neurolink/blob/release/src/lib/skills/skillTools.ts#L275)

Instance skill tools bound to a lazily-resolved manager: list_skills
plus the gated mutation tools. Returns Vercel AI SDK tool() objects
(description + Zod inputSchema + execute) keyed by tool name.

## Parameters

### resolveManager

() => [`SkillsManagerLike`](../type-aliases/SkillsManagerLike.md) \| `null`

### options?

[`SkillToolsOptions`](../type-aliases/SkillToolsOptions.md)

## Returns

`Record`\<`string`, `Tool`\>
