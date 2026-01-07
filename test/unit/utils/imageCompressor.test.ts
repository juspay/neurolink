import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import sharp from 'sharp';
import {
  compressImage,
  needsCompression,
  getProviderSizeLimit,
  PROVIDER_IMAGE_LIMITS,
} from '../../../src/lib/utils/imageCompressor.js';
import type { ProviderName } from '../../../src/lib/types/providers.js';

describe('imageCompressor', () => {
  let testImageBuffer: Buffer;
  const testImagePath = join(process.cwd(), 'test', 'fixtures', 'test-image.jpg');

  beforeAll(async () => {
    // Create a test image if it doesn't exist
    try {
      testImageBuffer = readFileSync(testImagePath);
    } catch {
      // Generate a test image: 1000x1000 solid color
      testImageBuffer = await sharp({
        create: {
          width: 1000,
          height: 1000,
          channels: 3,
          background: { r: 255, g: 0, b: 0 },
        },
      })
        .jpeg()
        .toBuffer();
      
      // Ensure fixtures directory exists
      try {
        mkdirSync(dirname(testImagePath), { recursive: true });
      } catch {
        // Directory already exists
      }
      
      // Save for future use
      writeFileSync(testImagePath, testImageBuffer);
    }
  });

  describe('compressImage', () => {
    it('should compress image for anthropic provider', async () => {
      const result = await compressImage(testImageBuffer, {
        provider: 'anthropic',
        quality: 80,
      });

      expect(result.compressedSize).toBeLessThanOrEqual(PROVIDER_IMAGE_LIMITS.anthropic);
      expect(result.compressionRatio).toBeGreaterThan(0);
      expect(result.metadata.width).toBeGreaterThan(0);
      expect(result.metadata.height).toBeGreaterThan(0);
    });

    it('should compress image with custom quality', async () => {
      const highQuality = await compressImage(testImageBuffer, {
        provider: 'openai',
        quality: 90,
      });

      const lowQuality = await compressImage(testImageBuffer, {
        provider: 'openai',
        quality: 50,
      });

      expect(lowQuality.compressedSize).toBeLessThan(highQuality.compressedSize);
    });

    it('should resize image when maxDimension is specified', async () => {
      const result = await compressImage(testImageBuffer, {
        provider: 'google',
        maxDimension: 500,
      });

      expect(result.metadata.width).toBeLessThanOrEqual(500);
      expect(result.metadata.height).toBeLessThanOrEqual(500);
    });

    it('should convert image format', async () => {
      const result = await compressImage(testImageBuffer, {
        provider: 'openai',
        format: 'webp',
      });

      expect(result.metadata.format).toBe('webp');
    });

    it('should return original if already under limit', async () => {
      // Create a tiny image
      const tinyImage = await sharp({
        create: {
          width: 10,
          height: 10,
          channels: 3,
          background: { r: 0, g: 0, b: 0 },
        },
      })
        .jpeg()
        .toBuffer();

      const result = await compressImage(tinyImage, {
        provider: 'openai',
      });

      expect(result.compressionRatio).toBe(1);
      expect(result.originalSize).toBe(result.compressedSize);
    });

    it('should throw error if unable to compress below limit', async () => {
      // Create a very large image
      const largeImage = await sharp({
        create: {
          width: 5000,
          height: 5000,
          channels: 3,
          background: { r: 255, g: 255, b: 255 },
        },
      })
        .png()
        .toBuffer();

      await expect(
        compressImage(largeImage, {
          provider: 'anthropic', // 5MB limit
          quality: 80,
        }),
      ).rejects.toThrow(/Unable to compress image/);
    });

    it('should handle all provider types', async () => {
      const providers: ProviderName[] = [
        'openai',
        'anthropic',
        'google',
        'bedrock',
        'azure',
      ];

      for (const provider of providers) {
        const result = await compressImage(testImageBuffer, {
          provider,
        });

        expect(result.compressedSize).toBeLessThanOrEqual(
          PROVIDER_IMAGE_LIMITS[provider],
        );
      }
    });
  });

  describe('needsCompression', () => {
    it('should return true when image exceeds provider limit', () => {
      // Create a buffer larger than anthropic's 5MB limit
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024);
      expect(needsCompression(largeBuffer, 'anthropic')).toBe(true);
    });

    it('should return false when image is under provider limit', () => {
      // Create a small buffer
      const smallBuffer = Buffer.alloc(1024); // 1KB
      expect(needsCompression(smallBuffer, 'anthropic')).toBe(false);
    });
  });

  describe('getProviderSizeLimit', () => {
    it('should return correct size limit for each provider', () => {
      expect(getProviderSizeLimit('openai')).toBe(20 * 1024 * 1024);
      expect(getProviderSizeLimit('anthropic')).toBe(5 * 1024 * 1024);
      expect(getProviderSizeLimit('google')).toBe(4 * 1024 * 1024);
      expect(getProviderSizeLimit('ollama')).toBe(100 * 1024 * 1024);
    });
  });

  describe('PROVIDER_IMAGE_LIMITS', () => {
    it('should have limits defined for all providers', () => {
      const providers: ProviderName[] = [
        'openai',
        'anthropic',
        'google',
        'bedrock',
        'google-vertex',
        'azure',
        'mistral',
        'huggingface',
        'ollama',
        'openrouter',
        'sagemaker',
        'gemini-vertex',
        'google-genai',
      ];

      for (const provider of providers) {
        expect(PROVIDER_IMAGE_LIMITS[provider]).toBeGreaterThan(0);
      }
    });
  });
});
