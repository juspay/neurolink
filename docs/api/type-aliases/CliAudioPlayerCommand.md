[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliAudioPlayerCommand

# Type Alias: CliAudioPlayerCommand

> **CliAudioPlayerCommand** = `object`

Defined in: [types/cli.ts:2116](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2116)

A single audio-player invocation for CLI TTS playback: a binary plus its
arguments for `execFile`. The player list is tried in order until one
succeeds (see `src/cli/utils/audioPlayer.ts`).

## Properties

### command

> **command**: `string`

Defined in: [types/cli.ts:2117](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2117)

---

### args

> **args**: `string`[]

Defined in: [types/cli.ts:2118](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2118)
