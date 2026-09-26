/**
 * Line-level TOML reading for the proxy's client-config writers.
 *
 * Grok and Codex keep their settings in TOML files the user and the CLI
 * itself also edit, and the writers must find what the proxy wrote there
 * without trusting its comment markers: Grok's own save drops every comment.
 * No TOML parser is a dependency, and a parse-and-serialize round trip would
 * reformat the user's file anyway, so this reads just enough structure to
 * edit text in place: table headers, strings, keys and assignments. Every
 * line keeps its own terminator, so text a writer does not own round-trips
 * byte for byte.
 */

import type {
  CliTomlScanState,
  CliTomlSection,
} from "../../lib/types/index.js";

function splitLinesKeepingEnds(text: string): string[] {
  return text.match(/[^\n]*\n|[^\n]+$/g) ?? [];
}

function readTomlKey(text: string): { value: string; length: number } | null {
  const bare = text.match(/^[A-Za-z0-9_-]+/);
  if (bare) {
    return { value: bare[0], length: bare[0].length };
  }
  const basic = text.match(/^"(?:[^"\\]|\\.)*"/);
  if (basic) {
    let value: unknown;
    try {
      value = JSON.parse(basic[0]);
    } catch {
      value = undefined;
    }
    return {
      value: typeof value === "string" ? value : basic[0].slice(1, -1),
      length: basic[0].length,
    };
  }
  const literal = text.match(/^'[^']*'/);
  if (literal) {
    return { value: literal[0].slice(1, -1), length: literal[0].length };
  }
  return null;
}

function parseTomlTableHeader(
  line: string,
): { path: string[]; arrayTable: boolean } | null {
  const text = line.trim();
  if (!text.startsWith("[")) {
    return null;
  }
  const arrayTable = text.startsWith("[[");
  const path: string[] = [];
  let rest = text.slice(arrayTable ? 2 : 1);
  for (;;) {
    rest = rest.trimStart();
    const key = readTomlKey(rest);
    if (key === null) {
      return null;
    }
    path.push(key.value);
    rest = rest.slice(key.length).trimStart();
    if (!rest.startsWith(".")) {
      break;
    }
    rest = rest.slice(1);
  }
  const close = arrayTable ? "]]" : "]";
  if (!rest.startsWith(close)) {
    return null;
  }
  const tail = rest.slice(close.length).trim();
  return tail.length === 0 || tail.startsWith("#")
    ? { path, arrayTable }
    : null;
}

function advanceTomlScan(
  line: string,
  state: CliTomlScanState,
): CliTomlScanState {
  let { multiline, depth } = state;
  let i = 0;
  while (i < line.length) {
    if (multiline !== null) {
      if (multiline === '"""' && line[i] === "\\") {
        i += 2;
      } else if (line.startsWith(multiline, i)) {
        // Up to two quotes of content may sit against the closing delimiter.
        const quote = multiline[0];
        i += 3;
        while (line[i] === quote) {
          i += 1;
        }
        multiline = null;
      } else {
        i += 1;
      }
      continue;
    }
    const ch = line[i];
    if (ch === "#") {
      break;
    }
    if (line.startsWith('"""', i) || line.startsWith("'''", i)) {
      multiline = line.startsWith('"""', i) ? '"""' : "'''";
      i += 3;
    } else if (ch === '"') {
      i += 1;
      while (i < line.length && line[i] !== '"') {
        i += line[i] === "\\" ? 2 : 1;
      }
      i += 1;
    } else if (ch === "'") {
      const end = line.indexOf("'", i + 1);
      i = end === -1 ? line.length : end + 1;
    } else {
      if (ch === "[" || ch === "{") {
        depth += 1;
      } else if (ch === "]" || ch === "}") {
        depth = Math.max(0, depth - 1);
      }
      i += 1;
    }
  }
  return { multiline, depth };
}

export function splitTomlSections(text: string): CliTomlSection[] {
  const sections: CliTomlSection[] = [];
  let current: {
    path: readonly string[] | null;
    arrayTable: boolean;
    lines: string[];
  } = { path: null, arrayTable: false, lines: [] };
  let state: CliTomlScanState = { multiline: null, depth: 0 };
  for (const line of splitLinesKeepingEnds(text)) {
    const header =
      state.multiline === null && state.depth === 0
        ? parseTomlTableHeader(line)
        : null;
    if (header) {
      sections.push(current);
      current = { ...header, lines: [line] };
      continue;
    }
    current.lines.push(line);
    state = advanceTomlScan(line, state);
  }
  sections.push(current);
  return sections;
}

