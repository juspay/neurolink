/**
 * Avatar Module — Talking-Head / Lip-sync Integration for NeuroLink
 *
 * Provides avatar-generation capability across providers (D-ID, HeyGen,
 * Replicate-hosted MuseTalk / SadTalker / Wav2Lip).
 *
 * Use `AvatarProcessor.generate(provider, options)` to dispatch to the
 * registered handler for `provider`.
 *
 * @module avatar
 */

export {
  AVATAR_ERROR_CODES,
  AvatarError,
  AvatarProcessor,
} from "../utils/avatarProcessor.js";

export {
  DIDAvatar,
  DIDAvatar as DIDAvatarHandler,
} from "./providers/DIDAvatar.js";
