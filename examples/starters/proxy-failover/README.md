# proxy-failover

Shows how to run Claude Code through the NeuroLink Claude proxy, which pools multiple
Anthropic accounts and fails over between them on rate limits. `src/index.ts` is a small
CLI that queries the proxy's local `/status` endpoint and prints a health/account summary.

## Quickstart

```bash
npx degit juspay/neurolink/examples/starters/proxy-failover my-app
cd my-app && npm install
cp .env.example .env   # defaults match the proxy's defaults, edit only if you changed them
npm start
```

## Set up the proxy itself

This starter does not start the proxy — it only checks on one that's already running.
To set one up:

```bash
# Install the CLI if you haven't already
npm install -g @juspay/neurolink

# One-command setup: authenticates via OAuth, installs the proxy as a background
# service, and points Claude Code at it (sets ANTHROPIC_BASE_URL)
neurolink proxy setup

# Add more Anthropic accounts to the pool for higher aggregate throughput
neurolink auth login anthropic --method oauth --add --label work
neurolink auth login anthropic --method oauth --add --label personal

# Restart Claude Code to pick up the new ANTHROPIC_BASE_URL, then verify:
neurolink proxy status
```

The proxy listens on `http://127.0.0.1:55669` by default. When a pooled account hits a
429, the proxy rotates to the next account automatically; when all accounts are
exhausted it can fall back to other providers configured in NeuroLink.

## What `npm start` does

Fetches `GET /status` from the running proxy and prints:

- process id, address, routing strategy, uptime
- total requests / successes / errors / rate-limits
- per-account request and error counts

If the proxy isn't running, it prints a clear message (not a stack trace) telling you
to run `neurolink proxy start` or `neurolink proxy setup`.

This starter makes no calls to Anthropic — it only talks to the local proxy process.

## Reference

- `neurolink proxy setup` / `neurolink proxy start` / `neurolink proxy status` — see
  `docs/features/claude-proxy.md` and `docs/features/claude-proxy-config-reference.md`
  in the main NeuroLink repo.
