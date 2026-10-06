[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / STT_PROVIDER_DESCRIPTORS

# Variable: STT_PROVIDER_DESCRIPTORS

> `const` **STT_PROVIDER_DESCRIPTORS**: readonly [`STTProviderDescriptor`](../type-aliases/STTProviderDescriptor.md)[]

Every shipped speech-to-text provider — the single source of truth for its
name, aliases, credentials slice, env vars and capabilities. Pure data, like
`PROVIDER_DESCRIPTORS` for text providers; the handler classes are wired to
these names in `voice/index.ts`, and `MEDIA_HANDLER_CATALOG`'s STT rows are
derived from this list so the two cannot drift.

**Order is precedence.** `resolveDefaultSTTProvider()` returns the first
entry that is configured, so reordering changes which engine every
`transcribe()` / `generate({ stt })` without an explicit provider uses.
`whistle` is last on purpose: it runs on this machine and needs no key, so
it is what a caller gets when nothing else is configured.