function decodeBasicString(inner: string): string {
  try {
    const value: unknown = JSON.parse(`"${inner}"`);
    return typeof value === "string" ? value : inner;
  } catch {
    return inner;
  }
}

/**
 * A line of TOML with every string replaced by `@<n>@` and any comment
 * dropped, so text inside a string can never read as a key or an assignment.
 * `strings[n]` is the decoded value. `@` cannot occur outside a string in
 * valid TOML.
 */
export function maskTomlStrings(line: string): {
  masked: string;
  strings: string[];
} {
  const strings: string[] = [];
  let masked = "";
  let i = 0;
  while (i < line.length) {
    const ch = line[i];
    if (ch === "#") {
      break;
    }
    const triple = line.startsWith('"""', i)
      ? '"""'
      : line.startsWith("'''", i)
        ? "'''"
        : null;
    if (triple !== null || ch === '"' || ch === "'") {
      const delimiter = triple ?? ch;
      let end = i + delimiter.length;
      while (end < line.length && !line.startsWith(delimiter, end)) {
        end += delimiter.startsWith('"') && line[end] === "\\" ? 2 : 1;
      }
      // Up to two quotes of content may sit against a triple closer.
      for (
        let extra = 0;
        triple !== null &&
        extra < 2 &&
        line[end + delimiter.length] === delimiter[0];
        extra += 1
      ) {
        end += 1;
      }
      const inner = line.slice(
        i + delimiter.length,
        Math.min(end, line.length),
      );
      strings.push(
        delimiter.startsWith("'") ? inner : decodeBasicString(inner),
      );
      masked += `@${strings.length - 1}@`;
      i = end + delimiter.length;
      continue;
    }
    masked += ch;
    i += 1;
  }
  return { masked, strings };
}

const TOML_KEY_PART = String.raw`(?:[A-Za-z0-9_-]+|@\d+@)`;

const TOML_ASSIGNMENT = new RegExp(
  String.raw`^\s*(${TOML_KEY_PART}(?:\s*\.\s*${TOML_KEY_PART})*)\s*=\s*(.*?)\s*$`,
);

function unmaskKeyPart(part: string, strings: readonly string[]): string {
  const token = part.match(/^@(\d+)@$/);
  return token ? strings[Number(token[1])] : part;
}

export function parseMaskedAssignment(
  masked: string,
  strings: readonly string[],
): { path: string[]; value: string } | null {
  const match = masked.match(TOML_ASSIGNMENT);
  return match
    ? {
        path: match[1]
          .split(".")
          .map((part) => unmaskKeyPart(part.trim(), strings)),
        value: match[2],
      }
    : null;
}

/**
 * The string a masked value starts with. Only the start counts, so a value
 * with damage after it (a literal `\n` left by a bad paste) is still read.
 */
export function maskedStringValue(
  value: string,
  strings: readonly string[],
): string | undefined {
  const token = value.match(/^@(\d+)@/);
  return token ? strings[Number(token[1])] : undefined;
}

