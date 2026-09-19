[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / canDeliverVideoNatively

# Function: canDeliverVideoNatively()

> **canDeliverVideoNatively**(`provider`, `video`): [`VideoDeliveryDecision`](../type-aliases/VideoDeliveryDecision.md)

Defined in: adapters/videoFormatSupport.ts:294

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

## Returns

[`VideoDeliveryDecision`](../type-aliases/VideoDeliveryDecision.md)
