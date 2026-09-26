# Neurolink on TUA-Bench: pilot, repeated baseline and fixes

Runs from 22–25 September 2026, ending with a full run over all 120 tasks. Companion to the local `benchmark.md`, which surveys the public agent benchmarks and argues for testing Neurolink as a harness.

## Bottom line

- **Same 7 tasks, same model, 3 valid attempts each, before and after three Neurolink fixes.** Model: `claude-sonnet-4-5-20250929` through the Neurolink Claude proxy, extended thinking off. The per-request model ledger shows every scored trial was served by that model, with no fallback.
- **Before (unchanged Neurolink, `4d173b419`): 9 of 18 evaluable trials fully passed; mean reward 0.591.**
- **After (three fixes merged, `b1a9e7046`): 15 of 18 fully passed; mean reward 0.938.**
  - 017 went from 0/3 to 3/3 and 115 from 0/3 to 3/3.
  - 018 went from 2/3 to 3/3, and 119's mean rose from 0.878 to 0.959.
  - 093 fell from 3/3 to 2/3: the one miss put each merged file in its own paragraph.
- **079 is excluded.** On this host its verifier crashes with SIGILL (exit 132) while importing the `cryptography` package. That happens in all 6 agent trials and in the oracle run.
- **Treat the gain as "the fixes work on the failures they were built for", not as a 35-point improvement.**
  - Two of the agent-mode rules were written after seeing these exact failures, so this is an in-sample test.
  - Trial-level Fisher exact test, one-sided: p = 0.038. But trials cluster within tasks, and counted by task the result is 4 improved against 1 worse, which a sign test puts at p = 0.19.
- **An ablation separates the two flags.** Each flag was run alone on the same build, 18 more scored trials per arm.
  - Agent mode alone reaches 13/18 (mean 0.850). It accounts for 115 and 018: 3/3 with it, 0/3 without it.
  - Tool roots alone reach 9/18 (mean 0.605), no measurable change from the baseline.
  - 017's gain most likely comes from the `readFile` binary-document refusal, not from either flag. On the baseline build plus that one change, 017 passes 2 of 3 times. Across every build that includes the refusal it passes 10 of 15 times, against 0 of 3 without it (p ≈ 0.07, so suggestive rather than settled).
- **Same-setup comparison: Neurolink (post-fix) 0.761 against Claude Code 0.438 in success rate.** Both used Sonnet 4.5 with thinking off, ran 6 tasks × 3 attempts side by side, and went through the same per-request ledger. Pass@1 was 72.2% against 33.3%.
  - The paired Pass@1 difference is +0.39, with a 95% bootstrap interval of +0.11 to +0.67 over tasks. Neurolink was better on 4 tasks, worse on none and tied on 2.
  - Claude Code's misses repeat baseline Neurolink's: the 115 comment, the 018 formula saved without a value, and the 017 cell.
  - This is in-sample for Neurolink, which was tuned on these failures. Claude Code also ran without its leaderboard setup (Opus, `max` thinking), so this shows where the harnesses differ on these tasks, not a general ranking.
- **The full-run prerequisites are built and verified.** Claude Code now runs through the same per-request ledger, from an offline bundle. On a 6-task smoke run (Sonnet 4.5, thinking off, one attempt each) it failed 115 and 018 exactly the way baseline Neurolink did. Thinking parity is proven per request, and that check caught Claude Code sending a 31,999-token budget instead of the 4,000 requested.
- **The fixed agent does more work.** Median tool calls rose from 13.5 to 19.5 and output tokens from 2.8k to 6.4k per trial. Agent time rose from 68 s to 120 s. By Neurolink's own cost report, the 18 scored trials rose 31%, from $12.05 to $15.78. That report overstates list price, because it counts cached tokens twice (see "Full run"); the relative rise is the usable part.
- **None of this can go on the TUA-Bench leaderboard.** The sample is 7 hand-picked tasks, not 120. The model and thinking setting match no leaderboard row, and the host is an Apple Silicon Mac. See "Plan for the comparable full run".
- **Full run, all 120 tasks (23–25 September; see "Full run").** The setup was Sonnet 4.5 with an 8,000-token thinking budget and 5 attempts per task, with both harnesses running side by side on this Mac. Over the 81 tasks that run here, Neurolink's success rate is 0.424 against Claude Code's 0.333.
  - The paired difference is **+0.091**, with a 95% interval of +0.017 to +0.164 (35 tasks better, 13 worse, 33 tied).
  - On the 75 held-out tasks it is +0.077 (+0.002 to +0.149).
  - On full passes alone (Pass@1) the lead is +0.062, and its interval includes zero, so it is not established.
- **The difference is largest in spreadsheet, presentation and writer tasks.** Neurolink did worse on `calc` (0 of 25 attempts against 6). That loss is one sheet name and one email address: renamed to `Sheet1`, all 5 of Neurolink's workbooks on task 096 pass its checker. Agent-mode prompt V2 adds a rule for each; in an in-sample re-run it took 099 from 0 to 4 of 5 and 096 from 0 to 1 of 5.
- **Neurolink costs about 1.3 times as much per trial at list price** ($0.29 against $0.22), because it makes more model requests. The whole run cost $237.48 at list price, against a $1,500 budget.
- **The run found several problems along the way, all fixed and disclosed.**
  - Our adapter's `--timeout 300` cut Neurolink runs short; batches 1–2 were re-run.
  - Neurolink's own cost report double-counts cached tokens, about 5.4 times over; the fix is merged on `release`.
  - The podman VM stopped mid-run; batch 24 was re-run.
  - The rule for scoring a crashed checker was changed after the data was seen. Both scorings are reported, and they differ by 0.003.

## What was run

|                  | Baseline                                                                                                                                                                    | Post-fix                                                         |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Neurolink        | `4d173b419`, tarball `814c7af9…`                                                                                                                                            | `b1a9e7046` (the three fix branches merged), tarball `517fd7f1…` |
| Agent command    | `neurolink generate "<instruction>" --provider anthropic --model <id> --max 8192 --timeout 300 --format json --enable-analytics --quiet --output <file>`, bash tool enabled | Same, plus `--agent-mode --tool-root /`                          |
| Model            | `anthropic/claude-sonnet-4-5-20250929`, thinking off                                                                                                                        | Same                                                             |
| Tasks × attempts | 7 × 3, plus 3 re-scheduled infra failures                                                                                                                                   | 7 × 3                                                            |
| Wall clock       | 47 min + 6.5 min repair, concurrency 3                                                                                                                                      | 38 min, concurrency 3                                            |
| Evidence         | `~/Developer/tua-evidence/baseline-sonnet45-k3` (+ `-repair`)                                                                                                               | `~/Developer/tua-evidence/postfix-sonnet45-k3`                   |

