"""Scan agent traces for tool calls that reference verifier material.

Usage: python integrity_scan.py <jobs-dir>[,<jobs-dir>...] [out.jsonl]

Reads Neurolink traces (agent/neurolink.json toolCalls) and Claude Code traces
(agent/claude-code.txt tool_use blocks). A hit is a tool argument naming the
tests, the reference solution, gold files or the verifier's outputs. Hits are
leads for a human to read, not verdicts: an agent may probe an empty folder
while looking for its inputs. Exits 1 when any trace could not be read, so a
clean report always covers every trial.
"""

import json
import re
import sys
from pathlib import Path

PATTERN = re.compile(
    r"(/tests?\b|/solution\b|/oracle\b|_gold\b|gold\.(xlsx|docx|csv|json)|test_outputs|"
    r"reward\.txt|/logs/verifier)",
    re.I,
)


def neurolink_calls(path: Path) -> list[tuple[str, str]]:
    data = json.loads(path.read_text(encoding="utf-8", errors="replace"))
    return [
        (call.get("toolName") or call.get("name") or "?",
         json.dumps(call.get("args") or call.get("input") or {}))
        for call in data.get("toolCalls") or []
    ]


def claude_code_calls(path: Path) -> list[tuple[str, str]]:
    calls = []
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            continue
        if event.get("type") != "assistant":
            continue
        for block in (event.get("message") or {}).get("content") or []:
            if block.get("type") == "tool_use":
                calls.append((block.get("name") or "?", json.dumps(block.get("input") or {})))
    return calls


def main() -> None:
    jobs_dirs = [Path(arg) for arg in sys.argv[1].split(",")]
    out = Path(sys.argv[2]) if len(sys.argv) > 2 else None
    hits, scanned, unreadable = [], 0, []
    for jobs_dir in jobs_dirs:
        for agent_dir in sorted(jobs_dir.glob("**/*__*/agent")):
            trial = agent_dir.parent.name
            readers = [(agent_dir / "neurolink.json", neurolink_calls),
                       (agent_dir / "claude-code.txt", claude_code_calls)]
            present = [(p, reader) for p, reader in readers if p.exists()]
            if not present:
                continue  # the agent never started (infra failure)
            scanned += 1
            for path, reader in present:
                try:
                    calls = reader(path)
                except (OSError, json.JSONDecodeError) as error:
                    unreadable.append((trial, f"{path.name}: {error}"))
                    continue
                for tool, args in calls:
                    match = PATTERN.search(args)
                    if match:
                        start = max(0, match.start() - 80)
                        hits.append({"trial": trial, "tool": tool,
                                     "excerpt": args[start:match.end() + 80]})
    if out:
        with out.open("w") as handle:
            for hit in hits:
                handle.write(json.dumps(hit) + "\n")
    print(f"traces scanned: {scanned}; hits: {len(hits)}; unreadable: {len(unreadable)}")
    for hit in hits:
        print(f"  HIT {hit['trial']} {hit['tool']}: {hit['excerpt']}")
    for trial, error in unreadable:
        print(f"  UNREADABLE {trial}: {error}")
    sys.exit(1 if unreadable else 0)


if __name__ == "__main__":
    main()
