/**
 * Replicate Video Handler
 *
 * Routes video generation through the universal Replicate prediction
 * lifecycle. Default model is Wan-Alpha (RGBA video); callers can specify
 * any image-to-video model on Replicate via `options.model`.
 *
 * @module adapters/video/replicateVideoHandler
 * @see https://replicate.com/atonamy/wan-alpha
 */

import { ErrorCategory, ErrorSeverity } from "../../constants/enums.js";
import { VIDEO_ERROR_CODES } from "../../constants/videoErrors.js";
import { logger } from "../../utils/logger.js";
import { VideoError } from "../../utils/videoProcessor.js";
import type {
  NeurolinkCredentials,
  VideoGenerationResult,
  VideoHandler,
  VideoOutputOptions,
} from "../../types/index.js";
import { getReplicateAuth } from "../replicate/auth.js";
import {
  downloadPredictionOutput,
  predict,
} from "../replicate/predictionLifecycle.js";

const DEFAULT_MODEL = "atonamy/wan-alpha";

/**
 * Replicate Video Handler.
 *
 * Capabilities depend on the specific Replicate model — this handler
 * advertises conservative bounds (any provider-supported aspect ratio /
 * resolution; up to 10s typical for Wan-Alpha).
 */
export class ReplicateVideoHandler implements VideoHandler {
  public readonly maxDurationSeconds = 10;
  public readonly supportedAspectRatios: readonly ("9:16" | "16:9" | "1:1")[] =
    ["9:16", "16:9", "1:1"];
  public readonly supportedResolutions: readonly ("720p" | "1080p")[] = [
    "720p",
    "1080p",
  ];

  private readonly instanceCredentials:
    | NeurolinkCredentials["replicate"]
    | undefined;

  constructor(credentials?: NeurolinkCredentials["replicate"]) {
    this.instanceCredentials = credentials;
  }

  isConfigured(): boolean {
    return getReplicateAuth(this.instanceCredentials) !== null;
  }

  async generate(
    image: Buffer,
    prompt: string,
    options: VideoOutputOptions,
  ): Promise<VideoGenerationResult> {
    const perCallCreds = options.credentials?.replicate;
    const auth = getReplicateAuth(perCallCreds ?? this.instanceCredentials);
    if (!auth) {
      throw new VideoError({
        code: VIDEO_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
        message: "REPLICATE_API_TOKEN not configured",
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
    }

    const startTime = Date.now();
    const model = options.model ?? DEFAULT_MODEL;
    const dataUri = `data:image/${this.detectImageType(image)};base64,${image.toString("base64")}`;

    // Wan-Alpha + most image-to-video models accept this shape; specific
    // models may require provider-specific extras passed through
    // VideoOutputOptions.[unknown key].
    //
    // `resolution` is forwarded as the `resolution` input parameter.
    // Wan-Alpha and several other Replicate image-to-video models accept it
    // (e.g. "720p", "1080p"). Models that do not recognise it will silently
    // ignore the field — the Replicate API does not reject unknown input keys.
    // `calculateDimensions` still populates the metadata `dimensions` field
    // so downstream consumers always receive correct width/height regardless
    // of whether the model honoured the resolution hint.
    const inputPayload: Record<string, unknown> = {
      image: dataUri,
      prompt,
      num_frames: (options.length ?? 4) * 24, // Assume 24 fps
      fps: 24,
      aspect_ratio: options.aspectRatio,
      ...(options.resolution !== undefined
        ? { resolution: options.resolution }
        : {}),
    };

    let prediction: Awaited<ReturnType<typeof predict>>;
    try {
      prediction = await predict(
        auth,
        { model, input: inputPayload },
        { abortSignal: options.abortSignal },
      );
    } catch (err) {
      throw new VideoError({
        code: VIDEO_ERROR_CODES.GENERATION_FAILED,
        message: `Replicate video generation failed: ${err instanceof Error ? err.message : String(err)}`,
        category: ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable: true,
        context: { model, options },
        originalError: err instanceof Error ? err : undefined,
      });
    }

    let videoBuffer: Buffer;
    try {
      videoBuffer = await downloadPredictionOutput(prediction);
    } catch (err) {
      throw new VideoError({
        code: VIDEO_ERROR_CODES.GENERATION_FAILED,
        message: `Replicate video download failed: ${err instanceof Error ? err.message : String(err)}`,
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.MEDIUM,
        retriable: true,
        context: { predictionId: prediction.id },
        originalError: err instanceof Error ? err : undefined,
      });
    }

    const processingTime = Date.now() - startTime;
    logger.info(
      `[ReplicateVideoHandler] Generated ${videoBuffer.length} bytes in ${processingTime}ms — model ${model}`,
    );

    return {
      data: videoBuffer,
      mediaType: "video/mp4",
      metadata: {
        duration: options.length ?? 4,
        dimensions: this.calculateDimensions(options),
        model,
        provider: "replicate",
        aspectRatio: options.aspectRatio ?? "16:9",
        audioEnabled: false, // Most Replicate video models are silent
        processingTime,
      },
    };
  }

  private detectImageType(buffer: Buffer): "png" | "jpeg" | "webp" {
    if (buffer.length < 4) {
      return "jpeg";
    }
    if (buffer[0] === 0x89 && buffer[1] === 0x50) {
      return "png";
    }
    if (buffer[0] === 0xff && buffer[1] === 0xd8) {
      return "jpeg";
    }
    if (
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46
    ) {
      return "webp";
    }
    return "jpeg";
  }

  private calculateDimensions(options: VideoOutputOptions): {
    width: number;
    height: number;
  } {
    const aspectRatio = options.aspectRatio ?? "16:9";
    const resolution = options.resolution ?? "720p";

    if (resolution === "1080p") {
      if (aspectRatio === "1:1") {
        return { width: 1080, height: 1080 };
      }
      return aspectRatio === "9:16"
        ? { width: 1080, height: 1920 }
        : { width: 1920, height: 1080 };
    }
    if (aspectRatio === "1:1") {
      return { width: 720, height: 720 };
    }
    return aspectRatio === "9:16"
      ? { width: 720, height: 1280 }
      : { width: 1280, height: 720 };
  }
}
