from __future__ import annotations

import json
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = REPO_ROOT / "backend"
DOCS_ROOT = REPO_ROOT / "docs"
SOURCE_FILE = DOCS_ROOT / "\u65b0\u5267\u60c5.md"
OUTPUT_FILE = REPO_ROOT / "xiang-app" / "src" / "data" / "story.generated.ts"

sys.path.insert(0, str(BACKEND_ROOT))

from app.services.story_parser import StoryParser  # noqa: E402


def emit_typescript(title: str, character_name: str, segments: list[dict[str, object]]) -> str:
    serialized_segments = json.dumps(segments, ensure_ascii=False, indent=2)

    return f"""export type ImportedDialogueRole = 'me' | 'other' | 'system'
export type ImportedDialogueVariant = 'message' | 'scene' | 'hint'

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

export const STORY_IMPORTED_TITLE = {json.dumps(title, ensure_ascii=False)}
export const STORY_IMPORTED_CHARACTER = {json.dumps(character_name, ensure_ascii=False)}
export const STORY_IMPORTED_SEGMENTS: ImportedDialogueSegment[] = {serialized_segments}
"""


def serialize_segments(segments) -> list[dict[str, object]]:
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


def main() -> None:
    if not SOURCE_FILE.exists():
        raise FileNotFoundError(f"Missing source file: {SOURCE_FILE}")

    parser = StoryParser()
    title, character_name, parsed_segments = parser.parse(SOURCE_FILE.read_text(encoding="utf-8"))
    serialized_segments = serialize_segments(parsed_segments)
    OUTPUT_FILE.write_text(emit_typescript(title, character_name, serialized_segments), encoding="utf-8")

    choice_count = sum(1 for segment in serialized_segments if segment["kind"] == "choice")
    print(f"Imported {len(serialized_segments)} segments from {SOURCE_FILE.name} ({choice_count} choices)")


if __name__ == "__main__":
    main()
