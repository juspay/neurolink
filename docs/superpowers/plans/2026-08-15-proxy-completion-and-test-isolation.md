# Proxy Completion and Test Isolation

Date: 2026-08-15
Base: `origin/release` at `09aed899` (`10.12.5`)
Branch: `fix/proxy-completion-and-test-isolation`

## Non-Negotiable Safety Boundary

- [x] Work in a clean, separate worktree based on the latest fetched release.
- [x] Do not install, stop, restart, signal, reconfigure, authenticate, or send
      traffic through the installed proxy.
- [x] Do not read or write the operator's proxy state, Claude settings, tokens,
      credentials, quota snapshots, cooldowns, statistics, or logs from tests.
- [x] Permit process-level tests only with a disposable home and non-live port.
- [x] Remove provider credentials from offline test processes.
- [x] Block provider endpoints and the installed listener in Vitest.
- [x] Require `NEUROLINK_PROXY_TEST_ALLOW_LIVE=1` for any real provider test.
- [x] Keep this release-bound PR to one commit after the final rebase.

## Incident Findings Closed by This PR

### Test suite mutated the installed proxy

Root cause: `continuous-test-suite-proxy.ts` backed up, deleted, and restored the
real `~/.neurolink/proxy-state.json` and `~/.claude/settings.json`. A failed or
overlapping run could leave the installed daemon with stale or missing state.

- [x] Allocate a disposable home before resolving test paths.
- [x] Delete all backup, delete, and restore operations against operator files.
- [x] Pass the isolated environment to the child proxy.
- [x] Use port `9876`, never the installed port `55669`.
- [x] Scrub provider credentials unless live execution is explicitly enabled.
- [x] Skip credential-dependent cases by default.
- [x] Remove the obsolete Sonnet 4 test default and use `claude-sonnet-4-6`.
- [x] Add regression assertions for the isolation boundary.
- [x] Restore all proxy Vitest suites to the offline `test:unit` CI tier.

### Candidate workers could miss the readiness deadline

Root cause: worker startup called synchronous recursive `cleanupLogs(7, 500)`
before publishing readiness. A large body/log tree could consume the 30-second
candidate deadline. The hourly retention run also executed on the serving event
loop and could interrupt active requests.

- [x] Remove retention from worker startup.
- [x] Run retention only after readiness.
- [x] Execute recursive scanning and deletion in a worker thread.
- [x] Coalesce overlapping cleanup cycles.
- [x] Unref cleanup timers and worker so they do not own process lifetime.
- [x] Terminate the cleanup worker during bounded proxy shutdown.
- [x] Preserve current-day compact request, attempt, debug, and lifecycle data.
- [x] Surface worker failures through debug diagnostics.
- [x] Prove compiled cleanup removes old artifacts while the parent loop ticks.

### Overload fallback could amplify an upstream burst

Root cause: immediate HTTP/SSE overload responses rotated accounts without any
pacing. A burst could therefore consume every account's transient admission
capacity in rapid succession.

- [x] Add bounded jittered overload delays of 250, 500, 1000, then 2000 ms.
- [x] Apply pacing only after classified overload responses and before safe
      pre-commit account rotation.
- [x] Preserve immediate rotation for genuine quota exhaustion.
- [x] Preserve the no-replay rule after a response is committed.
- [x] Test the exact first delay and the bounded progression.

### Analysis could overstate recovered requests

Root cause: request and attempt logs were treated as comparable whenever both
file types existed, even when retention left different observation windows.

- [x] Track complete-window quality separately for each stream.
- [x] Compute recovered-after-retry only when request and attempt windows are
      comparable.
- [x] Print an explicit unavailable/partial warning instead of a false count.
- [x] Test a retained-attempt/partial-request window.

### Rolling failures lacked bounded event detail

Root cause: persisted supervisor state retained aggregate rejected-socket and
failed-transfer totals but not enough recent generation/version context.

- [x] Persist a bounded 100-event supervisor journal.
- [x] Record activation, startup/activation failure, failed transfer, and
      rejected socket events with generation, version, timestamp, and reason.
