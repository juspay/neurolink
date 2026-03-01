/**
 * SVG Sanitization Unit Tests
 *
 * Tests for SVG processing and security sanitization:
 * - Script elements removed
 * - Event handlers stripped from elements (elements preserved)
 * - Valid SVG paths preserved
 * - xmlns attributes preserved
 * - foreignObject removed
 * - SMIL animations removed
 * - XXE prevention
 * - javascript: URL detection
 */

import { describe, expect, it } from "vitest";
import {
  sanitizeSvgContent,
  sanitizeSvgContentDetailed,
  isSvgContentSafe,
  getSvgSanitizationRules,
} from "../../../src/lib/utils/sanitizers/svg.js";
import { SvgProcessor } from "../../../src/lib/processors/markup/SvgProcessor.js";

// ---------------------------------------------------------------------------
// isSvgContentSafe
// ---------------------------------------------------------------------------

describe("isSvgContentSafe", () => {
  it("should return true for clean SVG", () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>';
    expect(isSvgContentSafe(svg)).toBe(true);
  });

  it("should return false for SVG with script element", () => {
    const svg = "<svg><script>alert(1)</script></svg>";
    expect(isSvgContentSafe(svg)).toBe(false);
  });

  it("should return false for SVG with event handler", () => {
    const svg = '<svg onload="alert(1)"><rect/></svg>';
    expect(isSvgContentSafe(svg)).toBe(false);
  });

  it("should return false for SVG with javascript: URL", () => {
    const svg = '<svg><a href="javascript:alert(1)"><rect/></a></svg>';
    expect(isSvgContentSafe(svg)).toBe(false);
  });

  it("should return false for SVG with DOCTYPE (XXE)", () => {
    const svg = "<!DOCTYPE svg><svg><rect/></svg>";
    expect(isSvgContentSafe(svg)).toBe(false);
  });

  it("should return false for SVG with foreignObject", () => {
    const svg = "<svg><foreignObject><body>evil</body></foreignObject></svg>";
    expect(isSvgContentSafe(svg)).toBe(false);
  });

  it("should return false for SVG with style element", () => {
    const svg = "<svg><style>.x { color: red }</style></svg>";
    expect(isSvgContentSafe(svg)).toBe(false);
  });

  it("should return false for SVG with use element", () => {
    const svg = '<svg><use href="external.svg#id"/></svg>';
    expect(isSvgContentSafe(svg)).toBe(false);
  });

  it("should return false for SVG with animate element", () => {
    const svg = '<svg><animate attributeName="x" to="100"/></svg>';
    expect(isSvgContentSafe(svg)).toBe(false);
  });

  it("should return false for empty/null input", () => {
    expect(isSvgContentSafe("")).toBe(false);
    expect(isSvgContentSafe(null as unknown as string)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// sanitizeSvgContent
// ---------------------------------------------------------------------------

describe("sanitizeSvgContent", () => {
  describe("script elements removed", () => {
    it("should remove inline script tags", () => {
      const svg =
        '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><rect width="10" height="10"/></svg>';
      const result = sanitizeSvgContent(svg);
      expect(result).not.toContain("<script>");
      expect(result).not.toContain("alert(1)");
      expect(result).toContain("rect");
    });

    it("should remove script tags with src attribute", () => {
      const svg =
        '<svg xmlns="http://www.w3.org/2000/svg"><script src="evil.js"/><rect width="10" height="10"/></svg>';
      const result = sanitizeSvgContent(svg);
      expect(result).not.toContain("<script");
      expect(result).not.toContain("evil.js");
    });

    it("should remove script tags case-insensitively", () => {
      const svg =
        '<svg xmlns="http://www.w3.org/2000/svg"><SCRIPT>alert(1)</SCRIPT><rect width="10" height="10"/></svg>';
      const result = sanitizeSvgContent(svg);
      expect(result.toLowerCase()).not.toContain("<script>");
    });
  });

  describe("event handler removal", () => {
    it("should remove onload handler from svg element", () => {
      const svg =
        '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><rect width="10" height="10"/></svg>';
      const result = sanitizeSvgContent(svg);
      expect(result).not.toContain("onload");
      expect(result).not.toContain("alert(1)");
      expect(result).toContain("rect");
    });

    it("should remove onerror handler", () => {
      const svg =
        '<svg xmlns="http://www.w3.org/2000/svg"><rect onerror="evil()" width="10" height="10"/></svg>';
      const result = sanitizeSvgContent(svg);
      expect(result).not.toContain("onerror");
      expect(result).not.toContain("evil()");
      expect(result).toContain("rect");
    });

    it("should remove onclick handler", () => {
      const svg =
        '<svg xmlns="http://www.w3.org/2000/svg"><rect onclick="doStuff()" width="10" height="10"/></svg>';
      const result = sanitizeSvgContent(svg);
      expect(result).not.toContain("onclick");
      expect(result).not.toContain("doStuff()");
      expect(result).toContain("rect");
    });

    it("should remove onmouseover handler", () => {
      const svg =
        '<svg xmlns="http://www.w3.org/2000/svg"><rect onmouseover="track()" width="10" height="10"/></svg>';
      const result = sanitizeSvgContent(svg);
      expect(result).not.toContain("onmouseover");
      expect(result).not.toContain("track()");
      expect(result).toContain("rect");
    });

    it("should handle SVG with event handlers on nested elements", () => {
      const svg =
        '<svg xmlns="http://www.w3.org/2000/svg"><g><rect onclick="x()" width="10" height="10"/></g></svg>';
      const result = sanitizeSvgContent(svg);
      expect(result).not.toContain("onclick");
      expect(result).toContain("rect");
      expect(result).toContain("<g");
    });

    it("should detect onload as unsafe via isSvgContentSafe", () => {
      expect(isSvgContentSafe('<svg onload="alert(1)"><rect/></svg>')).toBe(
        false,
      );
    });

    it("should detect onfocus as unsafe via isSvgContentSafe", () => {
      expect(isSvgContentSafe('<svg><rect onfocus="steal()"/></svg>')).toBe(
        false,
      );
    });
  });

  describe("valid SVG paths preserved", () => {
    it("should preserve basic SVG with path element", () => {
      const svg =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M10 10 L90 90" fill="none" stroke="black" stroke-width="2"/></svg>';
      const result = sanitizeSvgContent(svg);
      expect(result).toContain("path");
      expect(result).toContain("M10 10 L90 90");
      expect(result).toContain("stroke");
    });

    it("should preserve rect, circle, and ellipse elements", () => {
      const svg =
        '<svg xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="80" height="80"/><circle cx="50" cy="50" r="25"/><ellipse cx="50" cy="50" rx="30" ry="20"/></svg>';
      const result = sanitizeSvgContent(svg);
      expect(result).toContain("rect");
      expect(result).toContain("circle");
      expect(result).toContain("ellipse");
    });

    it("should preserve text elements", () => {
      const svg =
        '<svg xmlns="http://www.w3.org/2000/svg"><text x="10" y="20" font-size="14">Hello SVG</text></svg>';
      const result = sanitizeSvgContent(svg);
      expect(result).toContain("text");
      expect(result).toContain("Hello SVG");
    });

    it("should preserve gradient definitions", () => {
      const svg =
        '<svg xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="grad1"><stop offset="0%" stop-color="red"/><stop offset="100%" stop-color="blue"/></linearGradient></defs></svg>';
      const result = sanitizeSvgContent(svg);
      expect(result).toContain("linearGradient");
      expect(result).toContain("stop");
    });

    it("should preserve polyline and polygon elements", () => {
      const svg =
        '<svg xmlns="http://www.w3.org/2000/svg"><polyline points="0,0 10,10 20,0"/><polygon points="0,0 10,10 20,0"/></svg>';
      const result = sanitizeSvgContent(svg);
      expect(result).toContain("polyline");
      expect(result).toContain("polygon");
    });

    it("should preserve g (group) elements", () => {
      const svg =
        '<svg xmlns="http://www.w3.org/2000/svg"><g transform="translate(10,10)"><rect width="10" height="10"/></g></svg>';
      const result = sanitizeSvgContent(svg);
      expect(result).toContain("<g");
      expect(result).toContain("transform");
    });
  });

  describe("xmlns attributes preserved", () => {
    it("should preserve xmlns on svg element", () => {
      const svg =
        '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>';
      const result = sanitizeSvgContent(svg);
      expect(result).toContain('xmlns="http://www.w3.org/2000/svg"');
    });

    it("should preserve viewBox attribute", () => {
      const svg =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="10" height="10"/></svg>';
      const result = sanitizeSvgContent(svg);
      expect(result).toContain('viewBox="0 0 100 100"');
    });

    it("should preserve fill and stroke attributes", () => {
      const svg =
        '<svg xmlns="http://www.w3.org/2000/svg"><rect fill="red" stroke="blue" stroke-width="2" width="10" height="10"/></svg>';
      const result = sanitizeSvgContent(svg);
      expect(result).toContain("fill");
      expect(result).toContain("stroke");
    });
  });

  describe("dangerous elements removed", () => {
    it("should remove foreignObject elements", () => {
      const svg =
        '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><body>evil</body></foreignObject><rect width="10" height="10"/></svg>';
      const result = sanitizeSvgContent(svg);
      expect(result).not.toContain("foreignObject");
      expect(result).not.toContain("evil");
    });

    it("should remove use elements (external reference risk)", () => {
      const svg =
        '<svg xmlns="http://www.w3.org/2000/svg"><use href="evil.svg#payload"/><rect width="10" height="10"/></svg>';
      const result = sanitizeSvgContent(svg);
      expect(result).not.toContain("<use");
    });

    it("should remove image elements", () => {
      const svg =
        '<svg xmlns="http://www.w3.org/2000/svg"><image href="evil.png"/><rect width="10" height="10"/></svg>';
      const result = sanitizeSvgContent(svg);
      expect(result).not.toContain("<image");
    });

    it("should remove SMIL animate elements", () => {
      const svg =
        '<svg xmlns="http://www.w3.org/2000/svg"><animate attributeName="x" to="100"/><rect width="10" height="10"/></svg>';
      const result = sanitizeSvgContent(svg);
      expect(result).not.toContain("<animate");
    });

    it("should remove style elements", () => {
      const svg =
        '<svg xmlns="http://www.w3.org/2000/svg"><style>rect { fill: red; }</style><rect width="10" height="10"/></svg>';
      const result = sanitizeSvgContent(svg);
      expect(result).not.toContain("<style");
    });

    it("should remove a (anchor) elements", () => {
      const svg =
        '<svg xmlns="http://www.w3.org/2000/svg"><a href="javascript:alert(1)"><rect width="10" height="10"/></a></svg>';
      const result = sanitizeSvgContent(svg);
      expect(result).not.toContain("<a ");
    });

    it("should remove iframe/object/embed elements", () => {
      const svg =
        '<svg xmlns="http://www.w3.org/2000/svg"><iframe src="evil.com"/><object data="evil.swf"/><embed src="evil"/><rect width="10" height="10"/></svg>';
      const result = sanitizeSvgContent(svg);
      expect(result).not.toContain("<iframe");
      expect(result).not.toContain("<object");
      expect(result).not.toContain("<embed");
    });

    it("should remove set (SMIL) elements", () => {
      const svg =
        '<svg xmlns="http://www.w3.org/2000/svg"><set attributeName="href" to="javascript:alert(1)"/><rect width="10" height="10"/></svg>';
      const result = sanitizeSvgContent(svg);
      expect(result).not.toContain("<set");
    });
  });

  describe("XXE prevention", () => {
    it("should throw on DOCTYPE declarations", () => {
      const svg = '<!DOCTYPE svg SYSTEM "evil.dtd"><svg><rect/></svg>';
      expect(() => sanitizeSvgContent(svg)).toThrow(/DOCTYPE/);
    });

    it("should throw on ENTITY declarations", () => {
      const svg = '<!ENTITY xxe SYSTEM "file:///etc/passwd"><svg><rect/></svg>';
      expect(() => sanitizeSvgContent(svg)).toThrow(/DOCTYPE|ENTITY/);
    });
  });

  describe("CDATA removal", () => {
    it("should remove CDATA sections", () => {
      const svg =
        '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/><![CDATA[<script>alert(1)</script>]]></svg>';
      const result = sanitizeSvgContent(svg);
      expect(result).not.toContain("CDATA");
    });
  });

  describe("detailed sanitization result for element removal", () => {
    it("should report removed script elements in detailed result", () => {
      const svg =
        '<svg xmlns="http://www.w3.org/2000/svg"><script>evil()</script><rect width="10" height="10"/></svg>';
      const result = sanitizeSvgContentDetailed(svg);
      expect(result.wasModified).toBe(true);
      expect(result.removedItems.length).toBeGreaterThan(0);
    });

    it("should report no removed items for clean SVG", () => {
      const svg =
        '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>';
      const result = sanitizeSvgContentDetailed(svg);
      expect(result.removedItems).toHaveLength(0);
    });

    it("should report removed foreignObject in detailed result", () => {
      const svg =
        '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><body>x</body></foreignObject></svg>';
      const result = sanitizeSvgContentDetailed(svg);
      expect(result.wasModified).toBe(true);
      expect(
        result.removedItems.some((item) => item.includes("foreignObject")),
      ).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// getSvgSanitizationRules
// ---------------------------------------------------------------------------

describe("getSvgSanitizationRules", () => {
  it("should return safe and dangerous element/attribute lists", () => {
    const rules = getSvgSanitizationRules();
    expect(rules.safeElements).toContain("svg");
    expect(rules.safeElements).toContain("rect");
    expect(rules.safeElements).toContain("path");
    expect(rules.safeElements).toContain("circle");
    expect(rules.safeElements).toContain("text");
    expect(rules.safeElements).toContain("g");
    expect(rules.safeElements).toContain("defs");
    expect(rules.dangerousElements).toContain("script");
    expect(rules.dangerousElements).toContain("foreignObject");
    expect(rules.dangerousElements).toContain("style");
    expect(rules.dangerousElements).toContain("use");
    expect(rules.dangerousElements).toContain("animate");
    expect(rules.safeAttributes).toContain("xmlns");
    expect(rules.safeAttributes).toContain("viewBox");
    expect(rules.safeAttributes).toContain("fill");
    expect(rules.safeAttributes).toContain("stroke");
    expect(rules.dangerousAttributes).toContain("onload");
    expect(rules.dangerousAttributes).toContain("onclick");
    expect(rules.dangerousAttributes).toContain("style");
  });
});

// ---------------------------------------------------------------------------
// SvgProcessor integration
// ---------------------------------------------------------------------------

describe("SvgProcessor", () => {
  const processor = new SvgProcessor();

  describe("isFileSupported", () => {
    it("should support image/svg+xml MIME type", () => {
      expect(processor.isFileSupported("image/svg+xml", "icon.svg")).toBe(true);
    });

    it("should support .svg extension", () => {
      expect(processor.isFileSupported("", "diagram.svg")).toBe(true);
    });

    it("should reject non-SVG types", () => {
      expect(processor.isFileSupported("image/png", "image.png")).toBe(false);
    });
  });

  describe("processFile with buffer", () => {
    it("should process clean SVG and preserve key content", async () => {
      const svg =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="80" fill="blue"/></svg>';
      const result = await processor.processFile({
        id: "svg-1",
        name: "clean.svg",
        mimetype: "image/svg+xml",
        size: Buffer.byteLength(svg),
        buffer: Buffer.from(svg),
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.textContent).toContain("rect");
      expect(result.data!.textContent).toContain(
        'xmlns="http://www.w3.org/2000/svg"',
      );
      expect(result.data!.securityWarnings).toHaveLength(0);
    });

    it("should sanitize SVG with script tags and report warnings", async () => {
      const svg =
        '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><rect width="10" height="10"/></svg>';
      const result = await processor.processFile({
        id: "svg-2",
        name: "evil.svg",
        mimetype: "image/svg+xml",
        size: Buffer.byteLength(svg),
        buffer: Buffer.from(svg),
      });

      expect(result.success).toBe(true);
      expect(result.data!.sanitized).toBe(true);
      expect(result.data!.textContent).not.toContain("<script>");
      expect(result.data!.securityWarnings.length).toBeGreaterThan(0);
    });

    it("should produce safe output for SVG with event handlers", async () => {
      const svg =
        '<svg xmlns="http://www.w3.org/2000/svg" onload="bad()"><rect width="10" height="10"/></svg>';
      const result = await processor.processFile({
        id: "svg-3",
        name: "onload.svg",
        mimetype: "image/svg+xml",
        size: Buffer.byteLength(svg),
        buffer: Buffer.from(svg),
      });

      expect(result.success).toBe(true);
      expect(result.data!.sanitized).toBe(true);
      // Event handler is stripped but elements are preserved
      expect(result.data!.textContent).not.toContain("onload");
      expect(result.data!.textContent).toContain("rect");
      expect(result.data!.securityWarnings.length).toBeGreaterThan(0);
    });

    it("should fail on content without <svg> element", async () => {
      const notSvg = "<html><body>Not an SVG</body></html>";
      const result = await processor.processFile({
        id: "svg-4",
        name: "notsvg.svg",
        mimetype: "image/svg+xml",
        size: Buffer.byteLength(notSvg),
        buffer: Buffer.from(notSvg),
      });

      expect(result.success).toBe(false);
    });

    it("should preserve raw content when sanitization modifies the SVG", async () => {
      const svg =
        '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><rect width="10" height="10"/></svg>';
      const result = await processor.processFile({
        id: "svg-5",
        name: "modified.svg",
        mimetype: "image/svg+xml",
        size: Buffer.byteLength(svg),
        buffer: Buffer.from(svg),
      });

      expect(result.success).toBe(true);
      expect(result.data!.sanitized).toBe(true);
      expect(result.data!.rawContent).toBeDefined();
      expect(result.data!.rawContent).toContain("<script>");
    });

    it("should remove foreignObject via SvgProcessor", async () => {
      const svg =
        '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><body>evil</body></foreignObject><rect width="10" height="10"/></svg>';
      const result = await processor.processFile({
        id: "svg-6",
        name: "foreign.svg",
        mimetype: "image/svg+xml",
        size: Buffer.byteLength(svg),
        buffer: Buffer.from(svg),
      });

      expect(result.success).toBe(true);
      expect(result.data!.textContent).not.toContain("foreignObject");
      expect(result.data!.sanitized).toBe(true);
    });
  });
});
