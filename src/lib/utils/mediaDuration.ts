/**
 * Shared duration formatting for the media processors.
 *
 * AudioProcessor and VideoProcessor each carried their own private
 * `formatDuration`, and they disagreed: the same two-second file rendered as
 * "0:02" from audio and "2s" from video, and a zero duration as "0:00" versus
 * "0s". Both strings land in the `textContent` handed to the model, often in
 * the same request when a video's muxed audio is described alongside it, so
 * the mismatch reads as two different facts about one file.
 *
 * The explicit-unit form wins over the "m:ss" clock form because these strings
 * are consumed by a language model, not rendered in a player scrubber: "1m 30s"
 * has exactly one reading, while "1:30" is ambiguous between 1m30s and 1h30m
 * and has to be disambiguated from context that may not be present.
 */

/**
 * Format a duration in seconds as explicit units — "45s", "1m 30s", "1h 2m 3s".
 *
 * Non-finite, negative and zero durations all render as "0s": callers reach
 * this with a probe failure or a stream that reports no duration, and a
 * fabricated number would be worse than an obvious zero.
 */
export function formatMediaDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "0s";
  }

  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  const parts: string[] = [];
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0) {
    parts.push(`${minutes}m`);
  }
  // Keep the seconds term when it is the only one, so sub-minute durations
  // never render as an empty string.
  if (secs > 0 || parts.length === 0) {
    parts.push(`${secs}s`);
  }

  return parts.join(" ");
}

/**
 * Format the moment a video keyframe was sampled at — "3.00s",
 * "1234.00s (20m 34s)".
 *
 * Deliberately not the clock form, for the reason in this module's header:
 * the string is read by a language model, and "0:03" is ambiguous. That is
 * not theoretical here — an early draft labelled frames "0:03" and the model
 * reported the green frame as appearing at "3:00".
 *
 * Deliberately not `formatMediaDuration` alone either. That rounds to whole
 * seconds, and an explicit `videoOptions.frames` spreads frames evenly rather
 * than on the duration tier: sixteen frames across a 3.6s clip are 0.225s
 * apart, and every one of them would render as "0s". The precise value is
 * therefore always present, with the readable form added only past a minute,
 * where "1234.00s" stops meaning anything to a reader.
 *
 * Non-finite and negative inputs clamp to zero rather than emitting "NaNs".
 */
export function formatKeyframeTimestamp(seconds: number): string {
  const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  const precise = `${safe.toFixed(2)}s`;
  return safe >= 60 ? `${precise} (${formatMediaDuration(safe)})` : precise;
}
