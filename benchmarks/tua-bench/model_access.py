"""Where every adapter's in-container ledger forwards model requests."""

import os


def resolve_model_access() -> tuple[str, str]:
    """(upstream URL, API key the agent sends through the ledger).

    MODEL_UPSTREAM is a direct API (e.g. https://api.anthropic.com) and needs
    the real ANTHROPIC_API_KEY. NEUROLINK_PROXY_BASE_URL is a Neurolink proxy,
    which substitutes a pooled account, so any non-empty key works.
    """
    direct = os.environ.get("MODEL_UPSTREAM")
    if direct:
        key = os.environ.get("ANTHROPIC_API_KEY")
        if not key:
            raise ValueError("MODEL_UPSTREAM is set but ANTHROPIC_API_KEY is not")
        return direct, key
    proxy = os.environ.get("NEUROLINK_PROXY_BASE_URL")
    if not proxy:
        raise ValueError(
            "Set MODEL_UPSTREAM (direct API) or NEUROLINK_PROXY_BASE_URL (Neurolink proxy)"
        )
    return proxy, "proxy-managed"
