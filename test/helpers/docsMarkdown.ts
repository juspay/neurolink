/**
 * Shared reader for the hand-written docs, used by the suites that check what
 * the docs show against what the package ships
 * (continuous-test-suite-docs-snippets.ts, continuous-test-suite-docs-methods.ts).
 *
 * It lists README.md and every markdown file under docs/ except docs/api
 * (generated) and docs/plans (design notes), and splits a markdown file into
 * its fenced code blocks. Nothing here parses code or reads the package.
 */

import * as fs from "node:fs";
import * as path from "node:path";

export type Fence = {
  readonly language: string;
  /** Words after the language on the opening fence line. */
  readonly meta: readonly string[];
  readonly firstLine: number;
  readonly code: string;
};

type OpenFence = {
  readonly marker: string;
  readonly length: number;
  readonly language: string;
  readonly meta: readonly string[];
  readonly firstLine: number;
  readonly quoted: boolean;
  readonly body: string[];
};

export const EXCLUDED_DIRECTORIES: ReadonlySet<string> = new Set([
  "docs/api",
  "docs/plans",
]);

export const compareCodepoints = (a: string, b: string): number =>
  a < b ? -1 : a > b ? 1 : 0;

export function listDocFiles(root: string): string[] {
  const found: string[] = [];
  if (fs.existsSync(path.join(root, "README.md"))) {
    found.push("README.md");
  }
  const walk = (directory: string): void => {
    for (const entry of fs.readdirSync(path.join(root, directory), {
      withFileTypes: true,
    })) {
      const relative = `${directory}/${entry.name}`;
      if (entry.isDirectory()) {
        if (!EXCLUDED_DIRECTORIES.has(relative)) {
          walk(relative);
        }
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        found.push(relative);
      }
    }
  };
  if (fs.existsSync(path.join(root, "docs"))) {
    walk("docs");
  }
  return found.sort(compareCodepoints);
}

const FENCE_LINE = /^(\s*(?:>\s?)*)(`{3,}|~{3,})(.*)$/;
const QUOTE_PREFIX = /^\s*(?:>\s?)+/;

export function extractFences(markdown: string): Fence[] {
  const fences: Fence[] = [];
  const close = (open: OpenFence): void => {
    fences.push({
      language: open.language,
      meta: open.meta,
      firstLine: open.firstLine,
      code: open.body.join("\n"),
    });
  };
  let open: OpenFence | undefined;
  for (const [index, line] of markdown.split(/\r?\n/).entries()) {
    const match = FENCE_LINE.exec(line);
    if (open !== undefined) {
      const closes =
        match !== null &&
        match[2][0] === open.marker &&
        match[2].length >= open.length &&
        match[3].trim() === "";
      if (closes) {
        close(open);
        open = undefined;
      } else {
        open.body.push(open.quoted ? line.replace(QUOTE_PREFIX, "") : line);
      }
      continue;
    }
    if (match === null || (match[2][0] === "`" && match[3].includes("`"))) {
      continue;
    }
    const [language, ...rest] = match[3].trim().split(/[\s{:,]/);
    const meta = rest.filter((word) => word !== "");
    open = {
      marker: match[2][0],
      length: match[2].length,
      language: language.toLowerCase(),
      meta,
      firstLine: index + 2,
      quoted: match[1].includes(">"),
      body: [],
    };
  }
  if (open !== undefined) {
    close(open);
  }
  return fences;
}
