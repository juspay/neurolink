import hashlib
import json
import os
import shlex
from pathlib import Path
from typing import Any

from harbor.agents.installed.base import BaseInstalledAgent, with_prompt_template
from harbor.environments.base import BaseEnvironment
from harbor.models.agent.context import AgentContext
from ledger_summary import summarize_ledger
from model_access import resolve_model_access

_TGZ_NAME = "neurolink.tgz"
_LOCAL_TGZ = Path(os.environ.get("NEUROLINK_TGZ") or Path(__file__).parent / _TGZ_NAME)
_REMOTE_TGZ = f"/tmp/{_TGZ_NAME}"
# Optional offline runtime from build_bundle.sh: Node plus Neurolink already
# installed, so setup no longer downloads from NodeSource or the npm registry.
_BUNDLE = os.environ.get("NEUROLINK_BUNDLE")
_REMOTE_BUNDLE = "/tmp/neurolink-bundle.tar.gz"
_LOCAL_LEDGER = Path(__file__).parent / "model_ledger.mjs"
_REMOTE_LEDGER = "/opt/neurolink-node/model-ledger.mjs"
_LEDGER_PORT = 18080
_RESULT_LOG_NAME = "neurolink.json"
_LEDGER_LOG_NAME = "model-ledger.jsonl"
_EXIT_CODE_NAME = "neurolink.exit_code"
# Below the tasks' 2400 s agent timeout, so Neurolink is stopped inside the
# container and the trial is still scored instead of raising a host-side error.
_AGENT_TIMEOUT = "timeout --kill-after=30s 2280s"
# Neurolink's --timeout bounds the whole tool-using generation, not one model
# request, and a generation that runs past it is restarted from the prompt. At
# the task's own agent budget it never fires: _AGENT_TIMEOUT stops the run first.
_GENERATE_TIMEOUT_S = 2400
# With extended thinking, max_tokens must exceed the thinking budget, so a
# thinking run needs more than the 8192 used without it.
_MAX_TOKENS = os.environ.get("NEUROLINK_MAX_TOKENS", "8192")


