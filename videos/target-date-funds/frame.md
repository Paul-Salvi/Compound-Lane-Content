---
preset: notebook-handwritten
format: 1080x1920
layout: portrait
source: input/sample.html (notebook / graph-paper hand-drawn format)
colors:
  paper: "#f7f6f3"          # cream notebook paper
  grid: "rgba(120,140,170,0.28)"  # blue-gray graph grid lines
  margin: "#ef4444"         # red left margin line
  ink: "#1a1a1a"            # main handwriting
  pencil: "#555555"         # muted notes
  green: "#2f5d4e"          # positive / keep / compounding
  red: "#c0392b"            # losses / fees / negative
  blue: "#1b3a6b"           # rules / emphasis / bonds
  highlight: "#ffe98a"      # yellow marker swipe (key loss)
  ochre: "#a85a24"          # CTA flourish accent
fonts:
  marker:
    family: "Permanent Marker"
    fallback: cursive
    role: display titles, section heads, big CTA
  caveat:
    family: "Caveat"
    weight: 700
    fallback: cursive
    role: large handwritten numbers / stats ("$187K", "90%", "0.08%")
  hand:
    family: "Patrick Hand"
    fallback: cursive
    role: body, labels, descriptions, notes
typography:
  title-marker: { size: "88px", family: "Permanent Marker", color: "#1a1a1a", lineHeight: 1.05 }
  sec-title: { size: "56px", family: "Permanent Marker", color: "#1a1a1a" }
  stat-caveat: { size: "104px", family: "Caveat", weight: 700, color: "#2f5d4e" }
  amt-caveat: { size: "78px", family: "Caveat", weight: 700 }
  body-hand: { size: "38px", family: "Patrick Hand", color: "#1a1a1a" }
  note-hand: { size: "32px", family: "Patrick Hand", color: "#555555" }
spacing:
  frame-padding: 64px
  margin-line-left: 56px
  logo-top: 36px
  logo-left: 76px
  section-gap: 44px
components:
  wordmark:
    mark-stroke: "#2F5D4E"
    text-family: "Patrick Hand"
    text-size: "30px"
    text-color: "#2F5D4E"
  graph-paper:
    bg: "#f7f6f3"
    grid: "repeating-linear-gradient(to right, rgba(120,140,170,0.28) 0 1.5px, transparent 1.5px 44px) + same to bottom"
    margin: "3px solid #ef4444 at left:56px"
  sketch-card:
    bg: "rgba(255,255,255,0.55)"
    border: "border-radius 2px 255px 3px 25px / 255px 5px 225px 3px"
    rotation: "-1.5deg..1.6deg"
    squiggle-underline: "svg path Q-wobble, stroke-linecap round"
  highlight-banner:
    bg: "linear-gradient(104deg, rgba(254,240,138,0) 0.9%, rgba(254,240,138,1) 2.4%, rgba(254,240,138,0.5) 5.8%, rgba(254,240,138,0.9) 93%, rgba(254,240,138,0.7) 96%, rgba(254,240,138,0) 98%)"
    rotation: "-1.5deg"
  glide-bar:
    height: "48px"
    age-30: "#2f5d4e"
    retirement: "#1b3a6b"
motion:
  writeIn: "opacity 0→1, y 10→0, rotation -1.5→0, 0.45s, power2.out"
  drawPath: "strokeDasharray:1 / strokeDashoffset:1→0, 0.6-0.8s, power1.inOut"
  stat-in: "opacity 0→1, y 60→0, scale 0.6→1, rotation -3→-1, 0.8s, back.out(1.6)"
  stagger: "0.3s between elements"
