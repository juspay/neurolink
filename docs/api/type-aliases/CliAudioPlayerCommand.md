[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliAudioPlayerCommand

# Type Alias: CliAudioPlayerCommand

> **CliAudioPlayerCommand** = `object`

Defined in: [types/cli.ts:2193](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2193)

A single audio-player invocation for CLI TTS playback: a binary plus its
arguments for `execFile`. The player list is tried in order until one
succeeds (see `src/cli/utils/audioPlayer.ts`).

## Properties

### command

> **command**: `string`

Defined in: [types/cli.ts:2194](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2194)

---

### args

> **args**: `string`[]

Defined in: [types/cli.ts:2195](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2195)
