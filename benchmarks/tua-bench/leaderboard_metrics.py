"""TUA-Bench leaderboard metrics for one run, and a paired comparison of two.

Usage:
  python leaderboard_metrics.py <trials.jsonl> [--k 5] [--exclude task ...]
  python leaderboard_metrics.py <a/trials.jsonl> <b/trials.jsonl> [--k 5] [--exclude task ...]

Metrics follow the TUA-Bench README: Success Rate (mean reward), Pass@1 (share
of attempts that fully pass), Pass@k (task fully passed at least once), All-k
(every attempt fully passes). Attempt i of every task forms run i, and the
± is the standard error across those k runs.

Each task uses its first k evaluable attempts (full_pass, partial,
scored_fail) in start order. A task with fewer is reported as incomplete and
left out of every metric rather than scored on fewer attempts.

The paired comparison uses only tasks complete in both runs and bootstraps
over tasks, since attempts within a task are not independent.
"""

import argparse
import json
import random
import statistics
from collections import defaultdict
from pathlib import Path

EVALUABLE = {"full_pass", "partial", "scored_fail"}


def load(path: Path, k: int, excluded: set[str]) -> tuple[dict[str, list[dict]], dict[str, int]]:
    by_task: dict[str, list[dict]] = defaultdict(list)
    for line in path.read_text().splitlines():
        if line.strip():
            row = json.loads(line)
            if row["task_id"] not in excluded:
                by_task[row["task_id"]].append(row)
    complete, incomplete = {}, {}
    for task, rows in by_task.items():
        valid = sorted(
            (row for row in rows if row["terminal_state"] in EVALUABLE),
            key=lambda row: row.get("started_at") or "",
        )
        if len(valid) >= k:
            complete[task] = valid[:k]
        else:
            incomplete[task] = len(valid)
    return complete, incomplete


def metrics(tasks: dict[str, list[dict]], k: int) -> dict:
    if not tasks:
        return {"tasks": 0}
    full = {t: [row["terminal_state"] == "full_pass" for row in rows] for t, rows in tasks.items()}
    reward = {t: [row["reward"] or 0.0 for row in rows] for t, rows in tasks.items()}
    run_success = [statistics.mean(reward[t][i] for t in tasks) for i in range(k)]
    run_pass = [statistics.mean(full[t][i] for t in tasks) for i in range(k)]

    def se(values: list[float]) -> float:
        return statistics.stdev(values) / len(values) ** 0.5 if len(values) > 1 else 0.0

    return {
        "tasks": len(tasks),
        "success_rate": statistics.mean(run_success),
        "success_rate_se": se(run_success),
        "pass_at_1": statistics.mean(run_pass),
        "pass_at_1_se": se(run_pass),
        f"pass_at_{k}": statistics.mean(any(v) for v in full.values()),
        f"all_{k}": statistics.mean(all(v) for v in full.values()),
    }


def bootstrap_diff(values: list[float], iterations: int = 10000, seed: int = 0) -> tuple[float, float]:
    rng = random.Random(seed)
    means = sorted(
        statistics.mean(rng.choice(values) for _ in values) for _ in range(iterations)
    )
    return means[int(0.025 * iterations)], means[int(0.975 * iterations) - 1]


def show(label: str, m: dict, k: int, incomplete: dict[str, int]) -> None:
    if not m["tasks"]:
        print(f"{label}: no complete tasks")
        return
    print(
        f"{label}: {m['tasks']} tasks | success {m['success_rate']:.3f} ± {m['success_rate_se']:.3f}"
        f" | Pass@1 {m['pass_at_1']:.1%} ± {m['pass_at_1_se']:.1%}"
        f" | Pass@{k} {m[f'pass_at_{k}']:.1%} | All-{k} {m[f'all_{k}']:.1%}"
    )
    if incomplete:
        print(f"  incomplete (fewer than {k} evaluable attempts): "
              + ", ".join(f"{t}={n}" for t, n in sorted(incomplete.items())))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("runs", nargs="+", type=Path)
    parser.add_argument("--k", type=int, default=5)
    parser.add_argument("--exclude", nargs="*", default=[])
    parser.add_argument("--labels", nargs="*", default=[])
    args = parser.parse_args()
    excluded = set(args.exclude)
    labels = args.labels or [str(path) for path in args.runs]

    loaded = [load(path, args.k, excluded) for path in args.runs]
    for label, (tasks, incomplete) in zip(labels, loaded):
        show(label, metrics(tasks, args.k), args.k, incomplete)

    if len(loaded) == 2:
        (a, _), (b, _) = loaded
        shared = sorted(set(a) & set(b))
        if not shared:
            print("paired: no task complete in both runs")
            return
        mean_reward = lambda rows: statistics.mean(row["reward"] or 0.0 for row in rows)  # noqa: E731
        pass_rate = lambda rows: statistics.mean(row["terminal_state"] == "full_pass" for row in rows)  # noqa: E731
        for name, fn in (("success", mean_reward), ("Pass@1", pass_rate)):
            diffs = [fn(b[t]) - fn(a[t]) for t in shared]
            low, high = bootstrap_diff(diffs)
            better = sum(d > 0 for d in diffs)
            worse = sum(d < 0 for d in diffs)
            print(
                f"paired {name} ({labels[1]} - {labels[0]}), {len(shared)} tasks: "
                f"{statistics.mean(diffs):+.3f}, 95% bootstrap CI [{low:+.3f}, {high:+.3f}]; "
                f"{better} better, {worse} worse, {len(shared) - better - worse} tied"
            )


if __name__ == "__main__":
    main()
