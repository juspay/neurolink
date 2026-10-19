import { promises as fs } from "node:fs";
import type {
  DecisionAudioFormat,
  DecisionAudioLimits,
  DecisionMediaFileRead,
  DecisionMediaKind,
  DecisionMediaConversion,
  DecisionMediaLimits,
  DecisionMediaResult,
  DecisionMediaSource,
  DecisionMediaSourceRead,
  DecisionPreparedAudio,
} from "../types/index.js";
import { sniffImageMimeType } from "./imageDetection.js";
import { detectIsoBmffImageMimeType, hasFtypBoxSignature } from "./isoBmff.js";

const REMOTE_URL = /^https?:\/\//i;
const URL_SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i;
const MAX_ECHOED_PATH_CHARS = 200;
const DATA_URL: Record<DecisionMediaKind, RegExp> = {
  image: /^data:image\/[a-z0-9.+-]+;base64,/i,
  video: /^data:video\/[a-z0-9.+-]+;base64,/i,
  audio: /^data:audio\/[a-z0-9.+-]+;base64,/i,
};
const WEBM_HEADER = [0x1a, 0x45, 0xdf, 0xa3];

const NOT_RECOGNISED: Record<DecisionMediaKind, string> = {
  image: "is not a recognised image format",
  video: "is not a recognised video format (MP4, MOV or WebM)",
  audio: "is not a recognised audio format (WAV, FLAC, Ogg or MP3)",
};

/**
 * MP4 and MOV share the ISO-BMFF box. An AVIF or HEIC image shares it too, and
 * is not a video.
 */
function sniffVideoMimeType(buffer: Buffer): string | null {
  if (
    hasFtypBoxSignature(buffer) &&
    detectIsoBmffImageMimeType(buffer) === null
  ) {
    return "video/mp4";
  }
  return WEBM_HEADER.every((byte, i) => buffer[i] === byte)
    ? "video/webm"
    : null;
}

const ascii = (buffer: Buffer, start: number, end: number): string =>
  buffer.subarray(start, end).toString("latin1");

/**
 * The audio containers a decision model is known to decode. MP4 audio (M4A,
 * AAC) is told apart so it can be refused by name: it was measured decoding to
 * silence, with the request still answered as if it had been heard.
 */
function sniffAudioFormat(buffer: Buffer): DecisionAudioFormat | "aac" | null {
  if (ascii(buffer, 0, 4) === "RIFF" && ascii(buffer, 8, 12) === "WAVE") {
    return "wav";
  }
  if (ascii(buffer, 0, 4) === "fLaC") {
    return "flac";
  }
  if (ascii(buffer, 0, 4) === "OggS") {
    return "ogg";
  }
  if (hasFtypBoxSignature(buffer)) {
    return "aac";
  }
  if (ascii(buffer, 0, 3) === "ID3") {
    return "mp3";
  }
  // An MPEG frame sync. Layer bits 00 mark an ADTS (AAC) stream instead.
  if (buffer.length >= 2 && buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) {
    return (buffer[1] & 0x06) === 0 ? "aac" : "mp3";
  }
  return null;
}

/** A WAV clip's length from its `fmt ` byte rate and `data` size, or undefined. */
function wavSeconds(buffer: Buffer): number | undefined {
  let byteRate: number | undefined;
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const id = ascii(buffer, offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const body = offset + 8;
    if (id === "fmt " && body + 12 <= buffer.length) {
      byteRate = buffer.readUInt32LE(body + 8);
    } else if (id === "data") {
      // A streamed WAV leaves the size unset; what follows is the data.
      const dataBytes =
        size === 0 || size === 0xffffffff
          ? buffer.length - body
          : Math.min(size, buffer.length - body);
      return byteRate ? dataBytes / byteRate : undefined;
    }
    offset = body + size + (size % 2);
  }
  return undefined;
}

/** A FLAC clip's length from its STREAMINFO block, or undefined when unset. */
function flacSeconds(buffer: Buffer): number | undefined {
  // "fLaC", a 4-byte block header, then STREAMINFO.
  if (buffer.length < 26 || (buffer[4] & 0x7f) !== 0) {
    return undefined;
  }
  const info = 8;
  const sampleRate =
    (buffer[info + 10] << 12) |
    (buffer[info + 11] << 4) |
    (buffer[info + 12] >> 4);
  const totalSamples =
    (buffer[info + 13] & 0x0f) * 2 ** 32 + buffer.readUInt32BE(info + 14);
  return sampleRate > 0 && totalSamples > 0
    ? totalSamples / sampleRate
    : undefined;
}

/**
 * An Ogg clip's length: the granule position of its last page over the stream's
 * sample rate. Opus counts at 48 kHz from its pre-skip; Vorbis at the rate in
 * its identification header. Undefined for any other codec, or a stream whose
 * pages cannot be read.
 */
