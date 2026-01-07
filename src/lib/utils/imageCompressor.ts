import sharp from 'sharp';
import type { ProviderName } from '../types/providers.js';

/**
 * Provider-specific image size limits in bytes
 */
export const PROVIDER_IMAGE_LIMITS: Record<ProviderName, number> = {
  openai: 20 * 1024 * 1024, // 20MB
  anthropic: 5 * 1024 * 1024, // 5MB
  google: 4 * 1024 * 1024, // 4MB
  bedrock: 5 * 1024 * 1024, // 5MB
  'google-vertex': 4 * 1024 * 1024, // 4MB
  azure: 20 * 1024 * 1024, // 20MB
  mistral: 5 * 1024 * 1024, // 5MB
  huggingface: 10 * 1024 * 1024, // 10MB
  ollama: 100 * 1024 * 1024, // 100MB (local, no strict limit)
  openrouter: 20 * 1024 * 1024, // 20MB
  sagemaker: 5 * 1024 * 1024, // 5MB
  'gemini-vertex': 4 * 1024 * 1024, // 4MB
  'google-genai': 4 * 1024 * 1024, // 4MB
};

export interface CompressionOptions {
  provider: ProviderName;
  quality?: number; // 1-100, default 80
  maxDimension?: number; // Max width/height in pixels
  format?: 'jpeg' | 'png' | 'webp';
}

export interface CompressionResult {
  buffer: Buffer;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  metadata: {
    width: number;
    height: number;
    format: string;
  };
}

/**
 * Compress an image to meet provider-specific size limits
 * @param imageBuffer - Input image buffer
 * @param options - Compression options including provider name
 * @returns Compressed image buffer with metadata
 */
export async function compressImage(
  imageBuffer: Buffer,
  options: CompressionOptions,
): Promise<CompressionResult> {
  const { provider, quality = 80, maxDimension, format } = options;
  const sizeLimit = PROVIDER_IMAGE_LIMITS[provider];
  const originalSize = imageBuffer.length;

  // Get original metadata
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error('Unable to read image dimensions');
  }

  // If image is already under limit and no format conversion needed, return as-is
  if (originalSize <= sizeLimit && !format && !maxDimension) {
    return {
      buffer: imageBuffer,
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 1,
      metadata: {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format || 'unknown',
      },
    };
  }

  // Prepare compression pipeline
  let pipeline = sharp(imageBuffer);

  // Resize if needed
  if (maxDimension) {
    const needsResize =
      metadata.width > maxDimension || metadata.height > maxDimension;
    if (needsResize) {
      pipeline = pipeline.resize(maxDimension, maxDimension, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }
  }

  // Apply format and quality
  const targetFormat = format || (metadata.format as 'jpeg' | 'png' | 'webp') || 'jpeg';
  
  switch (targetFormat) {
    case 'jpeg':
      pipeline = pipeline.jpeg({ quality, mozjpeg: true });
      break;
    case 'png':
      pipeline = pipeline.png({ quality, compressionLevel: 9 });
      break;
    case 'webp':
      pipeline = pipeline.webp({ quality });
      break;
  }

  // Compress
  let compressedBuffer = await pipeline.toBuffer();
  let currentQuality = quality;

  // Iteratively reduce quality if still over limit
  while (compressedBuffer.length > sizeLimit && currentQuality > 10) {
    currentQuality -= 10;
    pipeline = sharp(imageBuffer);

    if (maxDimension) {
      pipeline = pipeline.resize(maxDimension, maxDimension, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    switch (targetFormat) {
      case 'jpeg':
        pipeline = pipeline.jpeg({ quality: currentQuality, mozjpeg: true });
        break;
      case 'png':
        pipeline = pipeline.png({ quality: currentQuality, compressionLevel: 9 });
        break;
      case 'webp':
        pipeline = pipeline.webp({ quality: currentQuality });
        break;
    }

    compressedBuffer = await pipeline.toBuffer();
  }

  // Final check
  if (compressedBuffer.length > sizeLimit) {
    throw new Error(
      `Unable to compress image to ${sizeLimit} bytes for provider ${provider}. ` +
      `Final size: ${compressedBuffer.length} bytes. ` +
      `Try using a smaller image or lower maxDimension.`,
    );
  }

  // Get final metadata
  const finalMetadata = await sharp(compressedBuffer).metadata();

  return {
    buffer: compressedBuffer,
    originalSize,
    compressedSize: compressedBuffer.length,
    compressionRatio: originalSize / compressedBuffer.length,
    metadata: {
      width: finalMetadata.width || 0,
      height: finalMetadata.height || 0,
      format: targetFormat,
    },
  };
}

/**
 * Check if an image needs compression for a specific provider
 * @param imageBuffer - Input image buffer
 * @param provider - AI provider name
 * @returns True if compression is needed
 */
export function needsCompression(
  imageBuffer: Buffer,
  provider: ProviderName,
): boolean {
  const sizeLimit = PROVIDER_IMAGE_LIMITS[provider];
  return imageBuffer.length > sizeLimit;
}

/**
 * Get the size limit for a specific provider
 * @param provider - AI provider name
 * @returns Size limit in bytes
 */
export function getProviderSizeLimit(provider: ProviderName): number {
  return PROVIDER_IMAGE_LIMITS[provider];
}
