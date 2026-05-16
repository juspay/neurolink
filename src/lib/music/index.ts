/**
 * Music Module — Music Generation Integration for NeuroLink
 *
 * Provides music-generation capability across providers (Beatoven,
 * ElevenLabs Music, Lyria, Replicate-hosted MusicGen / Riffusion).
 *
 * Use `MusicProcessor.generate(provider, options)` to dispatch to the
 * registered handler for `provider`.
 *
 * @module music
 */

export {
  MUSIC_ERROR_CODES,
  MusicError,
  MusicProcessor,
} from "../utils/musicProcessor.js";

export {
  BeatovenMusic,
  BeatovenMusic as BeatovenMusicHandler,
} from "./providers/BeatovenMusic.js";
