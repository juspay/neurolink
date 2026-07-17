# NeuroLink Chat Starter

A minimal terminal chat loop built on NeuroLink's streaming API. It reads a line from
stdin, streams the model's reply token-by-token to stdout, and repeats — NeuroLink
auto-selects whichever provider matches the API key you set, no provider code required.

## Quickstart

```bash
npx degit juspay/neurolink/examples/starters/chat my-app
cd my-app && npm install
cp .env.example .env   # then set one provider API key
npm start
```

## What it does

- `src/index.ts` runs a `readline/promises` loop, sending each line you type to
  `neurolink.stream({ input: { text } })` and writing chunks to stdout as they arrive.
- Type `/exit` (or Ctrl+C) to quit.
- To pin a specific provider/model instead of auto-selection, see the commented
  example in `src/index.ts`.

## Configuration

Copy `.env.example` to `.env` and set exactly one provider key (e.g. `OPENAI_API_KEY`,
`ANTHROPIC_API_KEY`, or `GOOGLE_AI_API_KEY`). NeuroLink picks the first available one.

## Scripts

- `npm start` — run the chat loop.
- `npm run typecheck` — type-check without emitting.
