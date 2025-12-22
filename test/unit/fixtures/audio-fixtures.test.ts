/**
 * Audio Fixtures Validation Tests
 *
 * Tests to validate that audio test fixtures exist and are accessible.
 * These fixtures are used for testing audio processing capabilities.
 */

import { describe, it, expect } from "vitest";
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";

// Path to audio fixtures
const audioFixturesPath = join(process.cwd(), "test", "fixtures", "audio");

describe("Audio Fixtures", () => {
  describe("Fixture Directory", () => {
    it("should have audio fixtures directory", () => {
      expect(existsSync(audioFixturesPath)).toBe(true);
    });
  });

  describe("Required Audio Files", () => {
    const requiredFiles = [
      { name: "sample.mp3", format: "MP3", minSize: 1024 },
      { name: "sample.wav", format: "WAV", minSize: 1024 },
      { name: "sample.m4a", format: "M4A", minSize: 1024 },
      { name: "sample.ogg", format: "OGG", minSize: 1024 },
      { name: "sample.flac", format: "FLAC", minSize: 1024 },
      { name: "spanish.mp3", format: "MP3", minSize: 1024 },
      { name: "corrupted.mp3", format: "Corrupted MP3", minSize: 100 },
    ];

    for (const file of requiredFiles) {
      it(`should have ${file.name} file`, () => {
        const filePath = join(audioFixturesPath, file.name);
        expect(existsSync(filePath)).toBe(true);
      });

      it(`should be able to read ${file.name}`, async () => {
        const filePath = join(audioFixturesPath, file.name);
        const content = await readFile(filePath);
        expect(content).toBeInstanceOf(Buffer);
        expect(content.length).toBeGreaterThan(0);
      });

      it(`${file.name} should meet minimum size requirement`, async () => {
        const filePath = join(audioFixturesPath, file.name);
        const stats = await stat(filePath);
        expect(stats.size).toBeGreaterThanOrEqual(file.minSize);
      });

      it(`${file.name} should be under 1MB`, async () => {
        const filePath = join(audioFixturesPath, file.name);
        const stats = await stat(filePath);
        expect(stats.size).toBeLessThan(1024 * 1024); // 1MB
      });
    }
  });

  describe("File Format Validation", () => {
    it("sample.mp3 should have MP3 signature", async () => {
      const filePath = join(audioFixturesPath, "sample.mp3");
      const buffer = await readFile(filePath);
      // MP3 files typically start with ID3 tag (0x49 0x44 0x33) or MPEG frame sync (0xFF 0xFB or 0xFF 0xF3)
      const hasID3 =
        buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33;
      const hasMPEGSync =
        buffer[0] === 0xff && (buffer[1] === 0xfb || buffer[1] === 0xf3);
      expect(hasID3 || hasMPEGSync).toBe(true);
    });

    it("sample.wav should have WAV signature", async () => {
      const filePath = join(audioFixturesPath, "sample.wav");
      const buffer = await readFile(filePath);
      // WAV files start with "RIFF" (0x52 0x49 0x46 0x46)
      const signature = buffer.toString("ascii", 0, 4);
      expect(signature).toBe("RIFF");
      // Also check for "WAVE" at offset 8
      const waveSignature = buffer.toString("ascii", 8, 12);
      expect(waveSignature).toBe("WAVE");
    });

    it("sample.flac should have FLAC signature", async () => {
      const filePath = join(audioFixturesPath, "sample.flac");
      const buffer = await readFile(filePath);
      // FLAC files start with "fLaC" (0x66 0x4C 0x61 0x43)
      const signature = buffer.toString("ascii", 0, 4);
      expect(signature).toBe("fLaC");
    });

    it("sample.ogg should have OGG signature", async () => {
      const filePath = join(audioFixturesPath, "sample.ogg");
      const buffer = await readFile(filePath);
      // OGG files start with "OggS" (0x4F 0x67 0x67 0x53)
      const signature = buffer.toString("ascii", 0, 4);
      expect(signature).toBe("OggS");
    });

    it("corrupted.mp3 should not be a valid audio file", async () => {
      const filePath = join(audioFixturesPath, "corrupted.mp3");
      const buffer = await readFile(filePath);
      // Corrupted file should NOT have valid MP3 signature
      const hasID3 =
        buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33;
      const hasMPEGSync =
        buffer[0] === 0xff && (buffer[1] === 0xfb || buffer[1] === 0xf3);
      expect(hasID3 || hasMPEGSync).toBe(false);
    });
  });

  describe("README Documentation", () => {
    it("should have README.md in audio fixtures directory", () => {
      const readmePath = join(audioFixturesPath, "README.md");
      expect(existsSync(readmePath)).toBe(true);
    });

    it("README.md should be readable and non-empty", async () => {
      const readmePath = join(audioFixturesPath, "README.md");
      const content = await readFile(readmePath, "utf-8");
      expect(content.length).toBeGreaterThan(100);
      expect(content).toContain("Audio Test Fixtures");
    });
  });
});