class NeurolinkCode(BaseInstalledAgent):
    """One `neurolink generate` call is the whole agent loop: it runs tool calls
    until the model stops or DEFAULT_MAX_STEPS (200) is reached."""

    @staticmethod
    def name() -> str:
        return "neurolink-code"

    def get_version_command(self) -> str | None:
        return ". /opt/neurolink-node/env.sh; neurolink --version"

    @staticmethod
    def _with_retries(command: str, attempts: int = 3) -> str:
        # Concurrent containers intermittently get `Ign:` for every apt index;
        # retry, and still fail loudly if every attempt fails.
        return (
            f"ok=0; for attempt in $(seq 1 {attempts}); do "
            f"if {command}; then ok=1; break; fi; sleep $((attempt * 15)); done; "
            '[ "$ok" = 1 ]'
        )

    async def install(self, environment: BaseEnvironment) -> None:
        # Node 22+ is required by package.json engines; task base images
        # (debian/ubuntu) don't ship it. NodeSource provides a prebuilt apt repo.
        apt = "apt-get -o Acquire::Retries=3 -o Acquire::http::Timeout=30"
        await self.exec_as_root(
            environment,
            command=self._with_retries(
                f"{apt} update && {apt} install -y --no-install-recommends "
                "ca-certificates curl gnupg"
            ),
            env={"DEBIAN_FRONTEND": "noninteractive"},
        )
        if _BUNDLE:
            await environment.upload_file(_BUNDLE, _REMOTE_BUNDLE)
            await self.exec_as_root(
                environment,
                command=(
                    f"tar -xzf {_REMOTE_BUNDLE} -C /opt && rm -f {_REMOTE_BUNDLE} && "
                    "test -x /opt/neurolink-node/bin/neurolink"
                ),
            )
        else:
            await self.exec_as_root(
                environment,
                command=(
                    self._with_retries(
                        "curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && "
                        f"{apt} install -y nodejs"
                    )
                    + " && mkdir -p /opt/neurolink-node && "
                    "echo 'export PATH=/usr/bin:$PATH' > /opt/neurolink-node/env.sh"
                ),
                env={"DEBIAN_FRONTEND": "noninteractive"},
            )
            await environment.upload_file(str(_LOCAL_TGZ), _REMOTE_TGZ)

        await environment.upload_file(str(_LOCAL_LEDGER), _REMOTE_LEDGER)
        await self.exec_as_root(
            environment,
            command=(
                f"chmod 644 {_REMOTE_LEDGER}"
                if _BUNDLE
                else f"chmod 644 {_REMOTE_LEDGER} && "
                f"npm install -g {_REMOTE_TGZ} --no-audit --no-fund"
            ),
        )

        await self.exec_as_agent(
            environment,
            command=". /opt/neurolink-node/env.sh; neurolink --version",
        )

    def populate_context_post_run(self, context: AgentContext) -> None:
        log_path = self.logs_dir / _RESULT_LOG_NAME
        exit_path = self.logs_dir / _EXIT_CODE_NAME
        metadata: dict[str, Any] = {
            "exitCode": exit_path.read_text().strip() if exit_path.exists() else None,
            "tgzSha256": hashlib.sha256(_LOCAL_TGZ.read_bytes()).hexdigest(),
            "bundleSha256": (
                hashlib.sha256(Path(_BUNDLE).read_bytes()).hexdigest() if _BUNDLE else None
            ),
            "extraArgs": os.environ.get("NEUROLINK_EXTRA_ARGS", ""),
            "maxTokens": _MAX_TOKENS,
            "generateTimeoutS": _GENERATE_TIMEOUT_S,
            "jsonBytes": log_path.stat().st_size if log_path.exists() else None,
            "parse": "missing",
            "modelLedger": summarize_ledger(self.logs_dir / _LEDGER_LOG_NAME, self.model_name),
        }
        context.metadata = metadata
        if not log_path.exists():
            return

        raw = log_path.read_text(encoding="utf-8", errors="replace")
        try:
            data, metadata["parse"] = json.loads(raw), "strict"
        except json.JSONDecodeError:
            data, metadata["parse"] = self._extract_last_json_object(raw), "fallback"
        if not isinstance(data, dict):
            metadata["parse"] = "failed"
            return

        analytics = data.get("analytics") or {}
        usage = analytics.get("tokenUsage") or data.get("usage") or {}
        limits = analytics.get("limits") or {}

        context.n_input_tokens = usage.get("input")
        context.n_output_tokens = usage.get("output")
        context.n_cache_tokens = usage.get("cacheReadTokens")
        context.cost_usd = analytics.get("cost")
        metadata.update(
            provider=data.get("provider"),
            requestedModel=data.get("model"),
            lastServedBy=limits.get("servedBy"),
            quotaSource=limits.get("quotaSource"),
            cacheReadTokens=usage.get("cacheReadTokens"),
            cacheCreationTokens=usage.get("cacheCreationTokens"),
            stepsUsed=analytics.get("stepsUsed"),
            toolCallCount=analytics.get("toolCallCount", len(data.get("toolCalls") or [])),
            toolExecutionCount=len(data.get("toolExecutions") or []),
            elapsedMs=analytics.get("elapsedMs") or data.get("responseTime"),
            stopReason=data.get("rawFinishReason") or data.get("finishReason"),
        )

    @staticmethod
    def _extract_last_json_object(raw: str) -> dict[str, Any] | None:
        start = raw.rfind("{")
        while start != -1:
            depth = 0
            for i in range(start, len(raw)):
                if raw[i] == "{":
                    depth += 1
                elif raw[i] == "}":
                    depth -= 1
                    if depth == 0:
                        try:
                            return json.loads(raw[start : i + 1])
                        except json.JSONDecodeError:
                            break
            start = raw.rfind("{", 0, start)
        return None

    @with_prompt_template
    async def run(
        self,
        instruction: str,
        environment: BaseEnvironment,
        context: AgentContext,
    ) -> None:
        if not self.model_name or "/" not in self.model_name:
            raise ValueError("Model name must be in the format provider/model_name")

        provider, model = self.model_name.split("/", 1)
        # An empty model silently falls back to Neurolink's provider default,
        # which is how the pilot ended up on claude-sonnet-4-5 unintentionally.
        if not model:
            raise ValueError("Pass an explicit model, e.g. -m anthropic/claude-opus-4-8")

        ledger_start = ""
        if provider == "anthropic":
            # Requests go through the in-container ledger, which records the
            # served model and thinking setting per request.
            upstream, api_key = resolve_model_access()
            env = {
                "ANTHROPIC_API_KEY": api_key,
                "ANTHROPIC_BASE_URL": f"http://127.0.0.1:{_LEDGER_PORT}",
                "LEDGER_UPSTREAM": upstream,
                "LEDGER_PORT": str(_LEDGER_PORT),
                "LEDGER_PATH": f"/logs/agent/{_LEDGER_LOG_NAME}",
            }
            ledger_start = (
                "rm -f /tmp/.model-ledger-ready; "
                f"node {_REMOTE_LEDGER} > /logs/agent/model-ledger.log 2>&1 & "
                "ledger_pid=$!; "
                "for _ in $(seq 1 100); do "
                "[ -f /tmp/.model-ledger-ready ] && break; sleep 0.1; done; "
                "[ -f /tmp/.model-ledger-ready ] || "
                "{ echo 'model ledger did not start' >&2; exit 97; }; "
            )
        elif provider == "openai":
            api_key = os.environ.get("OPENAI_API_KEY")
            if not api_key:
                raise ValueError("No API key found for provider: openai")
            env = {"OPENAI_API_KEY": api_key}
        else:
            raise ValueError(f"Unsupported provider: {provider}")

        env["NEUROLINK_ENABLE_BASH_TOOL"] = "true"
        extra_args = " ".join(
            shlex.quote(arg) for arg in shlex.split(os.environ.get("NEUROLINK_EXTRA_ARGS", ""))
        )

        await self.exec_as_agent(
            environment,
            command="touch /tmp/.neurolink-run-marker",
        )

        await self.exec_as_agent(
            environment,
            command=(
                ". /opt/neurolink-node/env.sh; "
                "{ pwd; id; node --version; npm --version; neurolink --version; } "
                "> /logs/agent/runtime.txt 2>&1; "
                f"{ledger_start}"
                f"{_AGENT_TIMEOUT} neurolink generate {shlex.quote(instruction)} "
                f"--provider {provider} --model {shlex.quote(model)} "
                f"--max {_MAX_TOKENS} --timeout {_GENERATE_TIMEOUT_S} "
                "--format json --enable-analytics --quiet "
                f"{extra_args} --output /logs/agent/{_RESULT_LOG_NAME} "
                "> /logs/agent/neurolink.stdout.log 2> /logs/agent/neurolink.stderr.log; "
                f'rc=$?; echo "$rc" > /logs/agent/{_EXIT_CODE_NAME}; '
                '[ -n "${ledger_pid:-}" ] && kill "$ledger_pid" 2>/dev/null; '
                'exit "$rc"'
            ),
            env=env,
        )

        # Off by default: this post-step does work the agent did not do, so a
        # score produced with it is not comparable to the published leaderboard.
        if os.environ.get("NEUROLINK_TUA_RECALC_XLSX") == "1":
            await self._recalculate_spreadsheets(environment)

    async def _recalculate_spreadsheets(self, environment: BaseEnvironment) -> None:
        """Re-save every .xlsx modified during the run through headless
        LibreOffice so formulas get cached values. Diagnostic only."""
        try:
            probe = await self.exec_as_agent(
                environment,
                command="command -v libreoffice || command -v soffice || true",
            )
            engine = next(
                (line.strip() for line in (probe.stdout or "").splitlines() if line.strip()),
                "",
            )
            if not engine:
                return

            find_result = await self.exec_as_agent(
                environment,
                command=(
                    "find /app /home /root -xdev -iname '*.xlsx' "
                    "-newer /tmp/.neurolink-run-marker 2>/dev/null || true"
                ),
            )
            xlsx_files = [
                line.strip() for line in (find_result.stdout or "").splitlines() if line.strip()
            ]
            for xlsx_path in xlsx_files:
                quoted = shlex.quote(xlsx_path)
                await self.exec_as_agent(
                    environment,
                    command=(
                        "rm -rf /tmp/.neurolink-recalc && mkdir -p /tmp/.neurolink-recalc && "
                        f"{shlex.quote(engine)} --headless --convert-to xlsx "
                        f"--outdir /tmp/.neurolink-recalc {quoted} && "
                        f"cp /tmp/.neurolink-recalc/\"$(basename {quoted})\" {quoted}"
                    ),
                    timeout_sec=120,
                )
        except Exception:
            self.logger.debug("Spreadsheet recalculation pass failed", exc_info=True)
