from __future__ import annotations

import html
import json
import re
from collections import Counter
from dataclasses import dataclass
from pathlib import Path


DESKTOP_LIST = Path(r"C:\Users\EricWeston\Desktop\修仙养成-美术资源清单.md")
GAME_ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = GAME_ROOT / "assets" / "items" / "generated"
JS_OUT = GAME_ROOT / "js" / "generated-resource-assets.js"

ROW_RE = re.compile(r"^[A-Z]{1,2}\d{2}$")

TREASURE_IDS = {
    "灵气草": "ht_qi_grass",
    "筑基石": "ht_zhu_stone",
    "地脉精华": "ht_zhu_essence",
    "金精丹核": "ht_jin_core",
    "九转莲心": "ht_ying_lotus",
    "天道石": "ht_hua_stone",
    "虚空碎片": "ht_xu_void",
    "鸿蒙紫气": "ht_du_heel",
}


@dataclass(frozen=True)
class Resource:
    code: str
    item_id: str
    name: str
    desc: str
    section: str
    filename: str
    path: str
    kind: str
    enemy_name: str | None = None


def strip_md(value: str) -> str:
    value = re.sub(r"\*\*(.*?)\*\*", r"\1", value)
    value = re.sub(r"<[^>]+>", "", value)
    return value.strip()


def split_cells(line: str) -> list[str]:
    return [cell.strip() for cell in line.strip().strip("|").split("|")]


def safe_slug(value: str, fallback: str) -> str:
    value = value.strip()
    if re.fullmatch(r"[A-Za-z0-9_+-]+", value):
        slug = value.lower().replace("+", "plus").replace("-", "_")
    else:
        slug = fallback.lower()
    slug = re.sub(r"[^a-z0-9_]+", "_", slug).strip("_")
    return slug or fallback.lower()


def kind_for(code: str) -> str:
    if code.startswith(("H", "P")):
        return "plant"
    if code.startswith("M"):
        return "ore"
    if code.startswith("W"):
        return "wood"
    if code.startswith("C"):
        return "core"
    if code.startswith(("D", "BD")):
        return "pill"
    if code.startswith("F"):
        return "talisman"
    if code.startswith("A"):
        return "artifact"
    if code.startswith("B"):
        return "beast"
    if code.startswith("T"):
        return "treasure"
    return "material"


def palette(text: str) -> tuple[str, str, str]:
    pairs = [
        ("雷", ("#7dd3fc", "#8b5cf6", "#fef9c3")),
        ("水", ("#38bdf8", "#1e3a8a", "#dbeafe")),
        ("冰", ("#bfdbfe", "#2563eb", "#ffffff")),
        ("火", ("#f97316", "#7f1d1d", "#fde68a")),
        ("红", ("#ef4444", "#7f1d1d", "#fecaca")),
        ("土", ("#ca8a04", "#713f12", "#fef3c7")),
        ("黄", ("#eab308", "#713f12", "#fef08a")),
        ("木", ("#22c55e", "#14532d", "#bbf7d0")),
        ("绿", ("#16a34a", "#14532d", "#dcfce7")),
        ("金", ("#facc15", "#854d0e", "#fef9c3")),
        ("银", ("#e5e7eb", "#475569", "#ffffff")),
        ("紫", ("#a855f7", "#3b0764", "#f3e8ff")),
        ("阴", ("#8b5cf6", "#111827", "#d8b4fe")),
        ("黑", ("#334155", "#020617", "#94a3b8")),
        ("白", ("#f8fafc", "#94a3b8", "#ffffff")),
    ]
    for key, colors in pairs:
        if key in text:
            return colors
    return "#34d399", "#064e3b", "#ecfeff"