/** The pairs directly inside a one-line inline table. */
export function inlineTablePairs(
  value: string,
  strings: readonly string[],
): { path: string[]; value: string }[] {
  if (!value.startsWith("{") || !value.endsWith("}")) {
    return [];
  }
  const parts: string[] = [];
  let depth = 0;
  let start = 1;
  for (let i = 1; i < value.length - 1; i += 1) {
    if (value[i] === "{" || value[i] === "[") {
      depth += 1;
    } else if (value[i] === "}" || value[i] === "]") {
      depth -= 1;
    } else if (value[i] === "," && depth === 0) {
      parts.push(value.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(value.slice(start, value.length - 1));
  return parts.flatMap((part) => {
    const pair = parseMaskedAssignment(part, strings);
    return pair ? [pair] : [];
  });
}

/** The dotted key a statement assigns, and its value when that is a string. */
export function readTomlAssignment(
  line: string,
): { path: string[]; value: string | undefined } | null {
  const { masked, strings } = maskTomlStrings(line);
  const assignment = parseMaskedAssignment(masked, strings);
  return assignment
    ? {
        path: assignment.path,
        value: maskedStringValue(assignment.value, strings),
      }
    : null;
}

function isTomlContentLine(line: string): boolean {
  const text = line.trim();
  return text.length > 0 && !text.startsWith("#");
}

/**
 * The lines of a section that are TOML rather than the inside of a
 * multi-line string; `statement` marks those that start a key/value pair
 * rather than continue an array or inline table.
 */
export function tomlCodeLines(
  section: CliTomlSection,
): { line: string; statement: boolean }[] {
  const code: { line: string; statement: boolean }[] = [];
  let state: CliTomlScanState = { multiline: null, depth: 0 };
  section.lines.forEach((line, index) => {
    const isHeader = index === 0 && section.path !== null;
    if (!isHeader && state.multiline === null) {
      code.push({ line, statement: state.depth === 0 });
    }
    if (!isHeader) {
      state = advanceTomlScan(line, state);
    }
  });
  return code;
}

export function readStringValue(
  section: CliTomlSection,
  key: string,
): string | undefined {
  for (const { line, statement } of tomlCodeLines(section)) {
    const assignment = statement ? readTomlAssignment(line) : null;
    if (assignment?.path.length === 1 && assignment.path[0] === key) {
      return assignment.value;
    }
  }
  return undefined;
}

/**
 * Names of the `<parent>.<name>` tables defined by dotted keys instead of a
 * `[<parent>.<name>]` header: `claude-opus-4-6.base_url = ...` under
 * `[model]`, or `model.claude-opus-4-6.base_url = ...` before the first
 * header.
 */
export function dottedTableIds(
  sections: readonly CliTomlSection[],
  parent: string,
): string[] {
  return sections.flatMap((section) => {
    const underParent =
      !section.arrayTable &&
      section.path?.length === 1 &&
      section.path[0] === parent;
    if (!underParent && section.path !== null) {
      return [];
    }
    return tomlCodeLines(section).flatMap(({ line, statement }) => {
      const path = statement ? readTomlAssignment(line)?.path : undefined;
      if (!path) {
        return [];
      }
      if (underParent) {
        return [path[0]];
      }
      return path.length >= 2 && path[0] === parent ? [path[1]] : [];
    });
  });
}

/**
 * How many of an owned section's lines are the writer's. Comments after its
 * last key belong to what follows, so a note the user wrote above their own
 * next table survives. `managedLines` are the writer's own comment lines,
 * which are dropped wherever they sit.
 */
export function ownedLineCount(
  section: CliTomlSection,
  managedLines: ReadonlySet<string>,
): number {
  const lastKey = section.lines.findLastIndex(isTomlContentLine);
  const firstNote = section.lines.findIndex(
    (line, index) =>
      index > lastKey &&
      line.trim().length > 0 &&
      !managedLines.has(line.trim()),
  );
  return firstNote === -1 ? section.lines.length : firstNote;
}

/**
 * A table declared twice is a TOML error, and neither Grok nor Codex will
 * start on one.
 * Each `[[array]]` element opens a fresh scope for everything under it, so
 * `[mcp_servers.env]` under two elements is not a repeat.
 */
export function findDuplicateTable(text: string): string | undefined {
  const tables = new Map<string, readonly string[]>();
  const arrays = new Map<string, readonly string[]>();
  const isUnder = (
    candidate: readonly string[],
    prefix: readonly string[],
  ): boolean =>
    candidate.length > prefix.length &&
    prefix.every((part, index) => candidate[index] === part);
  for (const { path, arrayTable } of splitTomlSections(text)) {
    if (path === null) {
      continue;
    }
    const key = JSON.stringify(path);
    if (arrayTable) {
      if (tables.has(key)) {
        return path.join(".");
      }
      for (const scope of [tables, arrays]) {
        for (const [seenKey, seenPath] of scope) {
          if (isUnder(seenPath, path)) {
            scope.delete(seenKey);
          }
        }
      }
      arrays.set(key, path);
      continue;
    }
    if (tables.has(key) || arrays.has(key)) {
      return path.join(".");
    }
    tables.set(key, path);
  }
  return undefined;
}
