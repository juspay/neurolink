"""Compare two summarized runs task by task.

Usage: python compare_runs.py <before/trials.jsonl> <after/trials.jsonl> <out.csv> [excluded-task ...]

Only evaluable trials (full_pass, partial, scored_fail) enter a mean; the other
states are counted so a missing attempt is visible rather than silently dropped.
"""

import csv
import json
import statistics
import sys
from collections import defaultdict
from pathlib import Path

EVALUABLE = {"full_pass", "partial", "scored_fail"}


def load(path: Path) -> dict[str, list[dict]]:
    by_task: dict[str, list[dict]] = defaultdict(list)
    for line in path.read_text().splitlines():
        if line.strip():
            row = json.loads(line)
            by_task[row["task_id"]].append(row)
    return by_task


def stats(rows: list[dict]) -> dict:
    valid = [row for row in rows if row["terminal_state"] in EVALUABLE]
    rewards = [row["reward"] for row in valid]
    mean = lambda key: (  # noqa: E731
        round(statistics.mean(v for v in (row.get(key) for row in valid) if v is not None))
        if any(row.get(key) is not None for row in valid) else ""
    )
    return {
        "scheduled": len(rows),
        "evaluable": len(valid),
        "full": sum(row["terminal_state"] == "full_pass" for row in valid),
        "mean": round(statistics.mean(rewards), 3) if rewards else None,
        "vector": " ".join(
            f"{row['reward']:.3g}" if row["terminal_state"] in EVALUABLE else row["terminal_state"]
            for row in rows
        ),
        "tool_calls": mean("tool_calls"),
        "input_tokens": mean("input_tokens"),
        "output_tokens": mean("output_tokens"),
        "agent_ms": mean("agent_ms"),
    }


def main() -> None:
    before, after = load(Path(sys.argv[1])), load(Path(sys.argv[2]))
    out, excluded = Path(sys.argv[3]), set(sys.argv[4:])
    fields = ["scheduled", "evaluable", "full", "mean", "vector",
              "tool_calls", "input_tokens", "output_tokens", "agent_ms"]
    rows, totals = [], {"before": [0, 0, []], "after": [0, 0, []]}
    for task in sorted(set(before) | set(after)):
        b, a = stats(before.get(task, [])), stats(after.get(task, []))
        delta = round(a["mean"] - b["mean"], 3) if a["mean"] is not None and b["mean"] is not None else ""
        rows.append([task, "excluded" if task in excluded else "",
                     *(b[f] for f in fields), *(a[f] for f in fields), delta])
        if task not in excluded:
            for side, s, src in (("before", b, before), ("after", a, after)):
                totals[side][0] += s["full"]
                totals[side][1] += s["evaluable"]
                totals[side][2] += [
                    row["reward"] for row in src.get(task, []) if row["terminal_state"] in EVALUABLE
                ]

    with out.open("w", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(["task_id", "note",
                         *(f"before_{f}" for f in fields), *(f"after_{f}" for f in fields),
                         "delta_mean"])
        writer.writerows(rows)

    print(f"{'task':32} {'before':>22} {'after':>22} {'delta':>7}")
    for row in rows:
        b = f"{row[4]}/{row[3]} full, mean {row[5]}"
        a = f"{row[4 + len(fields)]}/{row[3 + len(fields)]} full, mean {row[5 + len(fields)]}"
        print(f"{row[0][:32]:32} {b:>22} {a:>22} {row[-1]!s:>7} {row[1]}")
    for side, (full, evaluable, rewards) in totals.items():
        mean = round(statistics.mean(rewards), 3) if rewards else None
        print(f"{side}: {full}/{evaluable} evaluable trials fully passed, mean reward {mean}"
              + (f" (excluding {', '.join(sorted(excluded))})" if excluded else ""))


if __name__ == "__main__":
    main()