Common to both runs:

- **Benchmark.** TUA-Bench `3497fd3`, harbor 0.6.3.
- **Host.** macOS on Apple Silicon, podman VM with 7 CPU and 8 GB.
- **Images.** Each task image is built once and reused for every attempt (`cached_podman.py`).
- **Adapter.** `benchmarks/tua-bench/neurolink_agent/agent.py`. The adapter did no work on the agent's behalf in any scored run.

Three infra failures in the baseline happened before the agent started: two apt mirror timeouts and one 360 s setup timeout. They were re-run in `baseline-sonnet45-k3-repair` with apt retries and a doubled setup timeout. Those two changes affect only installation; the agent command was identical.

**Model identity.** A pass-through recorder inside each container logs every model request: the model asked for, the model that answered, and the proxy's served-by and account headers. A trial counts only if every response that delivered content came from Anthropic Sonnet 4.5 on a pooled OAuth account. Every scored trial passed this check:

- **Baseline:** 14 proxy errors (502s), all retried, none served by a fallback.
- **Post-fix:** 0 errors.

**Trial states.** Each trial ends in exactly one state: full pass, partial, scored fail, verifier failure, service failure (the last model request failed), infra failure, or integrity exclusion. Only the first three are scored. A harness's own crash or timeout is scored as the verifier scores it, and only failures the harness didn't cause are re-run.

## Why the baseline missed

Every cause below was checked against the agent's saved output file, not inferred from logs.

| Task                   | Baseline (3 scored) | Cause                                                                                                                                                                                                                       |
| ---------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 017 clean movie titles | 0, 0, 0             | The same single cell out of 28 in all three: C27 `Edge Of Puip-fre Fiction`, where the gold has `Puip-Fre`. The agent applied `str.capitalize()` to each word, but spreadsheet `PROPER` capitalises after every non-letter. |
| 018 total earnings     | 1, 0, 1             | The miss wrote the right formula (`=D3*24*F3`) with openpyxl, which stores no cached value. The verifier reads E3 as `None`.                                                                                                |
| 093 merge text files   | 1, 1, 1             | —                                                                                                                                                                                                                           |
| 106 create SSH user    | 1, 1, 1             | —                                                                                                                                                                                                                           |
| 115 VS Code keybinding | 0, 0, 0             | All three wrote the exact expected rule but added a `//` comment inside the array. VS Code accepts this, but the verifier parses strict JSON and skips only line 1.                                                         |
| 119 tab-stop split     | 1, 0.909, 0.727     | The partial trials used arbitrary tab stops: 15.0 cm and 12.0 cm. The document's own page setup gives the right margin as 12240 − 1440 − 1440 = 9360 twips, which is 16.51 cm.                                              |
| 079 fix mp3 tags       | excluded            | SIGILL in the verifier on this host. Post-score diagnostics show the agent's tags read back correctly in every trial.                                                                                                       |

The harness-level pattern is the same one the pilot found. In 017, 018 and 115 the agent had everything it needed to catch its own mistake. It never reopened the saved file in the form the checker reads, and it never applied the relevant data rule to every value. In 119 it chose a value where it could have derived one from the document.

## The fixes

Each fix lives on its own branch off `4d173b419`, with tests written to fail first. The integration branch `feat/harness-fixes-integration` (`b1a9e7046`) merges all three to build one tarball for the post-fix run. All three now ship in the same pull request as this report and the harness, as one commit on `release`, together with agent-mode prompt V2 (see "Full run").

| Branch                     | Commits                  | What it adds                                                                                                                   | Targets                                              | Tests                                                 |
| -------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- | ----------------------------------------------------- |
| `feat/terminal-agent-mode` | `61ac431f6`, `c2f2f8056` | `--agent-mode` / `agentMode` option (details below)                                                                            | 017, 018, 115, 119                                   | `test:agent-mode` 7/7                                 |
| `fix/tool-roots-hardening` | `bb6bd04c0`, `bee7582b1` | Configurable file-tool roots, set with `--tool-root`, `toolRoots`, `tools.fileRoots` or `NEUROLINK_TOOL_ROOTS` (details below) | Pilot 079: the file tools refused `/home/user/Music` | `test:file-tool-roots` 31/31; `test:bugfixes` 287/287 |
| `fix/cli-stdout-drain`     | `38d9df7d2`, `57d18b356` | The CLI waits for stdout to drain before its forced exits. If it can't drain within 30 s, it warns and exits with code 74.     | Pilot 093: piped JSON was cut off at 64 KiB          | `test:cli-json-output` 5/5                            |

**Agent mode** adds a versioned system prompt for autonomous terminal work. It tells the agent to:

1. change only what is asked;
2. derive values rather than use placeholders;
3. avoid interactive commands;
4. reopen each file and check the requested property in the structure the file actually stores (data rules on every value, stored spreadsheet values rather than formula text, document structure, configs that still parse);
5. fix and recheck, then report what it verified.

The branch also adds `--max-steps`. `readFile` now refuses ZIP and OLE2 binary documents with a structured error. That refusal applies with or without agent mode, so it changes behaviour for existing callers and has to be flagged in the PR. The ablation below ties 017's gain to it.

**File-tool roots** resolve symlinks and use separator-bounded containment. A per-request root can only narrow the instance's roots. Two independent adversarial reviews covered every public entry point: `generate`, `generateText`, `stream`, `executeTool`, the HTTP tool routes and worker instances. The first review found 3 escapes and one fail-closed bug; all four are fixed in `bee7582b1`. The second review confirmed the fixes and found nothing new.

**Checks on the merged build:** typecheck passes with 0 errors, lint shows 0 errors (the same 80 warnings as before), and the build passes. All five suites above pass again on the merged build.

The drain fix didn't affect these scores, because the adapter writes Neurolink's JSON to a file. It fixes real data loss for anyone who pipes the CLI's output.

