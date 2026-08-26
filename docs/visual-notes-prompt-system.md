# Compound Lane → "Study Notes" Visual Generator

Two-stage prompt system. Stage 1 turns any article (URL or local HTML file) into a
structured outline. Stage 2 turns that outline into an image-gen prompt in the
hand-drawn notebook style, OR into a deterministic HTML render via `projects/{slug}/02-visual/{slug}.html`
(see § Outputs & deterministic HTML alternative).

Use Stage 1 with Claude (or any assistant with web access / local file access).
Use Stage 2's output with an image model (Nano Banana / GPT-Image / Midjourney /
your FLUX+ComfyUI pipeline) **or** render deterministically to HTML.

---

## STAGE 1 — Content Extraction Prompt

### Variant A — URL (when web access is available)

Paste this into Claude along with the article URL.

```
You are extracting content from a Compound Lane article to build a hand-drawn
"study notes" style infographic (numbered concept list, notebook-paper aesthetic).

Article URL: {{ARTICLE_URL}}

Fetch the article and output ONLY the following JSON — no commentary:

{
  "handle": "@compoundlane",
  "title": "<article's core question or topic, ALL CAPS, under 45 characters>",
  "series_label": "<e.g. '401(K) JOB CHANGE: 6 THINGS TO KNOW'>",
  "page_label": "<e.g. 'PAGE 1: YOUR OPTIONS (1-4)' — only if content needs >1 page>",
  "total_pages": <integer, 1 if it fits on one page>,
  "concepts": [
    {
      "number": 1,
      "title": "<short bolded concept name, 2-5 words>",
      "body": "<2-3 plain sentences, beginner-friendly, no jargon left unexplained>",
      "visual_type": "none | diagram | table | comparison | callout",
      "visual_spec": {
        // IF diagram: simple flow with 2-4 labeled nodes and arrow labels
        "nodes": ["<label>", "<label>"],
        "arrow_labels": ["<label>"],

        // IF table: 2-3 columns, 3-6 rows, short cell text
        "columns": ["<col1>", "<col2>"],
        "rows": [["<val>", "<val>"]],

        // IF comparison: exactly 2 boxes side by side
        "left_label": "<e.g. TRADITIONAL 401(K)>",
        "left_points": ["<point>", "<point>", "<point>"],
        "right_label": "<e.g. ROTH 401(K)>",
        "right_points": ["<point>", "<point>", "<point>"],

        // IF callout: one tip/warning bubble
        "callout_heading": "TIP | WARNING | SOURCE",
        "callout_text": "<one short sentence, cite the number if it's a stat>"
      }
    }
  ],
  "sources_footer": "<1 short line, e.g. 'Sourced from IRS.gov, Vanguard, FINRA'>"
}

Rules:
- 5-7 concepts per page max (matches reference density). Split into multiple
  page objects if the article covers more.
- Every stat/number in "body" must trace back to something stated in the article
  or its cited sources — this feeds Compound Lane's "every number sourced" promise.
- Keep body text short enough to hand-letter: ~25-35 words per concept.
- Prefer "table" for anything with 3+ options being compared (rollover destinations,
  fee tiers, contribution limits by year).
- Prefer "comparison" for exactly 2 choices (Roth vs Traditional, stay vs roll over).
- Prefer "diagram" for a process/sequence (what happens step-by-step after you quit).
- Use "callout" sparingly — one per page max, for the single most important
  gotcha or common mistake.
```

### Variant B — Local HTML file (preferred — "dont webfetch" when content is saved locally)

When the article HTML is already saved (e.g. `input/3/Target Date Funds — Compound Lane.html`):

```
You are extracting content from a Compound Lane article HTML file to build a hand-drawn
"study notes" style infographic.

Article HTML file: {{LOCAL_HTML_PATH}}
(e.g. `input/3/Target Date Funds — Compound Lane.html` — visible text + asset list pasted below)

<paste visible_text.txt + asset-descriptions.md from the file, or the raw HTML>

Extract and output ONLY the same JSON schema as Variant A — no commentary, same fields
(handle, title, series_label, page_label, total_pages, concepts[], sources_footer).
Same Rules apply. Do not invent numbers — every stat must appear in the pasted source.
```

**Which variant to use:** Prefer **Variant B** when a local file exists (no credits, no drift, reproducible). Use **Variant A** only when you have a live URL and no saved copy. Both produce identical JSON.

### Multi-page schema

Stage 1 returns a **flat** JSON with `total_pages` + `concepts[]`. When `total_pages > 1`:

