import { describe, it, expect } from "vitest";
import {
  VideoProcessingError,
  VideoValidationError,
  VideoExtractionError,
  VideoUploadError,
  VideoErrorCodes,
  createInvalidFormatError,
  createVideoTooLargeError,
  createVideoTooLongError,
  createFfmpegNotFoundError,
  createFrameExtractionError,
  createMetadataExtractionError,
  createVideoUploadError,
  isVideoProcessingError,
  isVideoValidationError,
  isVideoExtractionError,
  isVideoUploadError,
} from "../../../src/lib/types/videoErrors.js";

describe("Video Error Types", () => {
  describe("VideoProcessingError", () => {
    it("should create a VideoProcessingError with message and code", () => {
      const error = new VideoProcessingError(
        "Processing failed",
        VideoErrorCodes.VIDEO_PROCESSING_ERROR,
      );

      expect(error.message).toBe("Processing failed");
      expect(error.code).toBe("VIDEO_PROCESSING_ERROR");
      expect(error.name).toBe("VideoProcessingError");
      expect(error.details).toBeUndefined();
      expect(error instanceof Error).toBe(true);
      expect(error instanceof VideoProcessingError).toBe(true);
    });

    it("should create a VideoProcessingError with details", () => {
      const details = { filePath: "/path/to/video.mp4", format: "mp4" };
      const error = new VideoProcessingError(
        "Processing failed",
        VideoErrorCodes.VIDEO_PROCESSING_ERROR,
        details,
      );

      expect(error.details).toEqual(details);
      expect(error.details?.filePath).toBe("/path/to/video.mp4");
      expect(error.details?.format).toBe("mp4");
    });

    it("should have proper stack trace", () => {
      const error = new VideoProcessingError(
        "Test error",
        VideoErrorCodes.VIDEO_PROCESSING_ERROR,
      );
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain("VideoProcessingError");
    });
  });

  describe("VideoValidationError", () => {
    it("should create a VideoValidationError with correct code", () => {
      const error = new VideoValidationError("Validation failed");

      expect(error.message).toBe("Validation failed");
      expect(error.code).toBe("VIDEO_VALIDATION_ERROR");
      expect(error.name).toBe("VideoValidationError");
      expect(error instanceof VideoProcessingError).toBe(true);
      expect(error instanceof VideoValidationError).toBe(true);
    });

    it("should include details when provided", () => {
      const details = { fileSize: 100000, maxSize: 50000 };
      const error = new VideoValidationError("File too large", details);

      expect(error.details).toEqual(details);
    });
  });

  describe("VideoExtractionError", () => {
    it("should create a VideoExtractionError with correct code", () => {
      const error = new VideoExtractionError("Extraction failed");

      expect(error.message).toBe("Extraction failed");
      expect(error.code).toBe("VIDEO_EXTRACTION_ERROR");
      expect(error.name).toBe("VideoExtractionError");
      expect(error instanceof VideoProcessingError).toBe(true);
      expect(error instanceof VideoExtractionError).toBe(true);
    });

    it("should include cause in details", () => {
      const cause = new Error("FFmpeg crashed");
      const error = new VideoExtractionError("Extraction failed", { cause });

      expect(error.details?.cause).toBe(cause);
    });
  });

  describe("VideoUploadError", () => {
    it("should create a VideoUploadError with correct code", () => {
      const error = new VideoUploadError("Upload failed");

      expect(error.message).toBe("Upload failed");
      expect(error.code).toBe("VIDEO_UPLOAD_FAILED");
      expect(error.name).toBe("VideoUploadError");
      expect(error instanceof VideoProcessingError).toBe(true);
      expect(error instanceof VideoUploadError).toBe(true);
    });
  });

  describe("VideoErrorCodes", () => {
    it("should have all required error codes", () => {
      expect(VideoErrorCodes.INVALID_VIDEO_FORMAT).toBe("INVALID_VIDEO_FORMAT");
      expect(VideoErrorCodes.VIDEO_TOO_LARGE).toBe("VIDEO_TOO_LARGE");
      expect(VideoErrorCodes.VIDEO_TOO_LONG).toBe("VIDEO_TOO_LONG");
      expect(VideoErrorCodes.FFMPEG_NOT_FOUND).toBe("FFMPEG_NOT_FOUND");
      expect(VideoErrorCodes.FRAME_EXTRACTION_FAILED).toBe(
        "FRAME_EXTRACTION_FAILED",
      );
      expect(VideoErrorCodes.METADATA_EXTRACTION_FAILED).toBe(
        "METADATA_EXTRACTION_FAILED",
      );
      expect(VideoErrorCodes.VIDEO_UPLOAD_FAILED).toBe("VIDEO_UPLOAD_FAILED");
    });
  });

  describe("Helper Functions", () => {
    describe("createInvalidFormatError", () => {
      it("should create an error with format details", () => {
        const error = createInvalidFormatError("avi", ["mp4", "webm", "mov"]);

        expect(error).toBeInstanceOf(VideoValidationError);
        expect(error.message).toContain("Invalid video format 'avi'");
        expect(error.message).toContain("mp4, webm, mov");
        expect(error.details?.format).toBe("avi");
        expect(error.details?.supportedFormats).toEqual(["mp4", "webm", "mov"]);
      });

      it("should include file path when provided", () => {
        const error = createInvalidFormatError(
          "avi",
          ["mp4"],
          "/path/to/video.avi",
        );
        expect(error.details?.filePath).toBe("/path/to/video.avi");
      });
    });

    describe("createVideoTooLargeError", () => {
      it("should create an error with size details", () => {
        const fileSize = 100 * 1024 * 1024; // 100 MB
        const maxSize = 50 * 1024 * 1024; // 50 MB
        const error = createVideoTooLargeError(fileSize, maxSize);

        expect(error).toBeInstanceOf(VideoValidationError);
        expect(error.message).toContain("100.00 MB");
        expect(error.message).toContain("50.00 MB");
        expect(error.details?.fileSize).toBe(fileSize);
        expect(error.details?.maxSize).toBe(maxSize);
      });
    });

    describe("createVideoTooLongError", () => {
      it("should create an error with duration details", () => {
        const error = createVideoTooLongError(120, 60);

        expect(error).toBeInstanceOf(VideoValidationError);
        expect(error.message).toContain("120s");
        expect(error.message).toContain("60s");
        expect(error.details?.duration).toBe(120);
        expect(error.details?.maxDuration).toBe(60);
      });
    });

    describe("createFfmpegNotFoundError", () => {
      it("should create an error about FFmpeg not found", () => {
        const error = createFfmpegNotFoundError();

        expect(error).toBeInstanceOf(VideoExtractionError);
        expect(error.message).toContain("FFmpeg");
        expect(error.message).toContain("not installed");
      });
    });

    describe("createFrameExtractionError", () => {
      it("should create an error with file path", () => {
        const error = createFrameExtractionError("/path/to/video.mp4");

        expect(error).toBeInstanceOf(VideoExtractionError);
        expect(error.message).toContain("extract frames");
        expect(error.message).toContain("/path/to/video.mp4");
        expect(error.details?.filePath).toBe("/path/to/video.mp4");
      });

      it("should include cause when provided", () => {
        const cause = new Error("FFmpeg error");
        const error = createFrameExtractionError("/path/to/video.mp4", cause);

        expect(error.details?.cause).toBe(cause);
      });
    });

    describe("createMetadataExtractionError", () => {
      it("should create an error with file path", () => {
        const error = createMetadataExtractionError("/path/to/video.mp4");

        expect(error).toBeInstanceOf(VideoExtractionError);
        expect(error.message).toContain("extract metadata");
        expect(error.message).toContain("/path/to/video.mp4");
      });
    });

    describe("createVideoUploadError", () => {
      it("should create an error with file path", () => {
        const error = createVideoUploadError("/path/to/video.mp4");

        expect(error).toBeInstanceOf(VideoUploadError);
        expect(error.message).toContain("upload video");
        expect(error.message).toContain("/path/to/video.mp4");
      });
    });
  });

  describe("Type Guards", () => {
    describe("isVideoProcessingError", () => {
      it("should return true for VideoProcessingError", () => {
        const error = new VideoProcessingError(
          "Test",
          VideoErrorCodes.VIDEO_PROCESSING_ERROR,
        );
        expect(isVideoProcessingError(error)).toBe(true);
      });

      it("should return true for subclasses", () => {
        expect(isVideoProcessingError(new VideoValidationError("Test"))).toBe(
          true,
        );
        expect(isVideoProcessingError(new VideoExtractionError("Test"))).toBe(
          true,
        );
        expect(isVideoProcessingError(new VideoUploadError("Test"))).toBe(true);
      });

      it("should return false for regular Error", () => {
        expect(isVideoProcessingError(new Error("Test"))).toBe(false);
      });

      it("should return false for non-error values", () => {
        expect(isVideoProcessingError(null)).toBe(false);
        expect(isVideoProcessingError(undefined)).toBe(false);
        expect(isVideoProcessingError("error")).toBe(false);
        expect(isVideoProcessingError({ message: "error" })).toBe(false);
      });
    });

    describe("isVideoValidationError", () => {
      it("should return true for VideoValidationError", () => {
        expect(isVideoValidationError(new VideoValidationError("Test"))).toBe(
          true,
        );
      });

      it("should return false for other VideoProcessingError subclasses", () => {
        expect(isVideoValidationError(new VideoExtractionError("Test"))).toBe(
          false,
        );
        expect(isVideoValidationError(new VideoUploadError("Test"))).toBe(
          false,
        );
      });
    });

    describe("isVideoExtractionError", () => {
      it("should return true for VideoExtractionError", () => {
        expect(isVideoExtractionError(new VideoExtractionError("Test"))).toBe(
          true,
        );
      });

      it("should return false for other VideoProcessingError subclasses", () => {
        expect(isVideoExtractionError(new VideoValidationError("Test"))).toBe(
          false,
        );
      });
    });

    describe("isVideoUploadError", () => {
      it("should return true for VideoUploadError", () => {
        expect(isVideoUploadError(new VideoUploadError("Test"))).toBe(true);
      });

      it("should return false for other VideoProcessingError subclasses", () => {
        expect(isVideoUploadError(new VideoValidationError("Test"))).toBe(
          false,
        );
      });
    });
  });
});
