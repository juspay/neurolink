[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DecisionAudioLimits

# Type Alias: DecisionAudioLimits

> **DecisionAudioLimits** = `object`

## Properties

### maxSeconds

> **maxSeconds**: `number`

Seconds of audio the model reads. A clip whose length can be read from its
header (WAV, FLAC, Ogg) and runs longer is refused, since the rest would be cut
off without a word.
