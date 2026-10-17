import type {
  DecideBaseURLShape,
  DecideBaseURLTransform,
} from "../../types/index.js";

const TRANSFORMS: Readonly<
  Record<DecideBaseURLTransform, (value: string) => string>
> = {
  // A loop, not /\/+$/: that pattern is quadratic on a long run of slashes
  // followed by another character.
  "strip-trailing-slash": (value) => {
    let end = value.length;
    while (end > 0 && value[end - 1] === "/") {
      end -= 1;
    }
    return value.slice(0, end);
  },
  // A fixed-width tail check, not a pattern: nothing here can backtrack.
  "strip-v1-suffix": (value) => {
    const start = value.length - 3;
    return start >= 0 &&
      value[start] === "/" &&
      (value[start + 1] === "v" || value[start + 1] === "V") &&
      value[start + 2] === "1"
      ? value.slice(0, start)
      : value;
  },
};

export function normalizeBaseURL(
  raw: string,
  transforms: readonly DecideBaseURLTransform[],
): string {
  return transforms.reduce((value, name) => TRANSFORMS[name](value), raw);
}

/**
 * The three spellings the rest of the SDK treats as this machine (the OTLP log
 * sink, proxy replay and native telemetry use the same list). It is exact on
 * purpose: `new URL()` has already folded `0x7f.1` and `2130706433` into
 * `127.0.0.1` and lowercased the host, and the rest of 127/8, `0.0.0.0` and
 * `*.localhost` are not loopback here.
 */
const LOOPBACK_HOSTS: ReadonlySet<string> = new Set([
  "localhost",
  "127.0.0.1",
  "[::1]",
]);

/** Whether a `URL.hostname` is this machine, so a plain-http request to it never leaves it. */
export function isLoopbackHost(hostname: string): boolean {
  return LOOPBACK_HOSTS.has(hostname);
}

/**
 * Why a parsed base URL may not be used, or undefined: a plain-http URL that
 * is not loopback would send the bearer key and the decision body in cleartext.
 * The message names no part of the URL.
 */
export function cleartextBaseURLProblem(
  url: URL,
  displayName: string,
  fix: string,
): string | undefined {
  return url.protocol === "http:" && !isLoopbackHost(url.hostname)
    ? `The ${displayName} base URL must use https:// unless it points at this machine (localhost, 127.0.0.1 or [::1]). ${fix}`
    : undefined;
}

const SHAPE_CHECKS: Readonly<
  Record<
    DecideBaseURLShape,
    (baseURL: string, displayName: string, fix: string) => string | undefined
  >
> = {
  // None of these messages repeats the base URL: it can hold a credential,
  // `fetch` rejects userinfo and echoes it, and a route appended after a query
  // string or fragment ends up inside it.
  origin: (baseURL, displayName, fix) => {
    try {
      const url = new URL(baseURL);
      // `new URL()` accepts any scheme, so a host:port with no scheme parses as
      // one (`xor.internal:8080` has the scheme `xor.internal:`) and would reach
      // `fetch` as a network error instead of this message.
      if (url.protocol !== "https:" && url.protocol !== "http:") {
        return `The ${displayName} base URL must start with https:// or http://. ${fix}`;
      }
      // A cleartext request would carry the bearer key and the decision body.
      const cleartext = cleartextBaseURLProblem(url, displayName, fix);
      if (cleartext) {
        return cleartext;
      }
      // The raw text is checked as well: `search` and `hash` are empty for a
      // lone "?" or "#", which still swallows the route appended after it.
      return url.username ||
        url.password ||
        url.search ||
        url.hash ||
        baseURL.includes("?") ||
        baseURL.includes("#")
        ? `The ${displayName} base URL must not carry credentials, a query string or a fragment. ${fix}`
        : undefined;
    } catch {
      return `The ${displayName} base URL is not a valid absolute URL. ${fix}`;
    }
  },
};

/** Why a normalised base URL fails the shape, or undefined when it passes. */
export function baseURLShapeProblem(
  shape: DecideBaseURLShape,
  baseURL: string,
  displayName: string,
  fix: string,
): string | undefined {
  return SHAPE_CHECKS[shape](baseURL, displayName, fix);
}
