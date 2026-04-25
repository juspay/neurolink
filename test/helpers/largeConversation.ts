/**
 * Builds a large `conversationMessages` array sized to overflow a real
 * provider's context window. No fake — the messages are sent to the real API
 * and produce the real "prompt is too long" 400.
 */

const SENTENCES = [
  "The quick brown fox jumps over the lazy dog.",
  "Artificial intelligence is transforming industries worldwide.",
  "Cloud computing enables scalable infrastructure for modern applications.",
  "Machine learning models require large datasets for training.",
  "Natural language processing helps computers understand human text.",
  "Deep learning architectures have revolutionized image recognition.",
  "Distributed systems provide fault tolerance and high availability.",
  "Microservices architecture allows independent deployment of components.",
  "Containerization with Docker simplifies application deployment.",
  "Kubernetes orchestrates container workloads at scale.",
  "GraphQL provides flexible data querying for APIs.",
  "TypeScript adds type safety to JavaScript development.",
  "React and Vue are popular frontend frameworks.",
  "Node.js enables server-side JavaScript execution.",
  "PostgreSQL is a powerful open-source relational database.",
];

/**
 * Generate roughly `targetTokens` worth of English text (~0.75 words/token).
 *
 * Reviewer follow-up: the previous implementation compared `out.length`
 * (sentence count) against `wordCount` (target word count) and overshot by
 * the average sentence length (~9×). Now tracks individual words and slices
 * the final sentence so the output is the requested word count.
 */
export function generateLargeText(targetTokens: number): string {
  const wordsPerToken = 0.75;
  const wordCount = Math.ceil(targetTokens * wordsPerToken);
  const words: string[] = [];
  let i = 0;
  while (words.length < wordCount) {
    const sentenceWords = SENTENCES[i++ % SENTENCES.length].split(/\s+/);
    for (const w of sentenceWords) {
      if (words.length >= wordCount) {
        break;
      }
      words.push(w);
    }
  }
  return words.join(" ");
}

export type LargeConvOptions = {
  /** Total target tokens across all messages combined. */
  targetTokens: number;
  /** Tokens per turn. Default 5_000. */
  perTurnTokens?: number;
};

export function buildLargeConversationMessages(
  o: LargeConvOptions,
): Array<{ role: "user" | "assistant"; content: string }> {
  const perTurn = o.perTurnTokens ?? 5_000;
  const turns = Math.ceil(o.targetTokens / perTurn);
  const msgs: Array<{ role: "user" | "assistant"; content: string }> = [];
  for (let i = 0; i < turns; i++) {
    msgs.push({
      role: i % 2 === 0 ? "user" : "assistant",
      content: `Turn ${i + 1}: ${generateLargeText(perTurn)}`,
    });
  }
  return msgs;
}
