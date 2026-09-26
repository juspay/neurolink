"""harbor's Claude Code agent, installed offline and routed through the same
per-request model ledger as the Neurolink adapter, so both harnesses carry the
same proof of which model served them and with what thinking budget."""

import hashlib
import os
import shlex
from pathlib import Path

from harbor.agents.installed.claude_code import ClaudeCode
from harbor.environments.base import BaseEnvironment
from harbor.models.agent.context import AgentContext
from ledger_summary import summarize_ledger
from model_access import resolve_model_access
from neurolink_agent.agent import NeurolinkCode

_BUNDLE = os.environ.get("CLAUDE_CODE_BUNDLE")
_REMOTE_BUNDLE = "/tmp/claude-bundle.tar.gz"
_ROOT = "/opt/claude-node"
_LOCAL_LEDGER = Path(__file__).parent.parent / "neurolink_agent" / "model_ledger.mjs"
_REMOTE_LEDGER = f"{_ROOT}/model-ledger.mjs"
_LEDGER_PORT = 18080
_LEDGER_LOG_NAME = "model-ledger.jsonl"


class ClaudeCodeLedger(ClaudeCode):
    @staticmethod
    def name() -> str:
        return "claude-code-ledger"

    def get_version_command(self) -> str | None:
        return "claude --version"

    async def install(self, environment: BaseEnvironment) -> None:
        if not _BUNDLE:
            raise ValueError("Set CLAUDE_CODE_BUNDLE to a bundle from build_bundle.sh")
        # The same system packages the Neurolink adapter installs, so neither
        # harness gets tools the other lacks.
        apt = "apt-get -o Acquire::Retries=3 -o Acquire::http::Timeout=30"
        await self.exec_as_root(
            environment,
            command=NeurolinkCode._with_retries(
                f"{apt} update && {apt} install -y --no-install-recommends "
                "ca-certificates curl gnupg"
            ),
            env={"DEBIAN_FRONTEND": "noninteractive"},
        )
        await environment.upload_file(_BUNDLE, _REMOTE_BUNDLE)
        await environment.upload_file(str(_LOCAL_LEDGER), _REMOTE_LEDGER)
        # harbor's run command expects `claude` on PATH; node, npm and npx are
        # exposed too, as the Neurolink adapter's env.sh exposes its own.
        await self.exec_as_root(
            environment,
            command=(
                f"tar -xzf {_REMOTE_BUNDLE} -C /opt && rm -f {_REMOTE_BUNDLE} && "
                f"chmod 644 {_REMOTE_LEDGER} && "
                f"for bin in claude node npm npx; do ln -sf {_ROOT}/bin/$bin /usr/local/bin/$bin; done"
            ),
        )
        await self.exec_as_agent(environment, command="claude --version")

    async def run(
        self,
        instruction: str,
        environment: BaseEnvironment,
        context: AgentContext,
    ) -> None:
        if not self.model_name or "/" not in self.model_name:
            raise ValueError("Pass an explicit model, e.g. -m anthropic/claude-sonnet-4-5-20250929")
        upstream, api_key = resolve_model_access()
        model = self.model_name.split("/", 1)[1]

        ledger_env = {
            "LEDGER_UPSTREAM": upstream,
            "LEDGER_PORT": str(_LEDGER_PORT),
            "LEDGER_PATH": f"/logs/agent/{_LEDGER_LOG_NAME}",
        }
        await self.exec_as_agent(
            environment,
            command=(
                "rm -f /tmp/.model-ledger-ready; "
                f"nohup setsid node {shlex.quote(_REMOTE_LEDGER)} "
                "> /logs/agent/model-ledger.log 2>&1 < /dev/null & "
                "for _ in $(seq 1 100); do [ -f /tmp/.model-ledger-ready ] && break; sleep 0.1; done; "
                "[ -f /tmp/.model-ledger-ready ] || { echo 'model ledger did not start' >&2; exit 97; }"
            ),
            env=ledger_env,
        )

        # Merged after harbor's own model handling, so the model name keeps no
        # provider prefix and every alias Claude Code might call resolves to
        # the model under test instead of a smaller one.
        self._resolved_env_vars.update(
            ANTHROPIC_BASE_URL=f"http://127.0.0.1:{_LEDGER_PORT}",
            ANTHROPIC_API_KEY=api_key,
            ANTHROPIC_MODEL=model,
            ANTHROPIC_SMALL_FAST_MODEL=model,
            ANTHROPIC_DEFAULT_SONNET_MODEL=model,
            ANTHROPIC_DEFAULT_OPUS_MODEL=model,
            ANTHROPIC_DEFAULT_HAIKU_MODEL=model,
            CLAUDE_CODE_SUBAGENT_MODEL=model,
        )
        try:
            await super().run(instruction, environment, context)
        finally:
            await self.exec_as_agent(
                environment,
                command='kill "$(cat /tmp/.model-ledger-ready)" 2>/dev/null || true',
            )

    def populate_context_post_run(self, context: AgentContext) -> None:
        super().populate_context_post_run(context)
        context.metadata = {
            **(context.metadata or {}),
            "bundleSha256": hashlib.sha256(Path(_BUNDLE).read_bytes()).hexdigest() if _BUNDLE else None,
            "modelLedger": summarize_ledger(self.logs_dir / _LEDGER_LOG_NAME, self.model_name),
        }
