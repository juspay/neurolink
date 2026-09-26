import asyncio

from repo_env.podman_env import PodmanEnvironment

# Concurrent builds of different task images failed with vanished apt files
# while sibling trials removed images; one build at a time avoids both.
_BUILD_LOCK = asyncio.Lock()


class CachedPodmanEnvironment(PodmanEnvironment):
    """Builds each task image once and reuses it for every attempt."""

    async def _build_runtime_image(self, build_command, timeout_sec):
        async with _BUILD_LOCK:
            exists = await self._run_podman_command(
                ["image", "exists", self._runtime_image_name], check=False
            )
            if exists.return_code == 0:
                return
            await super()._build_runtime_image(build_command, timeout_sec)

    async def stop(self, delete: bool):
        # Sibling attempts share the task image, so never remove it here.
        if delete and not self._keep_containers:
            await self._run_podman_command(
                ["rm", "-f", self._container_name], check=False
            )
            return
        await super().stop(delete=False)
