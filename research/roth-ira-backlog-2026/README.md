# Roth IRA Content Backlog — 30-day Plan (Aug 30 → Sept 29, 2026)

This directory contains the research and planning artifacts for a 30-day Roth IRA content series for Compound Lane.

## Files

| File | Purpose | Status |
|---|---|---|
| `01-seo-keyword-research.md` | Keyword universe, search intent, PAA dump, competitor gaps | ✅ Complete (~30 KB) |
| `02-trending-formats-and-topics.md` | Top-performing reels, hook patterns, format trends, 2026 catalysts | ✅ Complete (~31 KB) |
| `03-pillar-content-ideas.md` | 6 pillars, 4 series, 70/20/10 mix | ✅ Complete (~13 KB) |
| `04-30-day-content-backlog.md` | Calendar: 30 reels with full per-reel spec | ✅ Complete (~74 KB) |
| `05-final-backlog-database.md` | **Synthesized single source of truth** — locked facts, calendar at a glance, production rules, sourcing gate, KPIs | ✅ Complete |

## Start here

**Open `05-final-backlog-database.md` first.** It is the surface that ships — locked 2026 numbers, the 30-reel calendar in one line each, the "every number sourced" gate, and the production rules. The other four files are the deep context.

## How this was built

Four parallel research agents (WebSearch + WebFetch) fanned out across the territory, then a synthesis pass cross-referenced all four and resolved inconsistencies. The synthesis:
- Used the SEO agent's IRS-canonical 2026 numbers over the trending agent's secondary-source discrepancies ($7,500 / $8,600 / $153k–$168k / $242k–$252k MFJ).
- Kept the Pillar agent's 6-pillar structure and the calendar's 70/20/10 mix.
- Preserved the 30 reel-by-reel specs from the backlog agent.
- Wove the trending agent's format and hook data into the production rules.

## Constraints (apply to every reel)

- **Every number must trace to a source** — IRS Pub 590-A/B, IRS Form 8606, IRC §408A / §72(t) / §4973 / §415(c) / §223 / §86, SECURE 2.0 §327/§325, IRS Notice 2025-67. No fabrication.
- **Hook ≤ 12 words, 2-second deadline** — per `docs/pacing-rules-v1.md`.
- **30s runtime, 75-100 word VO, 2.3-2.7 wps** — per pacing-rules-v1.md.
- **7-beat map** — orient → frame → warn → quantify_cost → quantify_opportunity_cost → closing_edge_case → cta.
- **Peak number in segment 3** (20–30s).
- **Compound Lane voice** — plain English, no jargon unless defined, "this saved me an afternoon" tone, notebook-style visuals.

## Brand context

Compound Lane is plain-English investing education. Two delivery lanes: static hand-drawn visual notes (IG/Pinterest) and ~30s voiceover-led reels (Reels/Shorts/TikTok). All reel scripts are produced via VibeVoice / Paul at 1.20× speed (right at the 30s floor of pacing-rules-v1.md, per the Roth calibration data in `samples/paul-speed-audit/`).

The Roth IRA niche is the entry point for beginner investors — it's the account type most people need but few understand. A 30-day series here is the top of the funnel for the rest of the site.
