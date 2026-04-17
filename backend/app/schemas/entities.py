from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class TokenUsage(BaseModel):
    promptTokens: int = 0
    completionTokens: int = 0
    totalTokens: int = 0


class CharacterBase(BaseModel):
    id: str
    name: str
    avatar: str | None = None
    background: str | None = None
    description: str
    greeting: str | None = None
    settings: str
    isFavorite: bool = False
    createdAt: int
    updatedAt: int
    mode: str | None = None
    category: str | None = None
    subCategory: str | None = None
    avatarTone: str | None = None
    backgroundImage: str | None = None
    personality: str | None = None
    behavior: str | None = None
    values: str | None = None
    members: list[str] | None = None
    tags: list[str] | None = None
    sourceType: str | None = None
    sourceName: str | None = None


class CharacterPayload(CharacterBase):
    pass


class CharacterResponse(CharacterBase):
    pass


class UserInfo(BaseModel):
    name: str | None = None
    avatar: str | None = None
    globalPrompt: str | None = None
    fortuneCoins: int = 0
    chatLevel: int = 1
    gameLevel: int = 1


class UserSetting(BaseModel):
    key: str
    value: str


class APIConfigPayload(BaseModel):
    id: str
    name: str
    provider: Literal["openai", "openai-compatible"] = "openai-compatible"
    apiKey: str = ""
    baseURL: str | None = None
    model: str
    isDefault: bool = False
    source: Literal["storage", "env"] = "storage"


class APIConfigResponse(BaseModel):
    id: str
    name: str
    provider: Literal["openai", "openai-compatible"] = "openai-compatible"
    apiKey: str = ""
    baseURL: str | None = None
    model: str
    isDefault: bool = False
    source: Literal["storage", "env"] = "storage"


class APIConfigTestRequest(BaseModel):
    id: str | None = None
    name: str | None = None
    provider: Literal["openai", "openai-compatible"] | None = None
    apiKey: str | None = None
    baseURL: str | None = None
    model: str | None = None


class TestResult(BaseModel):
    success: bool
    message: str
    model: str | None = None


class SessionPayload(BaseModel):
    id: str
    characterId: str
    createdAt: int
    updatedAt: int
    messageCount: int = 0
    title: str | None = None
    mode: str | None = None


class SessionResponse(SessionPayload):
    pass


class MessagePayload(BaseModel):
    id: str
    sessionId: str
    role: Literal["user", "assistant"]
    contentType: Literal["text", "image", "audio"]
    content: str
    isLiked: bool = False
    timestamp: int
    tokenUsage: TokenUsage | None = None
    assetId: str | None = None


class MessageResponse(MessagePayload):
    pass


class ReplaceMessagesPayload(BaseModel):
    messages: list[MessagePayload]


class GameSettings(BaseModel):
    globalEnabled: bool = True
    sessionEnabled: dict[str, bool] = Field(default_factory=dict)


class GameStatePayload(BaseModel):
    id: str
    gameType: str
    characterId: str
    sessionId: str
    stateData: dict[str, Any]
    createdAt: int
    updatedAt: int


class GameStateResponse(GameStatePayload):
    pass


class AssetResponse(BaseModel):
    id: str
    assetType: str
    storagePath: str
    originalName: str | None = None
    mimeType: str | None = None
    size: int | None = None
    ownerType: str | None = None
    ownerId: str | None = None
    createdAt: int
    url: str


class StoryMessage(BaseModel):
    id: str
    role: Literal["me", "other", "system"]
    text: str
    variant: Literal["message", "scene", "hint"]
    delay: int = 0
    typing: int = 0
    hidden: bool = False


class StoryChoiceOption(BaseModel):
    id: str
    key: str
    text: str
    retry: bool = False
    branchMessages: list[StoryMessage] = Field(default_factory=list)


class StorySegment(BaseModel):
    id: str
    kind: Literal["messages", "choice"]
    scene: str | None = None
    prompt: str | None = None
    messages: list[StoryMessage] = Field(default_factory=list)
    options: list[StoryChoiceOption] = Field(default_factory=list)


class StoryResponse(BaseModel):
    id: str
    title: str
    sourceName: str | None = None
    sourceFormat: str | None = None
    version: str | None = None
    characterName: str | None = None
    entryDay: str | None = None
    isDefault: bool = False
    createdAt: int
    updatedAt: int
    segments: list[StorySegment] = Field(default_factory=list)


class StoryCompileResponse(BaseModel):
    title: str
    characterName: str
    segments: list[StorySegment]


class ChatContentPart(BaseModel):
    type: Literal["text", "image_url"]
    text: str | None = None
    image_url: dict[str, str] | None = None


class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str | list[ChatContentPart]


class ChatContextRequest(BaseModel):
    systemPrompt: str = ""
    messages: list[ChatMessage] = Field(default_factory=list)
    character: CharacterPayload | None = None


class ChatCompletionResponse(BaseModel):
    content: str
    usage: TokenUsage | None = None
    model: str | None = None


class TTSSynthesizeRequest(BaseModel):
    text: str
    voice: str | None = None
    language: str | None = None
    rate: float | None = None
    pitch: float | None = None
    format: Literal["mp3"] = "mp3"


class TTSSynthesizeResponse(BaseModel):
    asset: AssetResponse


class STTTranscribeResponse(BaseModel):
    text: str
    language: str | None = None
    confidence: float | None = None


class OverviewResponse(BaseModel):
    characterCount: int
    sessionCount: int
    messageCount: int
    apiConfigCount: int
    gameStateCount: int


class ImportSummary(BaseModel):
    mode: Literal["merge", "replace"]
    characterCount: int
    sessionCount: int
    messageCount: int
    apiConfigCount: int
    gameStateCount: int


class ExportTaskResponse(BaseModel):
    id: str
    exportType: str
    status: str
    filename: str
    assetId: str | None = None
    downloadUrl: str | None = None
    detail: dict[str, Any] | None = None
    createdAt: int
    updatedAt: int


class HealthResponse(BaseModel):
    status: str
    database: str
    storage: str
    llmProvider: str
