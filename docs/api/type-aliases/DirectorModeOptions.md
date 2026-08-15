[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / DirectorModeOptions

# Type Alias: DirectorModeOptions

> **DirectorModeOptions** = `object`

Defined in: [types/multimodal.ts:256](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/multimodal.ts#L256)

Director Mode configuration options.
Used when `input.segments` is provided to control transition generation.

## Properties

### transitionPrompts?

> `optional` **transitionPrompts?**: `string`[]

Defined in: [types/multimodal.ts:262](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/multimodal.ts#L262)

Prompts for generating transition clips (array of N-1 entries for N segments).
transitionPrompts[i] is used for the transition between segment i and segment i+1.
If omitted, defaults to "Smooth cinematic transition between scenes".

---

### transitionDurations?

> `optional` **transitionDurations?**: (`4` \| `6` \| `8`)[]

Defined in: [types/multimodal.ts:270](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/multimodal.ts#L270)

Duration of each transition clip in seconds (array of N-1 entries for N segments).
Each value must be 4, 6, or 8 (4 recommended for seamless feel).
If omitted, all transitions default to 4 seconds.

#### Default

```ts
[4, 4, ...]
```
