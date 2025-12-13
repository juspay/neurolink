import { describe, it, expect } from "vitest";
import { PDFProcessor } from "../../../src/lib/utils/pdfProcessor.js";
import * as fs from "fs";
import * as path from "path";

describe("PDFProcessor - Password Protection", () => {
  const fixturesDir = path.join(process.cwd(), "test", "fixtures");

  describe("Password-protected PDF handling", () => {
    it("should throw clear error when password is required but not provided", async () => {
      const pdfPath = path.join(fixturesDir, "encrypted-test.pdf");
      const pdfBuffer = fs.readFileSync(pdfPath);

      await expect(PDFProcessor.convertPDFToImages(pdfBuffer)).rejects.toThrow(
        "PDF is password-protected. Please provide a password using the password option.",
      );
    });

    it("should throw clear error when incorrect password is provided", async () => {
      const pdfPath = path.join(fixturesDir, "encrypted-test.pdf");
      const pdfBuffer = fs.readFileSync(pdfPath);

      await expect(
        PDFProcessor.convertPDFToImages(pdfBuffer, {
          password: "wrongpassword",
        }),
      ).rejects.toThrow(
        "Incorrect password provided for password-protected PDF. Please verify the password and try again.",
      );
    });

    it("should successfully process PDF with correct password (AES-256)", async () => {
      const pdfPath = path.join(fixturesDir, "encrypted-test.pdf");
      const pdfBuffer = fs.readFileSync(pdfPath);

      const result = await PDFProcessor.convertPDFToImages(pdfBuffer, {
        password: "test123",
        maxPages: 1,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty("buffer");
      expect(result[0]).toHaveProperty("pageNumber");
      expect(result[0].pageNumber).toBe(1);
    });

    it("should successfully process PDF with correct password (different password)", async () => {
      const pdfPath = path.join(fixturesDir, "encrypted-secure.pdf");
      const pdfBuffer = fs.readFileSync(pdfPath);

      const result = await PDFProcessor.convertPDFToImages(pdfBuffer, {
        password: "SecurePass456",
        maxPages: 2,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it("should support RC4 encryption (weak crypto)", async () => {
      const pdfPath = path.join(fixturesDir, "encrypted-rc4.pdf");
      const pdfBuffer = fs.readFileSync(pdfPath);

      const result = await PDFProcessor.convertPDFToImages(pdfBuffer, {
        password: "rc4pass",
        maxPages: 1,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it("should support AES-128 encryption", async () => {
      const pdfPath = path.join(fixturesDir, "encrypted-aes128.pdf");
      const pdfBuffer = fs.readFileSync(pdfPath);

      const result = await PDFProcessor.convertPDFToImages(pdfBuffer, {
        password: "weak123",
        maxPages: 1,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("Unencrypted PDF processing (regression test)", () => {
    it("should continue to work with unencrypted PDFs without password", async () => {
      const pdfPath = path.join(fixturesDir, "valid-sample.pdf");
      const pdfBuffer = fs.readFileSync(pdfPath);

      const result = await PDFProcessor.convertPDFToImages(pdfBuffer, {
        maxPages: 1,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it("should work with unencrypted PDFs even when password is provided", async () => {
      const pdfPath = path.join(fixturesDir, "valid-sample.pdf");
      const pdfBuffer = fs.readFileSync(pdfPath);

      // Providing a password for an unencrypted PDF should not cause issues
      const result = await PDFProcessor.convertPDFToImages(pdfBuffer, {
        password: "unnecessarypassword",
        maxPages: 1,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("PDFProcessorOptions type extension", () => {
    it("should accept password in process method options", async () => {
      const pdfPath = path.join(fixturesDir, "valid-sample.pdf");
      const pdfBuffer = fs.readFileSync(pdfPath);

      // Test that password option is accepted in PDFProcessorOptions
      const result = await PDFProcessor.process(pdfBuffer, {
        provider: "openai",
        password: "testpass",
      });

      expect(result).toBeDefined();
      expect(result.type).toBe("pdf");
    });
  });
});
