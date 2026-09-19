/**
 * HTML to Markdown conversion for document processors.
 *
 * Scoped deliberately to the small, well-formed HTML subset that document
 * converters emit (mammoth for DOCX): headings, paragraphs, emphasis, links,
 * images, lists, block quotes, preformatted text and tables. It is not a
 * general-purpose web-page converter, which is why the repository gains no
 * dependency for it.
 *
 * @module utils/htmlToMarkdown
 */

import type {
  MarkdownHtmlElementNode,
  MarkdownHtmlNode,
} from "../types/index.js";

/** Tags that never have a closing tag and so never open a scope. */
const VOID_TAGS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "source",
  "track",
  "wbr",
]);

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/**
 * Decode the numeric and named character references a document converter can
 * emit. Unknown references are left verbatim rather than dropped, so no text
 * is silently lost.
 */
function decodeEntities(value: string): string {
  return value.replace(
    /&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g,
    (match, body: string) => {
      if (body.startsWith("#")) {
        const codePoint =
          body.startsWith("#x") || body.startsWith("#X")
            ? Number.parseInt(body.slice(2), 16)
            : Number.parseInt(body.slice(1), 10);
        if (Number.isNaN(codePoint) || codePoint < 0 || codePoint > 0x10ffff) {
          return match;
        }
        try {
          return String.fromCodePoint(codePoint);
        } catch {
          return match;
        }
      }
      const named = NAMED_ENTITIES[body.toLowerCase()];
      return named ?? match;
    },
  );
}

/**
 * Parse the HTML subset into a node tree.
 *
 * Unbalanced closing tags are ignored and unclosed elements are closed at the
 * end of input, so malformed markup degrades to partial structure instead of
 * throwing.
 */
function parseHtml(html: string): MarkdownHtmlNode[] {
  const root: MarkdownHtmlElementNode = {
    kind: "element",
    tag: "#root",
    attrs: {},
    children: [],
  };
  const stack: MarkdownHtmlElementNode[] = [root];
  const tagPattern =
    /<\/?([a-zA-Z][a-zA-Z0-9-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;

  let cursor = 0;
  let match: RegExpExecArray | null;

  const pushText = (raw: string): void => {
    if (!raw) {
      return;
    }
    const current = stack[stack.length - 1];
    current.children.push({ kind: "text", value: decodeEntities(raw) });
  };

  while ((match = tagPattern.exec(html)) !== null) {
    pushText(html.slice(cursor, match.index));
    cursor = match.index + match[0].length;

    const tag = match[1].toLowerCase();
    const isClosing = match[0].startsWith("</");
    const isSelfClosing = match[2].trimEnd().endsWith("/");

    if (isClosing) {
      // Only unwind if the tag is actually open, so a stray `</div>` is inert.
      const openIndex = stack.findIndex((node) => node.tag === tag);
      if (openIndex > 0) {
        stack.length = openIndex;
      }
      continue;
    }

    const element: MarkdownHtmlElementNode = {
      kind: "element",
      tag,
      attrs: parseAttributes(match[2]),
      children: [],
    };
    stack[stack.length - 1].children.push(element);

    if (!isSelfClosing && !VOID_TAGS.has(tag)) {
      stack.push(element);
    }
  }

  pushText(html.slice(cursor));
  return root.children;
}

function parseAttributes(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const pattern =
    /([a-zA-Z_:][a-zA-Z0-9_.:-]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(raw)) !== null) {
    const value = match[3] ?? match[4] ?? match[5] ?? "";
    attrs[match[1].toLowerCase()] = decodeEntities(value);
  }
  return attrs;
}

function isElement(node: MarkdownHtmlNode): node is MarkdownHtmlElementNode {
  return node.kind === "element";
}

/** Collapse runs of whitespace the way an HTML renderer would. */
function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ");
}

/** Render inline content (emphasis, links, images, line breaks) to markdown. */
function renderInline(nodes: MarkdownHtmlNode[]): string {
  let out = "";
  for (const node of nodes) {
    if (node.kind === "text") {
      out += collapseWhitespace(node.value);
      continue;
    }
    switch (node.tag) {
      case "strong":
      case "b": {
        const inner = renderInline(node.children).trim();
        out += inner ? `**${inner}**` : "";
        break;
      }
      case "em":
      case "i": {
        const inner = renderInline(node.children).trim();
        out += inner ? `*${inner}*` : "";
        break;
      }
      case "code": {
        const inner = renderInline(node.children).trim();
        out += inner ? `\`${inner}\`` : "";
        break;
      }
      case "a": {
        const inner = renderInline(node.children).trim();
        const href = node.attrs.href;
        out += href ? `[${inner}](${href})` : inner;
        break;
      }
      case "img": {
        const alt = node.attrs.alt ?? "";
        const src = node.attrs.src ?? "";
        // A DOCX image is inlined as a multi-megabyte data URI; keep the
        // alt text and drop the payload rather than flooding the prompt.
        out += src.startsWith("data:")
          ? `![${alt}](embedded-image)`
          : `![${alt}](${src})`;
        break;
      }
      case "br":
        out += "\n";
        break;
      default:
        out += renderInline(node.children);
        break;
    }
  }
  return out;
}

