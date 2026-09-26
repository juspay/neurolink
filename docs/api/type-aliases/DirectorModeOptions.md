[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DirectorModeOptions

# Type Alias: DirectorModeOptions

> **DirectorModeOptions** = `object`

Director Mode configuration options.
Used when `input.segments` is provided to control transition generation.

## Properties

### transitionPrompts?

> `optional` **transitionPrompts?**: `string`[]

Prompts for generating transition clips (array of N-1 entries for N segments).
transitionPrompts[i] is used for the transition between segment i and segment i+1.
If omitted, defaults to "Smooth cinematic transition between scenes".

---

### transitionDurations?

> `optional` **transitionDurations?**: (`4` \| `6` \| `8`)[]

Duration of each transition clip in seconds (array of N-1 entries for N segments).
Each value must be 4, 6, or 8 (4 recommended for seamless feel).
If omitted, all transitions default to 4 seconds.

#### Default

```ts
[4, 4, ...]
```
