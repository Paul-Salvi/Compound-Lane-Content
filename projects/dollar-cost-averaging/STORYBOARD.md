# STORYBOARD — DCA Explainer

> Beat-by-beat plan. The page is 1080×1920. The hand SVG is 240×320. Hand origin is anchored at the **fingertip** so the SVG pivots around the tap target.

## Canvas

- Frame: 1080×1920
- Page: 1080×1920, frozen
- Hand: 240×320 SVG, transform-origin: top center (the fingertip)
- Coordinate space: x grows right, y grows down. The hand is positioned by setting its `transform: translate(x, y)` where (x, y) is the **fingertip** location.

## Anchor map (page regions)

Approximate pixel centers for each concept's main visual, used as the hand's tap targets. Drawn from the layout in `02-visual/dollar-cost-averaging.html`.

| # | Concept | Page region (fingertip) | Page y-band |
|---|---|---|---|
| — | Header (intro) | center: 540, 120 | y 60–250 |
| 1 | "Spreading cash" card | 250, 720 | y 600–830 |
| 1 | "Investing from income" card | 830, 720 | y 600–830 |
| 2 | Vanguard row | 540, 970 | y 920–1020 |
| 2 | Schwab row | 540, 1030 | y 980–1080 |
| 2 | Edge to DCA row | 540, 1090 | y 1040–1140 |
| 3 | "Lump sum now" row | 540, 1230 | y 1180–1280 |
| 3 | "DCA 12 mo" row | 540, 1290 | y 1240–1340 |
| 3 | "$373 drag" cell | 770, 1310 | y 1260–1360 |
| 4 | $10k day 1 node | 230, 1430 | y 1380–1500 |
| 4 | $10,700 lump node | 480, 1430 | y 1380–1500 |
| 4 | $10,327 DCA node | 850, 1430 | y 1380–1500 |
| 5 | DCA helps card | 250, 1620 | y 1530–1730 |
| 5 | DCA hurts card | 830, 1620 | y 1530–1730 |
| 6 | Tip box | 540, 1810 | y 1750–1880 |
| — | Source footer (outro) | 540, 1900 | y 1880–1920 |

## Beats (91.6s total)

### Beat 0 — Intro (0 → 3.0s)

| | |
|---|---|
| Hand | At off-screen bottom-right (-200, 2100), idle scale 0.9 |
| In | 1.5s ease-in: translate to (900, 1880), scale 1 |
| VO | "Six things to know about dollar-cost averaging." |
| Tap | none — this is the welcome |

### Beat 1 — Concept 1: "What DCA Means" (3.0 → 15.0s, 12.0s)

| | |
|---|---|
| Hand 1 | 3.0s: from (900, 1880) → (250, 720) over 1.5s (slide up + slight arc) |
| Tap 1 | 4.5s: scale 1 → 0.92 → 1 over 240ms; ripple expands 6 → 18px |
| Pause | 5.0–6.5s: hand stays on "Spreading cash" |
| Hand 2 | 6.5s: → (830, 720) over 1.0s |
| Tap 2 | 7.5s: same bounce |
| Pause | 8.0–13.0s: hand stays on "Investing from income" |
| Hand out | 13.0s: → off-screen (1240, 800) over 2.0s (slides right, out) |
| VO | "DCA means investing the same dollars on a schedule — like $833 each month for 12 months to deploy ten thousand dollars — not all at once. You buy fewer shares when prices are high, more when low. There are two flavors: spreading cash you already have, where the money sits out and loses time — that's cash drag. Or investing from each paycheck, where nothing waits, and that's drag-free DCA." |

### Beat 2 — Concept 2: "The 68% Rule" (15.0 → 27.0s, 12.0s)

