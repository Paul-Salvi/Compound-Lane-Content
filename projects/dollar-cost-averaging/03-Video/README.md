# 03-Video/ — HyperFrames composition for DCA Explainer

This is the HyperFrames project. Run `npm run check` and
`npm run render` from here.

## Sibling folders in this project

| Folder | Role |
|---|---|
| `../01-source/` | Original saved article (HTML + assets) |
| `../01-content/` | Stage-1 JSON spec (visual notes source of truth) |
| `../02-visual/` | Hand-drawn notebook page (rendered to PNG, used as `public/page-background.png` here) |
| **`../02-audio/`** | **Voiceover script — `tts_script.txt` is the source text for the single `voiceover.mp3` in `.media/voiceover/`. Edit there when you want to change what the video says.** |

## Audio workflow

The single `.media/voiceover/voiceover.mp3` is generated from
`../02-audio/tts_script.txt`. To change wording:

1. Edit `../02-audio/tts_script.txt`
2. From this folder, run `../02-audio/regen.sh` to regenerate the
   single combined voiceover (`voiceover.mp3`)
3. Copy the printed duration into `data-duration` on `<div id="root">`,
   `<div id="page-bg">`, `<audio id="bed">`, and `<audio id="vo">` in
   `index.html` (and into the music fade-out position in the timeline
   if the total changed)
4. Run `npm run check`, then `npm run render`

## Layout inside this folder

```
03-Video/
├── index.html                 # the composition
├── hyperframes.json
├── package.json
├── meta.json
├── AGENTS.md                  # copied from repo root by the project init
├── CLAUDE.md                  # ditto
├── public/                    # static assets
│   ├── page-background.png    # the frozen 1080×1920 notebook page
│   └── hand-pointer.svg       # (legacy, no longer animated; no hand in the video)
├── .media/
│   ├── voiceover/             # 1 .mp3 (voiceover.mp3 — source text: ../02-audio/tts_script.txt)
│   └── music/                 # ambient bed
├── compositions/              # (reserved for sub-compositions)
├── render/                    # single-frame screenshots
├── render-preview/            # multi-frame previews
└── renders/                   # final MP4 outputs
```
