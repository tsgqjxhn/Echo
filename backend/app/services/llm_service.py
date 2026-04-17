from __future__ import annotations

import asyncio
import base64
import json
import mimetypes
from pathlib import Path
from urllib.parse import urlparse

import httpx
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.schemas.entities import ChatContentPart, ChatContextRequest, ChatCompletionResponse, TokenUsage
from app.services.provider_config import resolve_runtime_api_config


class LLMService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def _media_path_from_url(self, url: str) -> Path | None:
        parsed = urlparse(url)
        path = parsed.path or url
        if not path.startswith(self.settings.media_url):
            return None
        relative = path[len(self.settings.media_url):].lstrip("/")
        return None if not relative else self.settings.storage_root / relative

    def _inline_local_image(self, item: ChatContentPart) -> ChatContentPart:
        if item.type != "image_url" or not item.image_url:
            return item
        url = item.image_url.get("url", "")
        file_path = self._media_path_from_url(url)
        if file_path is None or not file_path.exists():
            return item
        mime = mimetypes.guess_type(file_path.name)[0] or "image/png"
        encoded = base64.b64encode(file_path.read_bytes()).decode("ascii")
        return ChatContentPart(type="image_url", image_url={"url": f"data:{mime};base64,{encoded}"})

    def _build_messages(self, request: ChatContextRequest) -> list[dict[str, object]]:
        messages: list[dict[str, object]] = []
        if request.systemPrompt.strip():
            messages.append({"role": "system", "content": request.systemPrompt.strip()})

        for message in request.messages:
            if isinstance(message.content, str):
                if message.content.strip():
                    messages.append({"role": message.role, "content": message.content})
                continue

            content = [self._inline_local_image(part).model_dump(exclude_none=True) for part in message.content]
            messages.append({"role": message.role, "content": content})
        return messages

    def _mock_reply(self, request: ChatContextRequest) -> str:
        latest_user = next(
            (
                item.content
                for item in reversed(request.messages)
                if item.role == "user" and isinstance(item.content, str) and item.content.strip()
            ),
            "",
        )
        character_name = request.character.name if request.character else "角色"
        return f"{character_name} 已通过后端收到消息：{latest_user or '你好'}"

    async def chat(self, db: Session, request: ChatContextRequest) -> ChatCompletionResponse:
        runtime = resolve_runtime_api_config(db, self.settings)
        if runtime is None or self.settings.llm_provider == "mock":
            content = self._mock_reply(request)
            usage = TokenUsage(promptTokens=0, completionTokens=len(content), totalTokens=len(content))
            return ChatCompletionResponse(content=content, usage=usage, model="mock-backend")

        body = {
            "model": runtime["model"],
            "messages": self._build_messages(request),
            "stream": False,
            "temperature": 0.7,
            "max_tokens": 2048,
        }
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{runtime['base_url']}/chat/completions",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {runtime['api_key']}",
                },
                json=body,
            )
        if not response.is_success:
            raise HTTPException(status_code=response.status_code, detail=response.text or "LLM request failed")

        payload = response.json()
        usage_payload = payload.get("usage") or {}
        usage = TokenUsage(
            promptTokens=usage_payload.get("prompt_tokens", 0),
            completionTokens=usage_payload.get("completion_tokens", 0),
            totalTokens=usage_payload.get("total_tokens", 0),
        )
        return ChatCompletionResponse(
            content=payload.get("choices", [{}])[0].get("message", {}).get("content", ""),
            usage=usage,
            model=payload.get("model"),
        )

    async def stream_lines(self, db: Session, request: ChatContextRequest):
        runtime = resolve_runtime_api_config(db, self.settings)
        if runtime is None or self.settings.llm_provider == "mock":
            text = self._mock_reply(request)
            for chunk in [text[i:i + 24] for i in range(0, len(text), 24)]:
                payload = {
                    "choices": [{"delta": {"content": chunk}, "finish_reason": None}],
                    "usage": {"prompt_tokens": 0, "completion_tokens": len(chunk), "total_tokens": len(text)},
                }
                yield f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"
                await asyncio.sleep(0.03)
            yield "data: [DONE]\n\n"
            return

        body = {
            "model": runtime["model"],
            "messages": self._build_messages(request),
            "stream": True,
            "temperature": 0.7,
            "max_tokens": 2048,
        }
        async with httpx.AsyncClient(timeout=None) as client:
            async with client.stream(
                "POST",
                f"{runtime['base_url']}/chat/completions",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {runtime['api_key']}",
                },
                json=body,
            ) as response:
                if not response.is_success:
                    raise HTTPException(status_code=response.status_code, detail=(await response.aread()).decode("utf-8", errors="ignore"))
                async for line in response.aiter_lines():
                    if line.startswith("data:"):
                        yield f"{line}\n\n"
