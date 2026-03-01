/**
 * HTML Sanitization Unit Tests
 *
 * Tests for HTML processing and XSS detection:
 * - Script tags detected and stripped
 * - Event handlers detected
 * - JavaScript URLs detected
 * - Iframes detected
 * - Normal HTML preserved
 * - Nested malicious content handled
 */

import { describe, expect, it } from "vitest";
import {
  containsDangerousHtml,
  stripHtmlTags,
  escapeHtml,
} from "../../../src/lib/utils/sanitizers/html.js";
import { HtmlProcessor } from "../../../src/lib/processors/markup/HtmlProcessor.js";

// ---------------------------------------------------------------------------
// containsDangerousHtml
// ---------------------------------------------------------------------------

describe("containsDangerousHtml", () => {
  describe("script tags", () => {
    it("should detect <script>alert(1)</script>", () => {
      expect(containsDangerousHtml("<script>alert(1)</script>")).toBe(true);
    });

    it("should detect script tags with attributes", () => {
      expect(containsDangerousHtml('<script src="evil.js"></script>')).toBe(
        true,
      );
    });

    it("should detect script tags case-insensitively", () => {
      expect(containsDangerousHtml("<SCRIPT>alert(1)</SCRIPT>")).toBe(true);
      expect(containsDangerousHtml("<Script>alert(1)</Script>")).toBe(true);
    });
  });

  describe("event handlers", () => {
    it('should detect onclick="evil()"', () => {
      expect(containsDangerousHtml('<div onclick="evil()">click</div>')).toBe(
        true,
      );
    });

    it('should detect onload="..."', () => {
      expect(
        containsDangerousHtml('<body onload="steal()">content</body>'),
      ).toBe(true);
    });

    it('should detect onerror="..."', () => {
      expect(containsDangerousHtml('<img onerror="alert(1)" src="x">')).toBe(
        true,
      );
    });

    it('should detect onmouseover="..."', () => {
      expect(
        containsDangerousHtml('<div onmouseover="alert(1)">hover</div>'),
      ).toBe(true);
    });
  });

  describe("javascript URLs", () => {
    it("should detect javascript: in href", () => {
      expect(
        containsDangerousHtml('<a href="javascript:alert(1)">click</a>'),
      ).toBe(true);
    });

    it("should detect javascript: case-insensitively", () => {
      expect(
        containsDangerousHtml('<a href="JavaScript:alert(1)">click</a>'),
      ).toBe(true);
    });
  });

  describe("iframes and embeds", () => {
    it("should detect iframe tags", () => {
      expect(containsDangerousHtml('<iframe src="evil.com"></iframe>')).toBe(
        true,
      );
    });

    it("should detect object tags", () => {
      expect(containsDangerousHtml('<object data="evil.swf"></object>')).toBe(
        true,
      );
    });

    it("should detect embed tags", () => {
      expect(containsDangerousHtml('<embed src="evil.swf">')).toBe(true);
    });
  });

  describe("CSS expressions", () => {
    it("should detect expression()", () => {
      expect(
        containsDangerousHtml(
          '<div style="width: expression(alert(1))">x</div>',
        ),
      ).toBe(true);
    });

    it("should detect -moz-binding", () => {
      expect(
        containsDangerousHtml('<div style="-moz-binding: url(evil)">x</div>'),
      ).toBe(true);
    });
  });

  describe("data URLs", () => {
    it("should detect data:text/html", () => {
      expect(
        containsDangerousHtml(
          '<a href="data:text/html,<script>alert(1)</script>">click</a>',
        ),
      ).toBe(true);
    });
  });

  describe("safe content", () => {
    it("should not flag normal HTML", () => {
      expect(containsDangerousHtml("<p>Hello <b>World</b></p>")).toBe(false);
    });

    it("should not flag empty string", () => {
      expect(containsDangerousHtml("")).toBe(false);
    });

    it("should not flag plain text", () => {
      expect(containsDangerousHtml("Just some text")).toBe(false);
    });

    it("should not flag safe HTML with links and images", () => {
      expect(
        containsDangerousHtml(
          '<p>Visit <a href="https://example.com">here</a> and see <img src="photo.jpg"></p>',
        ),
      ).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// stripHtmlTags
// ---------------------------------------------------------------------------

describe("stripHtmlTags", () => {
  it("should strip all HTML tags leaving only text", () => {
    expect(stripHtmlTags("<p>Hello <b>World</b></p>")).toBe("Hello World");
  });

  it("should handle script tags by removing them and their content markers", () => {
    const result = stripHtmlTags(
      "<div>before<script>alert(1)</script>after</div>",
    );
    expect(result).toBe("beforealert(1)after");
  });

  it("should handle nested tags", () => {
    expect(stripHtmlTags("<div><span><em>deep</em></span></div>")).toBe("deep");
  });

  it("should normalize whitespace", () => {
    expect(stripHtmlTags("<p>  hello   world  </p>")).toBe("hello world");
  });

  it("should return empty string for empty input", () => {
    expect(stripHtmlTags("")).toBe("");
  });

  it("should handle self-closing tags", () => {
    expect(stripHtmlTags("hello<br/>world")).toBe("helloworld");
  });

  it("should handle nested tag fragments that reform after stripping", () => {
    // e.g. "<scr<script>ipt>" should not survive as "<script>"
    const result = stripHtmlTags("<scr<script>ipt>alert(1)</scr</script>ipt>");
    expect(result).not.toContain("<script>");
    expect(result).not.toContain("<");
  });
});

// ---------------------------------------------------------------------------
// escapeHtml
// ---------------------------------------------------------------------------

describe("escapeHtml", () => {
  it("should escape < > & characters", () => {
    expect(escapeHtml("<script>")).toBe("&lt;script&gt;");
  });

  it("should escape quotes", () => {
    expect(escapeHtml('"hello"')).toContain("&quot;");
    expect(escapeHtml("'hello'")).toContain("&#x27;");
  });

  it("should escape forward slashes", () => {
    expect(escapeHtml("/path")).toContain("&#x2F;");
  });

  it("should return empty string for empty input", () => {
    expect(escapeHtml("")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// HtmlProcessor integration
// ---------------------------------------------------------------------------

describe("HtmlProcessor", () => {
  const processor = new HtmlProcessor();

  describe("isFileSupported", () => {
    it("should support text/html MIME type", () => {
      expect(processor.isFileSupported("text/html", "page.html")).toBe(true);
    });

    it("should support application/xhtml+xml MIME type", () => {
      expect(
        processor.isFileSupported("application/xhtml+xml", "page.xhtml"),
      ).toBe(true);
    });

    it("should support .html extension", () => {
      expect(processor.isFileSupported("", "index.html")).toBe(true);
    });

    it("should support .htm extension", () => {
      expect(processor.isFileSupported("", "index.htm")).toBe(true);
    });

    it("should reject unsupported types", () => {
      expect(processor.isFileSupported("application/pdf", "doc.pdf")).toBe(
        false,
      );
    });
  });

  describe("processFile with buffer", () => {
    it("should extract text content from simple HTML", async () => {
      const html = "<html><body><p>Hello <b>World</b></p></body></html>";
      const result = await processor.processFile({
        id: "test-1",
        name: "page.html",
        mimetype: "text/html",
        size: Buffer.byteLength(html),
        buffer: Buffer.from(html),
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.textContent).toContain("Hello");
      expect(result.data!.textContent).toContain("World");
    });

    it("should detect script tags", async () => {
      const html = "<html><body><script>alert(1)</script></body></html>";
      const result = await processor.processFile({
        id: "test-2",
        name: "evil.html",
        mimetype: "text/html",
        size: Buffer.byteLength(html),
        buffer: Buffer.from(html),
      });

      expect(result.success).toBe(true);
      expect(result.data!.hasScripts).toBe(true);
      expect(result.data!.hasDangerousContent).toBe(true);
    });

    it("should detect style tags", async () => {
      const html =
        "<html><head><style>body { color: red; }</style></head><body></body></html>";
      const result = await processor.processFile({
        id: "test-3",
        name: "styled.html",
        mimetype: "text/html",
        size: Buffer.byteLength(html),
        buffer: Buffer.from(html),
      });

      expect(result.success).toBe(true);
      expect(result.data!.hasStyles).toBe(true);
    });

    it("should extract page title", async () => {
      const html =
        "<html><head><title>My Page</title></head><body>Content</body></html>";
      const result = await processor.processFile({
        id: "test-4",
        name: "titled.html",
        mimetype: "text/html",
        size: Buffer.byteLength(html),
        buffer: Buffer.from(html),
      });

      expect(result.success).toBe(true);
      expect(result.data!.title).toBe("My Page");
    });

    it("should preserve original HTML content", async () => {
      const html = "<p>Hello <b>World</b></p>";
      const result = await processor.processFile({
        id: "test-5",
        name: "simple.html",
        mimetype: "text/html",
        size: Buffer.byteLength(html),
        buffer: Buffer.from(html),
      });

      expect(result.success).toBe(true);
      expect(result.data!.content).toBe(html);
    });

    it("should detect event handlers as dangerous", async () => {
      const html =
        '<html><body><div onclick="alert(1)">click</div></body></html>';
      const result = await processor.processFile({
        id: "test-6",
        name: "onclick.html",
        mimetype: "text/html",
        size: Buffer.byteLength(html),
        buffer: Buffer.from(html),
      });

      expect(result.success).toBe(true);
      expect(result.data!.hasDangerousContent).toBe(true);
    });

    it("should detect javascript: URLs as dangerous", async () => {
      const html =
        '<html><body><a href="javascript:alert(1)">link</a></body></html>';
      const result = await processor.processFile({
        id: "test-7",
        name: "jsurl.html",
        mimetype: "text/html",
        size: Buffer.byteLength(html),
        buffer: Buffer.from(html),
      });

      expect(result.success).toBe(true);
      expect(result.data!.hasDangerousContent).toBe(true);
    });

    it("should detect iframes as dangerous", async () => {
      const html = '<html><body><iframe src="evil.com"></iframe></body></html>';
      const result = await processor.processFile({
        id: "test-8",
        name: "iframe.html",
        mimetype: "text/html",
        size: Buffer.byteLength(html),
        buffer: Buffer.from(html),
      });

      expect(result.success).toBe(true);
      expect(result.data!.hasDangerousContent).toBe(true);
    });

    it("should report safe HTML as not dangerous", async () => {
      const html = "<html><body><p>Hello <b>World</b></p></body></html>";
      const result = await processor.processFile({
        id: "test-9",
        name: "safe.html",
        mimetype: "text/html",
        size: Buffer.byteLength(html),
        buffer: Buffer.from(html),
      });

      expect(result.success).toBe(true);
      expect(result.data!.hasDangerousContent).toBe(false);
      expect(result.data!.hasScripts).toBe(false);
    });

    it("should handle nested malicious content", async () => {
      const html =
        '<html><body><div onclick="alert(1)"><p><a href="javascript:void(0)"><script>x</script></a></p></div></body></html>';
      const result = await processor.processFile({
        id: "test-10",
        name: "nested.html",
        mimetype: "text/html",
        size: Buffer.byteLength(html),
        buffer: Buffer.from(html),
      });

      expect(result.success).toBe(true);
      expect(result.data!.hasDangerousContent).toBe(true);
      expect(result.data!.hasScripts).toBe(true);
    });

    it("should fail on empty content", async () => {
      const result = await processor.processFile({
        id: "test-11",
        name: "empty.html",
        mimetype: "text/html",
        size: 0,
        buffer: Buffer.from(""),
      });

      expect(result.success).toBe(false);
    });
  });
});
