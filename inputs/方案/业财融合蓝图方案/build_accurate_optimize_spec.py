import json
import re
from pathlib import Path


BASE = Path(r"D:\项目AI协作\4、PMS业财一体化\input")
DECK = BASE / "业财融合蓝图汇报方案_准确还原优化版"
SOURCE_MD = BASE / "业财融合PPT汇报.md"
STYLE_REF = DECK / "origin_image" / "slide_08.png"


TARGET_SLIDES = [2, 4, 5, 6, 9, 10, *range(11, 23), 24, 25, 27]


def read_blocks():
    text = SOURCE_MD.read_text(encoding="utf-8")
    matches = list(re.finditer(r"(?m)^#{2,3}\s+.+$", text))
    blocks = []
    for i, match in enumerate(matches):
        start = match.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        block = text[start:end].strip()
        blocks.append(block)
    return blocks


def title_of(block, fallback):
    for line in block.splitlines():
        if line.startswith("标题："):
            return line.replace("标题：", "", 1).strip()
    first = block.splitlines()[0].strip("# ").strip()
    return first or fallback


def compact_excerpt(block, limit=1800):
    lines = []
    for raw in block.splitlines():
        line = raw.rstrip()
        if not line:
            continue
        if line.startswith("#"):
            continue
        lines.append(line)
    text = "\n".join(lines)
    return text[:limit]


def first_sentence(block):
    for line in block.splitlines():
        line = line.strip()
        if not line or line.startswith("#") or line.startswith("标题："):
            continue
        if line.startswith("|") or set(line) <= {"-", "|", " "}:
            continue
        return line[:70]
    return ""


def slide_source_map(blocks):
    return {
        2: {
            "title": "目录",
            "source": "目录结构：1. 规划背景与目标；2. 业务融合架构及场景规划；3. 迭代及推广计划；4. 待决策事项。",
            "role": "agenda",
        },
        4: {"title": title_of(blocks[3], "业务现状"), "source": compact_excerpt(blocks[3]), "role": "content"},
        5: {"title": title_of(blocks[4], "业财融合建设目标"), "source": compact_excerpt(blocks[4]), "role": "content"},
        6: {"title": title_of(blocks[5], "核心设计原则"), "source": compact_excerpt(blocks[5], 2000), "role": "principles"},
        9: {"title": title_of(blocks[8], "业务融合功能架构"), "source": compact_excerpt(blocks[8], 2200), "role": "architecture"},
        10: {"title": title_of(blocks[9], "业财融合数据整体交互"), "source": compact_excerpt(blocks[9], 2200), "role": "flow"},
        11: {"title": title_of(blocks[10], "场景1：项目经营主线"), "source": compact_excerpt(blocks[10], 2200), "role": "scenario"},
        12: {"title": title_of(blocks[11], "场景2：收入回款主线-收入确认"), "source": compact_excerpt(blocks[11], 2200), "role": "scenario"},
        13: {"title": title_of(blocks[12], "场景2：收入回款主线-销项开票"), "source": compact_excerpt(blocks[12], 2200), "role": "scenario"},
        14: {"title": title_of(blocks[13], "场景2：收入回款主线-收款核销"), "source": compact_excerpt(blocks[13], 2200), "role": "scenario"},
        15: {"title": title_of(blocks[14], "场景3：采购付款主线-物料采购"), "source": compact_excerpt(blocks[14], 2200), "role": "scenario"},
        16: {"title": title_of(blocks[15], "场景3：采购付款主线-服务采购"), "source": compact_excerpt(blocks[15], 2200), "role": "scenario"},
        17: {"title": title_of(blocks[16], "场景3：采购付款主线-固资采购"), "source": compact_excerpt(blocks[16], 2200), "role": "scenario"},
        18: {"title": title_of(blocks[17], "场景4：物资管理主线"), "source": compact_excerpt(blocks[17], 2200), "role": "scenario"},
        19: {"title": title_of(blocks[18], "场景5：费用报销主线"), "source": compact_excerpt(blocks[18], 2200), "role": "scenario"},
        20: {"title": title_of(blocks[19], "场景6：成本归集主线"), "source": compact_excerpt(blocks[19], 2200), "role": "scenario"},
        21: {"title": title_of(blocks[20], "场景7：财务集成主线"), "source": compact_excerpt(blocks[20], 2400), "role": "scenario"},
        22: {"title": title_of(blocks[21], "场景8：经营分析主线"), "source": compact_excerpt(blocks[21], 2200), "role": "scenario"},
        24: {"title": title_of(blocks[23], "PMS业财融合迭代版本计划"), "source": compact_excerpt(blocks[23], 1000), "role": "timeline"},
        25: {"title": title_of(blocks[24], "PMS业财推广整体进度"), "source": compact_excerpt(blocks[24], 2200), "role": "progress"},
        27: {"title": title_of(blocks[26], "待决策事项"), "source": compact_excerpt(blocks[26], 1200), "role": "decision"},
    }