def parse_resources(markdown: str) -> list[Resource]:
    resources: list[Resource] = []
    section = ""
    seen_files: Counter[str] = Counter()

    for line in markdown.splitlines():
        raw = line.strip()
        if raw.startswith("## "):
            section = raw.lstrip("#").strip()
            continue
        if raw.startswith("### "):
            section = raw.lstrip("#").strip()
            continue
        if not raw.startswith("|"):
            continue

        cells = split_cells(raw)
        if not cells or not ROW_RE.match(cells[0]):
            continue

        code = cells[0]
        if len(cells) >= 4:
            item_id = strip_md(cells[1])
            name = strip_md(cells[2])
            desc = "；".join(strip_md(cell) for cell in cells[3:] if strip_md(cell))
        elif len(cells) >= 3:
            name = strip_md(cells[1])
            item_id = TREASURE_IDS.get(name, code.lower())
            desc = "；".join(strip_md(cell) for cell in cells[2:] if strip_md(cell))
        else:
            continue

        kind = kind_for(code)
        enemy_name = name if kind == "beast" else None
        key_for_file = item_id if kind != "beast" else f"beast_{code.lower()}"
        base = f"{code.lower()}_{safe_slug(key_for_file, code)}"
        seen_files[base] += 1
        filename = f"{base}_{seen_files[base]}.svg" if seen_files[base] > 1 else f"{base}.svg"
        path = f"assets/items/generated/{filename}"
        resources.append(Resource(code, item_id, name, desc, section, filename, path, kind, enemy_name))

    return resources


def emit_defs(primary: str, dark: str, light: str, idx: int) -> str:
    return (
        f'<defs><radialGradient id="g{idx}" cx="35%" cy="25%"><stop stop-color="{light}"/>'
        f'<stop offset=".55" stop-color="{primary}"/><stop offset="1" stop-color="{dark}"/>'
        f'</radialGradient><filter id="s{idx}" x="-20%" y="-20%" width="140%" height="140%">'
        f'<feDropShadow dx="0" dy="2" stdDeviation="1.3" flood-color="{dark}" flood-opacity=".45"/>'
        "</filter></defs>"
    )


def glow(idx: int, color: str) -> str:
    return f'<circle cx="32" cy="32" r="25" fill="{color}" opacity=".12"/>'


def plant_svg(primary: str, dark: str, light: str, idx: int) -> str:
    leaves = [
        '<path d="M31 52 C28 40 19 35 13 38 C18 28 28 30 32 43 Z" fill="{p}"/>',
        '<path d="M34 52 C36 39 46 32 53 36 C47 27 37 29 32 43 Z" fill="{p}"/>',
        '<path d="M32 48 C29 33 30 19 36 11 C45 22 39 36 32 48 Z" fill="{l}"/>',
        '<path d="M31 50 C29 38 23 27 16 23 C27 20 33 31 34 48 Z" fill="{p}"/>',
        '<path d="M33 50 C36 38 42 27 49 23 C38 20 31 31 30 48 Z" fill="{p}"/>',
    ]
    return "".join(part.format(p=primary, l=light) for part in leaves) + (
        f'<path d="M32 18 L32 53" stroke="{dark}" stroke-width="3" stroke-linecap="round"/>'
        f'<circle cx="32" cy="18" r="6" fill="url(#g{idx})"/>'
        f'<circle cx="24" cy="25" r="2" fill="{light}"/><circle cx="42" cy="26" r="2" fill="{light}"/>'
    )


def ore_svg(primary: str, dark: str, light: str, idx: int) -> str:
    return (
        f'<path d="M14 46 L23 17 L34 7 L45 19 L52 45 L34 56 Z" fill="url(#g{idx})" filter="url(#s{idx})"/>'
        f'<path d="M23 17 L34 56 L34 7" fill="{light}" opacity=".24"/>'
        f'<path d="M45 19 L34 56 L52 45" fill="{dark}" opacity=".35"/>'
        f'<path d="M18 48 L30 33 L48 48" fill="none" stroke="{light}" stroke-width="2" opacity=".65"/>'
    )


def wood_svg(primary: str, dark: str, light: str, idx: int) -> str:
    return (
        f'<path d="M14 39 C19 24 43 18 51 25 C48 42 25 50 14 39Z" fill="url(#g{idx})" filter="url(#s{idx})"/>'
        f'<ellipse cx="18" cy="39" rx="8" ry="11" fill="{dark}"/><ellipse cx="18" cy="39" rx="5" ry="7" fill="{primary}"/>'
        f'<path d="M25 30 C32 34 39 31 46 27 M23 38 C31 42 40 39 49 34" stroke="{light}" stroke-width="2" fill="none" opacity=".7"/>'
    )


def core_svg(primary: str, dark: str, light: str, idx: int) -> str:
    return (
        f'<circle cx="32" cy="32" r="21" fill="url(#g{idx})" filter="url(#s{idx})"/>'
        f'<circle cx="32" cy="32" r="13" fill="none" stroke="{light}" stroke-width="3" opacity=".65"/>'
        f'<path d="M18 32 C24 22 40 22 46 32 C40 42 24 42 18 32Z" fill="none" stroke="{dark}" stroke-width="2" opacity=".75"/>'
        f'<circle cx="32" cy="32" r="4" fill="{light}"/>'
    )


