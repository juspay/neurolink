/**
 * Replicate Prediction Lifecycle
 *
 * Shared async-job helpers used by every Replicate-backed handler. Submits
 * a prediction, polls until terminal status, downloads the binary output.
 *
 * Usage pattern (for handlers — LLM, video, avatar, music):
 *
 *   const auth = getReplicateAuth(credentials);
 *   if (!auth) throw new XxxError({ code: PROVIDER_NOT_CONFIGURED, ... });
 *   const prediction = await predict(auth, { model, input });
 *   const buffer = await downloadPredictionOutput(prediction);
 *
 * @module adapters/replicate/predictionLifecycle
 */

import { ErrorCategory, ErrorSeverity } from "../../constants/enums.js";
import { logger } from "../../utils/logger.js";
import { NeuroLinkError, ERROR_CODES } from "../../utils/errorHandling.js";
import { sanitizeForLog } from "../../utils/logSanitize.js";
import { safeDownload } from "../../utils/safeFetch.js";
import { MAX_VIDEO_BYTES } from "../../utils/sizeGuard.js";
import type {
  ReplicateAuth,
  ReplicateCreatePredictionInput,
  ReplicatePollOptions,
  ReplicatePrediction,
} from "../../types/index.js";

// The submit path sends `Prefer: wait=60`, so Replicate can legitimately
// hold the connection for up to 60s while the prediction warms / runs.
// A 30s client-side timeout aborts in the middle of that window and
// produces spurious "submit timed out" errors on cold models (e.g. the
// MusicGen ones). Bump to 90s to cover the server window plus headroom.
const REQUEST_TIMEOUT_MS = 90_000;
const DEFAULT_POLL_INTERVAL_MS = 2_000;
const DEFAULT_TOTAL_TIMEOUT_MS = 5 * 60_000;

/**
 * Submit a Replicate prediction. Uses `Prefer: wait=60` so quick
 * predictions complete in the initial POST and skip polling entirely.
 */
export async function createPrediction(
  auth: ReplicateAuth,
  input: ReplicateCreatePredictionInput,
): Promise<ReplicatePrediction> {
  const baseUrl = auth.baseUrl ?? "https://api.replicate.com";
  const [modelPath, version] = input.model.split(":", 2);

  const endpoint = version
    ? `${baseUrl}/v1/predictions`
    : `${baseUrl}/v1/models/${modelPath}/predictions`;

  const body: Record<string, unknown> = version
    ? { version, input: input.input }
    : { input: input.input };

  if (input.webhook) {
    body.webhook = input.webhook;
  }
  if (input.webhookEventsFilter && input.webhookEventsFilter.length > 0) {
    body.webhook_events_filter = input.webhookEventsFilter;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Token ${auth.apiToken}`,
        "Content-Type": "application/json",
        Prefer: "wait=60",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err: unknown) {
    if (err instanceof NeuroLinkError) {
      throw err;
    }
    if (err instanceof Error && err.name === "AbortError") {
      throw new NeuroLinkError({
        code: ERROR_CODES.OPERATION_ABORTED,
        message: `Replicate predictions submit timed out after ${REQUEST_TIMEOUT_MS / 1000}s`,
        category: ErrorCategory.TIMEOUT,
        severity: ErrorSeverity.HIGH,
        retriable: true,
        originalError: err,
      });
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const raw = await response.text();
    throw new NeuroLinkError({
      code: ERROR_CODES.PROVIDER_NOT_AVAILABLE,
      message: `Replicate predictions submit failed: ${response.status} — ${sanitizeForLog(raw, 500)}`,
      category: ErrorCategory.NETWORK,
      severity: ErrorSeverity.HIGH,
      retriable: response.status >= 500,
    });
  }

  return (await response.json()) as ReplicatePrediction;
}

/**
 * Poll a Replicate prediction until it reaches a terminal status
 * (succeeded / failed / canceled) or the total timeout elapses.
 */
export async function pollPrediction(
  auth: ReplicateAuth,
  predictionId: string,
  options: ReplicatePollOptions = {},
): Promise<ReplicatePrediction> {
  const baseUrl = auth.baseUrl ?? "https://api.replicate.com";
  const startTime = Date.now();
  const totalTimeout = options.timeoutMs ?? DEFAULT_TOTAL_TIMEOUT_MS;
  const pollInterval = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;

  while (Date.now() - startTime < totalTimeout) {
    if (options.abortSignal?.aborted) {
      throw new NeuroLinkError({
        code: ERROR_CODES.OPERATION_ABORTED,
        message: "Replicate poll aborted by caller",
        category: ErrorCategory.ABORT,
        severity: ErrorSeverity.LOW,
        retriable: false,
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    // Forward caller abort into the in-flight fetch request.
    const onCallerAbort = (): void => controller.abort();
    options.abortSignal?.addEventListener("abort", onCallerAbort, {
      once: true,
    });

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/v1/predictions/${predictionId}`, {
        method: "GET",
        headers: { Authorization: `Token ${auth.apiToken}` },
        signal: controller.signal,
      });
    } catch (err: unknown) {
      if (err instanceof NeuroLinkError) {
        throw err;
      }
      if (err instanceof Error && err.name === "AbortError") {
        // Distinguish caller abort from internal timeout abort.
        if (options.abortSignal?.aborted) {
          throw new NeuroLinkError({
            code: ERROR_CODES.OPERATION_ABORTED,
            message: "Replicate poll aborted by caller",
            category: ErrorCategory.ABORT,
            severity: ErrorSeverity.LOW,
            retriable: false,
            originalError: err,
          });
        }
        throw new NeuroLinkError({
          code: ERROR_CODES.OPERATION_ABORTED,
          message: `Replicate poll request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`,
          category: ErrorCategory.TIMEOUT,
          severity: ErrorSeverity.HIGH,
          retriable: true,
          originalError: err,
        });
      }
      throw err;
    } finally {
      options.abortSignal?.removeEventListener("abort", onCallerAbort);
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const raw = await response.text();
      throw new NeuroLinkError({
        code: ERROR_CODES.PROVIDER_NOT_AVAILABLE,
        message: `Replicate poll failed: ${response.status} — ${sanitizeForLog(raw, 500)}`,
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.HIGH,
        retriable: response.status >= 500,
      });
    }

    const pred = (await response.json()) as ReplicatePrediction;

    if (pred.status === "succeeded") {
      return pred;
    }
    if (pred.status === "failed" || pred.status === "canceled") {
      throw new NeuroLinkError({
        code: ERROR_CODES.PROVIDER_NOT_AVAILABLE,
        message: `Replicate prediction ${pred.id} ${pred.status}: ${pred.error ?? "unknown"}`,
        category: ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable: pred.status === "failed",
      });
    }

    // Abortable sleep: resolves after pollInterval but rejects immediately
    // if the caller's AbortSignal fires, preventing up to pollInterval ms
    // of unnecessary blocking.
    await new Promise<void>((resolve, reject) => {
      const onAbort = (): void => {
        clearTimeout(timer);
        reject(
          new NeuroLinkError({
            code: ERROR_CODES.OPERATION_ABORTED,
            message: "Replicate poll aborted by caller",
            category: ErrorCategory.ABORT,
            severity: ErrorSeverity.LOW,
            retriable: false,
          }),
        );
      };
      const timer = setTimeout(() => {
        // Remove the abort listener when the timer fires normally so stale
        // listeners do not accumulate across many poll iterations.
        options.abortSignal?.removeEventListener("abort", onAbort);
        resolve();
      }, pollInterval);
      options.abortSignal?.addEventListener("abort", onAbort, { once: true });
    });
  }

  throw new NeuroLinkError({
    code: ERROR_CODES.OPERATION_ABORTED,
    message: `Replicate prediction ${predictionId} did not complete within ${Math.round(totalTimeout / 1000)}s`,
    category: ErrorCategory.TIMEOUT,
    severity: ErrorSeverity.HIGH,
    retriable: true,
  });
}