- Keep a single JSON per article — split `concepts` logically across pages (e.g. 1-4 on page 1, 5-6 on page 2).
- Set `page_label` per page (e.g. `"PAGE 1: YOUR OPTIONS (1-4)"`, `"PAGE 2: COSTS & RULES (5-6)"`).
- Run **Stage 2 once per page**: increment the circled page number in the header each time (`1 / total_pages`, `2 / total_pages`, …).
- Do NOT expect a `pages[]` array from Stage 1 — the schema is flat by design; pagination is a rendering concern.

For comparison, the **video variant** on the same article compresses all concepts onto a **single fixed 1080×1920 page** (no scrolling, no pagination) — see `GUIDE.md §17`. Choose one model per output.

---

## STAGE 2 — Image Generation Prompt

Take the JSON from Stage 1 and drop it into `{{CONTENT_JSON}}` below. Send the
whole thing to your image model — or skip the model and render via `templates/notebook-v2.html`
(see § Outputs below for the deterministic alternative).

```
Create a hand-drawn study-notes infographic, digital notebook style, in the
exact visual language described below. This mimics a popular "study notes"
Instagram/Notion aesthetic: colorful marker pen annotations on lined notebook
paper, clean but clearly hand-lettered.

CONTENT TO ILLUSTRATE:
{{CONTENT_JSON}}

LAYOUT (top to bottom):
1. Header row: small handle "{{handle}}" top-left in blue marker with a bullet
   dot after it. Large bold black hand-lettered title "{{title}}" centered,
   underlined with a thin blue line. Circled page number "{{total_pages}}"
   top-right in a black-outlined circle.
2. Section title bar: "{{series_label}}" in bold red/orange marker, larger
   than body text, with a horizontal divider line of small blue dots beneath it.
3. If page_label present: a small rounded rectangle box, hand-drawn outline,
   containing "{{page_label}}" in bold green marker text.
4. Numbered concept list, one per item in "concepts":
   - Bold number + underlined colored title (alternate blue/red/green per item
     for visual rhythm, consistent within one item).
   - 2-3 lines of plain black handwritten body text below the title, left-aligned.
   - To the right of or below the text (whichever fits), render the visual_type:
     - "diagram": simple boxes connected by curved hand-drawn arrows, labels in
       small caps, one box per node, arrow_labels written above each arrow.
     - "table": a hand-ruled grid, header row shaded pale blue/yellow, bold
       header text, black body text in cells, thin black grid lines.
     - "comparison": two side-by-side rounded rectangles, one outlined red one
       outlined blue, bullet points inside each in matching ink color, small
       "VS" or divider mark between them.
     - "callout": a hand-drawn cloud or dashed rounded box, star icon (⭐) prefix
       on the heading, text in green ink for TIP, red ink for WARNING.
5. Small footer strip at the very bottom, thin dotted line above it, tiny gray
   text: "{{sources_footer}}".

STYLE RULES — canonical tokens (must match `templates/notebook-v2.html`; do not improvise):
- Background: warm paper `oklch(97.5% .008 85)` with shade `oklch(93% .015 80)` margin band + warm radial vignettes; outer `html,body #3a3a3a` desk + `.desk-shadow`; ruled lines `oklch(85% .045 250)` at **41px** (transparent) / **43px** (rule) via `repeating-linear-gradient`.
- Ink palette (oklab, ballpoint semantics — use exactly these):
  ink-navy `oklch(42% .16 268)` — headings, ledger heads, chip borders;
  ink-body `oklch(44% .1 264)` — primary body text;
  text-muted `oklch(54% .05 262)` — secondary text;
  ink-maroon `oklch(50% .18 25)` — warnings/losses, indirect cards;
  ink-green `oklch(50% .13 158)` — positives/confirmations;
  ink-yellow `oklch(85% .13 95)` — highlighter (hl block + warn row).
- Fonts (load from Google Fonts; no other families):
  `Caveat 500/600/700` (via --font-script) for numbers/script headings;
  `Patrick Hand` (via --font-hand) for body/labels/tables;
  Wire as `var(--font-hand)` / `var(--font-script)` only — no `Architects Daughter` / `Kalam` in v2.
- Hand-drawn character (deterministic — fixed seeds, no Math.random):
  3 SVG filters `rough-a` (0.022/3/seed 4/scale 1.6), `rough-b` (0.035/2/seed 17/1.15), `rough-c` (0.016/4/seed 29/2) applied as `.rough` / `.rough2` / `.rough3`;
  paper-grain `::before` noise tile opacity .38 (gamma 2.6, seed 11, multiply);
  `.ink {mix-blend-mode:multiply; text-shadow: -.45px -.45px 0 rgba(0,0,0,.12), .7px .7px 0 rgba(255,255,255,.5)}`;
   per-blob radii `b1`..`b6` each unique + rotations -6deg..7deg, card radii vary per type.