## Post-fix results

| Task                   | Before          | After            | What changed (checked in the tool trace or output file)                                                                                                                                                            |
| ---------------------- | --------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 017 clean movie titles | 0, 0, 0         | **1, 1, 1**      | After writing, the agent spot-checked the rows with a hyphen, a comma and a colon, and caught `Puip-fre`.                                                                                                          |
| 018 total earnings     | 1, 0, 1         | **1, 1, 1**      | All three recalculated through LibreOffice, so E3 now stores a value. One also reopened the file with `data_only=True`.                                                                                            |
| 093 merge text files   | 1, 1, 1         | 1, **0**, 1      | The miss added one python-docx paragraph per source file; the gold file is a single paragraph. The instruction says "no merging separator". The agent checked font size but not structure against the instruction. |
| 106 create SSH user    | 1, 1, 1         | 1, 1, 1          | —                                                                                                                                                                                                                  |
| 115 VS Code keybinding | 0, 0, 0         | **1, 1, 1**      | All three validated the file with `python3 -m json.tool`, which rejects comments, so none were written.                                                                                                            |
| 119 tab-stop split     | 1, 0.909, 0.727 | 0.969, 0.909, 1  | One trial derived 9360 twips from the page setup. One used 16.0 cm, an assumed A4 margin. One used a 15.0 cm placeholder, the same as the baseline.                                                                |
| **All (excl. 079)**    | **9/18, 0.591** | **15/18, 0.938** |                                                                                                                                                                                                                    |

**Read the table with these limits in mind:**

- **In-sample.** The agent-mode rules about derived values, stored spreadsheet values and configs that still parse came from looking at these failures. These are general coding-agent habits rather than benchmark answers, but only tasks the fixes weren't written against can show how much they generalise.
- **Confounded, and since resolved by the ablation below.** Agent mode and `--tool-root /` were switched on together in this run. I first attributed 017's gain to agent mode's checking steps. The ablation shows that was wrong for 017, though right for 018 and 115.
- **Small.** Six scored tasks, three attempts each, one model.
- **093 is a candidate regression, not a proven one.** Across the baseline, the smoke trial and the post-fix run it went 6 of 7. The data can't separate a prompt effect from ordinary variance.

**Cost of the change** (means over the 18 scored trials unless noted):

| Measure                        | Before  | After   |
| ------------------------------ | ------- | ------- |
| Median tool calls              | 13.5    | 19.5    |
| Input tokens                   | 177,119 | 223,589 |
| Cache-read tokens              | 164,679 | 211,030 |
| Output tokens                  | 2,819   | 6,403   |
| Agent time                     | 68 s    | 120 s   |
| List-price estimate, 18 trials | $12.05  | $15.78  |

The proxy bills against subscriptions, so the list price is only an indicator.

## Ablation: which change did what

Both flags were run separately on the same post-fix build (`517fd7f1…`), for 6 tasks × 3 scored attempts per arm, with 079 excluded. So the `readFile` binary-document refusal and the stdout drain are on in every arm, and only the two flags differ.

| Task                  | Baseline        | Tool roots only | Agent mode only  | Both (post-fix)  |
| --------------------- | --------------- | --------------- | ---------------- | ---------------- |
| 017                   | 0, 0, 0         | **1, 1, 1**     | 0, 0, 1          | 1, 1, 1          |
| 018                   | 1, 0, 1         | 0, 0, 0         | **1, 1, 1**      | 1, 1, 1          |
| 093                   | 1, 1, 1         | 1, 1, 1         | 1, 1, 1          | 1, 0, 1          |
| 106                   | 1, 1, 1         | 1, 1, 1         | 1, 1, 1          | 1, 1, 1          |
| 115                   | 0, 0, 0         | 0, 0, 0         | **1, 1, 1**      | 1, 1, 1          |
| 119                   | 1, .909, .727   | 0, .969, .923   | .969, .606, .727 | .969, .909, 1    |
| **Full passes, mean** | **9/18, 0.591** | **9/18, 0.605** | **13/18, 0.850** | **15/18, 0.938** |

- **Agent mode fixes 115 and 018.** Both are 3/3 with it and 0/3 without it, on the same build. The traces show the mechanism: a strict `json.tool` parse for 115, and a recalculation through LibreOffice for 018.
- **017 follows the `readFile` refusal, not either flag.** It passed 7 of 9 times on the post-fix build across all three arms, and 0 of 3 on the baseline build. On the baseline build, `readFile` returned the `.xlsx` bytes; on the post-fix build it refused them in all nine trials. A follow-up run then isolated the refusal: the baseline build plus only that change (`readfile-refusal-only-k3`, tarball `b1a56124…`, no flags) scored 017 at 1, 1, 0. That run scored 018 at 0, 0, 0 and 119 at .727, .909, .909, both unchanged from the baseline. Across every build that includes the refusal, including the later same-setup comparison (1 of 3), 017 passed 10 of 15 times, against 0 of 3 without it. The one-sided Fisher exact p is about 0.07: suggestive, not settled. Every miss, in every run and in both harnesses, is the same cell: C27 `Puip-fre`. I had credited agent mode for 017, and that was wrong.
- **Tool roots alone change nothing measurable here.** That's expected: these tasks keep their files in `/app`, or the agent reaches them with bash. The roots matter for correctness and security, not for this sample's score.
- **119 is noisy at n = 3.** The one zero, from the tool-roots arm, inserted ten tab characters but defined no tab stop anywhere, then reported that it had set one. That unverified claim is exactly what agent mode's read-back rule targets. Still, no single arm separates cleanly from the others.
- **093's post-fix miss did not recur.** It went 3/3 in both arms, which is consistent with variance.

**Conditions.** Arm A's first run lost 8 trials to setup timeouts; the link had fallen to 10–300 KB/s. It lost 1 more to proxy 502s between 09:14 and 09:22 UTC, when the Anthropic pool was cooling; the CLI exited 1 after the task was done, and no fallback model served the request. Those 9 trials were re-run on an offline runtime bundle (`build_bundle.sh`, sha256 `f7b2fbaa…`), at concurrency 2. The bundle carries Node 22.23.2, npm 10.9.8 and Neurolink 11.2.3, the same versions the network install produced. Arm B ran entirely on the bundle. The install path doesn't change anything the agent runs. All 36 traces are free of references to tests, solutions or gold files, and model identity held on every scored trial.

