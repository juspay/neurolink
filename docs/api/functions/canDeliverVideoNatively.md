[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / canDeliverVideoNatively

# Function: canDeliverVideoNatively()

> **canDeliverVideoNatively**(`provider`, `video`, `priorNativeVideoBytes?`, `model?`): [`VideoDeliveryDecision`](../type-aliases/VideoDeliveryDecision.md)

Whether one specific clip may go to one specific provider as bytes.

Every rejection carries a reason the caller can log verbatim, because the
user-visible symptom of all of them is identical — "it only described the
file" — and the remedies are not: shorten the clip, re-encode the
container, or switch provider.

An unknown duration is not a rejection. Probing fails on exotic containers
and on machines without ffmpeg, and refusing a 2 MB clip because nothing
measured it would reintroduce the frames-only behaviour precisely where
frames are least likely to be available.

## Parameters

### provider

`string`

### video

[`MultimodalVideoEntry`](../type-aliases/MultimodalVideoEntry.md)

### priorNativeVideoBytes?

`number` = `0`

Source bytes already committed to the
_same request's_ inline budget: every inline image (keyframes
included), PDF and audio part assembled before the clips, plus each
clip accepted earlier. The caller accumulates this running total, since
this function is otherwise stateless and cannot see the rest of the
request. Defaults to 0, which makes the size check below a pure
per-clip check.

### model?

`string`

See [getVideoProviderConfig](getVideoProviderConfig.md): disambiguates a
Claude-on-Vertex request from a real Gemini-on-Vertex one.

## Returns

[`VideoDeliveryDecision`](../type-aliases/VideoDeliveryDecision.md)