- Center watermark: inline `assests/logo.svg` (stepped lane) at 700×700, `opacity .11`, `mix-blend-mode:multiply`, `z-index:0` behind `.ink` content — very subtle, centered `translate(-50%,-50%)`.
- Boxes and dividers have visibly hand-drawn (not perfectly straight) edges,
  rounded corners, slightly uneven line weight.
- Dense but organized — this is a reference sheet meant to be screenshotted
  and saved, not a minimal poster. Fill the page edge-to-edge with ~1cm margin.
- Portrait orientation: **default 1080×1920** (portrait, fixed canvas, no scrolling).
  Use **1080×1350 (4:5)** only when explicitly requested for an Instagram feed crop.
  Multi-page = sequential images with incremented circled page number, not scroll.

Output a single flat image, no layers — the handle in the header + the center watermark (`.watermark`, already in `sample_v2.html`/`sample.html`) are the only marks.
```

---

## Outputs & deterministic HTML alternative

**Outputs — `projects/{slug}/` structure (global template at `templates/notebook-v2.html` — mirrored at `input/sample_v2.html`; throwaway render at `input/sample.html`):**

```
projects/{slug}/
  01-source/source.html            # saved article HTML (Variant B — no web fetch)
  01-source/source_files/          # _files bundle if any (css2, logo.svg)
  01-content/{slug}.json           # Stage 1 JSON — single source of truth
  02-visual/{slug}.html            # deterministic render — fork of templates/notebook-v2.html
  02-visual/{slug}.png             # headless screenshot (1080×1920)
  03-video/                        # optional HyperFrames reel (same JSON → video)
```

**Image-model path (Stage 2 as written):**
- `Stage 1 JSON -> projects/{slug}/01-content/{slug}.json`
- `Stage 2 image -> projects/{slug}/02-visual/{slug}.png` (1080×1920 default, 1080×1350 if 4:5 requested) — or `temp/after.png` for a quick check

**Deterministic HTML path (preferred for version control / video reuse):**
- Same `projects/{slug}/01-content/{slug}.json` feeds the project render **`projects/{slug}/02-visual/{slug}.html`** (fork of `templates/notebook-v2.html`).
  Map each `visual_type` to the v2 component library (see `GUIDE.md §17` table):
  `table` -> `.ledger` (`.four-col` for 4-col) · `comparison` -> `.compare-row` / `.compare-card.direct` + `.indirect` · `callout` -> `.warning-box` (`.tip` variant green) · `diagram` -> `.flow-row` (`.flow-node.n1/n2/n3` + `.flow-label`/`.flow-arrow`) · `none` -> `.lede` plain.
- Screenshot the HTML to PNG (no image model needed):
  ```powershell
  msedge.exe --headless --disable-gpu --window-size=1080,1920 --screenshot=projects/{slug}/02-visual/{slug}.png "file:///D:/content-creator/video/init-video/projects/{slug}/02-visual/{slug}.html"
  # quick throwaway check still works:
  # msedge.exe --headless --disable-gpu --window-size=1080,1920 --screenshot=temp/after.png "file:///D:/content-creator/video/init-video/input/sample.html"
  ```
  Read back the PNG to verify. Keep the canvas fixed 1080×1920 with no scroll.
- **Video reuse:** the same JSON feeds `projects/{slug}/03-video/` via the notebook-handwritten preset — see `GUIDE.md §17` (spotlight dim 0.32 + red pen-circle draw, no camera zoom).

**Canonical reference:** `templates/notebook-v2.html` is the ground truth for v2 style (warm paper, Patrick Hand/Caveat, `ink-yellow`, 41px rule, `rough-a/b/c`, `.watermark`) — mirrored at `input/sample_v2.html`. `input/sample.html` is a throwaway render. If this doc and the template diverge, **the template wins**. Project renders at `projects/{slug}/02-visual/` inherit v2.

---

## Notes on using this

- **Multi-page articles**: run Stage 1 once (flat JSON with `total_pages` + `page_label`), then run Stage 2 once per page (increment the circled page number each time). For video, compress to one fixed page instead.
- **This is a separate content lane from your core article template** — the Graphite Mono / Fraunces / Plex Mono system stays untouched for the actual site pages. The notebook system (Architects Daughter / Patrick Hand / Caveat + oklch inks) is canonical for visual notes + notebook reels — see `GUIDE.md §11` ("Which Palette Where") and `§17`.
- **Fact-checking gate**: since every number needs a source, don't send Stage 1's JSON to Stage 2 (or to `input/sample.html`) until you've spot-checked the `body` text against the live article or local HTML source — the extraction step can compress or slightly misstate a stat. See also `GUIDE.md §17` gate.
- **Reuse**: swap `{{ARTICLE_URL}}` (Variant A) or `{{LOCAL_HTML_PATH}}` (Variant B) and re-run both stages for any Compound Lane article. No other edits needed.
