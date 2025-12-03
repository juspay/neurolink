import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { imageUtils } from "../../../src/lib/utils/imageProcessor.js";

describe("ImageProcessor urlToBase64DataUri - Race Condition Tests", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("should not abort fetch when it completes successfully before timeout", async () => {
    // Mock successful fetch that completes before timeout
    const mockArrayBuffer = new ArrayBuffer(100);
    const mockResponse = {
      ok: true,
      headers: {
        get: (key: string) => {
          if (key === "content-type") {
            return "image/jpeg";
          }
          if (key === "content-length") {
            return "100";
          }
          return null;
        },
      },
      arrayBuffer: async () => mockArrayBuffer,
    };

    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(mockResponse as Response);
    const abortSpy = vi.spyOn(AbortController.prototype, "abort");

    // Start the fetch with a 5000ms timeout
    const promise = imageUtils.urlToBase64DataUri(
      "https://example.com/image.jpg",
      { timeoutMs: 5000 },
    );

    // Fast-forward time by 6000ms (past the timeout)
    await vi.advanceTimersByTimeAsync(6000);

    // Wait for the promise to resolve
    const result = await promise;

    // Verify fetch was called
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://example.com/image.jpg",
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
    );

    // Verify abort was NOT called (completed flag prevents it)
    expect(abortSpy).not.toHaveBeenCalled();

    // Verify result is a valid data URI
    expect(result).toMatch(/^data:image\/jpeg;base64,/);
  });

  it("should abort fetch when timeout fires before completion", async () => {
    // This test verifies that abort is called when timeout fires
    // We'll skip the actual promise rejection testing since that's
    // difficult to test properly with fake timers

    const abortError = new Error("The operation was aborted");
    abortError.name = "AbortError";

    let abortSignal: AbortSignal | undefined;
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockImplementation((_, options) => {
        abortSignal = (options as RequestInit)?.signal as
          | AbortSignal
          | undefined;
        // Return a promise that never resolves to simulate slow fetch
        return new Promise(() => {});
      });

    const abortSpy = vi.spyOn(AbortController.prototype, "abort");

    // Start the fetch with a 1000ms timeout (don't await it)
    const promise = imageUtils.urlToBase64DataUri(
      "https://example.com/slow-image.jpg",
      { timeoutMs: 1000 },
    );

    // Fast-forward time by 1500ms (past the timeout)
    await vi.advanceTimersByTimeAsync(1500);

    // Verify abort WAS called because fetch didn't complete in time
    expect(abortSpy).toHaveBeenCalled();
    expect(abortSignal?.aborted).toBe(true);
  });

  it("should handle race condition where fetch completes just as timeout fires", async () => {
    // Mock fetch that completes at almost the same time as timeout
    const mockArrayBuffer = new ArrayBuffer(100);
    const mockResponse = {
      ok: true,
      headers: {
        get: (key: string) => {
          if (key === "content-type") {
            return "image/jpeg";
          }
          if (key === "content-length") {
            return "100";
          }
          return null;
        },
      },
      arrayBuffer: async () => mockArrayBuffer,
    };

    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(mockResponse as Response);
    const abortSpy = vi.spyOn(AbortController.prototype, "abort");

    // Start the fetch with a 2000ms timeout
    const promise = imageUtils.urlToBase64DataUri(
      "https://example.com/image.jpg",
      { timeoutMs: 2000 },
    );

    // Let the fetch complete
    await vi.advanceTimersByTimeAsync(0);
    await promise;

    // Now fire the timeout (after completion)
    await vi.advanceTimersByTimeAsync(2000);

    // Verify abort was NOT called because completed flag was set
    expect(abortSpy).not.toHaveBeenCalled();
  });

  it("should clear timeout after successful completion", async () => {
    // Mock successful fetch
    const mockArrayBuffer = new ArrayBuffer(100);
    const mockResponse = {
      ok: true,
      headers: {
        get: (key: string) => {
          if (key === "content-type") {
            return "image/jpeg";
          }
          if (key === "content-length") {
            return "100";
          }
          return null;
        },
      },
      arrayBuffer: async () => mockArrayBuffer,
    };

    vi.spyOn(global, "fetch").mockResolvedValue(mockResponse as Response);
    const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");

    // Start the fetch
    const promise = imageUtils.urlToBase64DataUri(
      "https://example.com/image.jpg",
      { timeoutMs: 5000 },
    );

    // Wait for completion
    await promise;

    // Verify clearTimeout was called
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it("should set completed flag to true before returning result", async () => {
    // This test verifies the order of operations
    const mockArrayBuffer = new ArrayBuffer(100);
    const mockResponse = {
      ok: true,
      headers: {
        get: (key: string) => {
          if (key === "content-type") {
            return "image/jpeg";
          }
          if (key === "content-length") {
            return "100";
          }
          return null;
        },
      },
      arrayBuffer: async () => mockArrayBuffer,
    };

    vi.spyOn(global, "fetch").mockResolvedValue(mockResponse as Response);
    const abortSpy = vi.spyOn(AbortController.prototype, "abort");

    // Start the fetch
    const promise = imageUtils.urlToBase64DataUri(
      "https://example.com/image.jpg",
      { timeoutMs: 100 },
    );

    // Wait for fetch to complete
    const result = await promise;

    // Advance time past the timeout
    await vi.advanceTimersByTimeAsync(200);

    // Verify result is valid
    expect(result).toMatch(/^data:image\/jpeg;base64,/);

    // Verify abort was never called (completed flag worked)
    expect(abortSpy).not.toHaveBeenCalled();
  });

  it("should handle errors without triggering abort after error", async () => {
    // Mock fetch that throws an error
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("Network error"));
    const abortSpy = vi.spyOn(AbortController.prototype, "abort");

    // Start the fetch
    const promise = imageUtils.urlToBase64DataUri(
      "https://example.com/image.jpg",
      { timeoutMs: 5000 },
    );

    // Wait for error
    await expect(promise).rejects.toThrow();

    // Advance time past timeout
    await vi.advanceTimersByTimeAsync(6000);

    // Abort might have been called before the error, but we're checking
    // that the cleanup happens properly
    const abortCallCount = abortSpy.mock.calls.length;

    // Fast-forward more time - abort should not be called again
    await vi.advanceTimersByTimeAsync(1000);

    // Verify abort wasn't called additional times
    expect(abortSpy.mock.calls.length).toBe(abortCallCount);
  });
});
