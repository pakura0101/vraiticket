import math
from typing import TypeVar
T = TypeVar("T")


def paginate(items: list, total: int, page: int, page_size: int) -> dict:
    """Build a pagination envelope compatible with PaginatedResponse."""
    pages = math.ceil(total / page_size) if page_size else 1
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": pages,
    }
