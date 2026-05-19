from __future__ import annotations

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.core.config import get_settings


class OptionalAPITokenMiddleware(BaseHTTPMiddleware):
    """若配置了 API_TOKEN，则要求请求携带 Authorization: Bearer <token>。"""

    EXEMPT_PREFIXES = ("/api/health", "/docs", "/openapi.json", "/redoc")

    async def dispatch(self, request: Request, call_next):
        settings = get_settings()
        token = (settings.api_token or "").strip()
        if not token:
            return await call_next(request)

        path = request.url.path
        if any(path.startswith(prefix) for prefix in self.EXEMPT_PREFIXES):
            return await call_next(request)

        auth = request.headers.get("Authorization", "")
        if auth == f"Bearer {token}":
            return await call_next(request)

        return JSONResponse(status_code=401, content={"detail": "Unauthorized"})
