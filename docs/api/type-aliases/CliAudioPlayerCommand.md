[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliAudioPlayerCommand

# Type Alias: CliAudioPlayerCommand

> **CliAudioPlayerCommand** = `object`

Defined in: [types/cli.ts:2175](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2175)

A single audio-player invocation for CLI TTS playback: a binary plus its
arguments for `execFile`. The player list is tried in order until one
succeeds (see `src/cli/utils/audioPlayer.ts`).

## Properties

### command

> **command**: `string`

Defined in: [types/cli.ts:2176](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2176)

---

### args

> **args**: `string`[]

Defined in: [types/cli.ts:2177](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2177)
