# Migration Guide (v7.40 → v7.47)

Use this guide when upgrading existing NeuroLink deployments to the 7.47 release train. The focus is on new capabilities (multimodal chat, auto evaluation, loop mode, orchestration) and the configuration changes required to adopt them safely.

## Compatibility Summary

| Area          | Status                                                                                 |
| ------------- | -------------------------------------------------------------------------------------- |
| Core SDK APIs | ✅ Backward compatible. `generate()` and `stream()` signatures are unchanged.          |
| CLI commands  | ✅ Existing scripts continue to work. New options are opt-in.                          |
| Configuration | ⚠️ New environment variables for evaluation and regional routing. Review `.env` files. |
| Tooling       | ✅ MCP, analytics, and telemetry remain compatible.                                    |

## Recommended Upgrade Steps

1. **Update dependencies**

   ```bash
   npm install @juspay/neurolink@^7.47.0
   # or
   pnpm add @juspay/neurolink@^7.47.0
   ```

2. **Refresh CLI binaries**

   ```bash
   npm install -g @juspay/neurolink@^7.47.0
   neurolink --version
   ```

3. **Review new environment variables**
   - Add `NEUROLINK_EVALUATION_PROVIDER`, `NEUROLINK_EVALUATION_MODEL`, and `NEUROLINK_EVALUATION_THRESHOLD` if you enable the auto-evaluation engine.
   - Ensure `AWS_REGION` / `GOOGLE_VERTEX_LOCATION` are set when targeting specific regions.
   - Provide `REDIS_URL` if you want loop sessions to auto-mount persistent memory.

4. **Adopt multimodal support**
   - CLI: use `--image` (multiple allowed) with `generate` or `stream`.
   - SDK: pass `input.images` (`string` path, HTTPS URL, or `Buffer`).
   - Update downstream parsing to handle `result.toolCalls` on multimodal calls.

5. **Leverage auto evaluation (optional)**
   - CLI: add `--enableEvaluation` to commands or set it once inside `neurolink loop` (`set enableEvaluation true`).
   - SDK: include `enableEvaluation: true` per request.
   - Capture `result.evaluation` in logs or dashboards.

6. **Introduce loop sessions to teams**
   - Document the new `loop` workflow, especially how to `set provider`, `set model`, and export transcripts.
   - Configure Redis for persistent memory where collaboration spans multiple terminals.

7. **Enable orchestration (server workloads)**
   - Instantiate `new NeuroLink({ enableOrchestration: true })` for services that benefit from automatic provider routing.
   - Monitor debug logs (`NEUROLINK_DEBUG=true`) in staging before enabling in production.

## Behaviour Changes to Note

- **Evaluation output** – `GenerateResult` now includes `toolCalls`, `toolResults`, and richer `analytics`. Update any custom serializers accordingly.
- **Loop session variables** – The new session state respects `set`/`unset` commands. Scripts that previously relied on global env variables should be adjusted to set session variables explicitly.
- **Redis auto-detect** – Starting a loop with `--auto-redis` sets `STORAGE_TYPE=redis` automatically. Ensure Redis credentials are valid; otherwise disable with `--no-auto-redis`.
- **Regional routing** – Requests that include `region` now forward directly to the provider. Validate quota and model availability per region to avoid 404s.

## Testing Checklist

- Run `npx @juspay/neurolink status --verbose` after upgrading credentials.
- Execute a multimodal CLI call (`generate --image`) to confirm file uploads succeed.
- Run a sample with `--enableEvaluation --format json` and verify the evaluation block is emitted.
- Stress-test loop mode with Redis by running `memory stats` and `memory history`.
- If orchestration is enabled, tail logs for `Orchestration route determined` messages and confirm provider availability.

## Rollback Plan

- Keep the previous CLI binary (`npm install -g @juspay/neurolink@<old-version>`) handy.
- Maintain separate `.env` files for pre- and post-upgrade configurations.
- Disable orchestration and evaluation env vars if you encounter regressions; core generation continues to work without them.

For additional support open an issue on GitHub or reach out via the Juspay developer channels.