function oggSeconds(buffer: Buffer): number | undefined {
  // The first page carries the codec's identification packet.
  const segments = buffer[26];
  if (buffer.length < 28 || segments === undefined) {
    return undefined;
  }
  const packet = 27 + segments;
  let rate: number | undefined;
  let preSkip = 0;
  if (ascii(buffer, packet, packet + 8) === "OpusHead") {
    rate = 48000;
    preSkip =
      buffer.length >= packet + 12 ? buffer.readUInt16LE(packet + 10) : 0;
  } else if (ascii(buffer, packet, packet + 7) === "\x01vorbis") {
    rate =
      buffer.length >= packet + 16
        ? buffer.readUInt32LE(packet + 12)
        : undefined;
  }
  const last = buffer.lastIndexOf("OggS");
  if (
    !rate ||
    last < 0 ||
    last + 14 > buffer.length ||
    buffer[last + 4] !== 0
  ) {
    return undefined;
  }
  const granule = buffer.readBigInt64LE(last + 6);
  if (granule <= 0n) {
    return undefined;
  }
  return Math.max(0, Number(granule) - preSkip) / rate;
}

/**
 * The clip in wire form, or why it cannot be sent. A clip whose length can be
 * read (WAV, FLAC, Ogg Opus or Vorbis) and that runs past what the model hears is
 * refused; the model would answer from its start alone. An MP3's length is not
 * read: it needs every frame header walked.
 */
function encodeAudio(
  buffer: Buffer,
  limits: DecisionAudioLimits,
  label: string,
):
  | { status: "ok"; audio: DecisionPreparedAudio }
  | { status: "error"; message: string } {
  const format = sniffAudioFormat(buffer);
  if (format === null) {
    return { status: "error", message: `${label} ${NOT_RECOGNISED.audio}.` };
  }
  if (format === "aac") {
    return {
      status: "error",
      message: `${label} is AAC or M4A audio, which the model does not decode. Convert it to WAV, FLAC, Ogg or MP3.`,
    };
  }
  const seconds =
    format === "wav"
      ? wavSeconds(buffer)
      : format === "flac"
        ? flacSeconds(buffer)
        : format === "ogg"
          ? oggSeconds(buffer)
          : undefined;
  // Every WAV the model can open has both chunks; the server answers one
  // without them with an engine error, which reads as a fault worth retrying.
  if (format === "wav" && seconds === undefined) {
    return {
      status: "error",
      message: `${label} is a WAV file without a complete fmt and data chunk.`,
    };
  }
  if (seconds !== undefined && seconds > limits.maxSeconds) {
    return {
      status: "error",
      message: `${label} runs ${seconds.toFixed(1)} seconds; the model hears at most ${limits.maxSeconds}. Trim it, or split it across requests.`,
    };
  }
  return {
    status: "ok",
    audio: { data: buffer.toString("base64"), format },
  };
}

function encode(
  buffer: Buffer,
  kind: Exclude<DecisionMediaKind, "audio">,
  label: string,
): DecisionMediaConversion {
  const mime =
    kind === "image" ? sniffImageMimeType(buffer) : sniffVideoMimeType(buffer);
  return mime === null
    ? { status: "error", message: `${label} ${NOT_RECOGNISED[kind]}.` }
    : {
        status: "ok",
        dataUrl: `data:${mime};base64,${buffer.toString("base64")}`,
      };
}

/**
 * A path can be echoed in an error. A stray base64 blob passed as a path cannot,
 * so past a short length only its size is shown.
 */
function describePath(path: string): string {
  return path.length <= MAX_ECHOED_PATH_CHARS
    ? `(${path})`
    : `(a ${path.length}-character string)`;
}

/** A file over the limit is refused from `stat`, before it is read into memory. */
async function readMediaFile(
  path: string,
  label: string,
  maxBytes: number,
): Promise<DecisionMediaFileRead> {
  try {
    const stats = await fs.stat(path);
    if (!stats.isFile()) {
      return {
        status: "error",
        message: `${label} ${describePath(path)} is not a file.`,
      };
    }
    if (stats.size > maxBytes) {
      return {
        status: "error",
        message: `${label} ${describePath(path)} is ${stats.size} bytes; a request may carry at most ${maxBytes}.`,
      };
    }
    return { status: "ok", buffer: await fs.readFile(path) };
  } catch (error) {
    const reason =
      error instanceof Error && "code" in error
        ? String(error.code)
        : "unreadable";
    return {
      status: "error",
      message: `Could not read ${label} ${describePath(path)}: ${reason}.`,
    };
  }
}

/**
 * A source resolved for one kind of media, with every refusal the three kinds
 * share. Nothing here echoes a `data:` URL or a remote URL: either can carry a
 * credential or megabytes of base64, and neither belongs in an error message.
 */
