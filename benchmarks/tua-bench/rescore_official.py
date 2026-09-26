"""Rescore trials the way TUA-Bench itself does: a checker that writes a bare
"0" after its evaluator crashed gives the trial a score of 0.

summarize_trials.py calls that case a verifier failure and repair rounds
re-run it, a rule written for a checker that crashed on this host whatever
the output (079). Once a task's reference solution passes on the host, such a
crash comes from the agent's output (e.g. a formula saved without a value),
and re-running it gives that harness extra attempts. leaderboard_metrics.py
then takes the first k evaluable attempts in start order, so the rescored
trials count where they fell.

Usage: python rescore_official.py <trials.jsonl> <out.jsonl>
"""

import json
import sys
from pathlib import Path


def rescore(row: dict) -> dict:
    if row["terminal_state"] == "verifier_failure" and (row.get("reward_raw") or "").strip() == "0":
        return dict(row, terminal_state="scored_fail", reward=0.0, rescored="checker_crash_is_zero")
    return row


def main() -> None:
    source, target = Path(sys.argv[1]), Path(sys.argv[2])
    rows = [json.loads(line) for line in source.read_text().splitlines() if line.strip()]
    rescored = [rescore(row) for row in rows]
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text("".join(json.dumps(row) + "\n" for row in rescored))
    changed = sum(1 for row in rescored if row.get("rescored"))
    print(f"{source}: {changed} of {len(rows)} trials rescored as 0")


if __name__ == "__main__":
    main()
