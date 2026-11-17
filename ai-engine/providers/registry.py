from typing import Dict, Type, Optional
from ai_engine.providers.base import BaseImageProvider


class ProviderRegistry:
    """
    Registry for model providers. Allows dynamic selection and instantiation
    based on configuration without coupling business logic to concrete providers.
    """
    _providers: Dict[str, Type[BaseImageProvider]] = {}
    _instances: Dict[str, BaseImageProvider] = {}

    @classmethod
    def register(cls, name: str, provider_cls: Type[BaseImageProvider]) -> None:
        cls._providers[name] = provider_cls

    @classmethod
    def get_provider(cls, name: str, **kwargs) -> BaseImageProvider:
        if name not in cls._instances:
            if name not in cls._providers:
                raise ValueError(
                    f"Provider '{name}' is not registered. "
                    f"Available providers: {list(cls._providers.keys())}"
                )
            cls._instances[name] = cls._providers[name](**kwargs)
        return cls._instances[name]

    @classmethod
    def list_registered(cls) -> list[str]:
        return list(cls._providers.keys())

    @classmethod
    def reset(cls) -> None:
        cls._instances.clear()
