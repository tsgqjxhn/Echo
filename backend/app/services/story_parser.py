from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Literal


DialogueRole = Literal["me", "other", "system"]
DialogueVariant = Literal["message", "scene", "hint"]


DAY_PREFIX = "\u7b2c"
DAY_SUFFIX = "\u5929"
PLAYER_LABEL = "\u4f60"
PLAYER_EXPLICIT_LABEL = "\u73a9\u5bb6"
SELF_LABEL = "\u6211"
STAR_LABEL = "\u661f"
SYSTEM_LABEL = "\u7cfb\u7edf"
CHOICE_MARK = "\U0001f518"
SECTION_MERGE_MARK = "\U0001f504"


@dataclass
class ParsedStoryMessage:
    id: str
    role: DialogueRole
    text: str
    variant: DialogueVariant
    delay: int = 0
    typing: int = 0
    hidden: bool = False


@dataclass
class ParsedStoryOption:
    id: str
    key: str
    text: str
    retry: bool = False
    branchMessages: list[ParsedStoryMessage] = field(default_factory=list)


@dataclass
class ParsedStorySegment:
    id: str
    kind: Literal["messages", "choice"]
    scene: str | None
    prompt: str | None
    messages: list[ParsedStoryMessage] = field(default_factory=list)
    options: list[ParsedStoryOption] = field(default_factory=list)


DAY_RE = re.compile(r"^#{1,3}\s*(第\d+天)(?:[｜|：:].*)?$")
SCENE_RE = re.compile(r"^##(?!#)\s*(.+?)\s*$")
SECTION_RE = re.compile(r"^###(?!#)\s*(.+?)\s*$")
OPTION_RE = re.compile(r"^\[选项\s*([A-Z])\]\s*(.+?)\s*$")
BRANCH_RE = re.compile(r"^\*\*.*?若选\s*([A-Z](?:\s*/\s*[A-Z])*)[^*]*\*\*$")
PLAIN_BRANCH_RE = re.compile(r"^▶\s*若选\s*([A-Z](?:\s*/\s*[A-Z])*)")
FINAL_BRANCH_RE = re.compile(r"^▶\s*若进入【结局\s*([A-Z])")
LEGACY_BRANCH_RE = re.compile(r"^【系统】若玩家选了\s*([A-Z])")
DIALOGUE_RE = re.compile(r"^【([^】]+)】\s*(.*)$")
WAIT_RE = re.compile(r"^（等待\s*([^)）]+)[)）]\s*$")


ROLE_MAP: dict[str, DialogueRole] = {
    PLAYER_LABEL: "me",
    PLAYER_EXPLICIT_LABEL: "me",
    SELF_LABEL: "me",
    STAR_LABEL: "other",
    SYSTEM_LABEL: "system",
}


def strip_annotation(text: str) -> str:
    cleaned = re.sub(r"^\s*[（(][^（）()]*[）)]\s*", "", text).strip()
    return re.sub(r"\s*[（(][^（）()]*[）)]\s*$", "", cleaned).strip()


def strip_heading_prefix(text: str) -> str:
    return re.sub(r"^[#\s\-\d.、]+", "", text).strip()


def normalize_choice_prompt(text: str) -> str:
    prompt = text.replace(CHOICE_MARK, "").strip()
    prompt = re.sub(r"^玩家(?:终极)?选择(?:[一二三四五六七八九十百0-9]+)?\s*", "", prompt)
    prompt = prompt.strip("（）() ").strip()
    return prompt or "请选择"


def is_death_text(text: str) -> bool:
    death_markers = (
        "\u89d2\u8272\u5df2\u6b7b\u4ea1",
        "\u8fde\u63a5\u5df2\u65ad\u5f00",
        "\u5f53\u524d\u65f6\u95f4\u7ebf\u5df2\u4e2d\u65ad",
        "\u65f6\u95f4\u7ebf\u4e2d\u65ad",
        "\u8111\u7535\u6ce2\u88ab\u7cfb\u7edf\u5f3a\u884c\u62b9\u5e73",
        "\u6551\u751f\u673a\u5728\u649e\u51fb\u4e2d\u7206\u70b8",
    )
    return any(marker in text for marker in death_markers)


