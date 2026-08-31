# pacing-rules-v1.md

Machine-readable pacing spec for reel script generation and QA. Consumed by the agent during Stage 2 copy generation and as a pre-render validation pass. Source research: `REEL-PACING-GUIDE.md` (human-readable, with citations and caveats). This file contains only the resolved rules — no narrative.

---

## constraints

```yaml
runtime_sec: [30, 40]
word_count: [75, 100]
words_per_sec: [2.3, 2.7]
wpm_equivalent: [140, 160]

hook_deadline_sec: 2
hook_max_words: 12
hook_tense: present
hook_forbidden_openers: ["hey guys", "today i'm going to", "in this video", "welcome back"]

max_silence_sec: 0.4

component_change_interval_target_sec: 5
component_change_interval_max_sec: 15
component_change_required_at_sec: 20   # mid-video reset, non-negotiable

component_repeat_allowed: false        # no component type repeats within one deck

cta_position_sec: [38, 40]
cta_max_asks: 1
cta_default_action: "save"             # override only if content type is not educational

keyword_continuity_required: true      # spoken line, on-screen text, caption must share core keyword
```

---

## beat timing map

```yaml
beats:
  - id: orient
    window_sec: [0, 2]
    word_budget: [5, 8]
    component: null   # hook only, no component card yet

  - id: frame
    window_sec: [2, 8]
    word_budget: [12, 18]
    component: context_setting

  - id: warn
    window_sec: [8, 14]
    word_budget: [12, 18]
    component: warning

  - id: quantify_cost
    window_sec: [14, 20]
    word_budget: [12, 18]
    component: [ledger, ledger_2col]

  - id: quantify_opportunity_cost
    window_sec: [20, 30]
    word_budget: [15, 20]
    component: [growth, compare]
    note: emotional_peak                # largest number lives here, mandatory mid-video visual reset

  - id: closing_edge_case
    window_sec: [30, 38]
    word_budget: [10, 15]
    component: flow

  - id: cta
    window_sec: [38, 40]
    word_budget: [5, 8]
    component: null
```

---

## validation rules (apply at QA pass, before render)

```yaml
checks:
  - id: word_count_in_range
    fail_if: total_words < 75 OR total_words > 100

  - id: hook_lands_on_time
    fail_if: first_beat_end_sec > 2

  - id: hook_has_forbidden_opener
    fail_if: script_start MATCHES any(hook_forbidden_openers)

  - id: silence_gap
    fail_if: any_pause_sec > 0.4

  - id: component_change_gap
    fail_if: any_gap_between_component_changes_sec > 15

  - id: mid_video_reset_present
    fail_if: no_component_change_at_sec ~ 20

  - id: component_type_repeats
    fail_if: any_component_type_count > 1

  - id: peak_number_position
    fail_if: largest_number NOT IN beat(quantify_opportunity_cost)

  - id: keyword_match
    fail_if: core_keyword NOT IN [spoken_line, on_screen_text, caption_first_line]

  - id: cta_single_ask
    fail_if: cta_beat CONTAINS more_than_1_distinct_ask

  - id: caption_safe_zone
    fail_if: critical_text_position IN [bottom_25_pct, right_edge]
```

---

## notes for agent

- If `runtime_sec` input falls outside [30, 40], scale `word_count` via `words_per_sec` midpoint (2.5) rather than reusing fixed word_count range.
- `cta_default_action` is "save" for educational content only — if content is promotional/offer-driven, use "DM" or "bio link" per existing CTA-matching rule in brand docs.
- `component_change_required_at_sec: 20` exists specifically to counter documented Reels mid-video retention sag — do not relax this even if total component count is otherwise satisfied earlier in the script.
- This file supersedes any pacing numbers embedded in `text-prompt-engine-v1.md` or `reel-prompt-engine-v2.md` — update those files to reference this one rather than duplicating constants.
