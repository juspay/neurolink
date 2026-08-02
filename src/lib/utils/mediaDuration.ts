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
