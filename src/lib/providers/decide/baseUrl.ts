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
