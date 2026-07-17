/**
 * Buffer → string decoding with encoding detection (#362).
 *
 * Order of resolution:
 *   1. Explicit override (any iconv-lite label).
 *   2. Deterministic BOM sniff (UTF-8 / UTF-16 LE / UTF-16 BE).
 *   3. `chardet` statistical detection, mapped to an iconv-lite label.
 *   4. Fallback to UTF-8 (preserves the historical hard-coded default).
 *
 * Decoding always goes through `iconv-lite`, and any residual BOM is stripped
 * from the decoded string so it can't glue onto the first token.
 */

import chardet from "chardet";
import iconv from "iconv-lite";
import { logger } from "./logger.js";
import type { DecodedBuffer } from "../types/index.js";

/** Strip a leading BOM (U+FEFF) from an already-decoded string. */
export function stripBomString(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/** Deterministic BOM detection from the raw bytes. Returns null when absent. */
function sniffBom(buffer: Buffer): string | null {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xef &&
    buffer[1] === 0xbb &&
    buffer[2] === 0xbf
  ) {
    return "utf-8";
  }
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return "utf-16le";
  }
  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
    return "utf-16be";
  }
  return null;
}

/**
 * Map a chardet label to an iconv-lite-supported label. Returns null when the
 * label is unknown/unsupported so the caller falls back to UTF-8.
 */
function toIconvLabel(detected: string | null): string | null {
  if (!detected) {
    return null;
  }
  const normalized = detected.toLowerCase().replace(/[^a-z0-9]/g, "");
  const map: Record<string, string> = {
    utf8: "utf-8",
    utf16le: "utf-16le",
    utf16be: "utf-16be",
    ascii: "utf-8", // ASCII is a strict UTF-8 subset
    windows1252: "windows-1252",
    iso88591: "latin1",
    latin1: "latin1",
    iso88592: "iso-8859-2",
    windows1251: "windows-1251",
    koi8r: "koi8-r",
    gb18030: "gb18030",
    big5: "big5",
    shiftjis: "shift_jis",
    euckr: "euc-kr",
    eucjp: "euc-jp",
  };
  const label = map[normalized] ?? detected;
  return iconv.encodingExists(label) ? label : null;
}

/**
 * Decode a buffer to text, detecting the encoding unless overridden.
 *
 * @param isCompleteBuffer - Whether `buffer` is the entire source (default
 *   `true`). Pass `false` when `buffer` is only a peeked prefix (e.g. a
 *   streaming head-sniff) — the ASCII fast path still commits to "utf-8" for
 *   the peeked bytes (unchanged behavior), but reports a lower confidence
 *   since later bytes not yet seen could still be non-ASCII (#1199).
 */
export function decodeBuffer(
  buffer: Buffer,
  override?: string,
  isCompleteBuffer = true,
): DecodedBuffer {
  // 1. Explicit override wins outright.
  if (override && iconv.encodingExists(override)) {
    return {
      text: stripBomString(iconv.decode(buffer, override)),
      encoding: override,
      confidence: 100,
    };
  }
  if (override && !iconv.encodingExists(override)) {
    logger.warn(
      `[textEncoding] Unsupported encoding override "${override}"; falling back to detection.`,
    );
  }

  // 2. BOM is authoritative when present.
  const bom = sniffBom(buffer);
  if (bom) {
    return {
      text: stripBomString(iconv.decode(buffer, bom)),
      encoding: bom,
      confidence: 100,
    };
  }

  // 2b. Pure-ASCII fast path — chardet often reports ASCII as ISO-8859-1, but
  // ASCII is a strict UTF-8 subset and decodes identically, so report "utf-8"
  // to preserve the historical default for plain-ASCII files.
  let ascii = true;
  for (let i = 0; i < buffer.length; i++) {
    if (buffer[i] >= 0x80) {
      ascii = false;
      break;
    }
  }
  if (ascii) {
    return {
      text: stripBomString(iconv.decode(buffer, "utf-8")),
      encoding: "utf-8",
      // A partial peek being pure-ASCII only proves the peeked prefix is
      // ASCII, not the whole file — a later chunk could still switch to a
      // legacy encoding. Only report full certainty when `buffer` is known
      // to be the complete source.
      confidence: isCompleteBuffer ? 100 : 60,
    };
  }

  // 3. Statistical detection.
  let detected: string | null = null;
  try {
    detected = chardet.detect(buffer);
  } catch (error) {
    logger.debug(`[textEncoding] chardet failed: ${String(error)}`);
  }
  const label = toIconvLabel(detected);
  if (label) {
    return {
      text: stripBomString(iconv.decode(buffer, label)),
      encoding: label,
      // chardet gives a winner but not a numeric score via detect(); treat a
      // confident non-UTF-8 hit as reasonably (not fully) certain.
      confidence: label === "utf-8" ? 100 : 80,
    };
  }

  // 4. Fallback: historical UTF-8 default.
  return {
    text: stripBomString(iconv.decode(buffer, "utf-8")),
    encoding: "utf-8",
    confidence: 0,
  };
}
