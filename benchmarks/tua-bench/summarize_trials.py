"""Classify every trial in a harbor jobs directory and summarize per task.

Usage: python summarize_trials.py <jobs-dir>[,<jobs-dir>...] <tasks-dir> <out-dir> [phase]

Several jobs dirs let a repair run (re-scheduled infra failures) be counted
together with the run it completes.
"""

import csv
import json
import statistics
import sys
from collections import defaultdict
from pathlib import Path

from ledger_summary import delivered, identity_mismatch, ledger_cost_usd

STATES = [
    "full_pass",
    "partial",
    "scored_fail",
    "verifier_failure",
    "service_failure",
    "infra_failure",
    "integrity_exclusion",
]


def read(path: Path) -> str | None:
    return path.read_text(encoding="utf-8", errors="replace") if path.exists() else None


def fallback_zero_possible(tasks_dir: Path, task: str) -> bool:
    # These verifiers print a float score and write a bare "0" only when the
    # evaluator process itself exits non-zero.
    test_sh = read(tasks_dir / task / "tests" / "test.sh") or ""
    return 'score="0"' in test_sh


def ledger_identity(trial: Path, expected_model: str | None) -> dict:
    """Judge model identity from the raw ledger: only responses that delivered
    content count; failed attempts (502s, dropped connections, empty 200s)
    are tallied. Without a ledger, identity cannot be shown at all."""
    ledger = trial / "agent" / "model-ledger.jsonl"
    if not ledger.exists():
        return {"identity_ok": False, "mismatch": True, "delivered": 0, "proxy_errors": 0,
                "thinking": [], "last_ok": None, "cost_usd": None}
    rows = [json.loads(line) for line in ledger.read_text().splitlines() if line.strip()]
    answers = [row for row in rows if delivered(row)]
    mismatch = identity_mismatch(rows, expected_model)
    return {
        "identity_ok": bool(answers) and not mismatch,
        "mismatch": mismatch,
        "delivered": len(answers),
        "proxy_errors": len(rows) - len(answers),
        # Distinct thinking settings actually requested; parity needs one value.
        "thinking": sorted({json.dumps(row.get("thinking")) for row in answers}),
        "last_ok": delivered(rows[-1]) if rows else None,
        "cost_usd": ledger_cost_usd(rows),
    }


def classify(trial: Path, tasks_dir: Path) -> dict:
    result = json.loads(read(trial / "result.json") or "{}")
    task = trial.name.split("__")[0]
    exception = (result.get("exception_info") or {}).get("exception_type")
    agent_result = result.get("agent_result") or {}
    metadata = agent_result.get("metadata") or {}
    ledger = metadata.get("modelLedger") or {}
    reward_raw = read(trial / "verifier" / "reward.txt")
    rewards = (result.get("verifier_result") or {}).get("rewards") or {}
    reward = rewards.get("reward")
    exit_code = metadata.get("exitCode")
    config = json.loads(read(trial / "config.json") or "{}")
    model_name = (config.get("agent") or {}).get("model_name") or ""
    identity = ledger_identity(trial, model_name.split("/", 1)[1] if "/" in model_name else None)
    agent_started = any(
        (trial / "agent" / name).exists()
        for name in ("runtime.txt", "neurolink.json", "neurolink.txt", "claude-code.txt")
    )

    if not agent_started:
        state = "infra_failure"
    elif identity["mismatch"]:
        state = "integrity_exclusion"
    elif not identity["identity_ok"] or identity["last_ok"] is False:
        # The model service, not the harness, ended the run (or never answered
        # at all): re-schedulable. A harness's own crash or timeout is scored
        # as the verifier scores it.
        state = "service_failure"
    elif reward_raw is None:
        state = "verifier_failure" if exception is None else "infra_failure"
    elif reward_raw.strip() == "0" and fallback_zero_possible(tasks_dir, task):
        state = "verifier_failure"
    elif reward == 1:
        state = "full_pass"
    elif reward is not None and 0 < reward < 1:
        state = "partial"
    else:
        state = "scored_fail"

    return {
        "task_id": task,
        "trial": trial.name,
        "terminal_state": state,
        "reward_raw": reward_raw,
        "reward": reward,
        "exception": exception,
        "agent_exit_code": exit_code,
        "model_identity_ok": identity["identity_ok"],
        "delivered_responses": identity["delivered"],
        "proxy_errors": identity["proxy_errors"],
        "thinking": identity["thinking"],
        "agent": (config.get("agent") or {}).get("import_path") or (config.get("agent") or {}).get("name"),
        "served_by": ledger.get("servedBy"),
        "response_models": ledger.get("responseModels"),
        "model_requests": ledger.get("requests"),
        "tool_calls": metadata.get("toolCallCount"),
        "input_tokens": agent_result.get("n_input_tokens"),
        "output_tokens": agent_result.get("n_output_tokens"),
        "cache_read_tokens": metadata.get("cacheReadTokens"),
        "cache_creation_tokens": metadata.get("cacheCreationTokens"),
        "cost_usd": agent_result.get("cost_usd"),
        "ledger_cost_usd": identity["cost_usd"],
        "agent_ms": metadata.get("elapsedMs"),
        "stop_reason": metadata.get("stopReason"),
        "json_parse": metadata.get("parse"),
        "started_at": result.get("started_at"),
    }


