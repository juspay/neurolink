import { describe, it, expect } from "vitest";
import { SVGSanitizer } from "../../../src/lib/utils/svgSanitizer.js";

describe("SVGSanitizer", () => {
  describe("sanitize", () => {
    it("should remove script tags from SVG", () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg">
        <script>alert('XSS')</script>
        <circle cx="50" cy="50" r="40"/>
      </svg>`;

      const result = SVGSanitizer.sanitize(svg);

      expect(result.sanitized).toBe(true);
      expect(result.content).not.toContain("<script");
      expect(result.content).not.toContain("</script>");
      expect(result.content).toContain("<circle");
      expect(result.removedElements.length).toBeGreaterThan(0);
    });

    it("should remove multiple script tags", () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg">
        <script>alert('first')</script>
        <rect x="10" y="10" width="100" height="100"/>
        <script type="text/javascript">alert('second')</script>
      </svg>`;

      const result = SVGSanitizer.sanitize(svg);

      expect(result.sanitized).toBe(true);
      expect(result.content).not.toContain("<script");
      expect(result.content).toContain("<rect");
    });

    it("should remove event handler attributes", () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="40" onclick="alert('click')"/>
        <rect x="10" y="10" width="100" height="100" onload="alert('load')"/>
      </svg>`;

      const result = SVGSanitizer.sanitize(svg);

      expect(result.sanitized).toBe(true);
      expect(result.content).not.toContain("onclick");
      expect(result.content).not.toContain("onload");
      expect(result.content).toContain("<circle");
      expect(result.content).toContain("<rect");
    });

    it("should remove various event handlers", () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" onmouseover="alert('xss')">
        <circle cx="50" cy="50" r="40" onmouseout="evil()"/>
        <rect onfocus="hack()" x="10" y="10" width="100" height="100"/>
        <path onmousedown="bad()" d="M10 10"/>
      </svg>`;

      const result = SVGSanitizer.sanitize(svg);

      expect(result.sanitized).toBe(true);
      expect(result.content).not.toContain("onmouseover");
      expect(result.content).not.toContain("onmouseout");
      expect(result.content).not.toContain("onfocus");
      expect(result.content).not.toContain("onmousedown");
    });

    it("should remove javascript: URLs from href", () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg">
        <a href="javascript:alert('XSS')">
          <text x="10" y="20">Click me</text>
        </a>
      </svg>`;

      const result = SVGSanitizer.sanitize(svg);

      expect(result.sanitized).toBe(true);
      expect(result.content).not.toContain("javascript:");
      expect(result.content).toContain("<text");
    });

    it("should remove javascript: URLs from xlink:href", () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <a xlink:href="javascript:alert('XSS')">
          <text x="10" y="20">Click me</text>
        </a>
      </svg>`;

      const result = SVGSanitizer.sanitize(svg);

      expect(result.sanitized).toBe(true);
      expect(result.content).not.toContain("javascript:");
    });

    it("should handle clean SVG without modification", () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="40" fill="red"/>
        <rect x="10" y="10" width="100" height="100" fill="blue"/>
      </svg>`;

      const result = SVGSanitizer.sanitize(svg);

      expect(result.sanitized).toBe(true);
      expect(result.content).toContain("<circle");
      expect(result.content).toContain("<rect");
      expect(result.removedElements.length).toBe(0);
    });

    it("should throw error when SVG is not allowed", () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg"><circle/></svg>`;

      expect(() => {
        SVGSanitizer.sanitize(svg, { allowSvg: false });
      }).toThrow("SVG files are not allowed");
    });

    it("should skip sanitization when disabled", () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg">
        <script>alert('XSS')</script>
      </svg>`;

      const result = SVGSanitizer.sanitize(svg, { sanitize: false });

      expect(result.sanitized).toBe(false);
      expect(result.content).toContain("<script");
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("should handle Buffer input", () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg">
        <script>alert('XSS')</script>
        <circle cx="50" cy="50" r="40"/>
      </svg>`;
      const buffer = Buffer.from(svg);

      const result = SVGSanitizer.sanitize(buffer);

      expect(result.sanitized).toBe(true);
      expect(result.content).not.toContain("<script");
    });

    it("should respect individual sanitization options", () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg">
        <script>alert('XSS')</script>
        <circle onclick="alert('click')" href="javascript:void(0)"/>
      </svg>`;

      // Only remove scripts
      const result1 = SVGSanitizer.sanitize(svg, {
        removeScripts: true,
        removeEventHandlers: false,
        removeJavaScriptUrls: false,
      });
      expect(result1.content).not.toContain("<script");
      expect(result1.content).toContain("onclick");

      // Only remove event handlers
      const result2 = SVGSanitizer.sanitize(svg, {
        removeScripts: false,
        removeEventHandlers: true,
        removeJavaScriptUrls: false,
      });
      expect(result2.content).toContain("<script");
      expect(result2.content).not.toContain("onclick");
    });

    it("should handle malformed script tags", () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg">
        <script src="evil.js"/>
        <script>
        <circle cx="50" cy="50" r="40"/>
      </svg>`;

      const result = SVGSanitizer.sanitize(svg);

      expect(result.sanitized).toBe(true);
      expect(result.content).not.toContain("<script");
    });

    it("should remove data: URLs with HTML content", () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg">
        <a href="data:text/html,<script>alert('XSS')</script>">
          <text x="10" y="20">Click me</text>
        </a>
      </svg>`;

      const result = SVGSanitizer.sanitize(svg);

      expect(result.sanitized).toBe(true);
      expect(result.content).not.toContain("data:text/html");
    });
  });

  describe("isSVG", () => {
    it("should detect SVG starting with <svg", () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg"><circle/></svg>`;
      expect(SVGSanitizer.isSVG(svg)).toBe(true);
    });

    it("should detect SVG starting with <?xml", () => {
      const svg = `<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"><circle/></svg>`;
      expect(SVGSanitizer.isSVG(svg)).toBe(true);
    });

    it("should detect SVG with whitespace at start", () => {
      const svg = `   <svg xmlns="http://www.w3.org/2000/svg"><circle/></svg>`;
      expect(SVGSanitizer.isSVG(svg)).toBe(true);
    });

    it("should handle Buffer input", () => {
      const svg = Buffer.from(`<svg><circle/></svg>`);
      expect(SVGSanitizer.isSVG(svg)).toBe(true);
    });

    it("should return false for non-SVG content", () => {
      expect(SVGSanitizer.isSVG("<html><body></body></html>")).toBe(false);
      expect(SVGSanitizer.isSVG("not svg at all")).toBe(false);
    });
  });

  describe("validate", () => {
    it("should find script tags", () => {
      const svg = `<svg><script>alert('XSS')</script></svg>`;
      const issues = SVGSanitizer.validate(svg);

      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some((i) => i.includes("script"))).toBe(true);
    });

    it("should find event handlers", () => {
      const svg = `<svg onclick="alert('XSS')"><circle/></svg>`;
      const issues = SVGSanitizer.validate(svg);

      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some((i) => i.includes("event handler"))).toBe(true);
    });

    it("should find javascript: URLs", () => {
      const svg = `<svg><a href="javascript:alert('XSS')"><text/></a></svg>`;
      const issues = SVGSanitizer.validate(svg);

      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some((i) => i.includes("javascript:"))).toBe(true);
    });

    it("should return empty array for clean SVG", () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40"/></svg>`;
      const issues = SVGSanitizer.validate(svg);

      expect(issues).toHaveLength(0);
    });

    it("should find multiple issues", () => {
      const svg = `<svg onclick="bad()"><script>evil()</script><a href="javascript:xss()"><text/></a></svg>`;
      const issues = SVGSanitizer.validate(svg);

      expect(issues.length).toBe(3);
    });
  });
});
