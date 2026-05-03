#!/usr/bin/env python3
"""
Parse docs/剧情.md into the app's TypeScript data format.
Output: frontend/src/data/story.generated.ts
"""
import os, re, json, sys

sys.stdout.reconfigure(encoding='utf-8')

HERE = os.path.dirname(os.path.abspath(__file__))
PROJECT = os.path.join(HERE, "..", "..")
INPUT = os.path.join(PROJECT, "docs", "剧情.md")
OUTPUT = os.path.join(HERE, "..", "src", "data", "story.generated.ts")

_mc = [0]
_sc = [0]
_oc = [0]


def mid(role):
    _mc[0] += 1
    return f"{role}-{_mc[0]}"


def sid():
    _sc[0] += 1
    return f"seg-{_sc[0]}"


def oid():
    _oc[0] += 1
    return f"opt-{_oc[0]}"


def msg(role, text, **kw):
    typing = 0
    if role == "other":
        typing = 300 if len(text) < 10 else 500 if len(text) < 30 else 800
    variant = kw.get("variant", None)
    hidden = kw.get("hidden", False)
    if role == "system":
        if not variant:
            variant = (
                "hint"
                if any(
                    k in text
                    for k in (
                        "转译",
                        "警告",
                        "当前时间",
                        "检测到",
                        "倒计时",
                        "等待",
                        "UI",
                        "进度",
                    )
                )
                else "scene"
            )
        if text.startswith("`") or (text.startswith("(") and text.endswith(")")):
            hidden = True
    else:
        variant = "message"
    return {
        "id": mid(role),
        "role": role,
        "text": text,
        "variant": variant,
        "delay": 0,
        "typing": typing,
        "hidden": hidden,
    }


def parse_line(line):
    m = re.match(r"^【(.+?)】(.+)$", line)
    if not m:
        return None
    speaker, text = m.group(1).strip(), m.group(2).strip()
    if not text:
        return None
    if speaker == "玩家":
        return msg("me", text)
    if speaker == "系统":
        return msg("system", text)
    # other speakers: 未知用户, 星, etc.
    return msg("other", text)


def detect_contact_name(lines):
    """Detect the primary contact name from dialogue lines."""
    for line in lines:
        m = re.match(r"^【(.+?)】", line)
        if m:
            name = m.group(1)
            if name not in ("玩家", "系统", "内容", "可见范围", "配图"):
                return name
    return "未知用户"


VOLUME_RE = re.compile(r"^##\s*卷([一二三四五六七八九十]+)[：:|｜](.+?)(?:[（(].+[)）])?$")
DAY_RE = re.compile(r"^###\s*第(\d+)天[|｜](.+)$")
SECTION_TIME_RE = re.compile(r"^[①②③④⑤⑥⑦⑧⑨⑩\d]+\s*`")


def parse_volume_header(line):
    m = VOLUME_RE.match(line)
    if not m:
        return None
    cn_num = m.group(1)
    title = m.group(2).strip()
    cn_map = {
        "一": 1, "二": 2, "三": 3, "四": 4, "五": 5,
        "六": 6, "七": 7, "八": 8, "九": 9, "十": 10,
    }
    num = cn_map.get(cn_num, 0)
    return num, f"卷{cn_num}：{title}"


def parse_day_header(line):
    m = DAY_RE.match(line)
    if not m:
        return None
    return int(m.group(1)), m.group(2).strip()


