/**
 * Arithmetic evaluator for the built-in `calculateMath` tool.
 *
 * The expression is MODEL output. It is parsed by a small recursive-descent
 * parser and evaluated over numbers only: there is no `Function`, no `eval`,
 * no property access and no identifier that is not on the fixed allow-list
 * below. Anything the grammar does not cover is reported as an error.
 *
 * Grammar (precedence low → high):
 *
 *   expression := term (("+" | "-") term)*
 *   term       := unary (("*" | "/" | "%") unary)*
 *   unary      := ("-" | "+") unary | power
 *   power      := primary ("**" unary)?            right-associative
 *   primary    := number | constant | function "(" args ")" | "(" expression ")"
 *
 * Numbers are decimal literals (`12`, `3.5`, `.5`, `1e-3`). Functions and
 * constants are the listed `Math` members, accepted with or without the
 * `Math.` prefix. Unary minus binds looser than `**`, so `-2 ** 2` is `-4`,
 * as in mathematics (JavaScript rejects that spelling outright).
 */

import type { ArithmeticEvaluation, ArithmeticToken } from "../types/index.js";

/** Longest expression accepted, in characters. */
const MAX_EXPRESSION_LENGTH = 1_000;

/** Deepest nesting of parentheses and function calls accepted. */
const MAX_NESTING_DEPTH = 64;

/** Most arguments one function call may take. */
const MAX_FUNCTION_ARGUMENTS = 16;

const MATH_FUNCTIONS: Readonly<
  Record<string, { fn: (...values: number[]) => number; arity: number | null }>
> = Object.freeze({
  abs: { fn: Math.abs, arity: 1 },
  ceil: { fn: Math.ceil, arity: 1 },
  floor: { fn: Math.floor, arity: 1 },
  round: { fn: Math.round, arity: 1 },
  trunc: { fn: Math.trunc, arity: 1 },
  sign: { fn: Math.sign, arity: 1 },
  sqrt: { fn: Math.sqrt, arity: 1 },
  cbrt: { fn: Math.cbrt, arity: 1 },
  pow: { fn: Math.pow, arity: 2 },
  exp: { fn: Math.exp, arity: 1 },
  log: { fn: Math.log, arity: 1 },
  log2: { fn: Math.log2, arity: 1 },
  log10: { fn: Math.log10, arity: 1 },
  sin: { fn: Math.sin, arity: 1 },
  cos: { fn: Math.cos, arity: 1 },
  tan: { fn: Math.tan, arity: 1 },
  asin: { fn: Math.asin, arity: 1 },
  acos: { fn: Math.acos, arity: 1 },
  atan: { fn: Math.atan, arity: 1 },
  atan2: { fn: Math.atan2, arity: 2 },
  sinh: { fn: Math.sinh, arity: 1 },
  cosh: { fn: Math.cosh, arity: 1 },
  tanh: { fn: Math.tanh, arity: 1 },
  hypot: { fn: Math.hypot, arity: null },
  min: { fn: Math.min, arity: null },
  max: { fn: Math.max, arity: null },
});

const MATH_CONSTANTS: Readonly<Record<string, number>> = Object.freeze({
  PI: Math.PI,
  E: Math.E,
  LN2: Math.LN2,
  LN10: Math.LN10,
  LOG2E: Math.LOG2E,
  LOG10E: Math.LOG10E,
  SQRT2: Math.SQRT2,
  SQRT1_2: Math.SQRT1_2,
});

/** The names the model may use, for the error text and the tool description. */
export const ARITHMETIC_FUNCTION_NAMES: readonly string[] = Object.freeze(
  Object.keys(MATH_FUNCTIONS),
);
export const ARITHMETIC_CONSTANT_NAMES: readonly string[] = Object.freeze(
  Object.keys(MATH_CONSTANTS),
);

class ArithmeticSyntaxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ArithmeticSyntaxError";
  }
}

const NUMBER_PATTERN = /^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/;
const IDENTIFIER_PATTERN =
  /^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*/;