class StoryParser:
    def __init__(self) -> None:
        self.segment_index = 0
        self.message_index = 0
        self.option_index = 0

    def next_segment_id(self, kind: str) -> str:
        self.segment_index += 1
        return f"{kind}-{self.segment_index}"

    def next_message_id(self, role: str) -> str:
        self.message_index += 1
        return f"{role}-{self.message_index}"

    def next_option_id(self, key: str) -> str:
        self.option_index += 1
        return f"option-{self.option_index}-{key.lower()}"

    def typing_ms(self, text: str, role: DialogueRole) -> int:
        if role != "other":
            return 0
        return min(max(len(text) * 55, 520), 1800)

    def parse_system_content(self, content: str) -> list[ParsedStoryMessage]:
        content = content.strip()
        wait_match = WAIT_RE.match(content)
        if wait_match:
            return [
                ParsedStoryMessage(
                    id=self.next_message_id("system"),
                    role="system",
                    text=content.strip("（）"),
                    variant="hint",
                    delay=self.delay_ms(wait_match.group(1)),
                    hidden=True,
                )
            ]

        return [
            ParsedStoryMessage(
                id=self.next_message_id("system"),
                role="system",
                text=content.strip("（）"),
                variant="hint",
                hidden=True,
            )
        ]

    def delay_ms(self, raw: str) -> int:
        minutes = re.search(r"(\d+(?:\.\d+)?)\s*分钟", raw)
        seconds = re.search(r"(\d+(?:\.\d+)?)\s*秒", raw)
        hours = re.search(r"(\d+(?:\.\d+)?)\s*小时", raw)
        total_seconds = 0.0

        if hours:
            total_seconds += float(hours.group(1)) * 3600
        if minutes:
            total_seconds += float(minutes.group(1)) * 60
        if seconds:
            total_seconds += float(seconds.group(1))

        if total_seconds <= 0:
            return 0

        return int(min(max(total_seconds * 20, 320), 2200))

    def parse_dialogue_line(self, line: str) -> list[ParsedStoryMessage]:
        match = DIALOGUE_RE.match(line.strip())
        if not match:
            text = line.strip()
            if not text:
                return []
            return [
                ParsedStoryMessage(
                    id=self.next_message_id("system"),
                    role="system",
                    text=text,
                    variant="hint",
                    hidden=True,
                )
            ]

        speaker = match.group(1).strip()
        content = match.group(2).strip()
        role = ROLE_MAP.get(speaker, "other")

        if role == "system":
            return self.parse_system_content(content)

        if role == "me":
            content = strip_annotation(content)

        return [
            ParsedStoryMessage(
                id=self.next_message_id(role),
                role=role,
                text=content,
                variant="message",
                typing=self.typing_ms(content, role),
            )
        ]

    def parse_choice_block(
        self,
        lines: list[str],
        start_index: int,
        scene_label: str | None,
        heading: str,
    ) -> tuple[ParsedStorySegment, int]:
        leading_messages: list[ParsedStoryMessage] = []
        options: list[ParsedStoryOption] = []
        option_map: dict[str, ParsedStoryOption] = {}
        index = start_index + 1

        while index < len(lines):
            line = lines[index].strip()
            if not line:
                index += 1
                continue

            option_match = OPTION_RE.match(line)
            if not option_match:
                if options:
                    break

                if (
                    line == "---"
                    or DAY_RE.match(line)
                    or SCENE_RE.match(line)
                    or SECTION_RE.match(line)
                    or line.startswith(CHOICE_MARK)
                ):
                    break

                leading_messages.extend(self.parse_dialogue_line(line))
                index += 1
                continue

            key = option_match.group(1)
            option = ParsedStoryOption(
                id=self.next_option_id(key),
                key=key,
                text=strip_annotation(option_match.group(2)),
            )
            options.append(option)
            option_map[key] = option
            index += 1

        while index < len(lines):
            line = lines[index].strip()
            if not line:
                index += 1
                continue

            if line == "---":
                index += 1
                break

            if DAY_RE.match(line) or SCENE_RE.match(line) or SECTION_RE.match(line):
                break

            if line.startswith(CHOICE_MARK):
                break

            branch_match = (
                BRANCH_RE.match(line)
                or PLAIN_BRANCH_RE.match(line)
                or FINAL_BRANCH_RE.match(line)
                or LEGACY_BRANCH_RE.match(line)
            )
            if not branch_match:
                index += 1
                continue

            keys = [item.strip() for item in branch_match.group(1).split("/")]
            index += 1
            branch_messages: list[ParsedStoryMessage] = []

            while index < len(lines):
                candidate = lines[index].strip()
                if not candidate:
                    index += 1
                    continue

                if (
                    candidate == "---"
                    or DAY_RE.match(candidate)
                    or SCENE_RE.match(candidate)
                    or SECTION_RE.match(candidate)
                    or candidate.startswith(CHOICE_MARK)
                    or BRANCH_RE.match(candidate)
                    or PLAIN_BRANCH_RE.match(candidate)
                    or FINAL_BRANCH_RE.match(candidate)
                    or LEGACY_BRANCH_RE.match(candidate)
                ):
                    break

                branch_messages.extend(self.parse_dialogue_line(candidate))
                index += 1

            normalized_branch = self.trim_branch_messages(branch_messages)

            for key in keys:
                option = option_map.get(key)
                if option is None:
                    continue
                option.branchMessages = normalized_branch.copy()
                option.retry = any(is_death_text(message.text) for message in normalized_branch if message.role == "system")

        segment = ParsedStorySegment(
            id=self.next_segment_id("choice"),
            kind="choice",
            scene=scene_label,
            prompt=normalize_choice_prompt(heading),
            messages=leading_messages,
            options=options,
        )
        return segment, index

    def trim_branch_messages(self, messages: list[ParsedStoryMessage]) -> list[ParsedStoryMessage]:
        trimmed = list(messages)

        while trimmed and trimmed[0].role == "me":
            trimmed.pop(0)

        return trimmed

    def parse(self, text: str) -> tuple[str, str, list[ParsedStorySegment]]:
        title = "\u56de\u58f0"
        character_name = STAR_LABEL
        current_day: str | None = None
        current_scene: str | None = None
        buffered_messages: list[ParsedStoryMessage] = []
        segments: list[ParsedStorySegment] = []
        lines = text.splitlines()
        index = 0

        def flush_messages() -> None:
            nonlocal buffered_messages
            if not buffered_messages:
                return

            segments.append(
                ParsedStorySegment(
                    id=self.next_segment_id("messages"),
                    kind="messages",
                    scene=current_scene,
                    prompt=None,
                    messages=buffered_messages,
                )
            )
            buffered_messages = []

        while index < len(lines):
            line = lines[index].strip()

            if not line or line == "[TOC]":
                index += 1
                continue

            day_match = DAY_RE.match(line)
            if day_match:
                flush_messages()
                current_day = day_match.group(1)
                current_scene = None
                index += 1
                continue

            scene_match = SCENE_RE.match(line)
            if scene_match:
                flush_messages()
                scene_name = strip_heading_prefix(scene_match.group(1))
                current_scene = f"{current_day} · {scene_name}" if current_day else scene_name
                index += 1
                continue

            if line == "---":
                flush_messages()
                index += 1
                continue

            section_match = SECTION_RE.match(line)
            if section_match:
                heading = section_match.group(1).strip()
                clean_heading = strip_heading_prefix(heading)

                if CHOICE_MARK in heading:
                    flush_messages()
                    choice_segment, next_index = self.parse_choice_block(lines, index, current_scene, clean_heading)
                    segments.append(choice_segment)
                    index = next_index
                    continue

                if SECTION_MERGE_MARK in heading:
                    flush_messages()
                    index += 1
                    continue

                if clean_heading:
                    flush_messages()
                    current_scene = f"{current_day} · {clean_heading}" if current_day else clean_heading
                    index += 1
                    continue

            if line.startswith(CHOICE_MARK):
                flush_messages()
                choice_segment, next_index = self.parse_choice_block(lines, index, current_scene, line)
                segments.append(choice_segment)
                index = next_index
                continue

            buffered_messages.extend(self.parse_dialogue_line(line))
            index += 1

        flush_messages()
        return title, character_name, segments
