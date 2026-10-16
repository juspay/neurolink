/**
 * Transcription sessions: one call, several speakers, every listener in the
 * languages they chose.
 *
 * Each speaker is its own `transcribeStream()` (a call platform gives one
 * track per participant). The session's output languages are the union of
 * what its listeners read right now, read once per utterance, so ten
 * listeners in Spanish cost one rendering and a language nobody reads costs
 * nothing. A listener receives the transcript events of the speakers it
 * follows and only the `output` events of its own languages.
 *
 * Late joiners get the backlog: the last `backlog` utterances, with every
 * rendering that was made for them. A language added later applies from the
 * next utterance on.
 *
 * @module voice/session/transcriptionSession
 */

import { randomUUID } from "node:crypto";
import type { NeuroLink } from "../../neurolink.js";
import type {
  TranscribeStreamOptions,
  TranscriptionSessionEvent,
  TranscriptionSessionOptions,
  TranscriptionSubscriberOptions,
  TranscriptionSubscription,
} from "../../types/index.js";
import { logger } from "../../utils/logger.js";
import { MAX_OUTPUT_LANGUAGES, outputLanguagesOf } from "../output/render.js";

const DEFAULT_BACKLOG = 50;

function normalizeTags(tags: readonly string[] | undefined): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const tag of tags ?? []) {
    const trimmed = typeof tag === "string" ? tag.trim() : "";
    if (trimmed && !seen.has(trimmed.toLowerCase())) {
      seen.add(trimmed.toLowerCase());
      out.push(trimmed);
    }
  }
  return out;
}

class Subscriber {
  languages: string[];
  speakers: Set<string> | undefined;
  constructor(
    options: TranscriptionSubscriberOptions,
    readonly deliver: (event: TranscriptionSessionEvent) => void,
    readonly interim: boolean,
  ) {
    this.languages = normalizeTags(options.languages);
    this.speakers = options.speakers?.length
      ? new Set(options.speakers)
      : undefined;
  }

  wants(event: TranscriptionSessionEvent): boolean {
    if (this.speakers && !this.speakers.has(event.speaker)) {
      return false;
    }
    if (
      !this.interim &&
      (event.type === "interim" || event.type === "correcting")
    ) {
      return false;
    }
    if (event.type === "output") {
      const tag = event.language.toLowerCase();
      return this.languages.some((l) => l.toLowerCase() === tag);
    }
    return true;
  }
}

export class TranscriptionSession {
  readonly id: string;
  private readonly subscribers = new Set<Subscriber>();
  /** Settled events per `speaker:utterance`, oldest group first. */
  private readonly backlog = new Map<string, TranscriptionSessionEvent[]>();
  private readonly backlogSize: number;
  private readonly maxLanguages: number;
  private readonly speakers = new Set<string>();
  private _unnamed = 0;
  private closed = false;

  constructor(
    private readonly neurolink: Pick<NeuroLink, "transcribeStream">,
    private readonly options: TranscriptionSessionOptions = {},
  ) {
    this.id = options.id?.trim() || randomUUID();
    this.backlogSize = Math.max(
      0,
      Math.floor(options.backlog ?? DEFAULT_BACKLOG),
    );
    this.maxLanguages = Math.max(
      1,
      Math.min(
        MAX_OUTPUT_LANGUAGES,
        Math.floor(options.maxLanguages ?? MAX_OUTPUT_LANGUAGES),
      ),
    );
  }

  /** The output languages listeners read now, in order of first request, capped. */
  languages(): string[] {
    return normalizeTags(
      [...this.subscribers].flatMap((s) => s.languages),
    ).slice(0, this.maxLanguages);
  }

  /** Speakers whose audio is being transcribed now. */
  activeSpeakers(): string[] {
    return [...this.speakers];
  }

  get listenerCount(): number {
    return this.subscribers.size;
  }

  get isClosed(): boolean {
    return this.closed;
  }