function tokenize(expression: string): ArithmeticToken[] {
  const tokens: ArithmeticToken[] = [];
  let index = 0;
  while (index < expression.length) {
    const char = expression[index];
    if (char === " " || char === "\t" || char === "\n" || char === "\r") {
      index++;
      continue;
    }
    const rest = expression.slice(index);
    const numberMatch = NUMBER_PATTERN.exec(rest);
    if (numberMatch) {
      const value = Number(numberMatch[0]);
      if (!Number.isFinite(value)) {
        throw new ArithmeticSyntaxError(
          `Number literal at position ${index} is out of range`,
        );
      }
      tokens.push({ kind: "number", value, at: index });
      index += numberMatch[0].length;
      continue;
    }
    const identifierMatch = IDENTIFIER_PATTERN.exec(rest);
    if (identifierMatch) {
      tokens.push({ kind: "identifier", name: identifierMatch[0], at: index });
      index += identifierMatch[0].length;
      continue;
    }
    if (rest.startsWith("**")) {
      tokens.push({ kind: "operator", value: "**", at: index });
      index += 2;
      continue;
    }
    if (
      char === "+" ||
      char === "-" ||
      char === "*" ||
      char === "/" ||
      char === "%"
    ) {
      tokens.push({ kind: "operator", value: char, at: index });
      index++;
      continue;
    }
    if (char === "(" || char === ")") {
      tokens.push({ kind: "paren", value: char, at: index });
      index++;
      continue;
    }
    if (char === ",") {
      tokens.push({ kind: "comma", at: index });
      index++;
      continue;
    }
    throw new ArithmeticSyntaxError(
      `Unexpected character "${char}" at position ${index}`,
    );
  }
  tokens.push({ kind: "end", at: expression.length });
  return tokens;
}

/** `Math.sqrt` and `sqrt` name the same function; anything else is refused. */
function resolveName(name: string): string {
  return name.startsWith("Math.") ? name.slice("Math.".length) : name;
}

class Parser {
  private position = 0;
  private depth = 0;

  constructor(private readonly tokens: ArithmeticToken[]) {}

  parse(): number {
    const value = this.parseExpression();
    const token = this.peek();
    if (token.kind !== "end") {
      throw new ArithmeticSyntaxError(
        `Unexpected input at position ${token.at}`,
      );
    }
    return value;
  }

  private peek(): ArithmeticToken {
    return this.tokens[this.position];
  }

  private next(): ArithmeticToken {
    const token = this.tokens[this.position];
    this.position++;
    return token;
  }

  private isOperator(token: ArithmeticToken, value: string): boolean {
    return token.kind === "operator" && token.value === value;
  }

  private enter(): void {
    this.depth++;
    if (this.depth > MAX_NESTING_DEPTH) {
      throw new ArithmeticSyntaxError(
        `Expression nests deeper than ${MAX_NESTING_DEPTH} levels`,
      );
    }
  }

  private leave(): void {
    this.depth--;
  }

  private parseExpression(): number {
    let left = this.parseTerm();
    for (;;) {
      const token = this.peek();
      if (this.isOperator(token, "+")) {
        this.next();
        left += this.parseTerm();
      } else if (this.isOperator(token, "-")) {
        this.next();
        left -= this.parseTerm();
      } else {
        return left;
      }
    }
  }

  private parseTerm(): number {
    let left = this.parseUnary();
    for (;;) {
      const token = this.peek();
      if (this.isOperator(token, "*")) {
        this.next();
        left *= this.parseUnary();
      } else if (this.isOperator(token, "/")) {
        this.next();
        left /= this.parseUnary();
      } else if (this.isOperator(token, "%")) {
        this.next();
        left %= this.parseUnary();
      } else {
        return left;
      }
    }
  }

  private parseUnary(): number {
    const token = this.peek();
    if (this.isOperator(token, "-")) {
      this.next();
      this.enter();
      const value = -this.parseUnary();
      this.leave();
      return value;
    }
    if (this.isOperator(token, "+")) {
      this.next();
      this.enter();
      const value = this.parseUnary();
      this.leave();
      return value;
    }
    return this.parsePower();
  }