## Same-setup comparison: Neurolink vs Claude Code

Both harnesses ran side by side, one trial at a time each, so they shared the network and proxy conditions. Settings were identical: Sonnet 4.5 with thinking off, offline bundles, the same apt packages, and the per-request ledger. Neurolink used the post-fix build with `--agent-mode --tool-root /`. Claude Code was version 2.1.280 through `claude_code_ledger`, with `--ak thinking=disabled`. Every scored trial on both sides was served by Sonnet 4.5, with thinking off on every delivered request.

| Task                        | Neurolink (post-fix)     | Claude Code               |
| --------------------------- | ------------------------ | ------------------------- |
| 017                         | 0, 0, 1                  | 1, 0, 0                   |
| 018                         | 1, 1, 1                  | 0, 0, 0                   |
| 093                         | 0, 1, 1                  | 1, 0, 0                   |
| 106                         | 1, 1, 1                  | 1, 1, 1                   |
| 115                         | 1, 1, 1                  | 1, 0, 0                   |
| 119                         | 1, .70, 0                | .969, 0, .909             |
| **Success rate**            | **0.761 ± 0.049**        | **0.438 ± 0.200**         |
| **Pass@1 / Pass@3 / All-3** | **72.2% / 100% / 50.0%** | **33.3% / 66.7% / 16.7%** |

The paired difference over tasks (Neurolink − Claude Code) is +0.323 in success rate, 95% bootstrap interval +0.036 to +0.667. For Pass@1 it is +0.389, interval +0.111 to +0.667, with 4 tasks better, 0 worse and 2 tied.

- **Claude Code's misses repeat baseline Neurolink's.** Two 115 trials left the `//` comment inside the array. All three 018 trials saved the formula without a stored value. Two 017 trials got the same C27 cell wrong. On 093, one trial asked the user where the files were and stopped. These are habits of the model, and on this task set Neurolink's agent mode corrects the first two.
- **Neurolink's misses.** Two 017 trials got the same C27 cell wrong. On 119, one trial used spaces and right alignment instead of tab stops and reported the result as finished. Agent mode's self-check confirmed its own misreading of the task.
- **The integrity scan flagged two Neurolink 093 trials** that included `/solution` in a `find` for the `.txt` inputs. The folder is empty outside reference-solution runs; one command returned only the inputs under `/home` and the other returned nothing. In both trials the agent finished before the verifier started.
- **What this shows.** The comparison machinery works, and it shows where the two harnesses differ on these tasks. It does not rank them in general. Neurolink's agent mode was written after seeing these failures, and Claude Code did not run its leaderboard setup (Opus with `max` thinking). The full run in `benchmarks/tua-bench/RUNBOOK.md` removes both problems.

## Full run (Mac): result

The run finished at 03:07 UTC on 25 September, after starting on 23 September. It covered all 120 tasks, 81 of which run on this host, with 5 scored attempts per task per harness. The final figures and the analysis inputs are in `~/Developer/tua-evidence/full-sonnet45-think8000-final/`.

**Setup.**

- **Host.** This Mac (Apple Silicon, podman VM), in batches of 5 tasks so images fit on disk. It was chosen to start now, instead of the Linux host in the runbook, so results are not comparable to the leaderboard.
- **Model and settings.** `claude-sonnet-4-5-20250929` through the shared Neurolink proxy, with an 8,000-token thinking budget and `max_tokens` 32,000 in both harnesses. A parity check on task 106 confirmed both settings on every request before the run began.
- **Harnesses.**
  - Neurolink `b1a9e7046` (the three fixes merged) with `--agent-mode --tool-root /`.
  - Claude Code 2.1.280 through `claude_code_ledger`.
  - Both run from offline bundles, through the same per-request ledger.
- **Protocol.**
  - Each batch starts with an oracle check, then 5 attempts per task.
  - The two harnesses run side by side, 2 trials each at a time.
  - Repair rounds re-run only service and infrastructure failures.
  - The comparison is paired over tasks, with bootstrap intervals.

**Result.** Scored the way TUA-Bench scores it: a checker's 0 is the score.

|                                       | Neurolink     | Claude Code   |
| ------------------------------------- | ------------- | ------------- |
| Success rate (partial credit)         | 0.424 ± 0.021 | 0.333 ± 0.020 |
| Pass@1 (full passes)                  | 32.8% ± 2.2%  | 26.7% ± 2.1%  |
| Pass@5                                | 56.8%         | 42.0%         |
| All-5                                 | 17.3%         | 12.3%         |
| Mean list-price cost per trial \*     | $0.287        | $0.220        |
| Median model requests / output tokens | 18.5 / 5.9k   | 9 / 2.6k      |

\* Measured per request by the ledger, over about 400 trials per harness in batches 3–24. Claude Code's batch 1–2 ledgers predate usage recording.

| Paired difference (Neurolink − Claude Code), 95% bootstrap interval over tasks | All 81 tasks                                                | 75 held-out tasks                                           |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------- | ----------------------------------------------------------- |
| Success rate                                                                   | **+0.091** (+0.017 to +0.164); 35 better, 13 worse, 33 tied | **+0.077** (+0.002 to +0.149); 31 better, 12 worse, 32 tied |
| Pass@1                                                                         | +0.062 (−0.012 to +0.136)                                   | +0.045 (−0.029 to +0.117)                                   |

- **What it shows.** On this host, with Sonnet 4.5 and an 8,000-token thinking budget, Neurolink's agent mode scores about 9 points higher than Claude Code in success rate. That measure gives partial credit, and its interval excludes zero, including on the 75 tasks the fixes were not written against, though only just there (+0.002).
- **On full passes alone, the lead is not established.** Pass@1 is about 6 points higher, and its interval includes zero.
- **Scored as planned before the run,** a crashed checker counts as unscorable and is re-run instead of scoring 0. The difference is then +0.088 (+0.014 to +0.162) over 80 tasks, and +0.073 (−0.003 to +0.147) on the held-out tasks. See "Scoring rule changed after the data was seen" below.
- **Neurolink costs about 1.3 times as much per trial.** It makes about twice as many model requests and writes about 2.3 times as much output. Both harnesses read 95–98% of their input from the prompt cache.
- **Total spend: $237.48 at list price** (Neurolink $126.39 over 415 trials, Claude Code $101.09 over 422, plus $10 for set-aside runs), against a $1,500 budget.

