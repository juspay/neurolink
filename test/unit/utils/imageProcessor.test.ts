import { describe, it, expect } from "vitest";
import { imageUtils } from "../../../src/lib/utils/imageProcessor.js";

describe("imageUtils.isValidBase64", () => {
  it("should return true for valid base64 strings", () => {
    const validBase64 = Buffer.from("hello world").toString("base64");
    expect(imageUtils.isValidBase64(validBase64)).toBe(true);
  });

  it("should return true for valid base64 with padding", () => {
    const validWithPadding = Buffer.from("a").toString("base64"); // "YQ=="
    expect(imageUtils.isValidBase64(validWithPadding)).toBe(true);
  });

  it("should return true for valid data URI", () => {
    const validDataUri =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
    expect(imageUtils.isValidBase64(validDataUri)).toBe(true);
  });

  it("should return false for invalid characters", () => {
    expect(imageUtils.isValidBase64("hello world!")).toBe(false);
    expect(imageUtils.isValidBase64("abc%def")).toBe(false);
  });

  it("should return false for invalid length (not multiple of 4)", () => {
    expect(imageUtils.isValidBase64("YQ=")).toBe(false); // Should be "YQ=="
    expect(imageUtils.isValidBase64("YQ")).toBe(false); // Should be "YQ=="
  });

  it("should return false for invalid padding position", () => {
    expect(imageUtils.isValidBase64("Y=Q=")).toBe(false);
    expect(imageUtils.isValidBase64("===Q")).toBe(false);
  });

  it("should return false for too much padding", () => {
    expect(imageUtils.isValidBase64("YQ===")).toBe(false);
  });

  it("should fail fast for invalid input without allocating memory", () => {
    // These strings should be rejected BEFORE buffer allocation
    expect(imageUtils.isValidBase64("hello world")).toBe(false);
    expect(imageUtils.isValidBase64("invalid@#$%")).toBe(false);
    expect(imageUtils.isValidBase64("test with spaces")).toBe(false);
  });

  it("should validate empty strings", () => {
    expect(imageUtils.isValidBase64("")).toBe(false);
    expect(imageUtils.isValidBase64("data:image/png;base64,")).toBe(false);
  });
});
