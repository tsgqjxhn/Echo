from __future__ import annotations

import json
import re
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = REPO_ROOT / "backend"
DOCS_ROOT = REPO_ROOT / "docs"
SOURCE_FILE = DOCS_ROOT / "剧情.md"
OUTPUT_FILE = REPO_ROOT / "frontend" / "src" / "data" / "story.generated.ts"

sys.path.insert(0, str(BACKEND_ROOT))

from app.services.story_parser import ParsedStoryMessage, ParsedStorySegment, StoryParser  # noqa: E402


DAY_BLOCK_RE = re.compile(r"^#{1,3}\s*(第\d+天)(?:[｜|：:].*)?$", re.MULTILINE)
ACT_TITLE_RE = re.compile(r"^##\s*(.+?)\s*$", re.MULTILINE)
DAY_HEADING_TITLE_RE = re.compile(r"^#{1,3}\s*第\d+天[｜|：:]\s*(.+?)\s*$", re.MULTILINE)
DAY_TITLE_RE = re.compile(r"^###\s*(?![🔘🔄])(.+?)\s*$", re.MULTILINE)

NAME_PATTERNS = (
    re.compile(r"\[名字更改[:：][^=\]]+=>([^\]]+)\]"),
    re.compile(r"联系人名称更新为【(.+?)】"),
    re.compile(r"联系人名称由【.+?】(?:永久)?更新为【(.+?)】"),
    re.compile(r"联系人暂记为[:：]\s*([^。]+)"),
)
AVATAR_PATTERNS = (
    re.compile(r"\[头像状态[:：][^=\]]+=>([^\]]+)\]"),
    re.compile(r"\[头像更换[:：][^=\]]+=>([^\]]+)\]"),
    re.compile(r"\[头像解锁[:：]\s*([^\]]+)\]"),
    re.compile(r"\[头像更新[:：]\s*([^\]]+)\]"),
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
        prefix = text[:start]
        act_matches = list(ACT_TITLE_RE.finditer(prefix))
        act_header = act_matches[-1].group(0) if act_matches else ""
        block_text = text[start:end].strip()
        blocks.append((day_label, f"{act_header}\n{block_text}".strip()))

    return blocks


def extract_act_title(block: str) -> str:
    match = ACT_TITLE_RE.search(block)
    return match.group(1).strip() if match else ""


def extract_day_title(block: str, day_label: str) -> str:
    heading_match = DAY_HEADING_TITLE_RE.search(block)
    if heading_match:
        return heading_match.group(1).strip()

    for match in DAY_TITLE_RE.finditer(block):
        title = match.group(1).strip()
        if title:
            title = re.sub(r"^第\d+天[｜|：:]\s*", "", title).strip()
            return title
    return day_label


def resolve_avatar_key(label: str | None) -> str:
    normalized = (label or "").strip()
    if not normalized:
        return "question"
    if "avatar-short-hair" in normalized or normalized == "short" or "短发" in normalized:
        return "short"
    if "avatar-blur" in normalized or normalized == "blur" or "模糊" in normalized:
        return "blur"
    if "avatar-xing" in normalized or normalized == "clear" or "正面清晰" in normalized or normalized == "星" or "清晰形象" in normalized:
        return "xing"
    if "avatar-question" in normalized or normalized == "question" or "?" in normalized or "未知" in normalized:
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


# ---------------------------------------------------------------------------
# Player-choice injection: ensure every 2-6 NPC messages are followed by a
# player choice so the conversation never feels like a monologue.
# ---------------------------------------------------------------------------

_INJECT_MIN_GAP = 2
_INJECT_MAX_GAP = 6

_RESPONSE_POOLS: dict[str, list[str]] = {
    "acknowledge": [
        "收到", "知道了", "行", "了解", "明白", "好", "嗯",
        "我知道了", "OK", "看着呢",
    ],
    "probe": [
        "说清楚点", "继续，细节呢", "具体什么情况", "重点",
        "你说完", "先把你看到的说完整", "什么意思",
        "别漏细节", "然后怎样",
    ],
    "reassure": [
        "别急，我在", "你先冷静", "注意安全", "撑住",
        "慢慢说", "先稳住", "别怕，我在",
        "你先别动", "我在，继续说",
    ],
    "pushback": [
        "能不能说重点", "所以你想表达什么", "你别绕了",
        "直接说", "别磨蹭", "简单点说",
        "你废话真多", "行行行你说", "话说完了没",
    ],
    "wary": [
        "真的假的", "你确定？", "再确认一遍", "这事不太正常",
        "先别动", "不对劲", "你确认一下",
        "我不太信", "别被骗了",
    ],
}

_DISTRESS_WORDS = (
    "冷", "怕", "帮", "救", "疼", "死", "痛", "抖", "哭",
    "不行了", "快没", "危险", "跑", "逃", "追", "躲", "吓",
)
_INFO_WORDS = (
    "发现", "照片", "证据", "档案", "看到", "找到", "线索",
    "图", "记录", "文件", "截图", "数据",
)


def _pick_pools(text: str) -> list[str]:
    """Choose 2-3 response-pool keys appropriate to *text*."""
    has_distress = any(w in text for w in _DISTRESS_WORDS)
    has_info = any(w in text for w in _INFO_WORDS)

    keys: list[str] = []
    if has_distress:
        keys += ["reassure", "probe"]
    elif has_info:
        keys += ["wary", "acknowledge"]
    else:
        keys += ["acknowledge", "pushback"]

    import random
    if random.random() < 0.25:
        keys.append("wary")
    elif random.random() < 0.2:
        keys.append("pushback")

    return keys[:3]


def _make_options(
    pools: list[str],
    base_id: str,
    chunk_idx: int,
) -> list[dict[str, object]]:
    import random

    seen: set[str] = set()
    options: list[dict[str, object]] = []
    key_char = ord("A")

    for pool_key in pools:
        candidates = [t for t in _RESPONSE_POOLS[pool_key] if t not in seen]
        if not candidates:
            continue
        text = random.choice(candidates)
        seen.add(text)
        options.append(
            {
                "id": f"{base_id}-opt-{chunk_idx}-{chr(key_char)}",
                "key": chr(key_char),
                "text": text,
                "retry": False,
                "branchMessages": [],
            }
        )
        key_char += 1

    return options[:3]


def inject_player_choices(
    segments: list[dict[str, object]],
    conversation_id: str,
) -> list[dict[str, object]]:
    """Split long NPC-only stretches and insert non-branching player choices.

    Walks ALL messages (including those alongside "me" messages) and ensures
    no more than _INJECT_MAX_GAP consecutive NPC messages appear between
    player interactions.
    """
    import random

    result: list[dict[str, object]] = []
    running_npc = 0  # NPC count since last player interaction or choice

    for segment in segments:
        if segment["kind"] != "messages":
            result.append(segment)
            if segment["kind"] == "choice":
                running_npc = 0
            continue

        messages = segment["messages"]
        target = random.randint(_INJECT_MIN_GAP, _INJECT_MAX_GAP)
        buf: list[dict[str, object]] = []
        chunk_idx = 0

        for msg in messages:
            buf.append(msg)

            if msg["role"] == "me":
                # Player spoke — count NPC messages in buf since last interaction
                # and flush as a segment, then reset.
                running_npc = 0
                target = random.randint(_INJECT_MIN_GAP, _INJECT_MAX_GAP)
            elif msg["role"] == "other":
                running_npc += 1

                if running_npc >= target:
                    # Flush buffer + inject choice
                    result.append(
                        {
                            "id": f"{segment['id']}-split-{chunk_idx}",
                            "kind": "messages",
                            "scene": segment["scene"],
                            "prompt": segment["prompt"],
                            "messages": list(buf),
                            "options": [],
                        }
                    )
                    chunk_text = " ".join(m["text"] for m in buf if m["role"] == "other")
                    pools = _pick_pools(chunk_text)
                    options = _make_options(pools, segment["id"], chunk_idx)
                    result.append(
                        {
                            "id": f"{segment['id']}-choice-{chunk_idx}",
                            "kind": "choice",
                            "scene": segment["scene"],
                            "prompt": "你的回复",
                            "messages": [],
                            "options": options,
                        }
                    )
                    buf = []
                    running_npc = 0
                    target = random.randint(_INJECT_MIN_GAP, _INJECT_MAX_GAP)
                    chunk_idx += 1
            # system messages: don't affect running_npc

        if buf:
            result.append(
                {
                    "id": f"{segment['id']}-split-{chunk_idx}",
                    "kind": "messages",
                    "scene": segment["scene"],
                    "prompt": segment["prompt"],
                    "messages": list(buf),
                    "options": [],
                }
            )

    # ---- Also inject synthetic "me" messages inside branch messages ----
    for segment in result:
        if segment["kind"] != "choice":
            continue
        for option in segment.get("options", []):
            branch: list[dict[str, object]] = option.get("branchMessages", [])
            if not branch:
                continue
            other_count = sum(1 for m in branch if m["role"] == "other")
            if other_count <= _INJECT_MAX_GAP:
                continue

            new_branch: list[dict[str, object]] = []
            other_seen = 0
            chunk_text = ""
            target = random.randint(_INJECT_MIN_GAP, _INJECT_MAX_GAP)
            msg_idx = 0

            for msg in branch:
                new_branch.append(msg)
                if msg["role"] == "other":
                    other_seen += 1
                    chunk_text += msg.get("text", "") + " "

                if other_seen >= target and msg["role"] == "other":
                    # Insert a synthetic "me" message to trigger inline choice
                    pools = _pick_pools(chunk_text)
                    opts_text = []
                    seen: set[str] = set()
                    for pk in pools:
                        cands = [t for t in _RESPONSE_POOLS[pk] if t not in seen]
                        if cands:
                            chosen = random.choice(cands)
                            opts_text.append(chosen)
                            seen.add(chosen)

                    for txt in opts_text[:3]:
                        msg_idx += 1
                        new_branch.append(
                            {
                                "id": f"branch-inject-{msg_idx}",
                                "role": "me",
                                "text": txt,
                                "variant": "message",
                                "delay": 0,
                                "typing": 0,
                                "hidden": False,
                            }
                        )

                    other_seen = 0
                    chunk_text = ""
                    target = random.randint(_INJECT_MIN_GAP, _INJECT_MAX_GAP)

            option["branchMessages"] = new_branch

    return result


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
