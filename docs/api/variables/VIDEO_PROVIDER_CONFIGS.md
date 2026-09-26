[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VIDEO_PROVIDER_CONFIGS

# Variable: VIDEO_PROVIDER_CONFIGS

> `const` **VIDEO_PROVIDER_CONFIGS**: `Readonly`\<`Record`\<`string`, [`VideoProviderConfig`](../type-aliases/VideoProviderConfig.md)\>\>

Per-provider video handling.

Keys are lowercase canonical names and the aliases each provider is
addressed by elsewhere in the codebase; `getVideoProviderConfig` normalises
before looking up, so a caller never has to know which spelling it holds.

Only Google's Gemini front ends carry `supportsNativeVideo: true`. The rest
are listed deliberately rather than left to the unknown-provider default:
an explicit row is how `getVideoProviderConfig` distinguishes "this provider
takes frames" from "nobody has looked at this provider yet", and the frame
budgets differ enough between them to be worth stating.
