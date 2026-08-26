# Background Commands (`run_command_bg` / `command_status` / `command_output` / `command_kill`)

A long-running agent has to run real commands — a build, a test suite, a linter
whose output **is** the evidence for a finding. The two obvious shapes both
fail: `bashTool` blocks the loop, hands the model a shell, and truncates its own
output at 100 KB; a `child_process` call with a command string is a shell
injection with extra steps.

These tools keep three promises instead.

| Promise                  | What it means                                                                                                                                                                          |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Detached**             | `run_command_bg` returns a `taskId` at once; the agent keeps working and asks about the command when it wants to.                                                                      |
| **Nothing discarded**    | Both streams go straight to files as they arrive, and the COMPLETE files are banked as artifacts when the command settles. The conversation gets a bounded tail plus a read-back call. |
| **Hardened by contract** | argv arrays with no shell, an exact-match executable allowlist, a realpath cwd sandbox, and a timeout that escalates SIGTERM → SIGKILL.                                                |

Opt-in and additive: nothing registers these tools until you ask, and the
policy is required — until one is set, every start is refused.

## Quick start

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();
neurolink.registerBackgroundCommandTools({
  allowedExecutables: ["/usr/local/bin/pnpm", "/usr/bin/git"],
  cwdRoot: "/srv/checkout",
  defaultTimeoutMs: 300_000,
  maxOutputBytes: 32 * 1024 * 1024,
});
neurolink.registerTaskTools(); // optional — carries the command counters

await neurolink.generate({
  input: {
    text:
      "Run the lint and test suites with run_command_bg, keep reviewing while " +
      "they run, and read their output when command_status says they finished.",
  },
  maxSteps: 40,
});
```

Or drive it from host code:

```typescript
const { taskId } = await neurolink.startBackgroundCommand(
  ["/usr/local/bin/pnpm", "run", "lint"],
  { cwd: "/srv/checkout" },
);

// …do other work…

const status = await neurolink.awaitBackgroundCommand(taskId);
if (status.exitCode !== 0) {
  const full = await neurolink.readArtifact(status.stdout!.artifactId);
  // `full` is every byte the command printed — not a preview of it.
}
```

## The policy is the contract

```typescript
type BackgroundCommandPolicy = {
  allowedExecutables: string[]; // matched EXACTLY against argv[0]
  allowlist?: (argv: string[], cwd: string) => true | string;
  cwdRoot: string; // realpath-checked sandbox
  defaultTimeoutMs?: number; // default 120_000
  maxOutputBytes?: number; // default 10_485_760, per stream
};
```

- **argv arrays only.** `spawn(argv[0], argv.slice(1), { shell: false })`. There
  is no string form and no shell, ever. An `argv[0]` containing whitespace or a
  shell metacharacter is refused with a message saying so — because a caller
  that passed `"pnpm run lint && echo done"` believed it was writing a shell
  line, and spawning an executable with that literal name would be a worse
  answer than a refusal.
- **Exact-match allowlist.** `argv[0]` must appear verbatim in
  `allowedExecutables`. There is deliberately no basename fallback: allowlisting
  `git` must never permit `/tmp/evil/git`. Name absolute paths when you can.
- **`allowlist` has the final say**, after the allowlist and the sandbox pass.
  Return `true`, or a string that becomes the refusal — so put the recovery step
  in it.
- **cwd sandbox.** `resolveWithinRoot(cwd, cwdRoot)` resolves **both** sides
  through the filesystem before comparing them, so a symlink inside the root
  pointing at `/etc` is refused rather than followed. A lexical comparison is
  not a sandbox.
- **Timeout kill.** SIGTERM at `timeoutMs`, SIGKILL five seconds later, state
  `timeout`. A process that ignores SIGTERM does not get to outlive its budget.

`env` deserves its own note: **omit it and the command inherits the parent
environment** (what a repository's own checks normally need); **pass it and it
REPLACES the parent environment entirely** — the child gets exactly those
variables and nothing else, which is how you keep the host's credentials out of
a third-party build.

## Output: bounded previews, unbounded files

Both streams are written to
`join(tmpdir(), "neurolink-commands", <taskId>)/{stdout,stderr}.log` as they
arrive, and banked with `bankArtifact({ kind: "command-output" })` when the
command settles. That means:

- `status.tailPreview` is ≤ 2000 characters — orientation, never evidence.
- `status.stdout` / `status.stderr` are `BankedArtifactRef`s once settled;
  `retrieve_context({ artifactId })` pages them like any other artifact.
- `command_output({ taskId, stream, offset, limit })` reads the log file
  directly, **while the command is still running** as well as after. Character
  offsets, `totalSize` and `hasMore` match `retrieve_context` exactly, so paging
  code written for one works on the other.

`maxOutputBytes` is the single bound, and reaching it is loud: the command is
killed, the state is `output-limit`, and **everything written up to the cap
stays on disk in full**. A capped command is a different fact from a failed one,
and both are different from a truncated one — which is why there is a state for
it rather than a silent cut.

## Learning that a command finished

The core generate loop is **not** modified. Completion surfaces the same way a
delegate's does (N2.3): counters ride along on results.

- Every command tool result carries `running` / `finished` for the session.
- Every `ChecklistToolResult` carries `commandsRunning` / `commandsFinished`, so
  a `tasks_list` tells the agent a build landed with no polling machinery.

`finished` means **finished and not yet looked at**. Reading a settled command's
status or output clears it, so a non-zero `finished` always means there is
something new to read. Nothing is discarded when it clears — the job, its logs
and its artifacts stay exactly where they were.

## Read-only git toolset

```typescript
neurolink.registerGitTools({ repoRoot: "/srv/checkout" });
```

Six bounded tools — `git_log`, `git_show`, `git_diff`, `git_blame`,
`git_merge_base`, `git_ls_files` — built on the same runner.

They take **values, never flags**. The model supplies a ref, a path, a line
range or a count; each tool validates them and assembles a fixed argv. That is
what keeps them read-only: a free-form argument string would carry
`--output=<file>` (which writes) and `diff.external` (which executes) straight
through. A value beginning with `-` is refused outright, paths must resolve
inside `repoRoot`, and every invocation runs with `--no-pager -c color.ui=false
-c diff.external= -c core.fsmonitor=false` and a replaced environment.

Registering them **widens nothing else**: they run under a private
one-executable policy rooted at `repoRoot`, so `run_command_bg` still cannot
execute git, and no general command policy is required.

Output follows the same rule as everything else here — bounded `preview`, full
`output` banked, `readBackHint` spelling out the `retrieve_context` call.

## Host API

```typescript
registerBackgroundCommandTools(policy: BackgroundCommandPolicy): void;  // opt-in, idempotent
setBackgroundCommandPolicy(policy: BackgroundCommandPolicy): void;      // policy only, no tools
async startBackgroundCommand(argv: string[], options: BackgroundCommandOptions): Promise<BackgroundCommandHandle>;
getBackgroundCommandStatus(taskId: string): BackgroundCommandStatus;    // SYNC
async awaitBackgroundCommand(taskId: string, opts?: { timeoutMs?: number }): Promise<BackgroundCommandStatus>;
async killBackgroundCommand(taskId: string, signal?: NodeJS.Signals): Promise<BackgroundCommandStatus>;
async readBackgroundCommandOutput(taskId: string, page: BackgroundCommandPageRequest): Promise<BackgroundCommandOutputPage>;

