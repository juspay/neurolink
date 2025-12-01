/**
 * Google Cloud TTS Voice Data
 * Contains voice information for Google Cloud Text-to-Speech API
 * Used by google-ai and vertex providers
 */

/**
 * Voice information structure
 */
export type VoiceInfo = {
  name: string;
  languageCode: string;
  gender: "MALE" | "FEMALE" | "NEUTRAL";
  type: "NEURAL2" | "WAVENET" | "STANDARD";
};

/**
 * Google Cloud TTS voice data
 * Includes Neural2, Wavenet, and Standard voices across multiple languages
 */
export const GOOGLE_TTS_VOICES: VoiceInfo[] = [
  // English (US) - Neural2 voices (highest quality)
  {
    name: "en-US-Neural2-A",
    languageCode: "en-US",
    gender: "MALE",
    type: "NEURAL2",
  },
  {
    name: "en-US-Neural2-C",
    languageCode: "en-US",
    gender: "FEMALE",
    type: "NEURAL2",
  },
  {
    name: "en-US-Neural2-D",
    languageCode: "en-US",
    gender: "MALE",
    type: "NEURAL2",
  },
  {
    name: "en-US-Neural2-E",
    languageCode: "en-US",
    gender: "FEMALE",
    type: "NEURAL2",
  },
  {
    name: "en-US-Neural2-F",
    languageCode: "en-US",
    gender: "FEMALE",
    type: "NEURAL2",
  },
  {
    name: "en-US-Neural2-G",
    languageCode: "en-US",
    gender: "FEMALE",
    type: "NEURAL2",
  },
  {
    name: "en-US-Neural2-H",
    languageCode: "en-US",
    gender: "FEMALE",
    type: "NEURAL2",
  },
  {
    name: "en-US-Neural2-I",
    languageCode: "en-US",
    gender: "MALE",
    type: "NEURAL2",
  },
  {
    name: "en-US-Neural2-J",
    languageCode: "en-US",
    gender: "MALE",
    type: "NEURAL2",
  },

  // English (US) - Wavenet voices (high quality)
  {
    name: "en-US-Wavenet-A",
    languageCode: "en-US",
    gender: "MALE",
    type: "WAVENET",
  },
  {
    name: "en-US-Wavenet-B",
    languageCode: "en-US",
    gender: "MALE",
    type: "WAVENET",
  },
  {
    name: "en-US-Wavenet-C",
    languageCode: "en-US",
    gender: "FEMALE",
    type: "WAVENET",
  },
  {
    name: "en-US-Wavenet-D",
    languageCode: "en-US",
    gender: "MALE",
    type: "WAVENET",
  },
  {
    name: "en-US-Wavenet-E",
    languageCode: "en-US",
    gender: "FEMALE",
    type: "WAVENET",
  },
  {
    name: "en-US-Wavenet-F",
    languageCode: "en-US",
    gender: "FEMALE",
    type: "WAVENET",
  },

  // English (US) - Standard voices
  {
    name: "en-US-Standard-A",
    languageCode: "en-US",
    gender: "MALE",
    type: "STANDARD",
  },
  {
    name: "en-US-Standard-B",
    languageCode: "en-US",
    gender: "MALE",
    type: "STANDARD",
  },
  {
    name: "en-US-Standard-C",
    languageCode: "en-US",
    gender: "FEMALE",
    type: "STANDARD",
  },
  {
    name: "en-US-Standard-D",
    languageCode: "en-US",
    gender: "MALE",
    type: "STANDARD",
  },
  {
    name: "en-US-Standard-E",
    languageCode: "en-US",
    gender: "FEMALE",
    type: "STANDARD",
  },

  // English (GB) - British voices
  {
    name: "en-GB-Neural2-A",
    languageCode: "en-GB",
    gender: "FEMALE",
    type: "NEURAL2",
  },
  {
    name: "en-GB-Neural2-B",
    languageCode: "en-GB",
    gender: "MALE",
    type: "NEURAL2",
  },
  {
    name: "en-GB-Neural2-C",
    languageCode: "en-GB",
    gender: "FEMALE",
    type: "NEURAL2",
  },
  {
    name: "en-GB-Neural2-D",
    languageCode: "en-GB",
    gender: "MALE",
    type: "NEURAL2",
  },
  {
    name: "en-GB-Neural2-F",
    languageCode: "en-GB",
    gender: "FEMALE",
    type: "NEURAL2",
  },
  {
    name: "en-GB-Wavenet-A",
    languageCode: "en-GB",
    gender: "FEMALE",
    type: "WAVENET",
  },
  {
    name: "en-GB-Wavenet-B",
    languageCode: "en-GB",
    gender: "MALE",
    type: "WAVENET",
  },
  {
    name: "en-GB-Wavenet-C",
    languageCode: "en-GB",
    gender: "FEMALE",
    type: "WAVENET",
  },
  {
    name: "en-GB-Wavenet-D",
    languageCode: "en-GB",
    gender: "MALE",
    type: "WAVENET",
  },

  // English (AU) - Australian voices
  {
    name: "en-AU-Neural2-A",
    languageCode: "en-AU",
    gender: "FEMALE",
    type: "NEURAL2",
  },
  {
    name: "en-AU-Neural2-B",
    languageCode: "en-AU",
    gender: "MALE",
    type: "NEURAL2",
  },
  {
    name: "en-AU-Neural2-C",
    languageCode: "en-AU",
    gender: "FEMALE",
    type: "NEURAL2",
  },
  {
    name: "en-AU-Neural2-D",
    languageCode: "en-AU",
    gender: "MALE",
    type: "NEURAL2",
  },
  {
    name: "en-AU-Wavenet-A",
    languageCode: "en-AU",
    gender: "FEMALE",
    type: "WAVENET",
  },
  {
    name: "en-AU-Wavenet-B",
    languageCode: "en-AU",
    gender: "MALE",
    type: "WAVENET",
  },

  // English (IN) - Indian voices
  {
    name: "en-IN-Neural2-A",
    languageCode: "en-IN",
    gender: "FEMALE",
    type: "NEURAL2",
  },
  {
    name: "en-IN-Neural2-B",
    languageCode: "en-IN",
    gender: "MALE",
    type: "NEURAL2",
  },
  {
    name: "en-IN-Neural2-C",
    languageCode: "en-IN",
    gender: "MALE",
    type: "NEURAL2",
  },
  {
    name: "en-IN-Neural2-D",
    languageCode: "en-IN",
    gender: "FEMALE",
    type: "NEURAL2",
  },
  {
    name: "en-IN-Wavenet-A",
    languageCode: "en-IN",
    gender: "FEMALE",
    type: "WAVENET",
  },
  {
    name: "en-IN-Wavenet-B",
    languageCode: "en-IN",
    gender: "MALE",
    type: "WAVENET",
  },

  // French voices
  {
    name: "fr-FR-Neural2-A",
    languageCode: "fr-FR",
    gender: "FEMALE",
    type: "NEURAL2",
  },
  {
    name: "fr-FR-Neural2-B",
    languageCode: "fr-FR",
    gender: "MALE",
    type: "NEURAL2",
  },
  {
    name: "fr-FR-Neural2-C",
    languageCode: "fr-FR",
    gender: "FEMALE",
    type: "NEURAL2",
  },
  {
    name: "fr-FR-Neural2-D",
    languageCode: "fr-FR",
    gender: "MALE",
    type: "NEURAL2",
  },
  {
    name: "fr-FR-Neural2-E",
    languageCode: "fr-FR",
    gender: "FEMALE",
    type: "NEURAL2",
  },
  {
    name: "fr-FR-Wavenet-A",
    languageCode: "fr-FR",
    gender: "FEMALE",
    type: "WAVENET",
  },
  {
    name: "fr-FR-Wavenet-B",
    languageCode: "fr-FR",
    gender: "MALE",
    type: "WAVENET",
  },
  {
    name: "fr-FR-Wavenet-C",
    languageCode: "fr-FR",
    gender: "FEMALE",
    type: "WAVENET",
  },
  {
    name: "fr-FR-Wavenet-D",
    languageCode: "fr-FR",
    gender: "MALE",
    type: "WAVENET",
  },

  // French (Canada) voices
  {
    name: "fr-CA-Neural2-A",
    languageCode: "fr-CA",
    gender: "FEMALE",
    type: "NEURAL2",
  },
  {
    name: "fr-CA-Neural2-B",
    languageCode: "fr-CA",
    gender: "MALE",
    type: "NEURAL2",
  },
  {
    name: "fr-CA-Neural2-C",
    languageCode: "fr-CA",
    gender: "FEMALE",
    type: "NEURAL2",
  },
  {
    name: "fr-CA-Neural2-D",
    languageCode: "fr-CA",
    gender: "MALE",
    type: "NEURAL2",
  },
  {
    name: "fr-CA-Wavenet-A",
    languageCode: "fr-CA",
    gender: "FEMALE",
    type: "WAVENET",
  },
  {
    name: "fr-CA-Wavenet-B",
    languageCode: "fr-CA",
    gender: "MALE",
    type: "WAVENET",
  },

  // Spanish (Spain) voices
  {
    name: "es-ES-Neural2-A",
    languageCode: "es-ES",
    gender: "FEMALE",
    type: "NEURAL2",
  },
  {
    name: "es-ES-Neural2-B",
    languageCode: "es-ES",
    gender: "MALE",
    type: "NEURAL2",
  },
  {
    name: "es-ES-Neural2-C",
    languageCode: "es-ES",
    gender: "FEMALE",
    type: "NEURAL2",
  },
  {
    name: "es-ES-Neural2-D",
    languageCode: "es-ES",
    gender: "FEMALE",
    type: "NEURAL2",
  },
  {
    name: "es-ES-Neural2-E",
    languageCode: "es-ES",
    gender: "FEMALE",
    type: "NEURAL2",
  },
  {
    name: "es-ES-Neural2-F",
    languageCode: "es-ES",
    gender: "MALE",
    type: "NEURAL2",
  },
  {
    name: "es-ES-Wavenet-B",
    languageCode: "es-ES",
    gender: "MALE",
    type: "WAVENET",
  },
  {
    name: "es-ES-Wavenet-C",
    languageCode: "es-ES",
    gender: "FEMALE",
    type: "WAVENET",
  },
  {
    name: "es-ES-Wavenet-D",
    languageCode: "es-ES",
    gender: "FEMALE",
    type: "WAVENET",
  },

  // Spanish (US) voices
  {
    name: "es-US-Neural2-A",
    languageCode: "es-US",
    gender: "FEMALE",
    type: "NEURAL2",
  },
  {
    name: "es-US-Neural2-B",
    languageCode: "es-US",
    gender: "MALE",
    type: "NEURAL2",
  },
  {
    name: "es-US-Neural2-C",
    languageCode: "es-US",
    gender: "MALE",
    type: "NEURAL2",
  },
  {
    name: "es-US-Wavenet-A",
    languageCode: "es-US",
    gender: "FEMALE",
    type: "WAVENET",
  },
  {
    name: "es-US-Wavenet-B",
    languageCode: "es-US",
    gender: "MALE",
    type: "WAVENET",
  },

  // German voices
  {
    name: "de-DE-Neural2-A",
    languageCode: "de-DE",
    gender: "FEMALE",
    type: "NEURAL2",
  },
  {
    name: "de-DE-Neural2-B",
    languageCode: "de-DE",
    gender: "MALE",
    type: "NEURAL2",
  },
  {
    name: "de-DE-Neural2-C",
    languageCode: "de-DE",
    gender: "FEMALE",
    type: "NEURAL2",
  },
  {
    name: "de-DE-Neural2-D",
    languageCode: "de-DE",
    gender: "MALE",
    type: "NEURAL2",
  },
  {
    name: "de-DE-Neural2-F",
    languageCode: "de-DE",
    gender: "FEMALE",
    type: "NEURAL2",
  },
  {
    name: "de-DE-Wavenet-A",
    languageCode: "de-DE",
    gender: "FEMALE",
    type: "WAVENET",
  },
  {
    name: "de-DE-Wavenet-B",
    languageCode: "de-DE",
    gender: "MALE",
    type: "WAVENET",
  },
  {
    name: "de-DE-Wavenet-C",
    languageCode: "de-DE",
    gender: "FEMALE",
    type: "WAVENET",
  },
  {
    name: "de-DE-Wavenet-D",
    languageCode: "de-DE",
    gender: "MALE",
    type: "WAVENET",
  },

  // Italian voices
  {
    name: "it-IT-Neural2-A",
    languageCode: "it-IT",
    gender: "FEMALE",
    type: "NEURAL2",
  },
  {
    name: "it-IT-Neural2-B",
    languageCode: "it-IT",
    gender: "FEMALE",
    type: "NEURAL2",
  },
  {
    name: "it-IT-Neural2-C",
    languageCode: "it-IT",
    gender: "MALE",
    type: "NEURAL2",
  },
  {
    name: "it-IT-Wavenet-A",
    languageCode: "it-IT",
    gender: "FEMALE",
    type: "WAVENET",
  },
  {
    name: "it-IT-Wavenet-B",
    languageCode: "it-IT",
    gender: "FEMALE",
    type: "WAVENET",
  },
  {
    name: "it-IT-Wavenet-C",
    languageCode: "it-IT",
    gender: "MALE",
    type: "WAVENET",
  },
  {
    name: "it-IT-Wavenet-D",
    languageCode: "it-IT",
    gender: "MALE",
    type: "WAVENET",
  },

  // Japanese voices
  {
    name: "ja-JP-Neural2-B",
    languageCode: "ja-JP",
    gender: "FEMALE",
    type: "NEURAL2",
  },
  {
    name: "ja-JP-Neural2-C",
    languageCode: "ja-JP",
    gender: "MALE",
    type: "NEURAL2",
  },
  {
    name: "ja-JP-Neural2-D",
    languageCode: "ja-JP",
    gender: "MALE",
    type: "NEURAL2",
  },
  {
    name: "ja-JP-Wavenet-A",
    languageCode: "ja-JP",
    gender: "FEMALE",
    type: "WAVENET",
  },
  {
    name: "ja-JP-Wavenet-B",
    languageCode: "ja-JP",
    gender: "FEMALE",
    type: "WAVENET",
  },
  {
    name: "ja-JP-Wavenet-C",
    languageCode: "ja-JP",
    gender: "MALE",
    type: "WAVENET",
  },
  {
    name: "ja-JP-Wavenet-D",
    languageCode: "ja-JP",
    gender: "MALE",
    type: "WAVENET",
  },

  // Korean voices
  {
    name: "ko-KR-Neural2-A",
    languageCode: "ko-KR",
    gender: "FEMALE",
    type: "NEURAL2",
  },
  {
    name: "ko-KR-Neural2-B",
    languageCode: "ko-KR",
    gender: "FEMALE",
    type: "NEURAL2",
  },
  {
    name: "ko-KR-Neural2-C",
    languageCode: "ko-KR",
    gender: "MALE",
    type: "NEURAL2",
  },
  {
    name: "ko-KR-Wavenet-A",
    languageCode: "ko-KR",
    gender: "FEMALE",
    type: "WAVENET",
  },
  {
    name: "ko-KR-Wavenet-B",
    languageCode: "ko-KR",
    gender: "FEMALE",
    type: "WAVENET",
  },
  {
    name: "ko-KR-Wavenet-C",
    languageCode: "ko-KR",
    gender: "MALE",
    type: "WAVENET",
  },
  {
    name: "ko-KR-Wavenet-D",
    languageCode: "ko-KR",
    gender: "MALE",
    type: "WAVENET",
  },

  // Portuguese (Brazil) voices
  {
    name: "pt-BR-Neural2-A",
    languageCode: "pt-BR",
    gender: "FEMALE",
    type: "NEURAL2",
  },
  {
    name: "pt-BR-Neural2-B",
    languageCode: "pt-BR",
    gender: "MALE",
    type: "NEURAL2",
  },
  {
    name: "pt-BR-Neural2-C",
    languageCode: "pt-BR",
    gender: "FEMALE",
    type: "NEURAL2",
  },
  {
    name: "pt-BR-Wavenet-A",
    languageCode: "pt-BR",
    gender: "FEMALE",
    type: "WAVENET",
  },
  {
    name: "pt-BR-Wavenet-B",
    languageCode: "pt-BR",
    gender: "MALE",
    type: "WAVENET",
  },

  // Portuguese (Portugal) voices
  {
    name: "pt-PT-Neural2-A",
    languageCode: "pt-PT",
    gender: "FEMALE",
    type: "NEURAL2",
  },
  {
    name: "pt-PT-Neural2-B",
    languageCode: "pt-PT",
    gender: "MALE",
    type: "NEURAL2",
  },
  {
    name: "pt-PT-Neural2-C",
    languageCode: "pt-PT",
    gender: "MALE",
    type: "NEURAL2",
  },
  {
    name: "pt-PT-Neural2-D",
    languageCode: "pt-PT",
    gender: "FEMALE",
    type: "NEURAL2",
  },
  {
    name: "pt-PT-Wavenet-A",
    languageCode: "pt-PT",
    gender: "FEMALE",
    type: "WAVENET",
  },
  {
    name: "pt-PT-Wavenet-B",
    languageCode: "pt-PT",
    gender: "MALE",
    type: "WAVENET",
  },

  // Hindi voices
  {
    name: "hi-IN-Neural2-A",
    languageCode: "hi-IN",
    gender: "FEMALE",
    type: "NEURAL2",
  },
  {
    name: "hi-IN-Neural2-B",
    languageCode: "hi-IN",
    gender: "MALE",
    type: "NEURAL2",
  },
  {
    name: "hi-IN-Neural2-C",
    languageCode: "hi-IN",
    gender: "FEMALE",
    type: "NEURAL2",
  },
  {
    name: "hi-IN-Neural2-D",
    languageCode: "hi-IN",
    gender: "MALE",
    type: "NEURAL2",
  },
  {
    name: "hi-IN-Wavenet-A",
    languageCode: "hi-IN",
    gender: "FEMALE",
    type: "WAVENET",
  },
  {
    name: "hi-IN-Wavenet-B",
    languageCode: "hi-IN",
    gender: "MALE",
    type: "WAVENET",
  },

  // Chinese (Mandarin) voices
  {
    name: "cmn-CN-Wavenet-A",
    languageCode: "cmn-CN",
    gender: "FEMALE",
    type: "WAVENET",
  },
  {
    name: "cmn-CN-Wavenet-B",
    languageCode: "cmn-CN",
    gender: "MALE",
    type: "WAVENET",
  },
  {
    name: "cmn-CN-Wavenet-C",
    languageCode: "cmn-CN",
    gender: "MALE",
    type: "WAVENET",
  },
  {
    name: "cmn-CN-Wavenet-D",
    languageCode: "cmn-CN",
    gender: "FEMALE",
    type: "WAVENET",
  },

  // Chinese (Taiwan) voices
  {
    name: "cmn-TW-Wavenet-A",
    languageCode: "cmn-TW",
    gender: "FEMALE",
    type: "WAVENET",
  },
  {
    name: "cmn-TW-Wavenet-B",
    languageCode: "cmn-TW",
    gender: "MALE",
    type: "WAVENET",
  },
  {
    name: "cmn-TW-Wavenet-C",
    languageCode: "cmn-TW",
    gender: "MALE",
    type: "WAVENET",
  },

  // Arabic voices
  {
    name: "ar-XA-Wavenet-A",
    languageCode: "ar-XA",
    gender: "FEMALE",
    type: "WAVENET",
  },
  {
    name: "ar-XA-Wavenet-B",
    languageCode: "ar-XA",
    gender: "MALE",
    type: "WAVENET",
  },
  {
    name: "ar-XA-Wavenet-C",
    languageCode: "ar-XA",
    gender: "MALE",
    type: "WAVENET",
  },
  {
    name: "ar-XA-Wavenet-D",
    languageCode: "ar-XA",
    gender: "FEMALE",
    type: "WAVENET",
  },

  // Dutch voices
  {
    name: "nl-NL-Wavenet-A",
    languageCode: "nl-NL",
    gender: "FEMALE",
    type: "WAVENET",
  },
  {
    name: "nl-NL-Wavenet-B",
    languageCode: "nl-NL",
    gender: "MALE",
    type: "WAVENET",
  },
  {
    name: "nl-NL-Wavenet-C",
    languageCode: "nl-NL",
    gender: "MALE",
    type: "WAVENET",
  },
  {
    name: "nl-NL-Wavenet-D",
    languageCode: "nl-NL",
    gender: "FEMALE",
    type: "WAVENET",
  },
  {
    name: "nl-NL-Wavenet-E",
    languageCode: "nl-NL",
    gender: "FEMALE",
    type: "WAVENET",
  },

  // Polish voices
  {
    name: "pl-PL-Wavenet-A",
    languageCode: "pl-PL",
    gender: "FEMALE",
    type: "WAVENET",
  },
  {
    name: "pl-PL-Wavenet-B",
    languageCode: "pl-PL",
    gender: "MALE",
    type: "WAVENET",
  },
  {
    name: "pl-PL-Wavenet-C",
    languageCode: "pl-PL",
    gender: "MALE",
    type: "WAVENET",
  },
  {
    name: "pl-PL-Wavenet-D",
    languageCode: "pl-PL",
    gender: "FEMALE",
    type: "WAVENET",
  },
  {
    name: "pl-PL-Wavenet-E",
    languageCode: "pl-PL",
    gender: "FEMALE",
    type: "WAVENET",
  },

  // Russian voices
  {
    name: "ru-RU-Wavenet-A",
    languageCode: "ru-RU",
    gender: "FEMALE",
    type: "WAVENET",
  },
  {
    name: "ru-RU-Wavenet-B",
    languageCode: "ru-RU",
    gender: "MALE",
    type: "WAVENET",
  },
  {
    name: "ru-RU-Wavenet-C",
    languageCode: "ru-RU",
    gender: "FEMALE",
    type: "WAVENET",
  },
  {
    name: "ru-RU-Wavenet-D",
    languageCode: "ru-RU",
    gender: "MALE",
    type: "WAVENET",
  },
  {
    name: "ru-RU-Wavenet-E",
    languageCode: "ru-RU",
    gender: "FEMALE",
    type: "WAVENET",
  },

  // Turkish voices
  {
    name: "tr-TR-Wavenet-A",
    languageCode: "tr-TR",
    gender: "FEMALE",
    type: "WAVENET",
  },
  {
    name: "tr-TR-Wavenet-B",
    languageCode: "tr-TR",
    gender: "MALE",
    type: "WAVENET",
  },
  {
    name: "tr-TR-Wavenet-C",
    languageCode: "tr-TR",
    gender: "FEMALE",
    type: "WAVENET",
  },
  {
    name: "tr-TR-Wavenet-D",
    languageCode: "tr-TR",
    gender: "FEMALE",
    type: "WAVENET",
  },
  {
    name: "tr-TR-Wavenet-E",
    languageCode: "tr-TR",
    gender: "MALE",
    type: "WAVENET",
  },

  // Vietnamese voices
  {
    name: "vi-VN-Wavenet-A",
    languageCode: "vi-VN",
    gender: "FEMALE",
    type: "WAVENET",
  },
  {
    name: "vi-VN-Wavenet-B",
    languageCode: "vi-VN",
    gender: "MALE",
    type: "WAVENET",
  },
  {
    name: "vi-VN-Wavenet-C",
    languageCode: "vi-VN",
    gender: "FEMALE",
    type: "WAVENET",
  },
  {
    name: "vi-VN-Wavenet-D",
    languageCode: "vi-VN",
    gender: "MALE",
    type: "WAVENET",
  },
];

/**
 * Supported TTS providers that use Google Cloud TTS
 */
export const TTS_PROVIDERS = ["google-ai", "vertex"] as const;
