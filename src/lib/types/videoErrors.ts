/**
 * Video-specific error types and error handling utilities for VideoProcessor.
 * Provides clear, actionable error messages for video processing failures.
 */

/**
 * Error codes for common video processing failures.
 */
export const VideoErrorCodes = {
  INVALID_VIDEO_FORMAT: "INVALID_VIDEO_FORMAT",
  VIDEO_TOO_LARGE: "VIDEO_TOO_LARGE",
  VIDEO_TOO_LONG: "VIDEO_TOO_LONG",
  FFMPEG_NOT_FOUND: "FFMPEG_NOT_FOUND",
  FRAME_EXTRACTION_FAILED: "FRAME_EXTRACTION_FAILED",
  METADATA_EXTRACTION_FAILED: "METADATA_EXTRACTION_FAILED",
  VIDEO_UPLOAD_FAILED: "VIDEO_UPLOAD_FAILED",
  VIDEO_VALIDATION_ERROR: "VIDEO_VALIDATION_ERROR",
  VIDEO_EXTRACTION_ERROR: "VIDEO_EXTRACTION_ERROR",
  VIDEO_PROCESSING_ERROR: "VIDEO_PROCESSING_ERROR",
} as const;

export type VideoErrorCode =
  (typeof VideoErrorCodes)[keyof typeof VideoErrorCodes];

/**
 * Details that can be included with video errors for debugging.
 */
export interface VideoErrorDetails {
  /** The file path or URL of the video */
  filePath?: string;
  /** The video format (e.g., 'mp4', 'avi') */
  format?: string;
  /** The file size in bytes */
  fileSize?: number;
  /** The video duration in seconds */
  duration?: number;
  /** Maximum allowed file size in bytes */
  maxSize?: number;
  /** Maximum allowed duration in seconds */
  maxDuration?: number;
  /** Supported formats */
  supportedFormats?: string[];
  /** The underlying error that caused this error */
  cause?: Error;
  /** Additional context-specific information */
  [key: string]: unknown;
}

/**
 * Base error class for all video processing errors.
 * Provides a consistent interface for video-related failures.
 */
