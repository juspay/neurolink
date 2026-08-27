[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TTSHandler

# Type Alias: TTSHandler

> **TTSHandler** = `object`

Defined in: [types/common.ts:512](https://github.com/juspay/neurolink/blob/release/src/lib/types/common.ts#L512)

TTS Handler interface for provider-specific implementations

Each provider (Google AI, OpenAI, etc.) implements this interface
to provide TTS generation capabilities using their respective APIs.

**Timeout Handling:**
Implementations MUST handle their own timeouts for the `synthesize()` method.
Recommended timeout: 30 seconds. Implementations should use `withTimeout()` utility
or provider-specific timeout mechanisms (e.g., Google Cloud client timeout).

**Error Handling:**
Implementations should throw TTSError for all failures, including timeouts.
Use appropriate error codes from TTS_ERROR_CODES.

## Example

```typescript
class MyTTSHandler implements TTSHandler {
  async synthesize(text: string, options: TTSOptions): Promise<TTSResult> {
    // REQUIRED: Implement timeout handling
    return await withTimeout(
      this.actualSynthesis(text, options),
      30000, // 30 second timeout
      "TTS synthesis timed out",
    );
  }

  isConfigured(): boolean {
    return !!process.env.MY_TTS_API_KEY;
  }
}
```

## Properties

### synthesizeStream?

> `optional` **synthesizeStream?**: `unknown`

Defined in: [types/common.ts:613](https://github.com/juspay/neurolink/blob/release/src/lib/types/common.ts#L613)

Stream provider-native audio for one pre-validated text segment.

Return `undefined` when the requested options cannot be delivered
incrementally. The processor then uses `synthesize()` and preserves the
buffered fallback for handlers and formats without native support.
Provider-local indexes, cumulative sizes, and finality are normalized by
the processor before chunks reach the public stream — an implementation
may leave `isFinal` false on every chunk rather than hold a fragment back
to label the last one, and the processor discards reported finality
either way.

Yield `TTSChunk` fragments. The member is declared `unknown` — not a
method signature — on purpose, and that is a deliberate trade.

This is an OPTIONAL member added to a public structural type that
consumers already implement. Any type narrower than `unknown` rejects some
existing handler that already carries a member of this name, which is a
source break under Critical Rule 5 whatever that other shape happens to
be. That is not hypothetical: a member returning a sync `Generator`, an
`async` method returning a `Promise` of an async iterable, a
callback-style member returning `void` or `Promise<void>`, and a plain
boolean capability flag all compile against `origin/release` today, and
every one of them is rejected by a declared method signature — including
an intentionally wide one such as `(...args: never[]) => unknown`, which
still cannot accept the boolean. Only `unknown` accepts them all.

The cost is that this member cannot contextually type an implementation's
parameters. Authors annotate their own signature instead — OpenAI TTS
declares `synthesizeStream(text: string, options: TTSOptions):
AsyncIterable<TTSChunk> | undefined` on the class — which keeps full
compiler checking of what that implementation yields. Nothing is checked
at this member; usability is decided at runtime by the processor.

The processor validates each fragment at runtime instead. A fragment is
audio only when it carries a non-empty `data` `Buffer` (or `Uint8Array`);
its `format` is honoured only when it names a real `TTSAudioFormat`, and
the requested format is used otherwise. A fragment that fails that test —
including an empty (`data.length === 0`) read — is skipped and never
reaches the consumer. A native stream that completes without yielding a
single deliverable fragment is treated as "no incremental delivery after
all" and falls back to `synthesize()` for that segment.

That filtering is specific to this native path. The buffered path
forwards whatever `synthesize()` returns, a zero-byte buffer included, so
a consumer of the public stream can still observe an empty chunk when a
handler produces one.

`undefined` is the only capability signal. Everything the processor does
to decide whether this capability exists is asked BEFORE the segment's
work starts, and every way that question can fail is a handler bug that
the processor answers the same way: it serves that segment from
`synthesize()` rather than losing it (the throwing modes also log a
warning; a member that is merely not callable falls back silently). None
of them should be used as a deliberate fallback mechanism. The modes it
anticipates cover each read as well as each call, because reading a
property can run a getter or a `Proxy` trap that throws just as a call
can:

- reading `synthesizeStream` off the handler throws;
- the member is present but not callable;
- reading `isConfigured` off the handler throws, or calling it throws —
  the segment falls back to the buffered path, where `synthesize()` asks
  again and a throw there fails the segment shaped, exactly as it would
  for a handler with no native member (a handler that merely reports
  itself unconfigured is not a bug: that segment fails with
  `TTS_PROVIDER_NOT_CONFIGURED`, as it always has);
- calling the member throws;
- the returned value's async-iterability cannot be established, including
  a value whose `Symbol.asyncIterator` property cannot even be read.

An error raised once the segment's own work has started, by contrast,
fails that segment like any other synthesis failure — it is not re-served
from the buffered path. Iteration begins at the `[Symbol.asyncIterator]()`
call, so that call throwing, that call handing back something that is not
an iterator, and a first read that rejects are all segment failures rather
than fallbacks.

Implementations MUST enforce their own timeout and cancel any active
transport when the returned iterable is closed.

The value the processor looks for is a callable of the shape
`(text: string, options: TTSOptions) => AsyncIterable<TTSChunk> | undefined`,
invoked with the handler as `this`. `text` is one buffered text segment
within the provider's length limit.

---

### maxTextLength?

> `optional` **maxTextLength?**: `number`

Defined in: [types/common.ts:636](https://github.com/juspay/neurolink/blob/release/src/lib/types/common.ts#L636)

Maximum text length supported by this provider (in bytes)
Different providers have different limits

#### Default

```ts
3000 if not specified
```

## Methods

### synthesize()

> **synthesize**(`text`, `options`): `Promise`\<[`TTSResult`](TTSResult.md)\>

Defined in: [types/common.ts:525](https://github.com/juspay/neurolink/blob/release/src/lib/types/common.ts#L525)

Generate audio from text using provider-specific TTS API

**IMPORTANT: Timeout Responsibility**
Implementations MUST enforce their own timeouts (recommended: 30 seconds).
Use the `withTimeout()` utility or provider-specific timeout mechanisms.

#### Parameters

##### text

`string`

Text to convert to speech (pre-validated, non-empty, within length limits)

##### options

[`TTSOptions`](TTSOptions.md)

TTS configuration options (voice, format, speed, etc.)

#### Returns

`Promise`\<[`TTSResult`](TTSResult.md)\>

Audio buffer with metadata

#### Throws

On synthesis failure, timeout, or configuration issues

---

### getVoices()?

> `optional` **getVoices**(`languageCode?`): `Promise`\<[`TTSVoice`](TTSVoice.md)[]\>

Defined in: [types/common.ts:621](https://github.com/juspay/neurolink/blob/release/src/lib/types/common.ts#L621)

Get available voices for the provider

#### Parameters

##### languageCode?

`string`

Optional language filter (e.g., "en-US")

#### Returns

`Promise`\<[`TTSVoice`](TTSVoice.md)[]\>

List of available voices

---

### isConfigured()

> **isConfigured**(): `boolean`

Defined in: [types/common.ts:628](https://github.com/juspay/neurolink/blob/release/src/lib/types/common.ts#L628)

Validate that the provider is properly configured

#### Returns

`boolean`

True if provider can generate TTS
