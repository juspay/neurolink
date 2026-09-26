# TUA-Bench full run: Neurolink vs Claude Code on one setup

This runbook produces the comparable number the pilot could not: Neurolink and a reference harness (Claude Code), both run by us, on the same x86_64 Linux host. Both use the same model, the same thinking budget, the same oracle-validated task set and the same number of attempts. Every model request is logged with the model that served it and the thinking setting it carried.

Read `benchmark-tua-pilot.md` first. Several steps below exist because of something that went wrong there.

## Decisions to make before starting

| Decision        | Options                                                                                                            | Recommendation                                                                                                                           |
| --------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Model           | Any Anthropic model both harnesses can call                                                                        | The model you most want a Neurolink claim about. For continuity with the pilot, `claude-sonnet-4-5-20250929`.                            |
| Thinking        | Off, or a fixed budget N                                                                                           | A fixed budget (e.g. 8000). Leaderboard rows use `max`; Neurolink's CLI has no `max`, so match budgets rather than names.                |
| Model access    | Direct API key (`MODEL_UPSTREAM=https://api.anthropic.com`), or a dedicated Neurolink proxy with no fallback chain | Direct API key. The shared pool in the pilot cooled mid-run and returned 502s.                                                           |
| Neurolink build | A published release carrying the fixes                                                                             | Run a released tarball that carries agent mode and the cached-token cost fix (#1792), so the claim is about something users can install. |
| Attempts        | K                                                                                                                  | 5, to report Pass@1, Pass@5 and All-5 like the leaderboard.                                                                              |

## Host

- **Machine.** x86_64 Linux with Docker and Python 3.12+ with `uv`. Budget roughly 16 vCPU and 64 GB RAM for 8 concurrent trials, and 500 GB of free disk for 120 task images plus build cache.
- **Why x86_64.** It removes both host-specific failures seen on the Mac. Task 011's x86-only binary crashed under Rosetta, and 079's verifier died with SIGILL on aarch64.
- **Clock.** Keep NTP running. Trial timestamps are how the integrity check proves the agent finished before the verifier's files arrived.

## Steps

### 1. Check out and prepare TUA-Bench

```bash
git clone https://github.com/facebookresearch/TUA-Bench && cd TUA-Bench
git checkout 3497fd3   # or the commit you intend to report; record it
uv sync && uv run setup-env
```

`setup-env` downloads assets that are not in the repository. Re-run it after pulling task changes.

### 2. Build the harnesses and their offline bundles

Per-trial network installs failed 8 of 18 times in the pilot when the link slowed. Build each harness once and copy it into every trial instead.

```bash
# Neurolink: the released tarball (or pnpm pack of the commit under test)
npm pack @juspay/neurolink@<version>
# Claude Code: pin the version you will report
npm pack @anthropic-ai/claude-code@<version>

B=benchmarks/tua-bench
IMG=<a built task image with the oldest glibc; build one task first with the oracle>
$B/build_bundle.sh juspay-neurolink-<version>.tgz neurolink-x64.tar.gz "$IMG" 22.23.2 x64
BUNDLE_DIR=claude-node $B/build_bundle.sh anthropic-ai-claude-code-<version>.tgz claude-x64.tar.gz "$IMG" 22.23.2 x64
```

Each bundle writes a `.txt` with the Node version, the source tarball's sha256 and its own sha256. `run_baseline.sh` refuses a Neurolink bundle built from a different tarball than the one declared.

### 3. Write the run configuration

```bash
cat > fullrun.env <<'EOF'
TUA=/path/to/TUA-Bench
RUN_PREFIX=full-sonnet45-think8000
MODEL=anthropic/claude-sonnet-4-5-20250929
THINKING_BUDGET=8000            # empty = thinking off in both harnesses
K=5
CONCURRENCY=8
NEUROLINK_TGZ=/path/to/juspay-neurolink-<version>.tgz
NEUROLINK_BUNDLE=/path/to/neurolink-x64.tar.gz
CLAUDE_CODE_BUNDLE=/path/to/claude-x64.tar.gz
NEUROLINK_ARGS="--agent-mode --tool-root /"
MODEL_UPSTREAM=https://api.anthropic.com   # or NEUROLINK_PROXY_BASE_URL=http://<proxy>:<port>
EOF
export ANTHROPIC_API_KEY=...   # never write it into the config file or the evidence
```

Leave `ENV_IMPORT_PATH` unset on Linux: harbor's Docker environment is the default. With `--no-delete` (the runner's setting), Docker removes each trial's containers but keeps task images, so later attempts don't rebuild them. On the Mac, set `ENV_IMPORT_PATH=cached_podman:CachedPodmanEnvironment`.

### 4. Run

```bash
benchmarks/tua-bench/fullrun.sh fullrun.env 2>&1 | tee fullrun.log
```

`fullrun.sh` does, in order:

1. **Preflight.** Checks the architecture, Docker and the three files.
2. **Oracle validation** (`oracle_validate.sh`). Runs every reference solution through its verifier once. Only tasks the oracle passes in full go forward; the rest are listed in `oracle_failing.txt` and must be reported.
3. **Parity preflight.** Runs one fast task (106) on each harness and stops unless both ledgers show the target model and the same thinking setting on every request. This check exists because Claude Code 2.1.280 silently sent a 31999-token budget when asked for 4000 with `--ak thinking=enabled`. The runner now passes only `max_thinking_tokens`.
4. **Full runs.** Neurolink, then Claude Code, each over the validated tasks × K.
5. **Repair rounds.** Re-schedule only failures the harness didn't cause, until every task has K scored attempts or the round budget (`REPAIR_ROUNDS`, default 2) runs out:
   - an infra failure, where the agent never started;
   - an integrity exclusion, where another model answered;
   - a service failure, where the last model request in the ledger failed.

   A harness's own crash or timeout is scored as the verifier scores it, so neither harness gets extra attempts for its own failures. Tasks still short are reported as incomplete, never scored on fewer attempts.