def prompt_for(number, item, spec):
    role = item["role"]
    source = item["source"]
    if role == "scenario":
        layout = (
            "统一场景页版式：顶部标题；标题下方一行场景介绍；中部一条主流程，最多保留源文档中的关键节点；"
            "右侧或下方展示关键规则/控制要点；底部展示经营洞察或流程价值。"
        )
        content_rule = (
            "必须从源文档准确提取：场景介绍、主流程、触发条件/数据来源/规范条件/校验规则中最关键的控制点、经营洞察或价值。"
            "不要新增源文档没有的节点、业务词或结论。"
        )
    elif role in {"architecture", "flow"}:
        layout = (
            "统一架构/交互页版式：顶部标题和一句核心结论；中部用流程或分层结构展示主线；"
            "右侧放3-5个关键要点或闭环结果。"
        )
        content_rule = "准确保留源文档中的主线、层级、闭环和系统名称；减少长段落，保留重要名词。"
    elif role == "principles":
        layout = "统一原则页版式：顶部核心原则一句话；中部两列或三列原则卡片；底部强调轻量闭环、后深度集成。"
        content_rule = "保留源文档7条设计原则的核心含义，可压缩文字但不得改变含义。"
    elif role == "progress":
        layout = "统一进度页版式：顶部推广策略；中部公司进度看板；底部责任人与待补录/未开始状态提示。"
        content_rule = "保留长沙、武汉、东莞、上海、无锡、杭州、湖北、江陵等公司状态；不要新增公司。"
    elif role == "timeline":
        layout = "统一计划页版式：横向三阶段路线图，一期、二期、三期分别列目标、周期和交付结果。"
        content_rule = "准确保留一期2-3个月、二期1个月、三期经营分析报表/智能预警/AI赋能。"
    elif role == "decision":
        layout = "统一决策页版式：顶部一句决策目标；中部审批流程事项列表；右侧列需要领导确认的节点边界。"
        content_rule = "保留源文档列出的采购申请、收入合同、招待/差旅/日常报销、服务验收等审批类型。"
    else:
        layout = "统一内容页版式：顶部标题；中部结构化分组；右侧或底部放关键结论，整体简洁。"
        content_rule = "准确保留源文档中的系统、阶段、数字和关键缺口，不新增内容。"

    prompt = f"""# Codex PPT Slide Image Prompt

## Canvas
{{
  "type": "16:9 full-slide PowerPoint image",
  "language": "Chinese",
  "slide_number": {number},
  "render_slide_number": false
}}

## Deck Goal
{spec["goal"]}

## Global Style
{json.dumps(spec["style"], ensure_ascii=False, indent=2)}

## Approved Style Reference
- Image 1: {STYLE_REF} — approved IBM-style consulting slide reference. Match palette, typography, icon language, spacing, and clean enterprise tone. Do not copy the exact layout.

## Slide
{{
  "number": {number},
  "title": "{item["title"]}",
  "role": "{role}",
  "intent": "按源MD准确还原重点，同时统一排版并降低复杂度"
}}

## Source Of Truth
以下内容来自 input/业财融合PPT汇报.md，是本页唯一内容来源。必须以此为准，不得新增源文档没有的流程、规则或结论。

```text
{source}
```

## Required Content Rule
{content_rule}

## Layout Rule
{layout}

## Visual Requirements
- 采用同一套咨询页组件：深蓝标题、浅灰白底、细线分隔、蓝色线性图标、少量卡片、清晰流程箭头。
- 每页最多 3-4 个内容区域，重要信息要出现，但不要把源文档逐字塞满。
- 文本必须是中文，必须清晰可读，不能乱码、不能重叠、不能贴边。
- 标题必须准确显示为：{item["title"]}

## Constraints
- 只使用 Source Of Truth 中的信息。
- 不要新增公司、系统、流程节点、公式、规则或业务结论。
- 不要使用密集大表格；如源文档有表格，压缩为关键卡片或短表。
- 不要出现水印、无关logo、额外页码。
- 与第8页样张保持统一的IBM咨询风格。
"""
    return {
        "slide": number,
        "title": item["title"],
        "prompt": prompt,
        "out": f"slide_{number:02d}.png",
        "input_images": [
            {
                "path": str(STYLE_REF),
                "role": "approved sample slide style reference",
                "fidelity": "match style only; do not copy exact layout",
            }
        ],
        "requires_context_images": True,
        "expected_backend": "built-in image tool",
        "sample_generation_method": {
            "backend_used": "built-in image tool",
            "tool_name": "image_gen",
            "mode": "generate",
            "prompt_source": "approved sample prompt for Slide 8 业务融合整体架构",
            "size": "16:9 landscape, built-in default",
            "quality": "built-in default",
            "approved_sample_path": str(STYLE_REF),
            "input_context_preparation": "approved sample is passed as style reference",
            "handoff_rule": "Subagents must use this same backend/tool/mode and return a blocker if unavailable.",
        },
        "generation_contract": {
            "must_use_selected_image_backend": True,
            "must_match_sample_generation_method": True,
            "forbidden_final_image_methods": [
                "local drawing/rendering scripts",
                "Pillow-generated slides",
                "SVG/HTML/CSS/canvas screenshots",
                "python-pptx/PptxGenJS/native PPT layout screenshots",
                "manually composited text/image overlays",
            ],
            "must_return": ["backend_used", "selected_source", "qa_note"],
        },
    }


