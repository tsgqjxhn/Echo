from __future__ import annotations

import json
import re
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = REPO_ROOT / "backend"
DOCS_ROOT = REPO_ROOT / "docs"
SOURCE_FILE = DOCS_ROOT / "新剧情.md"
OUTPUT_FILE = REPO_ROOT / "frontend" / "src" / "data" / "story.generated.ts"

sys.path.insert(0, str(BACKEND_ROOT))

from app.services.story_parser import ParsedStoryMessage, ParsedStorySegment, StoryParser  # noqa: E402


DAY_BLOCK_RE = re.compile(r"^#\s*(第\d+天)\s*$", re.MULTILINE)
ACT_TITLE_RE = re.compile(r"^##\s*(.+?)\s*$", re.MULTILINE)
DAY_TITLE_RE = re.compile(r"^###\s*(?![🔘🔄])(.+?)\s*$", re.MULTILINE)

NAME_PATTERNS = (
    re.compile(r"联系人名称更新为【(.+?)】"),
    re.compile(r"联系人名称由【.+?】(?:永久)?更新为【(.+?)】"),
    re.compile(r"联系人暂记为[:：]\s*([^。]+)"),
)
AVATAR_PATTERNS = (
    re.compile(r"头像解锁[:：]?【(.+?)】"),
    re.compile(r"头像更新[:：]?【(.+?)】"),
    re.compile(r"头像已从【.+?】(?:永久)?变更为【(.+?)】"),
)


def iter_day_blocks(text: str) -> list[tuple[str, str]]:
    matches = list(DAY_BLOCK_RE.finditer(text))
    blocks: list[tuple[str, str]] = []

    for index, match in enumerate(matches):
        day_label = match.group(1).strip()
        start = match.start()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        blocks.append((day_label, text[start:end].strip()))

    return blocks


def extract_act_title(block: str) -> str:
    match = ACT_TITLE_RE.search(block)
    return match.group(1).strip() if match else ""


def extract_day_title(block: str, day_label: str) -> str:
    for match in DAY_TITLE_RE.finditer(block):
        title = match.group(1).strip()
        if title:
            return title
    return day_label


def resolve_avatar_key(label: str | None) -> str:
    normalized = (label or "").strip()
    if not normalized:
        return "question"
    if "短发" in normalized:
        return "short"
    if "模糊" in normalized:
        return "blur"
    if "正面清晰" in normalized or normalized == "星" or "清晰形象" in normalized:
        return "xing"
    if "?" in normalized or "未知" in normalized:
        return "question"
    return "question"


def extract_profile_updates(text: str, current_name: str, current_avatar: str) -> tuple[str, str]:
    next_name = current_name
    next_avatar = current_avatar

    for pattern in NAME_PATTERNS:
        match = pattern.search(text)
        if match:
            next_name = match.group(1).strip()

    for pattern in AVATAR_PATTERNS:
        match = pattern.search(text)
        if match:
            next_avatar = resolve_avatar_key(match.group(1))

    if "头像：[?]" in text or "头像:[?]" in text:
        next_avatar = "question"

    return next_name, next_avatar


def iter_segment_messages(segment: ParsedStorySegment) -> list[ParsedStoryMessage]:
    if segment.kind == "messages":
        return segment.messages

    messages: list[ParsedStoryMessage] = []
    for option in segment.options:
        messages.extend(option.branchMessages)
    return messages


def serialize_segments(segments: list[ParsedStorySegment]) -> list[dict[str, object]]:
    serialized: list[dict[str, object]] = []

    for segment in segments:
        serialized.append(
            {
                "id": segment.id,
                "kind": segment.kind,
                "scene": segment.scene,
                "prompt": segment.prompt,
                "messages": [
                    {
                        "id": message.id,
                        "role": message.role,
                        "text": message.text,
                        "variant": message.variant,
                        "delay": message.delay,
                        "typing": message.typing,
                        "hidden": message.hidden,
                    }
                    for message in segment.messages
                ],
                "options": [
                    {
                        "id": option.id,
                        "key": option.key,
                        "text": option.text,
                        "retry": option.retry,
                        "branchMessages": [
                            {
                                "id": message.id,
                                "role": message.role,
                                "text": message.text,
                                "variant": message.variant,
                                "delay": message.delay,
                                "typing": message.typing,
                                "hidden": message.hidden,
                            }
                            for message in option.branchMessages
                        ],
                    }
                    for option in segment.options
                ],
            }
        )

    return serialized


def emit_typescript(conversations: list[dict[str, object]]) -> str:
    payload = json.dumps(conversations, ensure_ascii=False, indent=2)
    return f"""export type ImportedDialogueRole = 'me' | 'other' | 'system'
export type ImportedDialogueVariant = 'message' | 'scene' | 'hint'
export type ImportedStoryAvatarKey = 'question' | 'blur' | 'short' | 'xing'

export interface ImportedDialogueMessage {{
  id: string
  role: ImportedDialogueRole
  text: string
  variant: ImportedDialogueVariant
  delay: number
  typing: number
  hidden: boolean
}}

export interface ImportedDialogueChoiceOption {{
  id: string
  key: string
  text: string
  retry: boolean
  branchMessages: ImportedDialogueMessage[]
}}

export interface ImportedDialogueSegment {{
  id: string
  kind: 'messages' | 'choice'
  scene: string | null
  prompt: string | null
  messages: ImportedDialogueMessage[]
  options: ImportedDialogueChoiceOption[]
}}

export interface ImportedConversation {{
  id: string
  title: string
  dayLabel: string
  sceneLabel: string
  shortLabel: string
  contactName: string
  avatarKey: ImportedStoryAvatarKey
  segments: ImportedDialogueSegment[]
}}

export const STORY_IMPORTED_TITLE = "回声"
export const STORY_IMPORTED_CHARACTER = "星"

export const STORY_IMPORTED_CONVERSATIONS: ImportedConversation[] = {payload}
"""


def main() -> None:
    if not SOURCE_FILE.exists():
        raise FileNotFoundError(f"Missing source file: {SOURCE_FILE}")

    source_text = SOURCE_FILE.read_text(encoding="utf-8")
    parser = StoryParser()
    conversations: list[dict[str, object]] = []

    current_name = "未知用户"
    current_avatar = "question"

    for index, (day_label, block_text) in enumerate(iter_day_blocks(source_text), start=1):
        act_title = extract_act_title(block_text)
        day_title = extract_day_title(block_text, day_label)
        _, _, parsed_segments = parser.parse(block_text)
        serialized_segments = serialize_segments(parsed_segments)

        conversations.append(
            {
                "id": f"d{index:02d}",
                "title": day_title,
                "dayLabel": day_label,
                "sceneLabel": act_title,
                "shortLabel": f"D{index:02d}",
                "contactName": current_name,
                "avatarKey": current_avatar,
                "segments": serialized_segments,
            }
        )

        for segment in parsed_segments:
            for message in iter_segment_messages(segment):
                if message.role != "system":
                    continue
                current_name, current_avatar = extract_profile_updates(message.text, current_name, current_avatar)

    OUTPUT_FILE.write_text(emit_typescript(conversations), encoding="utf-8")

    total_segments = sum(len(conversation["segments"]) for conversation in conversations)
    total_choices = sum(
        1
        for conversation in conversations
        for segment in conversation["segments"]
        if segment["kind"] == "choice"
    )
    print(
        f"Imported {len(conversations)} conversations, {total_segments} segments, {total_choices} choices -> {OUTPUT_FILE}"
    )


if __name__ == "__main__":
    main()
