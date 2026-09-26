[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / estimateVideoTokens

# Function: estimateVideoTokens()

> **estimateVideoTokens**(`options`): `number`

Rough token cost of putting one video in front of one provider.

Two quite different prices, because two quite different payloads: a native
provider is billed for the clip's duration, a frame-extraction provider for
the frames it is sent. Asking for one number without saying which mode
applies is how a budget ends up an order of magnitude out, so the provider
decides the formula rather than the caller.

An estimate, not a quote — resolution settings, prompt text and provider
pricing changes all move the real figure.

## Parameters

### options

#### provider

`string`

Provider the video is destined for.

#### durationSec

`number`

Clip length. 0 when unknown.

#### frameCount?

`number`

Frames that would be extracted. Defaults to the
provider's `recommendedFrameCount`, or 8 for an unlisted provider.

#### hasTranscription?

`boolean`

Whether a speech transcript is included.
Ignored for a native provider, which already hears the audio track.

## Returns

`number`
