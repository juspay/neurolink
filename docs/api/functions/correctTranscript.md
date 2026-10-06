[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / correctTranscript

# Function: correctTranscript()

> **correctTranscript**(`input`, `deps`): `Promise`\<[`STTCorrectionOutput`](../type-aliases/STTCorrectionOutput.md)\>

Correct one transcript (a whole short recording, or one final utterance
when streaming). Never throws on a layer's failure and never returns empty
text when either transcript had words.

When the primary engine reported a low language score
(`languageDetected === false`) and a second opinion exists, the second
opinion leads: an Indic engine on English speech produces confident-looking
nonsense, and the English-oriented engine's text is the better base. The
engine text then goes to the rewrite as the secondary transcript, so
Indian-language words it did catch are not lost.

## Parameters

### input

[`STTCorrectionInput`](../type-aliases/STTCorrectionInput.md)

### deps

[`STTCorrectionDeps`](../type-aliases/STTCorrectionDeps.md)

## Returns

`Promise`\<[`STTCorrectionOutput`](../type-aliases/STTCorrectionOutput.md)\>
