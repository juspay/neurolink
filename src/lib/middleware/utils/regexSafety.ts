import type {
  RegexPatternVerdict,
  RegexSafetyContext,
  RegexSafetyCost,
  RegexSafetyNode,
  RegexSafetyOutcome,
  RegexSafetyShape,
} from "../../types/index.js";

/**
 * Static vetting for regular expressions that a caller hands to the
 * guardrails (`badWords.regexPatterns`, `precallEvaluation.sanitizationPatterns`).
 *
 * Both lists are compiled and run synchronously on the event loop against the
 * whole model response, so one pattern that backtracks catastrophically
 * (`(a+)+$` on a run of `a`) stalls every request in the process. A timing
 * probe on a short fixed string cannot find that: the cost only shows on long
 * adversarial input, and it is measured after the call has already returned.
 * This reads the pattern instead.
 *
 * The cause of every exponential case is one input that can be split between
 * the parts of the pattern in many ways. A variable-length part (`a+`, `a?`,
 * `a{1,3}`, `(ab)*`) is ambiguous when what can follow it may start with text
 * the part itself can match. The check refuses a pattern when:
 *
 * - such a part sits inside a repeated group (`(a+)+`, `(a?a?)+`,
 *   `(a{1,30}){1,30}`), where the ways multiply on every iteration;
 * - the alternatives of a repeated group may overlap (`(a|aa)+`);
 * - ambiguous parts are chained: more than {@link MAX_NARROW_WAYS} ways in
 *   total from optional or short parts (`a?` nine times in a row), or more
 *   than {@link MAX_OPEN_AMBIGUITY} open-ended ones (`.*a.*b.*c.*d.*e`);
 * - a repetition bound is above {@link MAX_REPETITION_BOUND}, or the pattern
 *   is longer than {@link MAX_REGEX_PATTERN_LENGTH}.
 *
 * A variable-length part that is followed by something it cannot match is
 * unambiguous, so `(\d{1,3}\.){3}`, `([a-z0-9-]+\.)+` and `(?:\d[ -]?){13,16}`
 * run.
 *
 * It is deliberately conservative, not a proof. Two classes are compared on a
 * fixed sample of characters (Latin text plus a few other scripts), so a class
 * that only overlaps outside the sample looks disjoint, and a back-reference
 * is assumed to overlap with everything. A hard guarantee would need a time
 * budget around the match itself (a `node:vm` timeout or a worker), which a
 * synchronous `String.replace` cannot offer; that is a follow-up.
 */

/** Longest pattern accepted, in characters. */
export const MAX_REGEX_PATTERN_LENGTH = 1000;

/** Largest number accepted in a `{n}`, `{n,}` or `{n,m}` bound. */
const MAX_REPETITION_BOUND = 500;

/**
 * A group repeated up to this many times has a bounded cost even when its
 * alternatives overlap; above it the repetition counts as open-ended.
 */
const MAX_AMBIGUOUS_REPETITIONS = 8;

/**
 * A part whose length varies by at most this much (`a?`, `a{1,3}`) multiplies
 * the ways to match by its range plus one. A wider one (`a*`, `a{2,50}`) adds
 * a polynomial degree instead.
 */
const MAX_NARROW_RANGE = 8;

/** Most ways the chained narrow ambiguous parts of a pattern may multiply to. */
const MAX_NARROW_WAYS = 256;

/** Most open-ended ambiguous parts a pattern may chain (`.*a.*b.*c.*d`). */
const MAX_OPEN_AMBIGUITY = 4;

const BRACE_QUANTIFIER = /^\{(\d+)(?:(,)(\d*))?\}/;

const SHORTHAND_CLASSES = "dDwWsS";
const ASSERTION_ESCAPES = "bB";

const REASON_LOOP =
  "a repeated group has a variable-length part that can match the same text as what follows it, so the input can be split many ways (such as (a+)+ or (a?a?)+)";
const REASON_ALTERNATIVES =
  "a repeated group has alternatives that may overlap (such as (a|aa)+)";
