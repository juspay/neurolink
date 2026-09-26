"""Summarize an in-container model ledger; shared by every harness adapter."""

import json
from collections import Counter
from pathlib import Path
from typing import Any

FALLBACK_SERVERS = {"codex", "vertex", "auto-provider"}


# A direct API answer has no proxy headers; the ledger records its upstream.
DIRECT_UPSTREAMS = {"api.anthropic.com"}

# List prices in USD per million tokens. Cache writes are priced by lifetime.
PRICES_PER_MTOK = {
    "claude-sonnet-4-5-20250929": {
        "input": 3.0,
        "output": 15.0,
        "cache_read": 0.30,
        "cache_write_5m": 3.75,
        "cache_write_1h": 6.0,
    },
}


def served_by_anthropic(row: dict) -> bool:
    if row.get("upstream") in DIRECT_UPSTREAMS:
        return True
    return (
        row.get("x-neurolink-served-by") == "anthropic"
        and row.get("x-neurolink-account-type") in {"oauth", "passthrough"}
    )


def delivered(row: dict) -> bool:
    # A 2xx without a model is not an answer: the proxy has sent an empty or
    # malformed body, which the harness sees as a failed request.
    status = row.get("status")
    return isinstance(status, int) and 200 <= status < 300 and bool(row.get("responseModel"))


def identity_mismatch(rows: list[dict], expected: str | None) -> bool:
    """True when a delivered answer came from another model or server."""
    return any(
        not served_by_anthropic(row)
        or row.get("requestModel") != expected
        or row.get("responseModel") != expected
        or row.get("x-neurolink-served-by") in FALLBACK_SERVERS
        for row in rows
        if delivered(row)
    )


def ledger_cost_usd(rows: list[dict]) -> float | None:
    """List-price cost of every request that reported token usage; None when
    no request did (a ledger older than usage recording, or no answers)."""
    total, metered = 0.0, False
    for row in rows:
        usage = row.get("usage")
        price = PRICES_PER_MTOK.get(row.get("responseModel")) or PRICES_PER_MTOK.get(
            row.get("requestModel")
        )
        if not usage or price is None:
            continue
        metered = True
        write_1h = usage.get("ephemeral_1h_input_tokens") or 0
        write_5m = usage.get("ephemeral_5m_input_tokens")
        if write_5m is None:
            write_5m = max((usage.get("cache_creation_input_tokens") or 0) - write_1h, 0)
        total += (
            (usage.get("input_tokens") or 0) * price["input"]
            + (usage.get("output_tokens") or 0) * price["output"]
            + (usage.get("cache_read_input_tokens") or 0) * price["cache_read"]
            + write_5m * price["cache_write_5m"]
            + write_1h * price["cache_write_1h"]
        ) / 1e6
    return round(total, 6) if metered else None


def summarize_ledger(ledger_path: Path, model_name: str | None) -> dict[str, Any]:
    if not ledger_path.exists():
        return {"present": False, "identityOk": False}

    rows = [
        json.loads(line)
        for line in ledger_path.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    expected = model_name.split("/", 1)[1] if model_name and "/" in model_name else model_name
    # Only responses that delivered content decide identity; a 502 or a
    # dropped connection is a retried failure, not a different model.
    succeeded = [row for row in rows if delivered(row)]
    identity_ok = bool(succeeded) and not identity_mismatch(rows, expected)
    return {
        "present": True,
        "requests": len(rows),
        "succeeded": len(succeeded),
        "proxyErrors": len(rows) - len(succeeded),
        "servedBy": dict(Counter(str(row.get("x-neurolink-served-by")) for row in rows)),
        "accountTypes": dict(Counter(str(row.get("x-neurolink-account-type")) for row in rows)),
        "responseModels": dict(Counter(str(row.get("responseModel")) for row in succeeded)),
        "thinking": dict(Counter(json.dumps(row.get("thinking")) for row in succeeded)),
        "maxTokens": dict(Counter(str(row.get("maxTokens")) for row in succeeded)),
        "costUsd": ledger_cost_usd(rows),
        "expectedModel": expected,
        "identityOk": identity_ok,
    }