6. **Summaries.** Writes per-trial and per-task summaries, the integrity scan and the leaderboard metrics with a paired comparison.

Expect about 6–9 hours per harness at 8-way concurrency. The pilot on a Mac took 5–7 minutes per trial slot. Cost scales with the model's price: in the Mac full run, Sonnet 4.5 with an 8,000-token thinking budget cost about $0.29 per Neurolink trial and $0.22 per Claude Code trial at list price, priced per request from the ledger. Don't budget from Neurolink's own cost report; it double-counted cached tokens before #1792.

### 5. Check before you quote anything

- **Identity.** In every `summary-all/trials.jsonl`, `model_identity_ok` is true for every scored trial, and `thinking` holds one value per harness, the same for both (`null` and `{type: disabled}` both mean off).
- **Integrity.** `integrity.jsonl` is empty or every hit has been read by a person. An agent that probes an empty `/solution` while looking for its inputs is not cheating, but it must be documented.
- **Oracle exclusions.** They are listed, and the same for both harnesses.
- **Incomplete tasks.** None, or listed with their counts.
- **The claim matches the data.** Report the paired comparison on shared tasks with its bootstrap interval, not the difference of two averages. Report the 7 pilot tasks separately from the other 113, because Neurolink's agent-mode prompt was written after seeing those 7 fail.

## Output

`<evidence>/<RUN_PREFIX>-metrics.txt` holds, per harness, Success Rate ± SE, Pass@1 ± SE, Pass@5 and All-5 over complete tasks. It also holds the paired difference (Neurolink − Claude Code) in success rate and Pass@1, with 95% bootstrap intervals over tasks and a count of tasks better, worse and tied. Everything is traceable to `RUN.txt`, which records commits, tarball and bundle hashes, agent arguments and the model, and to `HASHES.sha256` in each evidence directory.

## Lessons from the pilot this runbook encodes

| Pilot failure                                                             | Guard                                                                           |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| The adapter passed no model; Neurolink silently used its default          | Adapters refuse to run without an explicit `provider/model`                     |
| The proxy's fallback chain could answer with another model                | Per-request ledger; any non-target response excludes the trial                  |
| Setup downloads stalled past the timeout on a slow link                   | Offline bundles; apt retries; doubled setup timeout                             |
| Claude Code's explicit `thinking=enabled` overrode the requested budget   | `max_thinking_tokens` only; parity preflight on the ledger                      |
| Editing a script while bash was executing it                              | Never edit `run_baseline.sh` or `model_ledger.mjs` while a run is in progress   |
| An adapter post-step did work the agent had not done (spreadsheet recalc) | Off by default; any score produced with it is excluded                          |
| A host-specific verifier crash looked like an agent failure (079)         | Oracle validation first; bare `0` from a crashed verifier is a verifier failure |

## Lessons from the full run on the Mac

| Failure                                                                                                                                                                       | Guard                                                                                                                                                                                                       |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--timeout 300` bounds Neurolink's whole tool-using generation, which it restarts from the prompt, so runs ended at ~15 minutes (8 of 15 scored trials) or restarted mid-task | The adapter sets it at the task budget (2400 s), past the outer 2280 s stop; the driver stops the run if a Neurolink trial logs `operation timed out`                                                       |
| A task on an amd64-only base image (OpenFOAM) passed its oracle under emulation, but neither harness's arm64 runtime could start in it                                        | `fullrun_batched.sh` excludes any task whose image architecture differs from the host's, and lists it in `oracle_arch_excluded.txt`                                                                         |
| A batch's retained containers filled the VM disk; every repair then failed at container start                                                                                 | `KEEP_CONTAINERS=0` removes each container when its trial ends; free disk is checked before every harness phase and repair round                                                                            |
| The proxy's empty HTTP 200s and all-502 trials were labelled wrong-model exclusions                                                                                           | A 2xx without a model is a failed request; only a delivered answer from another model or server is an integrity exclusion                                                                                   |
| The spend meter used each harness's own cost, which Neurolink does not write when it exits with an error                                                                      | The ledger records token usage per request and the meter prices it; set-aside spend is carried in `PRIOR_SPEND_USD`                                                                                         |
| The podman VM stopped mid-batch (host load ~240); the batch was marked done although no trial had reached an agent                                                            | `fullrun_batched.sh` checks podman before each phase and before marking a batch done, and refuses to mark a batch done when no trial started an agent                                                       |
| The planned rule treated a checker that crashes on the agent's output as unscorable and re-ran the trial, giving that harness extra attempts                                  | Report TUA-Bench's own scoring (the checker's 0 is the score) with `rescore_official.py`; the crash-as-unscorable rule is only for tasks whose oracle also crashes, which the oracle check already excludes |
| Neurolink's `websearchGrounding` tool needs Google Vertex credentials the container did not have; all 65 calls in 54 trials failed, while Claude Code's page fetches worked   | Not guarded yet. Before the next run, give Neurolink's container working search credentials, and confirm one successful search call in the smoke run                                                        |
