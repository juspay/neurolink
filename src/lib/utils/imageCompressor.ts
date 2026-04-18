import sharp from "sharp";
import { withTimeout } from "./async/index.js";
import type {
  CompressionOptions,
  CompressionResult,
  ProviderName,
  SupportedFormat,
} from "../types/index.js";

const SUPPORTED_FORMATS: readonly SupportedFormat[] = [
  "jpeg",
  "png",
  "webp",
] as const;

const IMAGE_COMPRESSION_TIMEOUT_MS = 30_000;

/**
 * Provider-specific image size limits in bytes
 */
export const PROVIDER_IMAGE_LIMITS: Record<ProviderName, number> = {
  openai: 20 * 1024 * 1024, // 20MB
  "openai-compatible": 20 * 1024 * 1024, // 20MB (same as OpenAI)
  anthropic: 5 * 1024 * 1024, // 5MB
  "google-ai": 4 * 1024 * 1024, // 4MB
  vertex: 4 * 1024 * 1024, // 4MB
  bedrock: 5 * 1024 * 1024, // 5MB
  azure: 20 * 1024 * 1024, // 20MB
  mistral: 5 * 1024 * 1024, // 5MB
  huggingface: 10 * 1024 * 1024, // 10MB
  ollama: 100 * 1024 * 1024, // 100MB (local, no strict limit)
  openrouter: 20 * 1024 * 1024, // 20MB
  sagemaker: 5 * 1024 * 1024, // 5MB
  litellm: 20 * 1024 * 1024, // 20MB (proxy, use OpenAI default)
  auto: 5 * 1024 * 1024, // 5MB (conservative fallback)
};

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
  const metadata = await withTimeout(
    image.metadata(),
    IMAGE_COMPRESSION_TIMEOUT_MS,
    "Timed out reading image metadata",
  );

  if (!metadata.width || !metadata.height) {
    throw new Error("Unable to read image dimensions");
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
        format: metadata.format ?? "unknown",
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
        fit: "inside",
        withoutEnlargement: true,
      });
    }
  }

  // Resolve target format — validate metadata.format against supported set
  const rawFormat = metadata.format;
  const targetFormat: SupportedFormat =
    format ??
    (SUPPORTED_FORMATS.includes(rawFormat as SupportedFormat)
      ? (rawFormat as SupportedFormat)
      : "jpeg");

  const applyFormat = (p: sharp.Sharp, q: number): sharp.Sharp => {
    switch (targetFormat) {
      case "jpeg":
        return p.jpeg({ quality: q, mozjpeg: true });
      case "png":
        return p.png({ quality: q, compressionLevel: 9 });
      case "webp":
        return p.webp({ quality: q });
    }
  };

  // Compress
  let compressedBuffer = await withTimeout(
    applyFormat(pipeline, quality).toBuffer(),
    IMAGE_COMPRESSION_TIMEOUT_MS,
    "Timed out compressing image",
  );
  let currentQuality = quality;

  // Iteratively reduce quality if still over limit
  // Note: the sharp pipeline must be rebuilt on each iteration because
  // sharp does not support modifying quality settings after creation.
  while (compressedBuffer.length > sizeLimit && currentQuality > 10) {
    currentQuality -= 10;
    let p = sharp(imageBuffer);

    if (maxDimension) {
      p = p.resize(maxDimension, maxDimension, {
        fit: "inside",
        withoutEnlargement: true,
      });
    }

    compressedBuffer = await withTimeout(
      applyFormat(p, currentQuality).toBuffer(),
      IMAGE_COMPRESSION_TIMEOUT_MS,
      "Timed out compressing image",
    );
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
  const finalMetadata = await withTimeout(
    sharp(compressedBuffer).metadata(),
    IMAGE_COMPRESSION_TIMEOUT_MS,
    "Timed out reading compressed image metadata",
  );

  return {
    buffer: compressedBuffer,
    originalSize,
    compressedSize: compressedBuffer.length,
    compressionRatio: originalSize / compressedBuffer.length,
    metadata: {
      width: finalMetadata.width ?? 0,
      height: finalMetadata.height ?? 0,
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