def parse_file(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    lines = content.split("\n")

    # Find volume and day boundaries
    volumes = []
    days = []

    for i, line in enumerate(lines):
        v = parse_volume_header(line)
        if v:
            volumes.append((i, v[0], v[1]))
            continue
        d = parse_day_header(line)
        if d:
            days.append((i, d[0], d[1]))

    # Group days by volume
    result = []
    for vi, (vol_start, vol_num, vol_title) in enumerate(volumes):
        vol_end = volumes[vi + 1][0] if vi + 1 < len(volumes) else len(lines)
        vol_days = [(pos, dn, dt) for pos, dn, dt in days if vol_start < pos < vol_end]
        for di, (day_start, day_num, day_title) in enumerate(vol_days):
            day_end = vol_days[di + 1][0] if di + 1 < len(vol_days) else vol_end
            chunk_lines = lines[day_start + 1 : day_end]
            contact = detect_contact_name(chunk_lines)
            segments = parse_chunk(chunk_lines, f"D{day_num:02d}")
            result.append({
                "vol_num": vol_num,
                "vol_title": vol_title,
                "day_num": day_num,
                "day_title": day_title,
                "contact": contact,
                "segments": segments,
            })

    return result


def parse_chunk(chunk_lines, prefix):
    segments = []
    current_msgs = []
    scene = None

    def flush(msgs, opts=None, prompt=None):
        if not msgs and not opts:
            return
        seg = {
            "id": sid(),
            "kind": "choice" if opts else "messages",
            "scene": scene,
            "prompt": prompt,
            "messages": msgs,
            "options": opts or [],
        }
        segments.append(seg)

    i = 0
    while i < len(chunk_lines):
        line = chunk_lines[i]
        stripped = line.strip()

        # Skip empty lines
        if not stripped:
            i += 1
            continue

        # Skip TOC
        if stripped == "[TOC]":
            i += 1
            continue

        # Skip volume headers (## 卷) - shouldn't appear in chunk but just in case
        if re.match(r"^##\s", stripped):
            i += 1
            continue

        # Skip section time markers like ① `23:40-00:15` · ...
        if SECTION_TIME_RE.match(stripped):
            i += 1
            continue

        # Skip scene description lines like [卷一：... | 第1天：...]
        if stripped.startswith("[卷") and stripped.endswith("]"):
            i += 1
            continue

        # Skip horizontal rules
        if stripped == "---":
            i += 1
            continue

        # Skip image references
        if stripped.startswith("!["):
            i += 1
            continue

        # Skip backtick-only lines at start
        if stripped.startswith("`") and not stripped.startswith("```"):
            current_msgs.append(msg("system", stripped.strip("` "), hidden=True))
            i += 1
            continue

        # Merge section: 🔄
        if stripped.startswith("🔄"):
            flush(current_msgs)
            current_msgs = []
            i += 1
            continue

        # Choice section: 🔘
        if stripped.startswith("🔘"):
            flush(current_msgs)
            current_msgs = []
            prompt_match = re.search(r"（(.+?)）", stripped)
            prompt = prompt_match.group(1) if prompt_match else None

            options = {}
            branch_key = None
            branch_msgs = []
            j = i + 1

            while j < len(chunk_lines):
                ln = chunk_lines[j]
                s = ln.strip()

                if not s:
                    j += 1
                    continue

                # End of choice section
                if (
                    re.match(r"^(🔘|🔄|##\s|###\s)", s)
                    or SECTION_TIME_RE.match(s)
                    or s == "---"
                ):
                    break

                # Option line: [选项 A] text
                opt_m = re.match(r"^\[\s*选项\s*([ABC])\s*\]\s*(.+)$", s)
                if opt_m:
                    if branch_key and branch_key in options:
                        options[branch_key]["branchMessages"] = branch_msgs
                    branch_key = None
                    branch_msgs = []

                    key = opt_m.group(1)
                    raw_text = opt_m.group(2).strip()
                    is_death = "💀" in raw_text
                    text = re.sub(r"💀\s*", "", raw_text)
                    options[key] = {"text": text, "retry": is_death, "branchMessages": []}
                    j += 1
                    continue

                # Branch header: ▶ 若选 A (result):
                branch_m = re.match(
                    r"^▶\s*若选\s*([ABC](?:\s*/\s*[ABC])*)\s*(?:💀\s*)?(?:\(.*?\))?\s*[:：]",
                    s,
                )
                if branch_m:
                    if branch_key and branch_key in options:
                        options[branch_key]["branchMessages"] = branch_msgs
                    branch_msgs = []

                    keys_str = branch_m.group(1).replace(" ", "")
                    keys = [k.strip() for k in keys_str.split("/") if k.strip()]
                    is_death = "💀" in s or "死路" in s

                    for k in keys:
                        if k in options:
                            options[k]["retry"] = options[k]["retry"] or is_death
                            branch_key = k
                        else:
                            options[k] = {
                                "text": f"选项{k}",
                                "retry": is_death,
                                "branchMessages": [],
                            }
                            branch_key = k

                    j += 1
                    continue

                # Dialogue or system lines inside branch
                m = parse_line(s)
                if m:
                    if branch_key:
                        branch_msgs.append(m)
                    j += 1
                    continue

                # Backtick system message inside branch
                if s.startswith("`") and not s.startswith("```"):
                    if branch_key:
                        branch_msgs.append(msg("system", s.strip("` "), hidden=True))
                    j += 1
                    continue

                j += 1

            # Flush last branch
            if branch_key and branch_key in options:
                options[branch_key]["branchMessages"] = branch_msgs

            opt_list = []
            for k in sorted(options.keys()):
                info = options[k]
                opt_list.append(
                    {
                        "id": oid(),
                        "key": k,
                        "text": info["text"],
                        "retry": info["retry"],
                        "branchMessages": info["branchMessages"],
                    }
                )

            flush([], opt_list, prompt)
            i = j
            continue

        # Dialogue line
        m = parse_line(stripped)
        if m:
            current_msgs.append(m)
            i += 1
            continue

        # Skip unrecognized lines
        i += 1

    flush(current_msgs)
    return segments


def main():
    if not os.path.exists(INPUT):
        print(f"ERROR: {INPUT} not found")
        sys.exit(1)

    all_days = parse_file(INPUT)

    all_convs = []
    for d in all_days:
        all_convs.append(
            {
                "id": f"d{d['day_num']:02d}",
                "title": d["day_title"],
                "dayLabel": f"第{d['day_num']}天",
                "sceneLabel": d["vol_title"],
                "shortLabel": f"D{d['day_num']:02d}",
                "contactName": d["contact"],
                "avatarKey": "question" if d["contact"] == "未知用户" else "xing",
                "segments": d["segments"],
            }
        )

    total_msgs = sum(
        len(s["messages"]) for c in all_convs for s in c["segments"]
    )
    total_opts = sum(len(s["options"]) for c in all_convs for s in c["segments"])
    total_segs = sum(len(c["segments"]) for c in all_convs)
    print(
        f"Conversations: {len(all_convs)}, Segments: {total_segs}, "
        f"Messages: {total_msgs}, Options: {total_opts}"
    )

    ts = f"""export type ImportedDialogueRole = 'me' | 'other' | 'system'
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

export const STORY_IMPORTED_CONVERSATIONS: ImportedConversation[] = {json.dumps(all_convs, ensure_ascii=False, indent=2)}
"""

    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    with open(OUTPUT, "w", encoding="utf-8") as f:
        f.write(ts)
    print(f"Written: {OUTPUT} ({os.path.getsize(OUTPUT)/1024:.0f} KB)")


if __name__ == "__main__":
    main()
