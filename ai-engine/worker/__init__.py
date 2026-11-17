"""
Kaggle and Google Colab Ephemeral GPU Worker Module for Reve.
"""
from .kaggle_worker import resolve_worker_token, resolve_backend_url

__all__ = ["resolve_worker_token", "resolve_backend_url"]