**By category.** Categories with at least 4 tasks, TUA-Bench scoring, mean over the first 5 scored attempts:

| Category             | Tasks | Neurolink | Claude Code | Difference | Better / worse |
| -------------------- | ----- | --------- | ----------- | ---------- | -------------- |
| spreadsheet-editing  | 13    | 0.200     | 0.077       | +0.123     | 6 / 1          |
| browser              | 13    | 0.446     | 0.400       | +0.046     | 7 / 2          |
| presentation-editing | 11    | 0.182     | 0.073       | +0.109     | 5 / 0          |
| image-editing        | 6     | 0.500     | 0.433       | +0.067     | 3 / 1          |
| writer               | 5     | 0.693     | 0.432       | +0.260     | 3 / 0          |
| calc                 | 5     | 0.000     | 0.240       | −0.240     | 0 / 2          |
| medical              | 4     | 0.705     | 0.722       | −0.017     | 0 / 1          |
| os                   | 4     | 0.719     | 0.661       | +0.058     | 2 / 2          |
| document-editing     | 4     | 0.640     | 0.585       | +0.056     | 2 / 1          |

The other 16 tasks fall in 11 categories of 1–2 tasks each, too few to read. The spreadsheet and document gains fit what agent mode targets: re-reading a saved file, and storing values instead of bare formulas.

**The `calc` loss, task by task.** Neurolink passed 0 of 25 attempts and Claude Code 6, all on 096 and 099. Each cause below was confirmed by running the task's own checker code, with its pinned library versions, on the saved outputs. Where no output was saved (091), it was confirmed from the checker's log and a reproduction.

- **090 and 104: 0 for both harnesses on every attempt.** Not investigated.
- **096: a sheet name (Claude Code 2 of 5, Neurolink 0 of 5).**
  - The instruction says to keep "the workbook's default worksheet name unchanged", and the checker reads a sheet named `Sheet1`.
  - Neurolink built the workbook with openpyxl, whose default sheet name is `Sheet`. Claude Code's two passes saved through pandas, whose default is `Sheet1`.
  - Renamed to `Sheet1`, all 5 Neurolink workbooks score 1.0 with the task's checker, so their content was right.
  - Claude Code's other 3 attempts never found the papers, since the instruction gives no path, and stopped to ask where they were.
- **099: one email address (Claude Code 4 of 5, Neurolink 0 of 5).**
  - All 5 Neurolink attempts wrote `lingpenk@google.com` for Lingpeng Kong; the checker expects `lpk@cs.hku.hk`.
  - Neurolink searched the raw HTML of his homepage with `curl` and `grep`. The only address in it sits inside an HTML comment (`<!-- Email: ... -->`), which the page does not show.
  - Claude Code's page reader drops hidden markup, so it found no address and followed the page's Contact link to `lpk@cs.hku.hk`. Its one attempt that did not follow that link also wrote the Google address.
  - Neurolink's tables were otherwise right, with the checker's shape and headers. An earlier version of this note said Neurolink dropped a leading empty row. That was wrong: it was one of Claude Code's two misses.
- **091: 0 for both harnesses on every attempt.**
  - The Balance column holds formulas, and the checker reads their stored results straight from the file.
  - openpyxl saves formulas without stored results, including the ones it did not touch, and the task's container has no LibreOffice to recalculate them. Opening and saving the untouched workbook with openpyxl is enough to crash the checker. The only edit that passes replaces the formulas with plain numbers.
  - All 23 attempts that saved through openpyxl crashed the checker: Neurolink's 15 and 8 of Claude Code's 12.
  - Claude Code's other 4 saved through pandas and scored 0 for layout reasons. Two renamed the sheet. One wrote pandas' column labels (`Unnamed: 1` to `Unnamed: 4`) into the empty cells of the title row. One dropped the title row.
  - The workbook has no sheet named `Bookkeeping simple`; that is the title in cell A1. An earlier version of this note got this wrong.

So the `calc` gap comes from two narrow habits, not a weakness with spreadsheets. Neurolink trusted openpyxl's default sheet name, and it read an email address from markup that a reader of the page never sees.

**Re-run with agent-mode prompt V2 (26 September, in-sample).** V2 adds one rule for each habit: take facts only from what a web page shows, following its own links (such as a Contact page) when the fact is not shown; and check that a new workbook's sheets carry a spreadsheet application's names. Neurolink ran alone on 096 and 099, 5 attempts each, with the full run's settings and a build of the branch that carries V2. The rules were written from these two tasks' failures, so this shows whether they change behaviour, not how far they carry.

| Task | V1 (full run) | V2     |
| ---- | ------------- | ------ |
| 096  | 0 of 5        | 1 of 5 |
| 099  | 0 of 5        | 4 of 5 |

- **099: the web-page rule changed behaviour.** No V1 attempt opened Kong's Contact page. Four of the five V2 attempts did, and all four passed. The fifth took the commented-out address again, and also dropped the table's leading empty row.
- **096: the sheet-name rule mostly did not take.** Four of the five V2 attempts still saved openpyxl's `Sheet`, and each of those workbooks passes once its sheet is renamed. In three of those four traces the model never mentions `Sheet1`. The rule sits among the final checks; stating it where the workbook is created might work better, but was not tried, to avoid tuning wording on the same task.
- **Checks.** Every scored trial was served by Sonnet 4.5 with the 8,000-token budget, and reported agent-mode version 2. One 099 attempt could not start its container within 40 minutes, while the host's load average was about 130, and was replaced. The re-run cost $1.63 at list price.

**What these results are not.**

- They are not comparable to the leaderboard. The host is an arm64 Mac, where 39 of the 120 tasks don't run. The model is Sonnet 4.5 with an 8,000-token thinking budget, and Claude Code did not run its leaderboard setup (Opus with `max` thinking).
- They are one model and one thinking setting. A different model could change the gap.
- Neurolink's agent-mode prompt was written after seeing the 7 pilot tasks fail, which is why the held-out figures are reported separately.
- The two tool sets were not equal on web search, to Neurolink's cost. Neurolink's `websearchGrounding` tool needs Google Vertex credentials, which its container did not have. 54 Neurolink trials across 16 tasks called it, and all 65 calls failed, so Neurolink fell back to `curl`. Claude Code's page fetches worked.