def main():
    blocks = read_blocks()
    source_map = slide_source_map(blocks)

    spec_path = DECK / "deck_spec.json"
    spec = json.loads(spec_path.read_text(encoding="utf-8"))
    spec["deck_name"] = "业财融合蓝图汇报方案_准确还原优化版"
    spec["goal"] = "面向管理层汇报PMS业财融合蓝图，准确还原源MD重点，统一呈现建设背景、总体架构、业务场景、迭代推广和待决策事项。"
    spec["approved_style_reference"]["path"] = "origin_image/slide_08.png"
    spec["sample_generation_method"]["approved_sample_path"] = "origin_image/slide_08.png"

    for slide in spec["slides"]:
        number = slide["number"]
        if number in source_map:
            item = source_map[number]
            slide["title"] = item["title"]
            slide["role"] = f"accurate optimized {item['role']}"
            slide["intent"] = "按源MD准确还原重点，同时统一排版并降低复杂度"
            slide["key_points"] = [
                "以源MD为唯一内容来源",
                first_sentence(item["source"]),
                "保留关键流程、规则、控制点和洞察",
            ]
            slide["layout"] = {
                "composition": "统一咨询页：标题+核心结论+主结构/流程+关键控制/洞察",
                "content_zones": "title, claim, main visual, key points",
                "density": "medium-low",
            }
            slide["visual_elements"] = {
                "main_visual": "source-accurate structured process or grouped cards",
                "supporting_elements": "IBM blue icons, thin connectors, concise callouts",
            }
            slide["constraints"] = [
                "只使用源MD信息",
                "重要信息保留但不过载",
                "同一套IBM咨询风格和统一版式组件",
                "中文清晰可读",
            ]

    spec_path.write_text(json.dumps(spec, ensure_ascii=False, indent=2), encoding="utf-8")

    prompts_dir = DECK / "prompts"
    prompts_dir.mkdir(exist_ok=True)
    for number in TARGET_SLIDES:
        job = prompt_for(number, source_map[number], spec)
        (prompts_dir / f"slide_{number:02d}.json").write_text(
            json.dumps(job, ensure_ascii=False, indent=2), encoding="utf-8"
        )

    jobs_path = DECK / "slide_jobs.json"
    jobs = json.loads(jobs_path.read_text(encoding="utf-8"))
    jobs["deck_name"] = "业财融合蓝图汇报方案_准确还原优化版"
    jobs["sample_generation_method"]["approved_sample_path"] = str(STYLE_REF)
    jobs["run_status"] = "jobs_prepared"
    for slide in jobs["slides"]:
        for img in slide.get("input_images", []):
            if img.get("role") == "approved sample slide style reference":
                img["path"] = str(STYLE_REF)
        number = slide["number"]
        if number in TARGET_SLIDES:
            item = source_map[number]
            slide["title"] = item["title"]
            slide["status"] = "pending"
            slide["dispatch"] = None
            slide["result"] = None
            slide["blocker"] = None
            slide["job"] = f"prompts/slide_{number:02d}.json"
            slide["out"] = f"origin_image/slide_{number:02d}.png"
            slide["input_images"] = [
                {
                    "path": str(STYLE_REF),
                    "role": "approved sample slide style reference",
                    "fidelity": "match style only; do not copy exact layout",
                }
            ]
    jobs_path.write_text(json.dumps(jobs, ensure_ascii=False, indent=2), encoding="utf-8")

    state_path = DECK / "slide_run_state.json"
    state = json.loads(state_path.read_text(encoding="utf-8"))
    state["status"] = "jobs_prepared"
    state.setdefault("history", []).append(
        {
            "from": "slides_recorded",
            "to": "jobs_prepared",
            "at": "2026-07-14T00:00:00Z",
            "note": "content slides reset for source-accurate unified optimization",
        }
    )
    state_path.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")

    speech_lines = []
    for slide in spec["slides"]:
        number = slide["number"]
        title = slide["title"]
        speech_lines.append(f"## 第{number}页：{title}\n")
        if number in source_map:
            item = source_map[number]
            speech_lines.append(
                f"本页按源文档还原“{title}”的核心内容，重点看主线结构、关键规则和管理含义。"
                f"展示时先看页面中部的主结构，再看右侧或底部的控制要点与洞察。\n"
            )
            speech_lines.append("---\n")
            speech_lines.append("注意点：\n")
            speech_lines.append("- 重点：说明该页信息来自源MD，已做结构化压缩但不改变含义。\n")
            speech_lines.append("- 画面引导：标题、核心结论、主流程、控制/洞察。\n")
            speech_lines.append("- 补充：如需展开细节，可回到源MD对应页。\n")
        else:
            speech_lines.append("本页用于承接章节结构，帮助听众理解汇报节奏和上下文。\n")
            speech_lines.append("---\n")
            speech_lines.append("注意点：\n- 重点：作为章节过渡，不展开细节。\n")
        speech_lines.append("\n")
    (DECK / "speech.md").write_text("\n".join(speech_lines), encoding="utf-8")

    print(json.dumps({"deck": str(DECK), "targets": TARGET_SLIDES, "count": len(TARGET_SLIDES)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
