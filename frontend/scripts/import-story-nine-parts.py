#!/usr/bin/env python3
"""
Parse the 9-part story markdown files into the app's TypeScript data format.
Output: frontend/src/data/story.generated.ts
"""
import os, re, json, sys

sys.stdout.reconfigure(encoding='utf-8')

DOWNLOADS = os.path.expanduser("~/Downloads")
HERE = os.path.dirname(os.path.abspath(__file__))
FRONTEND = os.path.join(HERE, "..")
OUTPUT = os.path.join(FRONTEND, "src", "data", "story.generated.ts")

PART_FILES = [
    "第一部.md", "第二部.md", "第三部.md", "第四部.md", "第五部.md",
    "第六部.md", "第七部.md", "第八部.md", "第九部.md",
]

PART_NAMES = {
    "第一部.md": "第一部·雨夜求救",
    "第二部.md": "第二部·地下暗网",
    "第三部.md": "第三部·幽灵校园",
    "第四部.md": "第四部·黎明爆破",
    "第五部.md": "第五部·幻影剧场",
    "第六部.md": "第六部·风暴孤岛",
    "第七部.md": "第七部·深海代码",
    "第八部.md": "第八部·空城幻梦",
    "第九部.md": "第九部·灯塔黎明",
}

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
            variant = "hint" if any(k in text for k in ("转译","警告","当前时间","检测到","倒计时","等待","UI","进度")) else "scene"
        if text.startswith("`") or (text.startswith("(") and text.endswith(")")):
            hidden = True
    else:
        variant = "message"
    return {"id": mid(role), "role": role, "text": text,
            "variant": variant, "delay": 0, "typing": typing, "hidden": hidden}

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
    return msg("other", text)

