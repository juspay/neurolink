[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliAudioPlayerCommand

# Type Alias: CliAudioPlayerCommand

> **CliAudioPlayerCommand** = `object`

Defined in: [types/cli.ts:2172](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2172)

A single audio-player invocation for CLI TTS playback: a binary plus its
arguments for `execFile`. The player list is tried in order until one
succeeds (see `src/cli/utils/audioPlayer.ts`).

## Properties

### command

> **command**: `string`

Defined in: [types/cli.ts:2173](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2173)

---

### args

> **args**: `string`[]

Defined in: [types/cli.ts:2174](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2174)
