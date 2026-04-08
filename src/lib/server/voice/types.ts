export type Frame =
  | { type: "audio"; data: Int16Array }
  | { type: "vad_start" }
  | { type: "vad_stop" }
  | { type: "transcript"; text: string; final: boolean }
  | { type: "llm_token"; text: string }
  | { type: "tts_audio"; data: Buffer }
  | { type: "interrupt" };