const REASON_NARROW_CHAIN = `a chain of optional or short variable-length parts that may overlap can be matched in more than ${MAX_NARROW_WAYS} ways (such as a?a?a?a?a?a?a?a?a?)`;
const REASON_OPEN_CHAIN = `more than ${MAX_OPEN_AMBIGUITY} open-ended repeats may match the same text (such as .*a.*b.*c.*d.*e)`;
const REASON_BOUND = `a repetition bound is above ${MAX_REPETITION_BOUND}`;

const parsePattern = (pattern: string): RegexSafetyNode[][] => {
  let pos = 0;

  /** Skips what follows `(` and reports whether the group is a lookaround. */
  const skipGroupPrefix = (): boolean => {
    if (pattern[pos] !== "?") {
      return false;
    }
    const lookbehind = /^\?<[=!]/.test(pattern.slice(pos, pos + 3));
    if (lookbehind) {
      pos += 3;
      return true;
    }
    if (pattern[pos + 1] === "<") {
      const close = pattern.indexOf(">", pos);
      pos = close === -1 ? pattern.length : close + 1;
      return false;
    }
    const lookahead = pattern[pos + 1] === "=" || pattern[pos + 1] === "!";
    pos += 2;
    return lookahead;
  };

  const readClass = (): RegexSafetyNode => {
    const start = pos - 1;
    while (pos < pattern.length && pattern[pos] !== "]") {
      pos += pattern[pos] === "\\" ? 2 : 1;
    }
    pos = Math.min(pos + 1, pattern.length);
    return { kind: "class", source: pattern.slice(start, pos) };
  };

  /** Reads a fixed number of hex digits after `\x` or `\u`, if they are there. */
  const readHexEscape = (digits: number): string | undefined => {
    const hex = pattern.slice(pos, pos + digits);
    if (hex.length !== digits || !/^[0-9a-fA-F]+$/.test(hex)) {
      return undefined;
    }
    pos += digits;
    return String.fromCharCode(Number.parseInt(hex, 16));
  };

  const readEscape = (): RegexSafetyNode => {
    const escaped = pattern[pos];
    if (escaped === undefined) {
      return { kind: "literal", char: "\\" };
    }
    pos += 1;
    if (ASSERTION_ESCAPES.includes(escaped)) {
      return { kind: "assertion" };
    }
    // `\x61` and `a` are the letter `a`: reading them as a class named
    // `x` or `u` would hide `(\x61+)+` from every check below.
    const hexChar =
      escaped === "x"
        ? readHexEscape(2)
        : escaped === "u"
          ? readHexEscape(4)
          : undefined;
    if (hexChar !== undefined) {
      return { kind: "literal", char: hexChar.toLowerCase() };
    }
    if (escaped === "c" && /[A-Za-z]/.test(pattern[pos] ?? "")) {
      const control = String.fromCharCode(pattern.charCodeAt(pos) % 32);
      pos += 1;
      return { kind: "literal", char: control };
    }
    if (escaped === "0") {
      return { kind: "literal", char: "\0" };
    }
    if (SHORTHAND_CLASSES.includes(escaped) || /[1-9A-Za-z]/.test(escaped)) {
      return { kind: "class", source: `\\${escaped}` };
    }
    return { kind: "literal", char: escaped.toLowerCase() };
  };

  const readQuantifier = (): { min: number; max: number } | undefined => {
    const ch = pattern[pos];
    let quantifier: { min: number; max: number } | undefined;
    if (ch === "*") {
      quantifier = { min: 0, max: Infinity };
      pos += 1;
    } else if (ch === "+") {
      quantifier = { min: 1, max: Infinity };
      pos += 1;
    } else if (ch === "?") {
      quantifier = { min: 0, max: 1 };
      pos += 1;
    } else if (ch === "{") {
      const braces = BRACE_QUANTIFIER.exec(pattern.slice(pos));
      if (braces) {
        const min = Number(braces[1]);
        let max = min;
        if (braces[2] !== undefined) {
          max = braces[3] === "" ? Infinity : Number(braces[3]);
        }
        quantifier = { min, max };
        pos += braces[0].length;
      }
    }
    if (quantifier && pattern[pos] === "?") {
      pos += 1;
    }
    return quantifier;
  };

  const parseAlternatives = (depth: number): RegexSafetyNode[][] => {
    const alternatives: RegexSafetyNode[][] = [];
    let sequence: RegexSafetyNode[] = [];

    while (pos < pattern.length) {
      const ch = pattern[pos];
      if (ch === ")" && depth > 0) {
        break;
      }
      if (ch === "|") {
        pos += 1;
        alternatives.push(sequence);
        sequence = [];
        continue;
      }
      const quantifier = sequence.length > 0 ? readQuantifier() : undefined;
      if (quantifier) {
        const child = sequence[sequence.length - 1];
        sequence = [
          ...sequence.slice(0, -1),
          { kind: "repeat", child, ...quantifier },
        ];
        continue;
      }
      pos += 1;
      if (ch === "(") {
        const lookaround = skipGroupPrefix();
        const groupAlternatives = parseAlternatives(depth + 1);
        if (pattern[pos] === ")") {
          pos += 1;
        }
        sequence.push({
          kind: "group",
          alternatives: groupAlternatives,
          ...(lookaround ? { lookaround } : {}),
        });
      } else if (ch === "[") {
        sequence.push(readClass());
      } else if (ch === "\\") {
        sequence.push(readEscape());
      } else if (ch === ".") {
        sequence.push({ kind: "class", source: "." });
      } else if (ch === "^" || ch === "$") {
        sequence.push({ kind: "assertion" });
      } else {
        sequence.push({ kind: "literal", char: ch.toLowerCase() });
      }
    }

    alternatives.push(sequence);
    return alternatives;
  };

  return parseAlternatives(0);
};