**Checks.**

- **Model identity.** Every scored trial on both sides was served by Sonnet 4.5 through Anthropic accounts. No other model answered anywhere in the run. Three Claude Code trials were excluded and re-run because one reply in each lacked the proxy's "served by" header, although its model was right.
- **Thinking.** Every agent turn in both harnesses carried `{enabled, 8000}`. Claude Code also made 153 short side calls with thinking off. None used the conversation's cache, and none wrote more than 1,683 tokens, so they are separate calls, not agent turns.
- **Integrity.** The scan flagged 18 tool calls, all Neurolink's.
  - 10 name scratch or test files the agent made, such as `/tmp/test.png` or `/app/test.xml`.
  - The other 8 looked in `/solution` or `/tests`: four trials of task 031 (browser profile search) and one of 092. Every one returned nothing, and every trial finished before its checker started.
  - Claude Code had no hits in 422 traces.

**Scoring rule changed after the data was seen (disclosed).**

- **The rule as planned.** It treated a checker that crashes and writes a bare `0` as unscorable, and repair rounds re-ran the trial. It was written for 079, whose checker crashed on this host whatever the output.
- **What happened in the full run.** Such crashes came from the agents' own output. On 091, for example, saving the workbook through openpyxl leaves its formulas without stored results, and the checker crashes reading them (see the `calc` notes above). TUA-Bench's own scoring counts that as 0, and re-running it gives the harness extra attempts.
- **What was affected.** 25 trials: Neurolink's 15 on 091, and Claude Code's 8 on 091 plus one each on 063 and 095.
- **The decision.** It was made after the numbers were seen, so both scorings are reported. The headline moves from +0.088 to +0.091.
- **The tool.** `benchmarks/tua-bench/rescore_official.py` produces the TUA-Bench scoring from the trial summaries.

**Excluded on this host: 39 of the 120 tasks.**

- **The reference solution fails (26):** 004, 009, 019, 034, 035, 037, 038, 043, 044, 046, 048, 053, 069, 072, 073, 079, 080, 085, 086, 089, 100, 103, 105, 110, 111 and 112. The causes were not investigated beyond 079 (its checker crashes with SIGILL on this VM).
- **Errors before a verdict, after one retry (11).**
  - Seven download programs built only for x86_64: 003, 006, 011, 015, 024, 107 and 109.
  - Four fail during container setup in their CellProfiler-based image: 000, 001, 075 and 114.
- **The image is amd64-only (2):** 005 and 084 (OpenFOAM). Neither harness's arm64 runtime can start in it.

**What went wrong during the run, and how it was fixed.** The fixes are in `benchmarks/tua-bench/` and listed in `RUNBOOK.md`.

| Failure                                                                                                                                       | Effect                                                                                                                        | Fix                                                                                                                                        | Checked by                                                                                                                                                                          |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The adapter passed `--timeout 300`. Neurolink applies it to the whole tool-using task and restarts the task from the prompt when it runs out. | 8 of 15 scored Neurolink trials in batches 1–2 stopped at about 15 minutes; others restarted mid-task.                        | The timeout is set at the task budget (2,400 s), and the run stops if Neurolink's timeout ever fires.                                      | Batches 1–2 re-run: every trial ran with `--timeout 2400`, and the guard never fired in the rest of the run.                                                                        |
| Task 005's image is amd64-only.                                                                                                               | All 10 of its trials failed before the agent started.                                                                         | Tasks whose image doesn't match the host's architecture are excluded.                                                                      | 005 and 084 excluded; 010 kept.                                                                                                                                                     |
| Retained containers filled the VM disk.                                                                                                       | Every repair in batch 2 failed at container start.                                                                            | Each container is removed when its trial ends; free disk is checked before each phase.                                                     | No disk stop in the rest of the run.                                                                                                                                                |
| Empty HTTP 200s and all-502 trials were labelled wrong-model exclusions.                                                                      | They were re-run, but under the wrong label.                                                                                  | These are now service failures.                                                                                                            | Exactly the 5 affected trials changed label.                                                                                                                                        |
| Spend was read from each harness's own cost report.                                                                                           | Neurolink's crashed runs cost nothing on the meter, and its report is inflated (below).                                       | The ledger records token usage per request; the meter prices it.                                                                           | Matched a hand calculation to the cent.                                                                                                                                             |
| The podman VM stopped during batch 24's image builds, while the Mac's load average was about 240 from other applications.                     | Two tasks were recorded as oracle errors, every harness trial failed before its agent started, and the batch was marked done. | The driver checks podman before each phase and before marking a batch done, and refuses to mark a batch done if no trial reached an agent. | Tested on the real data: batch 24 counted 0 started agents, batch 23 counted 10. The VM was restarted and batch 24 re-run in full; all 5 of its tasks then passed the oracle check. |

Invalid runs were set aside, not deleted, each with a README:

- Neurolink's batch 1–2 runs, in `~/Developer/tua-evidence/archive/full-sonnet45-think8000-setaside-timeout300/`.
- The first batch 24, in `archive/full-sonnet45-think8000-b024-podman-down/`.

Claude Code's batch 1–2 trials were valid and stayed in the run.

**Neurolink's cost report double-counts cached tokens.** This is a Neurolink bug, not a harness bug. It was on `release` too (`c52629a1a`), and is now fixed there.

- **The cause.** The Anthropic client reports each request's input both as a total that includes cache reads and writes, and as those cache counts separately.
  - `src/lib/core/nativeGenerateLoop.ts` adds up the inclusive total and the cache counts.
  - `src/lib/providers/anthropic/client.ts` passes the inclusive total on as `input`.
  - `calculateCost` then charges cached tokens at the full input rate and again at the cache rates.
