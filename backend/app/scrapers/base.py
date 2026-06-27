from abc import ABC, abstractmethod
from typing import Any


class BaseScraper(ABC):
    @abstractmethod
    async def fetch(self) -> list[dict[str, Any]]:
        raise NotImplementedError