| | |
|---|---|
| Hand 1 | 15.0s: from (1240, 800) → (250, 1880) over 1.5s (returns from right, sweeps down-left) |
| Hand 2 | 16.5s: → (540, 970) over 0.6s |
| Tap | 17.1s: tap on "Vanguard ~2/3 win" |
| Hand 3 | 18.5s: → (540, 1030) over 0.4s |
| Tap | 19.0s: tap on "Schwab ~68% win" |
| Hand 4 | 20.5s: → (540, 1090) over 0.4s |
| Tap | 21.0s: tap on "Edge to DCA ~32%" |
| Pause | 22.0–25.0s: hand holds on edge row |
| Hand out | 25.0s: → off-screen (1240, 1100) over 2.0s |
| VO | "Vanguard and Charles Schwab both tested rolling twelve-month windows going back to the nineteen-twenties. Lump sum beat twelve-month DCA about two-thirds of the time — call it sixty-eight percent. The reason is simple: stocks rise more often than they fall, so the longer your money's in the market, the better your expected return. DCA wins the other thirty-two percent — the periods when markets drop right after you start." |

### Beat 3 — Concept 3: "$10,000 Head-to-Head" (27.0 → 39.0s, 12.0s)

| | |
|---|---|
| Hand 1 | 27.0s: from (1240, 1100) → (250, 1880) over 1.5s |
| Hand 2 | 28.5s: → (540, 1230) over 0.5s |
| Tap | 29.0s: tap on "Lump sum now $10,000 → ~$10,700" |
| Hand 3 | 30.5s: → (540, 1290) over 0.5s |
| Tap | 31.0s: tap on "DCA 12 mo end-of-month ~$10,327" |
| Hand 4 | 32.5s: → (770, 1310) over 0.6s |
| Tap (long) | 33.1s: double-tap (1 → 0.92 → 1 → 0.92 → 1) over 480ms, on the ~$373 gap cell |
| Pause | 34.5–37.0s: hand holds on the gap |
| Hand out | 37.0s: → off-screen (1240, 1300) over 2.0s |
| VO | "Here's the head-to-head at a steady seven percent for illustration. Ten thousand dollars invested on day one grows to about ten thousand seven hundred after a year. DCA at end-of-month — investing the same ten thousand split into twelve equal checks — grows to about ten thousand three hundred and twenty-seven. The three-hundred-seventy-three dollar gap is not a fee. It is cash drag — the cost of money sitting out of the market while it waits its turn." |

### Beat 4 — Concept 4: "See the Cash Drag" (39.0 → 51.0s, 12.0s)

| | |
|---|---|
| Hand 1 | 39.0s: from (1240, 1300) → (250, 1880) over 1.5s |
| Hand 2 | 40.5s: → (230, 1430) over 0.5s |
| Tap | 41.0s: tap on "$10,000 day 1" node |
| Hand 3 | 42.5s: → (480, 1430) over 0.7s (traces the arrow) |
| Tap | 43.2s: tap on "$10,700 lump" node |
| Hand 4 | 44.7s: → (850, 1430) over 0.7s (traces the second arrow) |
| Tap (long) | 45.4s: double-tap on "$10,327 DCA" — this is the punchline |
| Pause | 46.5–49.0s: hand holds on DCA node |
| Hand out | 49.0s: → off-screen (1240, 1450) over 2.0s |
| VO | "Look at the flow. Lump sum earns a full year on the whole ten thousand. DCA at end-of-month earns about half a year on average — your first eight-thirty-three earns roughly eleven months in the market, your last one earns almost zero. The later your money arrives, the less time it has to compound. That's the drag, visualized." |

### Beat 5 — Concept 5: "When DCA Helps vs Hurts" (51.0 → 63.0s, 12.0s)

