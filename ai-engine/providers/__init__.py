from ai_engine.providers.base import BaseImageProvider
from ai_engine.providers.registry import ProviderRegistry
from ai_engine.providers.local_diffusers import LocalDiffusersProvider
from ai_engine.providers.mock_provider import MockTestProvider
from ai_engine.providers.remote_worker import RemoteWorkerProvider

# Register providers
ProviderRegistry.register("local_diffusers", LocalDiffusersProvider)
ProviderRegistry.register("mock_test", MockTestProvider)
ProviderRegistry.register("remote_worker", RemoteWorkerProvider)

__all__ = [
    "BaseImageProvider",
    "ProviderRegistry",
    "LocalDiffusersProvider",
    "MockTestProvider",
    "RemoteWorkerProvider",
]