  private parsePower(): number {
    const base = this.parsePrimary();
    if (this.isOperator(this.peek(), "**")) {
      this.next();
      this.enter();
      const exponent = this.parseUnary();
      this.leave();
      return base ** exponent;
    }
    return base;
  }

  private parsePrimary(): number {
    const token = this.next();
    if (token.kind === "number") {
      return token.value;
    }
    if (token.kind === "paren" && token.value === "(") {
      this.enter();
      const value = this.parseExpression();
      this.leave();
      this.expectClosingParen();
      return value;
    }
    if (token.kind === "identifier") {
      return this.parseIdentifier(token.name, token.at);
    }
    if (token.kind === "end") {
      throw new ArithmeticSyntaxError("Expression ended unexpectedly");
    }
    throw new ArithmeticSyntaxError(`Unexpected token at position ${token.at}`);
  }

  private expectClosingParen(): void {
    const token = this.next();
    if (token.kind !== "paren" || token.value !== ")") {
      throw new ArithmeticSyntaxError(`Expected ")" at position ${token.at}`);
    }
  }

  private parseIdentifier(name: string, at: number): number {
    const resolved = resolveName(name);
    const following = this.peek();
    const isCall = following.kind === "paren" && following.value === "(";
    if (isCall) {
      const definition = Object.prototype.hasOwnProperty.call(
        MATH_FUNCTIONS,
        resolved,
      )
        ? MATH_FUNCTIONS[resolved]
        : undefined;
      if (!definition) {
        throw new ArithmeticSyntaxError(
          `Unknown function "${name}" at position ${at}. Allowed: ${ARITHMETIC_FUNCTION_NAMES.join(", ")}`,
        );
      }
      this.next();
      this.enter();
      const args = this.parseArguments();
      this.leave();
      if (definition.arity !== null && args.length !== definition.arity) {
        throw new ArithmeticSyntaxError(
          `"${name}" takes ${definition.arity} argument(s), got ${args.length}`,
        );
      }
      return definition.fn(...args);
    }
    if (Object.prototype.hasOwnProperty.call(MATH_CONSTANTS, resolved)) {
      return MATH_CONSTANTS[resolved];
    }
    throw new ArithmeticSyntaxError(
      `Unknown identifier "${name}" at position ${at}. Allowed constants: ${ARITHMETIC_CONSTANT_NAMES.join(", ")}`,
    );
  }

  /** Called after the opening parenthesis has been consumed. */
  private parseArguments(): number[] {
    const args: number[] = [];
    if (this.peek().kind === "paren") {
      this.expectClosingParen();
      return args;
    }
    for (;;) {
      args.push(this.parseExpression());
      if (args.length > MAX_FUNCTION_ARGUMENTS) {
        throw new ArithmeticSyntaxError(
          `A function call may take at most ${MAX_FUNCTION_ARGUMENTS} arguments`,
        );
      }
      const token = this.next();
      if (token.kind === "comma") {
        continue;
      }
      if (token.kind === "paren" && token.value === ")") {
        return args;
      }
      throw new ArithmeticSyntaxError(
        `Expected "," or ")" at position ${token.at}`,
      );
    }
  }
}

/**
 * Evaluate an arithmetic expression without executing it as code.
 *
 * Total: every failure — unsupported syntax, an unknown name, a result that is
 * not a finite number — comes back as `{ ok: false, error }`, never a throw.
 */
export function evaluateArithmetic(expression: string): ArithmeticEvaluation {
  if (typeof expression !== "string") {
    return { ok: false, error: "Expression must be a string" };
  }
  if (expression.trim().length === 0) {
    return { ok: false, error: "Expression is empty" };
  }
  if (expression.length > MAX_EXPRESSION_LENGTH) {
    return {
      ok: false,
      error: `Expression is ${expression.length} characters long; the limit is ${MAX_EXPRESSION_LENGTH}`,
    };
  }
  try {
    const value = new Parser(tokenize(expression)).parse();
    if (!Number.isFinite(value)) {
      return {
        ok: false,
        error: Number.isNaN(value)
          ? "Result is not a number"
          : "Result is not a finite number",
      };
    }
    return { ok: true, value };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Could not parse expression",
    };
  }
}