/** Collect the `<tr>` rows under a table, seeing through thead/tbody/tfoot. */
function collectRows(node: MarkdownHtmlElementNode): MarkdownHtmlElementNode[] {
  const rows: MarkdownHtmlElementNode[] = [];
  for (const child of node.children.filter(isElement)) {
    if (child.tag === "tr") {
      rows.push(child);
    } else if (["thead", "tbody", "tfoot"].includes(child.tag)) {
      rows.push(...collectRows(child));
    }
  }
  return rows;
}

/** A pipe inside a cell would otherwise split it into two columns. */
function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ").trim();
}

function renderTable(node: MarkdownHtmlElementNode): string {
  const rows = collectRows(node);
  if (rows.length === 0) {
    return "";
  }

  const cellsOf = (row: MarkdownHtmlElementNode): string[] =>
    row.children
      .filter(isElement)
      .filter((cell) => cell.tag === "td" || cell.tag === "th")
      .map((cell) =>
        escapeCell(renderBlocks(cell.children).replace(/\n+/g, " ")),
      );

  // Markdown has no headerless table, so when the source marked no header row
  // the first row is promoted — that is what a reader sees anyway.
  const header = cellsOf(rows[0]);
  const bodyRows = rows.slice(1).map(cellsOf);
  const columnCount = Math.max(
    header.length,
    ...bodyRows.map((r) => r.length),
    1,
  );
  const pad = (cells: string[]): string[] =>
    Array.from({ length: columnCount }, (_, i) => cells[i] ?? "");

  const lines = [
    `| ${pad(header).join(" | ")} |`,
    `| ${Array.from({ length: columnCount }, () => "---").join(" | ")} |`,
    ...bodyRows.map((cells) => `| ${pad(cells).join(" | ")} |`),
  ];
  return lines.join("\n");
}

function renderList(node: MarkdownHtmlElementNode, depth: number): string {
  const ordered = node.tag === "ol";
  const items = node.children
    .filter(isElement)
    .filter((child) => child.tag === "li");
  const indent = "  ".repeat(depth);

  return items
    .map((item, index) => {
      const marker = ordered ? `${index + 1}.` : "-";
      // Nested lists render themselves at the next depth; everything else on
      // the item is inline content belonging to this bullet.
      const nested = item.children
        .filter(isElement)
        .filter((child) => child.tag === "ul" || child.tag === "ol");
      const own = item.children.filter(
        (child) =>
          !(isElement(child) && (child.tag === "ul" || child.tag === "ol")),
      );
      const label = renderBlocks(own).replace(/\n+/g, " ").trim();
      const nestedText = nested
        .map((child) => renderList(child, depth + 1))
        .filter(Boolean)
        .join("\n");
      return [`${indent}${marker} ${label}`.trimEnd(), nestedText]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");
}

/** Render block-level content, separating blocks with a blank line. */
function renderBlocks(nodes: MarkdownHtmlNode[]): string {
  const blocks: string[] = [];
  let inlineBuffer = "";

  const flushInline = (): void => {
    const text = inlineBuffer.trim();
    if (text) {
      blocks.push(text);
    }
    inlineBuffer = "";
  };

  for (const node of nodes) {
    if (node.kind === "text") {
      inlineBuffer += collapseWhitespace(node.value);
      continue;
    }

    const headingMatch = /^h([1-6])$/.exec(node.tag);
    if (headingMatch) {
      flushInline();
      const level = Number.parseInt(headingMatch[1], 10);
      const text = renderInline(node.children).replace(/\n+/g, " ").trim();
      if (text) {
        blocks.push(`${"#".repeat(level)} ${text}`);
      }
      continue;
    }

    switch (node.tag) {
      case "p": {
        flushInline();
        const text = renderBlocks(node.children).trim();
        if (text) {
          blocks.push(text);
        }
        break;
      }
      case "ul":
      case "ol": {
        flushInline();
        const text = renderList(node, 0);
        if (text) {
          blocks.push(text);
        }
        break;
      }
      case "table": {
        flushInline();
        const text = renderTable(node);
        if (text) {
          blocks.push(text);
        }
        break;
      }
      case "blockquote": {
        flushInline();
        const inner = renderBlocks(node.children).trim();
        if (inner) {
          blocks.push(
            inner
              .split("\n")
              .map((line) => (line ? `> ${line}` : ">"))
              .join("\n"),
          );
        }
        break;
      }
      case "pre": {
        flushInline();
        const inner = renderInline(node.children).replace(/^\n+|\n+$/g, "");
        if (inner) {
          blocks.push(`\`\`\`\n${inner}\n\`\`\``);
        }
        break;
      }
      case "hr": {
        flushInline();
        blocks.push("---");
        break;
      }
      case "div":
      case "section":
      case "article": {
        flushInline();
        const inner = renderBlocks(node.children).trim();
        if (inner) {
          blocks.push(inner);
        }
        break;
      }
      default:
        inlineBuffer += renderInline([node]);
        break;
    }
  }

  flushInline();
  return blocks.join("\n\n");
}

/**
 * Convert an HTML fragment to Markdown.
 *
 * @param html - HTML produced by a document converter
 * @returns Markdown text, or an empty string when the fragment has no content
 *
 * @example
 * ```typescript
 * htmlToMarkdown("<h1>Title</h1><p>Body</p>"); // "# Title\n\nBody"
 * ```
 */
export function htmlToMarkdown(html: string): string {
  if (!html || !html.trim()) {
    return "";
  }
  // Comments and script/style payloads are not content.
  const cleaned = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "");
  return renderBlocks(parseHtml(cleaned))
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