def main() -> None:
    jobs_dirs = [Path(arg) for arg in sys.argv[1].split(",")]
    tasks_dir, out_dir = Path(sys.argv[2]), Path(sys.argv[3])
    phase = sys.argv[4] if len(sys.argv) > 4 else "baseline"
    out_dir.mkdir(parents=True, exist_ok=True)

    trials = sorted(
        path.parent
        for jobs_dir in jobs_dirs
        for path in jobs_dir.glob("**/*__*/result.json")
        if (path.parent / "config.json").exists() and (path.parent / "agent").is_dir()
    )
    rows = [dict(classify(trial, tasks_dir), phase=phase) for trial in trials]
    rows.sort(key=lambda row: (row["task_id"], row["started_at"] or ""))
    by_task: dict[str, list[dict]] = defaultdict(list)
    for row in rows:
        row["attempt"] = len(by_task[row["task_id"]]) + 1
        by_task[row["task_id"]].append(row)

    with (out_dir / "trials.jsonl").open("w") as handle:
        for row in rows:
            handle.write(json.dumps(row) + "\n")

    with (out_dir / "task_summary.csv").open("w", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(
            ["phase", "task_id", "scheduled", "evaluable", *STATES,
             "mean_reward", "min_reward", "max_reward", "vector"]
        )
        for task, task_rows in sorted(by_task.items()):
            valid = [
                row["reward"] for row in task_rows
                if row["terminal_state"] in {"full_pass", "partial", "scored_fail"}
            ]
            counts = [sum(row["terminal_state"] == state for row in task_rows) for state in STATES]
            writer.writerow([
                phase, task, len(task_rows), len(valid), *counts,
                round(statistics.mean(valid), 3) if valid else "",
                min(valid) if valid else "",
                max(valid) if valid else "",
                " ".join(
                    str(row["reward"]) if row["terminal_state"] in {"full_pass", "partial", "scored_fail"}
                    else row["terminal_state"]
                    for row in task_rows
                ),
            ])

    passes = sum(row["terminal_state"] == "full_pass" for row in rows)
    evaluable = sum(row["terminal_state"] in {"full_pass", "partial", "scored_fail"} for row in rows)
    print(f"{phase}: {len(rows)} trials, {passes} full passes, {evaluable} evaluable")
    for task, task_rows in sorted(by_task.items()):
        print(f"  {task}: " + ", ".join(
            f"{row['terminal_state']}({row['reward']})" for row in task_rows
        ))


if __name__ == "__main__":
    main()