def parse_file(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # Split into days
    day_pattern = re.compile(r"^##\s*📅\s*【第\s*(\d+)\s*天[：:](.*?)】", re.MULTILINE)
    splits = list(day_pattern.finditer(content))

    days = []
    for idx, m in enumerate(splits):
        day_num = int(m.group(1))
        day_title = m.group(2).strip()
        start = m.end()
        end = splits[idx + 1].start() if idx + 1 < len(splits) else len(content)
        chunk = content[start:end]
        segments = parse_chunk(chunk, f"D{day_num}")
        days.append({"day": day_num, "title": day_title, "segments": segments})
    return days

def parse_chunk(chunk, prefix):
    lines = chunk.split("\n")
    segments = []
    current_msgs = []
    scene = ""

    def flush(msgs, opts=None, prompt=None):
        if not msgs and not opts:
            return
        seg = {
            "id": sid(),
            "kind": "choice" if opts else "messages",
            "scene": scene,
            "prompt": prompt,
            "messages": msgs,
            "options": opts or []
        }
        segments.append(seg)

    i = 0
    while i < len(lines):
        line = lines[i].rstrip()
        stripped = line.strip()

        # Skip empty / headers / notes
        if not stripped or stripped.startswith("#") and not stripped.startswith("### "):
            i += 1
            continue
        if stripped.startswith("---") or stripped.startswith("!["):
            i += 1
            continue
        if re.match(r"^-\s*第\d+天", stripped):
            i += 1
            continue

        # Section headers (🔄 merge or other)
        if re.match(r"^###\s*🔄", stripped):
            i += 1
            continue

        # Choice section
        if re.match(r"^###\s*🔘", stripped):
            flush(current_msgs)
            current_msgs = []
            prompt_match = re.search(r"（(.+?)）", stripped)
            prompt = prompt_match.group(1) if prompt_match else ""

            # Collect options and branches
            options = {}  # key -> {text, retry, branchMessages}
            state = "opts"  # opts, branch
            branch_key = None
            branch_msgs = []
            j = i + 1

            while j < len(lines):
                ln = lines[j].rstrip()
                s = ln.strip()

                if not s:
                    j += 1
                    continue

                # End of choice section
                if re.match(r"^###\s*[🔄🔘]", s) or re.match(r"^##\s", s):
                    break

                # Option line
                opt_m = re.match(r"^\[\s*选项\s*([ABC])\s*\]\s*(.+)$", s)
                if opt_m:
                    # Flush previous branch
                    if branch_key and branch_key in options:
                        options[branch_key]["branchMessages"] = branch_msgs
                    branch_key = None
                    branch_msgs = []
                    state = "opts"

                    key = opt_m.group(1)
                    text = re.sub(r"💀\s*", "", opt_m.group(2).strip())
                    is_death = "💀" in opt_m.group(2)
                    options[key] = {"text": text, "retry": is_death, "branchMessages": []}
                    j += 1
                    continue

                # Branch header: **▶ 若选 X (result):** or **▶ 若选 A / B (result):**
                branch_m = re.match(r"^\*\*▶\s*若选\s*([ABC](?:\s*/\s*[ABC])*)\s*(?:💀\s*)?(?:\(.*?\))?\s*[:：]\s*\*\*", s)
                if branch_m:
                    # Flush previous branch
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
                            options[k] = {"text": f"选项{k}", "retry": is_death, "branchMessages": []}
                            branch_key = k

                    state = "branch"
                    j += 1
                    continue

                # Special: 【玩家】(发送选项内容) lines in branches
                if state == "branch" or state == "opts":
                    m = parse_line(s)
                    if m:
                        if state == "branch":
                            branch_msgs.append(m)
                        # ignore in opts state
                    elif s.startswith("`"):
                        if state == "branch":
                            branch_msgs.append(msg("system", s.strip("` "), hidden=True))

                j += 1

            # Flush last branch
            if branch_key and branch_key in options:
                options[branch_key]["branchMessages"] = branch_msgs

            # Build options list
            opt_list = []
            for k in sorted(options.keys()):
                info = options[k]
                opt_list.append({
                    "id": oid(), "key": k, "text": info["text"],
                    "retry": info["retry"], "branchMessages": info["branchMessages"]
                })

            flush([], opt_list, prompt)
            i = j
            continue

        # Dialogue line
        m = parse_line(stripped)
        if m:
            current_msgs.append(m)
            i += 1
            continue

        # Backtick system message
        if stripped.startswith("`"):
            current_msgs.append(msg("system", stripped.strip("` "), hidden=True))
            i += 1
            continue

        i += 1

    flush(current_msgs)
    return segments

def main():
    all_convs = []
    for filename in PART_FILES:
        filepath = os.path.join(DOWNLOADS, filename)
        if not os.path.exists(filepath):
            print(f"SKIP: {filepath}")
            continue
        part_name = PART_NAMES.get(filename, filename)
        print(f"Parse: {filename}")
        days = parse_file(filepath)
        part_num = PART_FILES.index(filename) + 1
        for d in days:
            all_convs.append({
                "id": f"p{part_num}d{d['day']}",
                "title": d["title"],
                "dayLabel": f"第{d['day']}天",
                "sceneLabel": part_name,
                "shortLabel": f"P{part_num}D{d['day']}",
                "segments": d["segments"],
            })

    total_msgs = sum(
        len(m) for c in all_convs for s in c["segments"] for m in [s["messages"]]
    )
    total_opts = sum(len(s["options"]) for c in all_convs for s in c["segments"])
    total_segs = sum(len(c["segments"]) for c in all_convs)
    print(f"Conversations: {len(all_convs)}, Segments: {total_segs}, Messages: {total_msgs}, Options: {total_opts}")

    ts = f"""export type ImportedDialogueRole = 'me' | 'other' | 'system'
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

export interface ImportedConversation {{
  id: string
  title: string
  dayLabel: string
  sceneLabel: string
  shortLabel: string
  segments: ImportedDialogueSegment[]
}}

export const STORY_IMPORTED_TITLE = "林星夏的逃亡录"
export const STORY_IMPORTED_CHARACTER = "林星夏"

export const STORY_IMPORTED_CONVERSATIONS: ImportedConversation[] = {json.dumps(all_convs, ensure_ascii=False, indent=2)}
"""

    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    with open(OUTPUT, "w", encoding="utf-8") as f:
        f.write(ts)
    print(f"Written: {OUTPUT} ({os.path.getsize(OUTPUT)/1024:.0f} KB)")

if __name__ == "__main__":
    main()