  /** A fallback name no speaker in this session holds (a counter, so a leaver's name is not reused). */
  private _unnamedSpeaker(): string {
    let name: string;
    do {
      this._unnamed++;
      name = `speaker-${this._unnamed}`;
    } while (this.speakers.has(name));
    return name;
  }

  /**
   * Transcribe one speaker until its audio ends (or the session closes).
   * Every event goes to the session's listeners; `onEvent`, when given, sees
   * them too (the speaker's own captions). The speaker's own
   * `output.languages`, if any, are rendered in addition to the listeners'.
   */
  async addSpeaker(
    speaker: string,
    options: TranscribeStreamOptions,
    onEvent?: (event: TranscriptionSessionEvent) => void,
  ): Promise<void> {
    if (this.closed) {
      throw new Error(`Transcription session ${this.id} is closed`);
    }
    const name = speaker.trim() || this._unnamedSpeaker();
    if (this.speakers.has(name)) {
      throw new Error(`Speaker "${name}" is already in session ${this.id}`);
    }
    this.speakers.add(name);
    const own = options.output;
    const languages = {
      current: (): readonly string[] =>
        normalizeTags([...outputLanguagesOf(own), ...this.languages()]).slice(
          0,
          MAX_OUTPUT_LANGUAGES,
        ),
    };
    try {
      for await (const event of this.neurolink.transcribeStream({
        ...options,
        output: { ...this.options.output, ...own, languages },
      })) {
        if (this.closed) {
          break;
        }
        const tagged: TranscriptionSessionEvent = { ...event, speaker: name };
        this.remember(tagged);
        this.broadcast(tagged);
        try {
          onEvent?.(tagged);
        } catch (error) {
          logger.warn("[TranscriptionSession] speaker callback failed", {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    } finally {
      this.speakers.delete(name);
    }
  }

  /** Follow the session. With `backlog` (the default), the last utterances are replayed first. */
  subscribe(
    options: TranscriptionSubscriberOptions,
    onEvent: (event: TranscriptionSessionEvent) => void,
  ): TranscriptionSubscription {
    const subscriber = new Subscriber(
      options,
      onEvent,
      options.interim !== false,
    );
    if (!this.closed) {
      this.subscribers.add(subscriber);
    }
    if (options.backlog !== false) {
      for (const group of this.backlog.values()) {
        for (const event of group) {
          if (subscriber.wants(event)) {
            this.safeDeliver(subscriber, event);
          }
        }
      }
    }
    const subscribers = this.subscribers;
    return {
      get languages(): readonly string[] {
        return subscriber.languages;
      },
      update: (next) => {
        if (next.languages) {
          subscriber.languages = normalizeTags(next.languages);
        }
        if (next.speakers) {
          subscriber.speakers = next.speakers.length
            ? new Set(next.speakers)
            : undefined;
        }
      },
      close: () => {
        subscribers.delete(subscriber);
      },
    };
  }

  /** Stop delivering; speakers' streams end at their next event. */
  close(): void {
    this.closed = true;
    this.subscribers.clear();
    this.backlog.clear();
  }

  private remember(event: TranscriptionSessionEvent): void {
    if (
      this.backlogSize === 0 ||
      event.type === "interim" ||
      event.type === "correcting" ||
      event.utterance === undefined
    ) {
      return;
    }
    const key = `${event.speaker}:${event.utterance}`;
    const group = this.backlog.get(key) ?? [];
    group.push(event);
    this.backlog.set(key, group);
    while (this.backlog.size > this.backlogSize) {
      const oldest = this.backlog.keys().next().value;
      if (oldest === undefined) {
        break;
      }
      this.backlog.delete(oldest);
    }
  }

  private broadcast(event: TranscriptionSessionEvent): void {
    for (const subscriber of this.subscribers) {
      if (subscriber.wants(event)) {
        this.safeDeliver(subscriber, event);
      }
    }
  }

  private safeDeliver(
    subscriber: Subscriber,
    event: TranscriptionSessionEvent,
  ): void {
    try {
      subscriber.deliver(event);
    } catch (error) {
      logger.warn("[TranscriptionSession] listener callback failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