async function readMediaSource(
  source: DecisionMediaSource,
  kind: DecisionMediaKind,
  label: string,
  maxBytes: number,
): Promise<DecisionMediaSourceRead> {
  if (typeof source !== "string") {
    return source.length === 0
      ? { status: "error", message: `${label} is an empty Buffer.` }
      : { status: "buffer", buffer: source };
  }
  const value = source.trim();
  if (value === "") {
    return { status: "error", message: `${label} is an empty string.` };
  }
  if (REMOTE_URL.test(value)) {
    return {
      status: "error",
      message: `${label} is a remote URL. Media is not fetched for you; pass a Buffer, a file path or a data: URL.`,
    };
  }
  if (/^data:/i.test(value)) {
    return DATA_URL[kind].test(value)
      ? { status: "dataUrl", dataUrl: value }
      : {
          status: "error",
          message: `${label} is a data: URL that is not base64 ${kind} content.`,
        };
  }
  if (URL_SCHEME.test(value)) {
    return {
      status: "error",
      message: `${label} uses an unsupported URL scheme. Pass a Buffer, a file path or a data: URL.`,
    };
  }
  const file = await readMediaFile(value, label, maxBytes);
  return file.status === "ok"
    ? { status: "buffer", buffer: file.buffer }
    : file;
}

/** An image or video as a `data:` URL: bytes are identified first, a URL of the right kind is sent as given. */
async function toDataUrl(
  source: DecisionMediaSource,
  kind: Exclude<DecisionMediaKind, "audio">,
  label: string,
  maxBytes: number,
): Promise<DecisionMediaConversion> {
  const read = await readMediaSource(source, kind, label, maxBytes);
  if (read.status === "buffer") {
    return encode(read.buffer, kind, label);
  }
  return read.status === "dataUrl"
    ? { status: "ok", dataUrl: read.dataUrl }
    : read;
}

/** An audio clip as bytes: a `data:audio/…` URL is decoded, since the wire takes raw base64 and the container is sniffed. */
async function readAudioSource(
  source: DecisionMediaSource,
  label: string,
  maxBytes: number,
): Promise<DecisionMediaFileRead> {
  const read = await readMediaSource(source, "audio", label, maxBytes);
  if (read.status === "dataUrl") {
    const base64 = read.dataUrl.slice(read.dataUrl.indexOf(",") + 1);
    return { status: "ok", buffer: Buffer.from(base64, "base64") };
  }
  return read.status === "buffer"
    ? { status: "ok", buffer: read.buffer }
    : read;
}

/**
 * Turn the caller's images and video into `data:` URLs, and an audio clip into
 * `{ data, format }`, or say why not. Runs before any request, so every
 * refusal costs nothing and none is retried.
 */
export async function prepareDecisionMedia(
  request: {
    images?: readonly DecisionMediaSource[];
    video?: DecisionMediaSource;
    audio?: DecisionMediaSource;
  },
  limits: DecisionMediaLimits | undefined,
  vendor: string,
  alternatives: readonly string[],
): Promise<DecisionMediaResult> {
  const images = request.images ?? [];
  if (
    images.length === 0 &&
    request.video === undefined &&
    request.audio === undefined
  ) {
    return { status: "prepared", media: undefined };
  }
  const use =
    alternatives.length > 0
      ? ` Use a decision provider that does: ${alternatives.join(", ")}.`
      : "";
  if (!limits) {
    const what =
      images.length === 0 && request.video === undefined
        ? "audio"
        : "images or video";
    return {
      status: "refused",
      message: `${vendor} does not accept ${what}.${use}`,
    };
  }
  if (request.audio !== undefined && limits.audio === undefined) {
    return {
      status: "refused",
      message: `${vendor} does not accept audio.${use}`,
    };
  }
  if (images.length > limits.maxImages) {
    return {
      status: "refused",
      message: `${vendor} accepts at most ${limits.maxImages} images per request; this one has ${images.length}.`,
    };
  }
  if (request.video !== undefined && !limits.video) {
    return { status: "refused", message: `${vendor} does not accept video.` };
  }

  const prepared: string[] = [];
  for (const [index, image] of images.entries()) {
    const converted = await toDataUrl(
      image,
      "image",
      `Image ${index + 1}`,
      limits.maxRequestBytes,
    );
    if (converted.status === "error") {
      return { status: "refused", message: converted.message };
    }
    prepared.push(converted.dataUrl);
  }
  let video: string | undefined;
  if (request.video !== undefined) {
    const converted = await toDataUrl(
      request.video,
      "video",
      "The video",
      limits.maxRequestBytes,
    );
    if (converted.status === "error") {
      return { status: "refused", message: converted.message };
    }
    video = converted.dataUrl;
  }
  let audio: DecisionPreparedAudio | undefined;
  if (request.audio !== undefined && limits.audio !== undefined) {
    const read = await readAudioSource(
      request.audio,
      "The audio",
      limits.maxRequestBytes,
    );
    if (read.status === "error") {
      return { status: "refused", message: read.message };
    }
    const encoded = encodeAudio(read.buffer, limits.audio, "The audio");
    if (encoded.status === "error") {
      return { status: "refused", message: encoded.message };
    }
    audio = encoded.audio;
  }
  const bytes = prepared.reduce(
    (sum, url) => sum + url.length,
    (video?.length ?? 0) + (audio?.data.length ?? 0),
  );
  return {
    status: "prepared",
    media: {
      images: prepared,
      ...(video ? { video } : {}),
      ...(audio ? { audio } : {}),
      bytes,
    },
  };
}