- **Scope.** It affects every Anthropic `generate()` that hits the cache, not only agent mode. The OpenAI-compatible path has the same double count.
- **An example.** One trial reported $2.92. Priced from the API's own usage figures, it cost $0.55.
- **Across the re-run.** The report was 5.36 times the real cost over 15 trials.
- **The fixes are merged on `release`.**
  - [#1792](https://github.com/juspay/neurolink/pull/1792) (`c26e6eb1c`) makes the loop count uncached input. Its new end-to-end suite fails without the fix and passes with it.
  - [#1793](https://github.com/juspay/neurolink/pull/1793) (`8521098bb`) prices cached tokens on a streaming path that is reachable only when a middleware skips the provider.
- Every cost in this section comes from the ledger. The pilot costs quoted in the Bottom line came from Neurolink's report and overstate the list price.

## Integrity

- **The agent never saw verifier material.** TUA-Bench's own podman environment creates empty `/tests` and `/solution` directories when a container starts. `/solution` stays empty outside oracle runs. `/tests` is filled when the verifier starts, and in all 21 post-fix trials the agent had finished before that.
- **Only one tool call touched either path.** A failing 093 trial ran `find /solution -name "*.txt"` while searching for its input files, and it returned nothing. No other post-fix trial and no baseline trial referenced tests, solutions or gold files.
- **Model identity** was checked per request, as described under "What was run".
- **Evidence is preserved.** Each run's evidence directory holds the harbor job, the per-trial ledgers, the summaries, a `FINDINGS.md`, the output files checked above and a `HASHES.sha256`.

## What the pilot found, and corrections

The pilot ran 7 tasks once each and scored 2 of 7, with a mean reward of 0.39. Its misses were the same causes listed above, which is why the baseline ran 3 attempts before any fix. Corrections to statements made while it ran:

- **`benchmark.md`'s TUA-Bench numbers are real.** I had suggested they might be invented; the TUA-Bench README matches them.
- **018 was never "fixed" in the pilot.** Its re-run passed only because the adapter re-saved the spreadsheet through LibreOffice. That step is now off by default, and no scored run uses it.
- **079's cause took two wrong guesses before the evidence settled it.** It is a SIGILL in the verifier's `cryptography` import on this aarch64 VM, and it reproduces with a bare import in a fresh container.
- **"Effectively 6 of 7 solved" was wrong.** The pilot scored 2 of 7.
- **The pilot's model was Sonnet 4.5 by accident.** The adapter passed no model, so Neurolink used its default. The adapter now refuses to run without an explicit model.
- **The pilot runs used `--timeout 300`, which caps and restarts Neurolink's whole task.** With thinking off, runs were short, and it touched one trial: a post-fix 119 attempt of 557 s restarted once and still finished. None of the same-setup comparison's 18 Neurolink trials ran past 280 s. The full run exposed the cap, because thinking made runs longer; the adapter now sets it at the task budget.

## Plan for the comparable full run

The full run was done on the Mac instead (see "Full run"). The Linux plan below remains the route to a number comparable with the leaderboard.

A comparable number means Neurolink and a reference harness run under identical conditions, on the full task set, with several attempts per task. `benchmarks/tua-bench/RUNBOOK.md` turns this plan into steps. `fullrun.sh` runs them: oracle validation, a thinking-parity preflight, both harnesses × K attempts, repair rounds, integrity scans and leaderboard metrics with paired bootstrap intervals. In order:

1. **Run from a published release.** The fixes ship with this report; once released, run from the published version, so the result describes something users can install.
2. **Run on x86_64 Linux with Docker.** This removes the Rosetta failure (011) and the aarch64 SIGILL (079), and matches how the leaderboard was run.
3. **Validate the host.** Run `uv run setup-env`, then the oracle over all 120 tasks. Drop any task whose reference solution fails, and publish the dropped list.
4. **Run a reference harness ourselves (decided).** Neurolink is compared with Claude Code, harbor's built-in `claude-code` agent, on the same host, model and thinking budget; Terminus-2 is optional as a second reference. Leaderboard rows are context only, because they use `max` thinking, which Neurolink's CLI doesn't offer.
   - **Thinking parity is set in tokens, and verified on every request (built).** The model ledger now logs each request's `thinking` field.
     - **With a budget:** Neurolink `--thinking --thinking-budget N`; Claude Code `--ak max_thinking_tokens=N` with no `thinking` argument. On 106, both sent `{enabled, 4000}` on every request. Adding `--ak thinking=enabled` made Claude Code 2.1.280 send **31999** instead. Without the per-request check, that mismatch would have gone unnoticed.
     - **Off:** Neurolink by default; Claude Code `--ak thinking=disabled`.
   - **Claude Code runs through the same ledger (built).** `claude_code_ledger.agent:ClaudeCodeLedger` subclasses harbor's `claude-code` agent and leaves its run command unchanged. It installs Claude Code 2.1.280 from an offline bundle with the same apt packages as the Neurolink adapter, starts the ledger, and points every model alias at the model under test.
     - A 6-task smoke run (thinking off, one attempt each) scored 017 1, 018 0, 093 0, 106 1, 115 0 and 119 .923.
     - Its 115 and 018 misses are identical to baseline Neurolink's.
     - On 093 it searched a symlinked home directory, found nothing, and stopped to ask the user a question.
     - With one attempt per task, this is a pipeline check, not a comparison.
5. **Pin model access.** Use a direct API key, or a dedicated proxy instance with no fallback chain; the shared pool here cooled mid-run and returned 502s. Keep the per-request ledger and exclude any trial that another model served.
6. **Make setup offline (built for arm64; build x64 on the Linux host).** Pass a runtime bundle as `NEUROLINK_BUNDLE`; for Claude Code, build it with `BUNDLE_DIR=claude-node` and pass it as `CLAUDE_CODE_BUNDLE`. Per-trial network installs failed 8 of 18 times here when the link slowed, and 600 trials would multiply that. Build the x64 bundles natively on the full-run host with `build_bundle.sh <tgz> <out> <image> 22.23.2 x64`, rather than under emulation here.
7. **Run 5 attempts per task and report Pass@1, Pass@5 and All-5.** Compare harnesses task by task, with bootstrap intervals over tasks rather than over trials.
8. **Report held-out tasks separately.** Show the 7 tasks the fixes were built against apart from the other 113, which are the real test of the fixes.
9. **Fix the analysis before running.** Settle the trial states, exclusion rules, integrity scan and identity rule in advance; the scripts here already implement them.

**Scale.** 120 tasks × 5 attempts is 600 trials per harness.

- **Time.** This run went at about 5–7 minutes per trial slot, which puts the full run at roughly 6–9 hours per harness with 8 trials running at once. A Linux host with Docker should be faster.
- **Tokens.** The pilot put this at about $0.88 per trial, or roughly $525 for Neurolink alone, but that came from Neurolink's inflated cost report. Measured per request in the full run, Neurolink costs about $0.29 per trial with an 8,000-token thinking budget, and Claude Code about $0.22. Other models scale by their price.
- **Rate limits.** Subscription accounts behind the proxy may throttle at this volume. That is one more reason to use a dedicated access path.

## Reproducing

```bash
# In the neurolink worktree: build and pack the harness under test
pnpm run build && pnpm pack --pack-destination <dir>

# From feat/harness-test, with a TUA-Bench checkout (uv sync; uv run setup-env)
# Baseline:
benchmarks/tua-bench/run_baseline.sh <run-name> <tua-bench-dir> 3 3
# Post-fix, or any other build and flags:
NEUROLINK_TGZ=<dir>/juspay-neurolink-<ver>.tgz \
NEUROLINK_EXTRA_ARGS="--agent-mode --tool-root /" \
  benchmarks/tua-bench/run_baseline.sh <run-name> <tua-bench-dir> 3 3
# Re-run a subset (e.g. infra failures):
TASK_LIST="017-clean-movie-titles 115-remove-explorer-find-key" \
  benchmarks/tua-bench/run_baseline.sh <run-name> <tua-bench-dir> 1 3
# Claude Code through the same ledger, from an offline bundle (thinking budget N shown)
npm pack @anthropic-ai/claude-code@2.1.280
BUNDLE_DIR=claude-node benchmarks/tua-bench/build_bundle.sh anthropic-ai-claude-code-2.1.280.tgz <claude.tar.gz> <image>
AGENT_IMPORT_PATH=claude_code_ledger.agent:ClaudeCodeLedger AGENT_ARGS="--ak max_thinking_tokens=<N>" \
  CLAUDE_CODE_BUNDLE=<claude.tar.gz> benchmarks/tua-bench/run_baseline.sh <run-name> <tua-bench-dir> 1 2
# Offline setup: build a runtime bundle once per tarball, then pass it along
benchmarks/tua-bench/build_bundle.sh <tgz> <bundle.tar.gz> <task-image-with-oldest-glibc> [node-version] [arm64|x64]
NEUROLINK_TGZ=<tgz> NEUROLINK_BUNDLE=<bundle.tar.gz> NEUROLINK_EXTRA_ARGS="--agent-mode" \
  benchmarks/tua-bench/run_baseline.sh <run-name> <tua-bench-dir> 3 2

# Summaries and the before/after comparison
python3 benchmarks/tua-bench/summarize_trials.py <jobs>[,<jobs>...] <tua-bench-dir>/tasks <out> <phase>
python3 benchmarks/tua-bench/compare_runs.py <before>/trials.jsonl <after>/trials.jsonl <out.csv> 079-fix-mp3-metadata
```

What `run_baseline.sh` does:

1. Reads the proxy port from `neurolink proxy status` and records the commits and file hashes in `RUN.txt`.
2. Runs harbor with image caching.
3. Collects post-score diagnostics for 079.
4. Copies the job into the evidence directory, summarizes it and hashes every file.

The model defaults to Sonnet 4.5; override it with `MODEL=anthropic/<id>`.

## Evidence

- Baseline: `~/Developer/tua-evidence/baseline-sonnet45-k3/` (`FINDINGS.md`, `summary-combined/`, `failed-outputs/`) and `~/Developer/tua-evidence/baseline-sonnet45-k3-repair/`
- Post-fix: `~/Developer/tua-evidence/postfix-sonnet45-k3/` (`FINDINGS.md`, `summary/`, `comparison.csv`, `checked-outputs/`)
- Post-fix smoke trial (not scored): `~/Developer/tua-evidence/postfix-smoke-093/`
- Same-setup comparison: `~/Developer/tua-evidence/cmp-neurolink-k3/FINDINGS.md`, `cmp-neurolink-k3/` and `cmp-claudecode-k3/`, metrics in `~/Developer/tua-evidence/cmp-metrics.txt`
- Full-run tooling: `benchmarks/tua-bench/RUNBOOK.md`, `fullrun.sh`, `oracle_validate.sh`, `leaderboard_metrics.py`, `integrity_scan.py`, `model_access.py`
- readFile isolation, Claude Code smoke and thinking parity: `~/Developer/tua-evidence/readfile-refusal-only-k3/FINDINGS.md`, plus `claudecode-smoke-k1/`, `parity-neurolink-think4000/`, `parity-claudecode-think4000/` and `parity-claudecode-mtt4000/`
- Ablation: `~/Developer/tua-evidence/ablation-agentmode-k3/` (`FINDINGS.md`, `summary-combined/`, `comparison-vs-baseline.csv`) with `-repair2` and `-repair1`, and `~/Developer/tua-evidence/ablation-toolroot-k3/` (`summary/`, `comparison-vs-baseline.csv`, `failed-outputs/`)
- Full run: final analysis `~/Developer/tua-evidence/full-sonnet45-think8000-final/` (`metrics-final.txt`, `checks-final.txt`, the rescored trials), log `~/Developer/tua-evidence/full-sonnet45-think8000.log`, metrics `full-sonnet45-think8000-metrics.txt`, integrity scans `full-sonnet45-think8000-integrity-{neurolink,claudecode}.jsonl`, per-batch evidence `full-sonnet45-think8000-b0NN-{oracle,neurolink,claudecode}/`, set-aside runs in `archive/full-sonnet45-think8000-setaside-timeout300/` and `archive/full-sonnet45-think8000-b024-podman-down/`, and the run configuration in `~/Developer/tua-fullrun/fullrun.env`
- Prompt V2 re-run: `~/Developer/tua-evidence/full-sonnet45-think8000-v2-calc/` and its one replacement attempt, `full-sonnet45-think8000-v2-calc-r1/`, built from `~/Developer/tua-fullrun/artifacts/neurolink-v2-86b909578.tgz`
- Pilot artefacts are under `/private/tmp` (cleared on reboot): `…/b9fc73fc-…/scratchpad/TUA-Bench/jobs/` and `…/234a7d61-…/scratchpad/`