| | |
|---|---|
| Hand 1 | 51.0s: from (1240, 1450) → (250, 1880) over 1.5s |
| Hand 2 | 52.5s: → (250, 1620) over 0.6s |
| Tap | 53.1s: tap on "DCA helps" card |
| Pause | 54.0–57.0s: hand holds on helps card |
| Hand 3 | 57.0s: → (830, 1620) over 0.7s |
| Tap | 57.7s: tap on "DCA hurts" card |
| Pause | 58.5–61.0s: hand holds on hurts card |
| Hand out | 61.0s: → off-screen (1240, 1650) over 2.0s |
| VO | "So when does DCA actually help? When you would otherwise sit in cash out of fear, or when markets drop right after you start — at least you didn't deploy everything before the fall. When does it hurt? Whenever markets rise while your cash waits. That's most years. The persistent cost of DCA isn't a fee — it's the ten percent nominal return you left on the table while your money sat on the sideline." |

### Beat 6 — Concept 6: "Use It Right" (63.0 → 75.0s, 12.0s)

| | |
|---|---|
| Hand 1 | 63.0s: from (1240, 1650) → (250, 1880) over 1.5s |
| Hand 2 | 64.5s: → (540, 1810) over 0.6s |
| Tap | 65.1s: tap on the tip box |
| Pause | 66.0–73.0s: hand holds on tip box, slow drift right (10px) and back (subtle "live pointer") |
| Hand out | 73.0s: → off-screen (1240, 1820) over 2.0s |
| VO | "How to use DCA right. Automate your paycheck investing on payday — there's no drag because the money was never in cash to begin with. For a windfall, either invest it promptly, or DCA a short window — three to six months, max. Park any waiting cash in a high-yield account so it's at least earning something, and check your target allocation, not the entry price." |

### Beat 7 — Outro (75.0 → 91.6s, 16.6s)

| | |
|---|---|
| Hand 1 | 75.0s: from (1240, 1820) → (540, 1900) over 2.0s (returns to center) |
| Idle | 77.0s: hand holds at footer for 1s |
| Hand out | 78.0s: → off-screen (-200, 1900) over 2.0s (exits left) |
| Music | 87.0s: bed fade-out begins (3s linear to -40dB) |
| End | 91.6s |
| VO | "Sourced from the SEC, FINRA, Vanguard, Charles Schwab, and S&P 500 data going back to 1928. Full notes at compound lane dot com." |

## Animation primitives

All beats share the same primitives:

- **Move** — `gsap.to(hand, {x, y, duration, ease})` with a slight arc on long moves (mid-way point offset by 40–80px perpendicular to the line, `cubic-bezier(.4,.1,.3,1)`)
- **Tap bounce** — `gsap.fromTo(hand, {scale: 1}, {scale: 0.92, duration: 0.12, yoyo: true, repeat: 1, ease: 'power2.out'})`. Long tap = `repeat: 1, yoyo: true` = 2 bounces.
- **Ripple** — `gsap.fromTo(ripple, {scale: 1, opacity: 0.7}, {scale: 3, opacity: 0, duration: 0.6, ease: 'power1.out'})` fired with the tap.

The whole timeline is built once at load, registered on `window.__timelines["dca-explainer"]`, paused. HyperFrames drives `seek` to scrub; GSAP handles deterministic playback.

## Hand path summary (12 anchor points over 91.6s)

```
t=0.0    (off)        -200, 2100   scale 0.9
t=1.5    intro         900, 1880   scale 1
t=3.0    c1 left      250, 720
t=4.5    tap 1        250, 720
t=6.5    c1 right     830, 720
t=7.5    tap 2        830, 720
t=13.0   c1 out       1240, 800
t=16.5   c2 vanguard  540, 970
t=18.5   c2 schwab    540, 1030
t=20.5   c2 edge      540, 1090
t=28.5   c3 lump      540, 1230
t=30.5   c3 dca       540, 1290
t=32.5   c3 gap       770, 1310
t=40.5   c4 day1      230, 1430
t=42.5   c4 lump node 480, 1430
t=44.7   c4 dca node  850, 1430
t=52.5   c5 helps     250, 1620
t=57.0   c5 hurts     830, 1620
t=64.5   c6 tip       540, 1810
t=77.0   outro        540, 1900
t=80.0   outro exit   -200, 1900
```