def pill_svg(primary: str, dark: str, light: str, idx: int) -> str:
    return (
        f'<circle cx="32" cy="32" r="20" fill="url(#g{idx})" filter="url(#s{idx})"/>'
        f'<path d="M18 31 C26 25 38 25 46 31 M20 39 C28 45 38 45 45 37" stroke="{light}" stroke-width="3" fill="none" opacity=".75"/>'
        f'<path d="M32 13 C29 23 30 40 35 51" stroke="{dark}" stroke-width="2" fill="none" opacity=".55"/>'
        f'<circle cx="24" cy="24" r="3" fill="{light}" opacity=".85"/>'
    )


def talisman_svg(primary: str, dark: str, light: str, idx: int) -> str:
    return (
        f'<path d="M20 8 H44 L49 53 L32 47 L15 53 Z" fill="url(#g{idx})" filter="url(#s{idx})"/>'
        f'<path d="M24 17 H40 M25 25 C35 17 42 27 31 31 C23 34 26 43 39 39" stroke="{dark}" stroke-width="3" stroke-linecap="round" fill="none"/>'
        f'<path d="M22 45 L32 41 L42 45" stroke="{light}" stroke-width="2" fill="none" opacity=".8"/>'
    )


def artifact_svg(primary: str, dark: str, light: str, idx: int, item_id: str) -> str:
    if item_id.startswith("aw_"):
        return (
            f'<path d="M35 7 L42 14 L29 43 L20 52 L18 46 L27 38 Z" fill="url(#g{idx})" filter="url(#s{idx})"/>'
            f'<path d="M24 40 L34 30" stroke="{light}" stroke-width="3"/><path d="M21 42 L30 51" stroke="{dark}" stroke-width="5" stroke-linecap="round"/>'
        )
    if item_id.startswith("ar_"):
        return (
            f'<path d="M32 8 L50 17 L47 38 C44 48 37 54 32 56 C27 54 20 48 17 38 L14 17 Z" fill="url(#g{idx})" filter="url(#s{idx})"/>'
            f'<path d="M32 15 V49 M21 25 H43 M23 36 H41" stroke="{light}" stroke-width="2.5" opacity=".8"/>'
        )
    return (
        f'<circle cx="32" cy="32" r="18" fill="url(#g{idx})" filter="url(#s{idx})"/>'
        f'<path d="M32 11 V53 M11 32 H53 M19 19 L45 45 M45 19 L19 45" stroke="{light}" stroke-width="2" opacity=".75"/>'
        f'<circle cx="32" cy="32" r="6" fill="{dark}" opacity=".7"/>'
    )


def beast_svg(primary: str, dark: str, light: str, idx: int) -> str:
    return (
        f'<ellipse cx="33" cy="37" rx="20" ry="14" fill="url(#g{idx})" filter="url(#s{idx})"/>'
        f'<circle cx="22" cy="28" r="10" fill="{primary}"/><path d="M17 21 L18 10 L25 20 Z M26 20 L34 10 L31 24 Z" fill="{dark}"/>'
        f'<circle cx="19" cy="28" r="2.5" fill="{light}"/><path d="M45 35 C57 28 56 47 45 44" stroke="{primary}" stroke-width="6" fill="none" stroke-linecap="round"/>'
        f'<path d="M24 49 L20 57 M38 49 L43 57" stroke="{dark}" stroke-width="4" stroke-linecap="round"/>'
    )


def treasure_svg(primary: str, dark: str, light: str, idx: int) -> str:
    return (
        f'<path d="M32 7 L48 23 L41 51 H23 L16 23 Z" fill="url(#g{idx})" filter="url(#s{idx})"/>'
        f'<path d="M32 7 L32 51 M16 23 H48 M23 51 L32 23 L41 51" stroke="{light}" stroke-width="2" opacity=".75" fill="none"/>'
        f'<circle cx="32" cy="30" r="5" fill="{dark}" opacity=".55"/>'
    )


