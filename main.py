"""Razor Console development entry point."""

import uvicorn

from razor_console.settings import settings


def main() -> None:
    """Run the Console HTTP service."""
    uvicorn.run(
        "razor_console.app:app",
        host=settings.host,
        port=settings.port,
        reload=False,
        access_log=False,
    )


if __name__ == "__main__":
    main()