// ---------------------------------------------------------------------------
// Character sets
//
// Two classes are compared on a fixed sample of characters rather than by
// parsing them: the engine itself decides what `[\w-]` or `\S` matches. A set
// is a bitmap over the sample, so "can these two match the same character" is
// a word-wise AND.
// ---------------------------------------------------------------------------

const EXTRA_SAMPLE_CODES = [
  0x3b1, 0x410, 0x5d0, 0x627, 0x4e2d, 0xac00, 0x2028, 0x2029, 0xfeff, 0xffff,
];

const SAMPLE_CHARS: readonly string[] = [
  ...Array.from({ length: 0x300 }, (_, code) => String.fromCharCode(code)),
  ...EXTRA_SAMPLE_CODES.map((code) => String.fromCharCode(code)),
];

const SET_WORDS = Math.ceil(SAMPLE_CHARS.length / 32);

const EMPTY_SET: Uint32Array = new Uint32Array(SET_WORDS);
const FULL_SET: Uint32Array = new Uint32Array(SET_WORDS).fill(0xffffffff);

const setOf = (matches: (char: string) => boolean): Uint32Array => {
  const set = new Uint32Array(SET_WORDS);
  SAMPLE_CHARS.forEach((char, index) => {
    if (matches(char)) {
      set[index >>> 5] |= 1 << (index & 31);
    }
  });
  return set;
};

const unionOf = (left: Uint32Array, right: Uint32Array): Uint32Array =>
  left.map((word, index) => word | right[index]);

const overlaps = (left: Uint32Array, right: Uint32Array): boolean =>
  left.some((word, index) => (word & right[index]) !== 0);

/**
 * The characters a class matches. A back-reference or a class that does not
 * compile cannot be compared, so it is assumed to match everything.
 */
const classSetOf = (source: string): Uint32Array => {
  if (/^\\[1-9k]/.test(source)) {
    return FULL_SET;
  }
  try {
    const matcher = new RegExp(`^(?:${source})$`, "i");
    return setOf((char) => matcher.test(char));
  } catch {
    return FULL_SET;
  }
};

// ---------------------------------------------------------------------------
// Ambiguity analysis
// ---------------------------------------------------------------------------

