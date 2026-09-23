[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliAudioPlayerCommand

# Type Alias: CliAudioPlayerCommand

> **CliAudioPlayerCommand** = `object`

Defined in: [types/cli.ts:2155](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2155)

A single audio-player invocation for CLI TTS playback: a binary plus its
arguments for `execFile`. The player list is tried in order until one
succeeds (see `src/cli/utils/audioPlayer.ts`).

## Properties

### command

> **command**: `string`

Defined in: [types/cli.ts:2156](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2156)

---

### args

> **args**: `string`[]

Defined in: [types/cli.ts:2157](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2157)