export class VideoProcessingError extends Error {
  /**
   * Creates a new VideoProcessingError.
   * @param message - A human-readable error message
   * @param code - The error code identifying the type of failure
   * @param details - Optional additional details about the error
   */
  constructor(
    message: string,
    public code: VideoErrorCode,
    public details?: VideoErrorDetails,
  ) {
    super(message);
    this.name = "VideoProcessingError";
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Error thrown when video validation fails (e.g., invalid format, size, or duration).
 */
export class VideoValidationError extends VideoProcessingError {
  /**
   * Creates a new VideoValidationError.
   * @param message - A human-readable error message describing the validation failure
   * @param details - Optional additional details about the validation error
   */
  constructor(message: string, details?: VideoErrorDetails) {
    super(message, VideoErrorCodes.VIDEO_VALIDATION_ERROR, details);
    this.name = "VideoValidationError";
  }
}

/**
 * Error thrown when video frame or metadata extraction fails.
 */
export class VideoExtractionError extends VideoProcessingError {
  /**
   * Creates a new VideoExtractionError.
   * @param message - A human-readable error message describing the extraction failure
   * @param details - Optional additional details about the extraction error
   */
  constructor(message: string, details?: VideoErrorDetails) {
    super(message, VideoErrorCodes.VIDEO_EXTRACTION_ERROR, details);
    this.name = "VideoExtractionError";
  }
}

/**
 * Error thrown when video upload fails.
 */
export class VideoUploadError extends VideoProcessingError {
  /**
   * Creates a new VideoUploadError.
   * @param message - A human-readable error message describing the upload failure
   * @param details - Optional additional details about the upload error
   */
  constructor(message: string, details?: VideoErrorDetails) {
    super(message, VideoErrorCodes.VIDEO_UPLOAD_FAILED, details);
    this.name = "VideoUploadError";
  }
}

// ============================================================================
// Helper Functions for Error Creation
// ============================================================================

/**
 * Creates an error for invalid video format.
 * @param format - The invalid format that was provided
 * @param supportedFormats - List of supported formats
 * @param filePath - Optional path to the video file
 */
export function createInvalidFormatError(
  format: string,
  supportedFormats: string[],
  filePath?: string,
): VideoValidationError {
  return new VideoValidationError(
    `Invalid video format '${format}'. Supported formats: ${supportedFormats.join(", ")}`,
    {
      format,
      supportedFormats,
      filePath,
    },
  );
}

/**
 * Creates an error for video that exceeds the maximum file size.
 * @param fileSize - The actual file size in bytes
 * @param maxSize - The maximum allowed file size in bytes
 * @param filePath - Optional path to the video file
 */
export function createVideoTooLargeError(
  fileSize: number,
  maxSize: number,
  filePath?: string,
): VideoValidationError {
  const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);
  const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
  return new VideoValidationError(
    `Video file size (${fileSizeMB} MB) exceeds maximum allowed size (${maxSizeMB} MB)`,
    {
      fileSize,
      maxSize,
      filePath,
    },
  );
}

/**
 * Creates an error for video that exceeds the maximum duration.
 * @param duration - The actual video duration in seconds
 * @param maxDuration - The maximum allowed duration in seconds
 * @param filePath - Optional path to the video file
 */
export function createVideoTooLongError(
  duration: number,
  maxDuration: number,
  filePath?: string,
): VideoValidationError {
  return new VideoValidationError(
    `Video duration (${duration}s) exceeds maximum allowed duration (${maxDuration}s)`,
    {
      duration,
      maxDuration,
      filePath,
    },
  );
}

/**
 * Creates an error for when FFmpeg is not found on the system.
 */
export function createFfmpegNotFoundError(): VideoExtractionError {
  return new VideoExtractionError(
    "FFmpeg is not installed or not found in PATH. Please install FFmpeg to process videos.",
    {},
  );
}

/**
 * Creates an error for frame extraction failure.
 * @param filePath - Path to the video file
 * @param cause - Optional underlying error that caused the failure
 */
export function createFrameExtractionError(
  filePath: string,
  cause?: Error,
): VideoExtractionError {
  return new VideoExtractionError(
    `Failed to extract frames from video: ${filePath}`,
    {
      filePath,
      cause,
    },
  );
}

/**
 * Creates an error for metadata extraction failure.
 * @param filePath - Path to the video file
 * @param cause - Optional underlying error that caused the failure
 */
export function createMetadataExtractionError(
  filePath: string,
  cause?: Error,
): VideoExtractionError {
  return new VideoExtractionError(
    `Failed to extract metadata from video: ${filePath}`,
    {
      filePath,
      cause,
    },
  );
}

/**
 * Creates an error for video upload failure.
 * @param filePath - Path to the video file
 * @param cause - Optional underlying error that caused the failure
 */
export function createVideoUploadError(
  filePath: string,
  cause?: Error,
): VideoUploadError {
  return new VideoUploadError(`Failed to upload video: ${filePath}`, {
    filePath,
    cause,
  });
}

/**
 * Type guard to check if an error is a VideoProcessingError.
 * @param error - The error to check
 */
export function isVideoProcessingError(
  error: unknown,
): error is VideoProcessingError {
  return error instanceof VideoProcessingError;
}

/**
 * Type guard to check if an error is a VideoValidationError.
 * @param error - The error to check
 */
export function isVideoValidationError(
  error: unknown,
): error is VideoValidationError {
  return error instanceof VideoValidationError;
}

/**
 * Type guard to check if an error is a VideoExtractionError.
 * @param error - The error to check
 */
export function isVideoExtractionError(
  error: unknown,
): error is VideoExtractionError {
  return error instanceof VideoExtractionError;
}

/**
 * Type guard to check if an error is a VideoUploadError.
 * @param error - The error to check
 */
export function isVideoUploadError(error: unknown): error is VideoUploadError {
  return error instanceof VideoUploadError;
}
