import {
  BINARY_KEYS,
  BINARY_PAYLOAD_MIN_CHARS,
  REDACTED_VALUE,
} from "../constants/telemetry.js";
import type { JsonValue } from "../types/index.js";

const TOKEN_KEY_PATTERN = /tokens?$/;
// A run of base64 characters and `=`, with no whitespace in it.
const BASE64_RUN_PATTERN = /^[A-Za-z0-9+/_\-=]+$/;
// What every string was held to before whitespace was told apart.
const BASE64_OR_SPACE_PATTERN = /^[A-Za-z0-9+/_\-=\s]+$/;
const WHITESPACE_PATTERN = /\s/;
const SEGMENT_PATTERN = /\S+/g;
const PEM_ARMOR_PATTERN = /^-----BEGIN [A-Z0-9 ]+-----/;
// Encoders wrap at 16 columns or more; a narrower repeat is a list of short
// words or codes.
const MIN_WRAPPED_WIDTH = 16;
const MIME_TYPE_KEYS = ["mimeType", "mediaType", "media_type", "mime_type"];
const DATA_URL_PATTERN = new RegExp(
  `data:([\\w.+-]+/[\\w.+-]+)?(?:;[\\w=.+-]+)*;base64,[A-Za-z0-9+/_\\-=]{${BINARY_PAYLOAD_MIN_CHARS},}`,
  "g",
);
// A name made of word characters, dots and dashes that is followed by `=` or
// `:` and a value that is not a bare number. Starting only where a run begins
// keeps the scan linear: the run is read once, and whether it names a
// credential is decided afterwards on the matched run alone.
const ASSIGNMENT_NAME_PATTERN =
  /(?<![\w.-])[\w.-]+(?=\s*[=:]\s*(?!\d+\b)[^\s&"',;])/g;
const ASSIGNMENT_VALUE_PATTERN = /(\s*[=:]\s*)(?!\d+\b)[^\s&"',;]+/y;
const SECRET_NAME_PATTERN =
  /api[_-]?key|secret|password|passwd|token|credential|private[_-]?key|signature/i;
const BARE_SECRET_PATTERN =
  /\b(?:sk-[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16}|xox[baprs]-[A-Za-z0-9-]{10,})/g;

function normalizeKey(key: string): string {
  return key.replace(/[_-]/g, "").toLowerCase();
}

function maskStrings(value: JsonValue): JsonValue {
  if (typeof value === "string") {
    return REDACTED_VALUE;
  }
  if (Array.isArray(value)) {
    return value.map(maskStrings);
  }
  if (value === null || typeof value !== "object") {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, maskStrings(entry)]),
  );
}

/**
 * @description Masks the value stored under a credential-looking key. Structures under a plural token key (`tokens`) keep their shape with every string masked; anything else collapses to the placeholder.
 * @param key {string} - Property name that matched the sensitive-key pattern.
 * @param entry {JsonValue} - Value stored under that key.
 * @returns {JsonValue} The masked value.
 */
export function redactSensitiveEntry(key: string, entry: JsonValue): JsonValue {
  const isStructure = typeof entry === "object" && entry !== null;
  return isStructure && TOKEN_KEY_PATTERN.test(normalizeKey(key))
    ? maskStrings(entry)
    : REDACTED_VALUE;
}

/**
 * @description Masks credentials written as `name=value`, `name: value` or as a recognizable bare key (OpenAI, GitHub, AWS, Slack). Purely numeric values after a credential-looking name are left alone. Runs in time linear in the length of the text.
 * @param text {string} - Text to scan.
 * @returns {string} The text with credential values replaced.
 */
export function redactSecretAssignments(text: string): string {
  const names = new RegExp(ASSIGNMENT_NAME_PATTERN);
  const value = new RegExp(ASSIGNMENT_VALUE_PATTERN);
  let redacted = "";
  let copied = 0;
  for (let name = names.exec(text); name; name = names.exec(text)) {
    if (!SECRET_NAME_PATTERN.test(name[0])) {
      continue;
    }
    const nameEnd = name.index + name[0].length;
    value.lastIndex = nameEnd;
    const assignment = value.exec(text);
    if (!assignment) {
      continue;
    }
    redacted += `${text.slice(copied, nameEnd)}${assignment[1]}${REDACTED_VALUE}`;
    copied = nameEnd + assignment[0].length;
    names.lastIndex = copied;
  }
  return `${redacted}${text.slice(copied)}`.replace(
    BARE_SECRET_PATTERN,
    REDACTED_VALUE,
  );
}

/**
 * @description Replaces inline base64 data URLs with a size and MIME-type placeholder.
 * @param text {string} - Text to scan.
 * @returns {string} The text with each data URL payload replaced by `[N bytes mime/type]`.
 */
export function describeDataUrls(text: string): string {
  return text.replace(
    DATA_URL_PATTERN,
    (match, mimeType: string | undefined) =>
      `[${Math.floor(((match.length - match.indexOf(",") - 1) * 3) / 4)} bytes${mimeType ? ` ${mimeType}` : ""}]`,
  );
}

/**
 * @description Tells whether an object key conventionally holds a binary payload.
 * @param key {string} - Property name.
 * @returns {boolean} `true` for keys such as `data`, `image`, `bytes` and `base64`.
 */
export function isBinaryKey(key: string): boolean {
  return BINARY_KEYS.has(normalizeKey(key));
}

/**
 * @description Reads the MIME type an object declares for its payload.
 * @param node {object} - Object that may carry `mimeType`, `mediaType`, `media_type` or `mime_type`.
 * @returns {string | undefined} The declared MIME type, or `undefined` when none is a string.
 */
export function declaredMimeType(node: object): string | undefined {
  for (const key of MIME_TYPE_KEYS) {
    const declared = Reflect.get(node, key);
    if (typeof declared === "string") {
      return declared;
    }
  }
  return undefined;
}

// Encoded text with whitespace in it is wrapped: every segment but the last has
// the same width, as MIME, PEM and `base64 -w` produce. Prose and lists of names
// break wherever they like, so their segments differ in length.
function isWrappedBase64(text: string): boolean {
  if (PEM_ARMOR_PATTERN.test(text)) {
    return BASE64_OR_SPACE_PATTERN.test(text);
  }
  let width: number | undefined;
  let sawShorter = false;
  for (const [segment] of text.matchAll(SEGMENT_PATTERN)) {
    if (!BASE64_RUN_PATTERN.test(segment)) {
      return false;
    }
    if (width === undefined) {
      width = segment.length;
      if (width < MIN_WRAPPED_WIDTH) {
        return false;
      }
    } else if (sawShorter || segment.length > width) {
      return false;
    } else if (segment.length < width) {
      sawShorter = true;
    }
  }
  return true;
}

// A string without whitespace is held to the rule it always was; one with
// whitespace inside it must also read as wrapped base64, which keeps prose and
// word lists readable. Whitespace around the ends does not count.
function isBase64Payload(value: string): boolean {
  const text = value.trim();
  return WHITESPACE_PATTERN.test(text)
    ? isWrappedBase64(text)
    : BASE64_RUN_PATTERN.test(text);
}

/**
 * @description Describes a binary payload by size instead of content.
 * @param value {ArrayBuffer | ArrayBufferView | string} - Raw bytes, or a base64 string long enough to be treated as bytes. A string made only of base64 characters and `=` counts as base64; one with whitespace inside it counts only when it is wrapped at a fixed width (or PEM-armored), so prose, word lists and name lists keep their content.
 * @param mimeType {string | undefined} - MIME type to include in the placeholder.
 * @returns {string | undefined} `[N bytes mime/type]`, or `undefined` when the value is not binary.
 */
export function binaryPlaceholder(
  value: ArrayBuffer | ArrayBufferView | string,
  mimeType: string | undefined,
): string | undefined {
  const suffix = mimeType ? ` ${mimeType}` : "";
  if (typeof value !== "string") {
    return value instanceof ArrayBuffer || ArrayBuffer.isView(value)
      ? `[${value.byteLength} bytes${suffix}]`
      : undefined;
  }
  if (value.length > BINARY_PAYLOAD_MIN_CHARS && isBase64Payload(value)) {
    return `[${Math.floor((value.length * 3) / 4)} bytes${suffix}]`;
  }
  return undefined;
}