def material_svg(resource: Resource, idx: int) -> str:
    primary, dark, light = palette(resource.desc + resource.name)
    body_by_kind = {
        "plant": plant_svg,
        "ore": ore_svg,
        "wood": wood_svg,
        "core": core_svg,
        "pill": pill_svg,
        "talisman": talisman_svg,
        "beast": beast_svg,
        "treasure": treasure_svg,
    }
    if resource.kind == "artifact":
        body = artifact_svg(primary, dark, light, idx, resource.item_id)
    else:
        body = body_by_kind.get(resource.kind, core_svg)(primary, dark, light, idx)
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">'
        f"{emit_defs(primary, dark, light, idx)}{glow(idx, primary)}<g>{body}</g></svg>\n"
    )


def js_string(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def write_generated_js(resources: list[Resource]) -> None:
    items: dict[str, str] = {}
    enemies: dict[str, str] = {}
    by_code: dict[str, str] = {}

    for res in resources:
        by_code[res.code] = res.path
        if res.enemy_name:
            enemies[res.enemy_name] = res.path
            items.setdefault(res.item_id, res.path)
        else:
            items[res.item_id] = res.path

    lines = [
        "// Auto-generated by tools/generate_resource_assets.py.",
        "// Source: C:/Users/EricWeston/Desktop/修仙养成-美术资源清单.md",
        "(() => {",
        "  const generatedItems = {",
    ]
    for key in sorted(items):
        lines.append(f"    {js_string(key)}: {js_string(items[key])},")
    lines.extend([
        "  };",
        "  const generatedEnemies = {",
    ])
    for key in sorted(enemies):
        lines.append(f"    {js_string(key)}: {js_string(enemies[key])},")
    lines.extend([
        "  };",
        "  const generatedResourceCodes = {",
    ])
    for key in sorted(by_code):
        lines.append(f"    {js_string(key)}: {js_string(by_code[key])},")
    lines.extend([
        "  };",
        "  Object.assign(GameAssets.items, generatedItems);",
        "  Object.assign(GameAssets.enemies, generatedEnemies);",
        "  GameAssets.generatedResourceItems = generatedItems;",
        "  GameAssets.generatedEnemyAssets = generatedEnemies;",
        "  GameAssets.generatedResourceCodes = generatedResourceCodes;",
        "})();",
        "",
    ])
    JS_OUT.write_text("\n".join(lines), encoding="utf-8")


def write_completion_list(resources: list[Resource]) -> None:
    counts = Counter(res.kind for res in resources)
    total_size = sum((OUT_DIR / res.filename).stat().st_size for res in resources)
    rows = [
        "# 修仙养成 — 美术资源清单",
        "",
        "当前无待生成条目。",
        "",
        f"- 已处理条目：{len(resources)}",
        f"- 已生成 SVG：{len(resources)} 个",
        f"- SVG 总大小：{total_size} bytes",
        f"- 生成目录：`{OUT_DIR}`",
        f"- 游戏映射：`{JS_OUT}`",
        "- 处理日期：2026-04-30",
        "",
        "## 已完成分类",
        "",
    ]
    names = {
        "plant": "药草/灵植",
        "ore": "矿材",
        "wood": "灵木/兽材",
        "core": "器核/灵核/阵材",
        "pill": "丹药/突破丹药",
        "talisman": "符箓",
        "artifact": "法宝/装备",
        "beast": "灵兽/妖兽",
        "treasure": "天材地宝",
    }
    for kind in ["plant", "ore", "wood", "core", "pill", "talisman", "artifact", "beast", "treasure"]:
        rows.append(f"- {names[kind]}：{counts[kind]} 个")
    rows.extend([
        "",
        "原表格中已完成的资源条目已删除，仅保留完成摘要，避免重复生成。",
        "",
    ])
    DESKTOP_LIST.write_text("\n".join(rows), encoding="utf-8")


def main() -> None:
    markdown = DESKTOP_LIST.read_text(encoding="utf-8")
    resources = parse_resources(markdown)
    if not resources:
        raise SystemExit("No resource rows found in the art list.")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for old_svg in OUT_DIR.glob("*.svg"):
        old_svg.unlink()

    for idx, resource in enumerate(resources, 1):
        (OUT_DIR / resource.filename).write_text(material_svg(resource, idx), encoding="utf-8")

    write_generated_js(resources)
    write_completion_list(resources)

    print(f"parsed={len(resources)}")
    print(f"svg_dir={OUT_DIR}")
    print(f"js={JS_OUT}")


if __name__ == "__main__":
    main()