const NO_COST: RegexSafetyCost = { ways: 1, degree: 0 };
const TOP_LEVEL: RegexSafetyContext = { inLoop: false, unbounded: false };

const chain = (
  left: RegexSafetyCost,
  right: RegexSafetyCost,
): RegexSafetyCost => ({
  ways: left.ways * right.ways,
  degree: left.degree + right.degree,
});

const worse = (
  left: RegexSafetyCost,
  right: RegexSafetyCost,
): RegexSafetyCost => ({
  ways: Math.max(left.ways, right.ways),
  degree: Math.max(left.degree, right.degree),
});

const literalWord = (sequence: RegexSafetyNode[]): string | undefined => {
  const chars = sequence.map((node) =>
    node.kind === "literal" ? node.char : undefined,
  );
  return chars.every((char) => char !== undefined) ? chars.join("") : undefined;
};

/** True when no word is a prefix of another, so the words decode uniquely. */
const isPrefixFree = (words: string[]): boolean => {
  const sorted = [...words].sort();
  return sorted.every(
    (word, index) => index === 0 || !word.startsWith(sorted[index - 1]),
  );
};

const analyze = (alternatives: RegexSafetyNode[][]): RegexSafetyOutcome => {
  const shapes = new WeakMap<object, RegexSafetyShape>();

  const shapeOfSequence = (sequence: RegexSafetyNode[]): RegexSafetyShape => {
    let first = EMPTY_SET;
    let nullable = true;
    for (const node of sequence) {
      if (!nullable) {
        break;
      }
      const shape = shapeOf(node);
      first = unionOf(first, shape.first);
      nullable = shape.nullable;
    }
    return { first, nullable };
  };

  const shapeOf = (node: RegexSafetyNode): RegexSafetyShape => {
    const known = shapes.get(node);
    if (known) {
      return known;
    }
    let shape: RegexSafetyShape;
    switch (node.kind) {
      case "literal":
        shape = {
          first: setOf((char) => char.toLowerCase() === node.char),
          nullable: false,
        };
        break;
      case "class":
        shape = { first: classSetOf(node.source), nullable: false };
        break;
      case "assertion":
        shape = { first: EMPTY_SET, nullable: true };
        break;
      case "group": {
        if (node.lookaround) {
          shape = { first: EMPTY_SET, nullable: true };
          break;
        }
        const parts = node.alternatives.map(shapeOfSequence);
        shape = {
          first: parts.reduce(
            (all, part) => unionOf(all, part.first),
            EMPTY_SET,
          ),
          nullable: parts.some((part) => part.nullable),
        };
        break;
      }
      case "repeat": {
        const child = shapeOf(node.child);
        shape = {
          first: child.first,
          nullable: node.min === 0 || child.nullable,
        };
        break;
      }
    }
    shapes.set(node, shape);
    return shape;
  };

  /** True when two alternatives of a group could match the same text. */
  const alternativesOverlap = (group: RegexSafetyNode[][]): boolean => {
    const words = group.map(literalWord);
    if (words.every((word): word is string => word !== undefined)) {
      return !isPrefixFree(words);
    }
    const parts = group.map(shapeOfSequence);
    return parts.some(
      (part, index) =>
        part.nullable ||
        parts
          .slice(index + 1)
          .some((other) => overlaps(part.first, other.first)),
    );
  };

  const analyzeSequence = (
    sequence: RegexSafetyNode[],
    after: Uint32Array,
    context: RegexSafetyContext,
  ): RegexSafetyOutcome => {
    let total = NO_COST;
    let follow = after;
    for (let index = sequence.length - 1; index >= 0; index -= 1) {
      const node = sequence[index];
      const outcome = analyzeNode(node, follow, context);
      if (typeof outcome === "string") {
        return outcome;
      }
      total = chain(total, outcome);
      const shape = shapeOf(node);
      follow = shape.nullable ? unionOf(shape.first, follow) : shape.first;
    }
    return total;
  };

  const analyzeAlternatives = (
    group: RegexSafetyNode[][],
    after: Uint32Array,
    context: RegexSafetyContext,
  ): RegexSafetyOutcome => {
    let worst = NO_COST;
    for (const sequence of group) {
      const outcome = analyzeSequence(sequence, after, context);
      if (typeof outcome === "string") {
        return outcome;
      }
      worst = worse(worst, outcome);
    }
    return worst;
  };

  const analyzeNode = (
    node: RegexSafetyNode,
    after: Uint32Array,
    context: RegexSafetyContext,
  ): RegexSafetyOutcome => {
    if (node.kind === "group") {
      if (node.lookaround) {
        return analyzeAlternatives(node.alternatives, EMPTY_SET, TOP_LEVEL);
      }
      const overlapping =
        node.alternatives.length > 1 && alternativesOverlap(node.alternatives);
      if (overlapping && context.unbounded) {
        return REASON_ALTERNATIVES;
      }
      const inner = analyzeAlternatives(node.alternatives, after, context);
      if (typeof inner === "string") {
        return inner;
      }
      return overlapping ? chain(inner, { ways: 2, degree: 0 }) : inner;
    }
    if (node.kind !== "repeat") {
      return NO_COST;
    }

    const finiteMax = Number.isFinite(node.max) ? node.max : 0;
    if (node.min > MAX_REPETITION_BOUND || finiteMax > MAX_REPETITION_BOUND) {
      return REASON_BOUND;
    }

    const child = shapeOf(node.child);
    const variable = node.min < node.max;
    const ambiguous = variable && overlaps(child.first, after);
    if (ambiguous && context.inLoop) {
      return REASON_LOOP;
    }

    const repeatsGroup =
      node.max > 1 &&
      node.child.kind !== "literal" &&
      node.child.kind !== "class";
    let inner: RegexSafetyOutcome;
    if (repeatsGroup) {
      // The next iteration starts where this one ends, so its first
      // characters follow every part of the body.
      inner = analyzeNode(node.child, unionOf(child.first, after), {
        inLoop: true,
        unbounded: context.unbounded || node.max > MAX_AMBIGUOUS_REPETITIONS,
      });
    } else {
      inner = analyzeNode(node.child, after, context);
    }
    if (typeof inner === "string") {
      return inner;
    }
    const looped: RegexSafetyCost = repeatsGroup
      ? {
          ways: inner.ways ** (Number.isFinite(node.max) ? node.max : 1),
          degree: inner.degree,
        }
      : inner;
    if (!ambiguous) {
      return looped;
    }
    const range = node.max - node.min;
    return chain(
      looped,
      range <= MAX_NARROW_RANGE
        ? { ways: range + 1, degree: 0 }
        : { ways: 1, degree: 1 },
    );
  };

  const outcome = analyzeAlternatives(alternatives, EMPTY_SET, TOP_LEVEL);
  if (typeof outcome === "string") {
    return outcome;
  }
  if (outcome.ways > MAX_NARROW_WAYS) {
    return REASON_NARROW_CHAIN;
  }
  if (outcome.degree > MAX_OPEN_AMBIGUITY) {
    return REASON_OPEN_CHAIN;
  }
  return outcome;
};

/**
 * Decide whether a caller-supplied pattern may be compiled and run.
 *
 * Total: it returns a verdict for any string and never throws, so a caller can
 * skip a refused pattern the same way it skips an invalid one.
 */
export function vetRegexPattern(pattern: string): RegexPatternVerdict {
  if (pattern.length > MAX_REGEX_PATTERN_LENGTH) {
    return {
      safe: false,
      reason: `the pattern is ${pattern.length} characters long and the limit is ${MAX_REGEX_PATTERN_LENGTH}`,
    };
  }
  try {
    const outcome = analyze(parsePattern(pattern));
    return typeof outcome === "string"
      ? { safe: false, reason: outcome }
      : { safe: true };
  } catch {
    return {
      safe: false,
      reason: "the pattern is too deeply nested to analyse",
    };
  }
}