- [x] Test generation-scoped transfer and rejection evidence.

### Process suite had stale assertions

- [x] Assert the Anthropic `/v1/models` schema on the Claude-compatible route.
- [x] Timestamp fixed-clock quota fixtures at the same fixed observation time.
- [x] Re-run the process suite offline: 20 passed, 0 failed, 6 intentionally
      skipped because no provider credentials were admitted.

## Requirements Already Present on the Release Base

The following were rechecked in source and focused tests rather than duplicated:

- [x] Explicit account enablement and exclusion controls.
- [x] Fill-first, round-robin, configured-primary, and quota-routing-off modes.
- [x] Unified, 5-hour, 7-day, freshness, expiry, soft-limit, and overage-aware
      quota ordering.
- [x] Reset-aware cooldown persistence and stale-cooldown recovery.
- [x] HTTP 429, immediate SSE error, auth, transport, timeout, validation, and
      client-cancellation classifications.
- [x] Safe pre-commit fallback and no post-commit stream replay.
- [x] Bounded terminal-error journal and separate aggregate statistics.
- [x] Account statistics table and explicit unattributed/internal accounting.
- [x] Redacted four-phase body capture, deterministic replay export, and
      operator-authorized direct comparison.
- [x] Hot routing/config snapshots with invalid-generation rollback.
- [x] Same-version environment-triggered rolling worker replacement.
- [x] Stable listener, candidate readiness/version validation, worker drain,
      package rollback, and serialized replacement foundations.
- [x] Direct-versus-proxy latency, lifecycle overhead, rolling handoff, CPU,
      memory, descriptor, event-loop delay, sustained concurrency, and no-drop
      benchmark budgets.

## Verification Matrix for This PR

- [x] Focused Vitest: analysis, routing reliability, updater fallback,
      observability, rolling handoff, and test isolation.
- [x] Built the CLI.
- [x] Completed TypeScript type compilation.
- [x] Compiled cleanup-worker smoke test with parent event-loop progress.
- [x] Offline process-level proxy suite against disposable state.
- [x] Full typecheck.
- [x] Formatting check.
- [x] ESLint for changed files.
- [x] All proxy Vitest suites: 254 passed.
- [x] Continuous bugfix suite: 275 passed.
- [ ] Full offline `test:unit` chain: attempted, but the unchanged release-base
      `continuous-test-suite-file-detector-extension.ts` stopped the chain at its
      invalid-extension case after env guard 118/118 and bugfix 275/275 passed.
      The dedicated proxy gate still passed independently.
- [x] Proxy lifecycle, transport, stats, and rolling performance gates.
- [x] Review pass 1: behavior, unsafe replay, and routing semantics. Corrected
      final-account overload pacing so no delay occurs without a next account.
- [x] Review pass 2: races, shutdown, worker/resource leaks, and error paths.
- [x] Review pass 3: privacy, credential leakage, live-state access, and scope.
- [ ] Fetch/rebase latest `origin/release` immediately before publication.
- [ ] Squash to exactly one commit over release.
- [ ] Push and open one PR.
- [ ] Check every inline and outside-diff review comment, mergeability, and CI.

## Proof That Must Remain Post-Merge and Separately Authorized

These cannot truthfully be completed inside a PR while also obeying the explicit
instruction not to touch the running proxy:

- [ ] Verify package publication and updater detection for the merged version.
- [ ] Run a real cross-version rolling update while the stable supervisor PID
      remains unchanged.
- [ ] Continuously probe the public listener during update.
- [ ] Complete concurrent normal and long-lived streaming requests across the
      handoff without rejected sockets, failed transfers, or body interruption.
- [ ] Inject a candidate-readiness failure and prove the old version remains
      active and package state rolls back.
- [ ] Verify configuration and environment changes apply through snapshots or
      rolling replacement without a visible service restart.
- [ ] Compare post-release live counters and retained failure evidence from a
      user-approved observation interval.

No PR or synthetic test should mark these live acceptance items complete.