registerGitTools(options: GitToolsetOptions): void;                     // opt-in, idempotent
async runGitCommand(args: string[], sessionId?: string): Promise<GitToolResult>;
```

Host-side calls **throw** where the tool returns a refusal (no policy, malformed
argv, a non-allowlisted executable, a vetoed command, a cwd escape, an unknown
`taskId`), so host code should catch rather than inspect a result.
`awaitBackgroundCommand`'s `timeoutMs` bounds the **wait**, not the command: when
it elapses you get the current status back rather than an exception, so a caller
can poll in bounded steps and never lose the job.

## Things worth knowing

- **Settled jobs are never evicted.** Their logs and artifacts are the run's
  evidence, and a `command_status` that answers "unknown taskId" for a command
  that ran is exactly the information loss this primitive exists to prevent. The
  registry is process-local; the log files live under the OS temp directory.
- **A command that could not start still settles.** An allowlisted executable
  that is not installed produces a settled job with `error` explaining why —
  never a job the agent waits on forever.
- **Killing discards the process, never its output.** Whatever a command printed
  before it was killed is banked and still readable.
- **Both toolsets are registered with `cacheable: false`.** Their results are a
  function of live process state, not of their arguments; a cached
  `command_status` would report a finished build as still running for the whole
  TTL.
- **Background children keep the event loop alive**, as child processes normally
  do. A host that wants to exit while commands are outstanding should kill them
  first.
- **The allowlist is a NAME allowlist, not a binary allowlist.** The policy
  matches `argv[0]` exactly; the OS then resolves that name through `PATH`, so
  the policy controls the name and the environment controls which binary runs.
  Pin the binary by allowlisting an absolute path. And choose entries knowing
  that anything with an escape hatch grants general execution: `node` runs
  arbitrary code, `pnpm` runs any `package.json` script, `find` has `-exec`.
- **The cwd sandbox is checked at start time.** `resolveWithinRoot` realpaths
  and validates before the spawn; a process able to replace path components
  with symlinks between check and spawn can race it. Known limitation — the
  sandbox is a guard against mistakes and model-supplied paths, not against a
  hostile local writer inside the root.
- **The registry grows one entry per command per process lifetime.** Per-entry
  memory is bounded (an 8 KB tail per stream; full output lives on disk), but
  the count is not, and there is no TTL. Fine for CLI runs; a long-lived server
  that starts commands forever should expect that ceiling to be "commands per
  process lifetime".

## Tests

`pnpm run test:background-commands` →
`test/continuous-test-suite-background-commands.ts`. **No credentials are
needed** — every case is mechanical and nothing in the suite can SKIP. It covers
a long-running command polled to completion, 3 MB banked and paged back
byte-exact, the byte cap landing mid-chunk, kill, timeout, SIGKILL escalation
against a process that ignores SIGTERM, every refusal (no policy, shell string,
non-allowlisted executable, basename bypass, cwd escape, symlink escape,
sibling-prefix escape, policy veto), env replacement, the checklist counters,
and the git toolset including its argument-injection refusals.
