import type { DecideBaseURLTransform } from "../../types/index.js";

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
};

export function normalizeBaseURL(
  raw: string,
  transforms: readonly DecideBaseURLTransform[],
): string {
  return transforms.reduce((value, name) => TRANSFORMS[name](value), raw);
}
