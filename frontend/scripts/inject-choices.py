"""Scan 剧情.md and insert player choices every 2-6 NPC messages.

Only inserts in main-line sections (NOT inside ▶ branches or 🔘 blocks).
"""
from __future__ import annotations

import random
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
SOURCE_FILE = REPO_ROOT / "docs" / "剧情.md"

# ---------------------------------------------------------------------------
# Line classification helpers
# ---------------------------------------------------------------------------

DIALOGUE_RE = re.compile(r"^【(.+?)】\s*(.*)$")
PLAYER_NAMES = {"你", "玩家", "我"}
SYSTEM_NAMES = {"系统"}

CHOICE_MARK = "\U0001f518"  # 🔘
BRANCH_RE = re.compile(r"^▶\s*若选")
MERGE_RE = re.compile(r"^🔄")
OPTION_RE = re.compile(r"^\[选项\s*[A-Z]\]")
HEADING_RE = re.compile(r"^#{1,4}\s")
DIVIDER_RE = re.compile(r"^---+$")

# Response pools — player personality: direct, sometimes sarcastic, cares but hides it
POOLS: dict[str, list[str]] = {
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

DISTRESS_WORDS = (
    "冷", "怕", "帮", "救", "疼", "死", "痛", "抖", "哭",
    "不行了", "快没", "危险", "跑", "逃", "追", "躲", "吓",
)
INFO_WORDS = (
    "发现", "照片", "证据", "档案", "看到", "找到", "线索",
    "图", "记录", "文件", "截图", "数据",
)


def classify_line(line: str) -> str:
    """Return 'npc', 'player', 'system', or 'other'."""
    m = DIALOGUE_RE.match(line)
    if not m:
        return "other"
    name = m.group(1).strip()
    if name in PLAYER_NAMES:
        return "player"
    if name in SYSTEM_NAMES:
        return "system"
    return "npc"


def pick_options(recent_text: str) -> list[str]:
    """Pick 2-3 natural response options based on recent NPC text."""
    has_distress = any(w in recent_text for w in DISTRESS_WORDS)
    has_info = any(w in recent_text for w in INFO_WORDS)

    pool_keys: list[str]
    if has_distress:
        pool_keys = ["reassure", "probe"]
    elif has_info:
        pool_keys = ["wary", "acknowledge"]
    else:
        pool_keys = ["acknowledge", "pushback"]

    if random.random() < 0.25:
        pool_keys.append("wary")
    elif random.random() < 0.2:
        pool_keys.append("pushback")

    pool_keys = pool_keys[:3]

    chosen: list[str] = []
    seen: set[str] = set()
    for key in pool_keys:
        candidates = [t for t in POOLS[key] if t not in seen]
        if candidates:
            text = random.choice(candidates)
            chosen.append(text)
            seen.add(text)
    return chosen[:3]


def make_choice_block(options: list[str]) -> list[str]:
    """Return markdown lines for a non-branching choice block."""
    lines: list[str] = ["", "🔘"]
    for idx, opt in enumerate(options):
        key = chr(ord("A") + idx)
        lines.append(f"[选项 {key}] {opt}")
    lines.append("")
    lines.append("---")
    lines.append("")
    return lines


def main() -> None:
    random.seed(42)  # deterministic output

    if not SOURCE_FILE.exists():
        print(f"Error: {SOURCE_FILE} not found", file=sys.stderr)
        sys.exit(1)

    original = SOURCE_FILE.read_text(encoding="utf-8")
    lines = original.splitlines(keepends=True)

    # State machine
    MAIN = "MAIN"
    IN_CHOICE = "IN_CHOICE"  # after 🔘, before all branches/options read
    IN_BRANCH = "IN_BRANCH"  # after ▶, before next ▶ / 🔄 / ---

    state = MAIN
    npc_count = 0
    recent_npc_text = ""
    target = random.randint(2, 6)

    result: list[str] = []
    inserted = 0

    for line in lines:
        stripped = line.strip()

        # ---- State transitions ----
        is_choice = stripped.startswith(CHOICE_MARK)
        is_branch = bool(BRANCH_RE.match(stripped))
        is_merge = bool(MERGE_RE.match(stripped))
        is_option = bool(OPTION_RE.match(stripped))
        is_heading = bool(HEADING_RE.match(stripped))
        is_divider = bool(DIVIDER_RE.match(stripped))

        if is_choice:
            # Flush any pending NPC count
            state = IN_CHOICE
            npc_count = 0
            recent_npc_text = ""
            result.append(line)
            continue

        if is_branch:
            state = IN_BRANCH
            npc_count = 0
            recent_npc_text = ""
            result.append(line)
            continue

        if is_merge or is_divider:
            state = MAIN
            npc_count = 0
            recent_npc_text = ""
            target = random.randint(2, 6)
            result.append(line)
            continue

        if is_heading:
            state = MAIN
            npc_count = 0
            recent_npc_text = ""
            target = random.randint(2, 6)
            result.append(line)
            continue

        if is_option:
            # Still inside choice block
            result.append(line)
            continue

        # ---- Inside branch or choice block: pass through ----
        if state in (IN_BRANCH, IN_CHOICE):
            result.append(line)
            continue

        # ---- MAIN state: count NPC messages ----
        kind = classify_line(stripped)

        if kind == "npc":
            npc_count += 1
            # Accumulate text for context-aware option selection
            msg_match = DIALOGUE_RE.match(stripped)
            if msg_match:
                recent_npc_text += msg_match.group(2).strip() + " "

            result.append(line)

            if npc_count >= target:
                # Insert a choice block after this NPC message
                opts = pick_options(recent_npc_text)
                for cl in make_choice_block(opts):
                    result.append(cl + "\n")
                inserted += 1
                npc_count = 0
                recent_npc_text = ""
                target = random.randint(2, 6)

            continue

        if kind == "player":
            # Player spoke — reset counter
            npc_count = 0
            recent_npc_text = ""
            target = random.randint(2, 6)
            result.append(line)
            continue

        # System messages, blank lines, scene tags, etc. — pass through, don't reset
        result.append(line)

    # Write back
    SOURCE_FILE.write_text("".join(result), encoding="utf-8")
    print(f"Inserted {inserted} choice blocks into {SOURCE_FILE}")


if __name__ == "__main__":
    main()