/**
 * Submit + poll. Combines `createPrediction` + `pollPrediction`.
 *
 * Uses `Prefer: wait=60` in the submit call so short jobs complete in the
 * initial POST and bypass polling entirely.
 */
export async function predict(
  auth: ReplicateAuth,
  input: ReplicateCreatePredictionInput,
  options: ReplicatePollOptions = {},
): Promise<ReplicatePrediction> {
  const submitted = await createPrediction(auth, input);
  if (submitted.status === "succeeded") {
    return submitted;
  }
  if (submitted.status === "failed" || submitted.status === "canceled") {
    throw new NeuroLinkError({
      code: ERROR_CODES.PROVIDER_NOT_AVAILABLE,
      message: `Replicate prediction ${submitted.id} ${submitted.status} on submit: ${submitted.error ?? "unknown"}`,
      category: ErrorCategory.EXECUTION,
      severity: ErrorSeverity.HIGH,
      retriable: submitted.status === "failed",
    });
  }
  return pollPrediction(auth, submitted.id, options);
}

/**
 * Download a Replicate prediction's binary output.
 *
 * Replicate models return either a single URL string or an array of URL
 * strings (multi-output models). For models that return base64 directly,
 * use a model-specific helper instead.
 *
 * @param prediction  The completed prediction to download.
 * @param maxBytes    Maximum bytes allowed. Defaults to {@link MAX_VIDEO_BYTES}
 *                    (256 MiB). Pass {@link MAX_AUDIO_BYTES} for music/TTS
 *                    outputs or {@link MAX_IMAGE_BYTES} for image outputs.
 */
export async function downloadPredictionOutput(
  prediction: ReplicatePrediction,
  maxBytes: number = MAX_VIDEO_BYTES,
): Promise<Buffer> {
  const output = prediction.output;
  const url = Array.isArray(output) ? output[0] : output;

  if (typeof url !== "string") {
    throw new NeuroLinkError({
      code: ERROR_CODES.PROVIDER_NOT_AVAILABLE,
      message: `Replicate prediction ${prediction.id} output is not a URL: ${typeof output}`,
      category: ErrorCategory.EXECUTION,
      severity: ErrorSeverity.HIGH,
      retriable: false,
    });
  }

  try {
    const buffer = await safeDownload(url, {
      maxBytes,
      label: `Replicate prediction ${prediction.id}`,
      timeoutMs: REQUEST_TIMEOUT_MS,
    });
    logger.debug(
      `[Replicate] Downloaded prediction ${prediction.id} output: ${buffer.length} bytes`,
    );
    return buffer;
  } catch (err: unknown) {
    if (err instanceof NeuroLinkError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : String(err);
    throw new NeuroLinkError({
      code: ERROR_CODES.PROVIDER_NOT_AVAILABLE,
      message: `Replicate output download failed: ${message} — ${url}`,
      category: ErrorCategory.NETWORK,
      severity: ErrorSeverity.HIGH,
      retriable: true,
      originalError: err instanceof Error ? err : undefined,
    });
  }
}
