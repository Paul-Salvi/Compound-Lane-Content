---
preset: code-editorial
format: 1080x1920
layout: portrait
colors:
  bg: "#FAF8F3"
  bg-alt: "#F1EDE2"
  ink: "#1B1F1D"
  ink-muted: "#565A55"
  accent: "#2F5D4E"
  accent-deep: "#223F35"
  secondary: "#A85A24"
  surface: "#FFFFFF"
  border: "#DBD5C4"
fonts:
  display:
    family: "Fraunces"
    weights: [600, 700]
    fallback: Georgia, serif
  mono:
    family: "IBM Plex Mono"
    weights: [400, 600, 700]
    fallback: 'Courier New', monospace
    tabular: true
  body:
    family: "Inter"
    weights: [400, 500, 600]
    fallback: -apple-system, BlinkMacSystemFont, sans-serif
typography:
  display-h1: { size: "52px", weight: 600, color: "#2F5D4E", lineHeight: 1.1, letterSpacing: "-0.015em" }
  display-h2: { size: "36px", weight: 600, color: "#2F5D4E", lineHeight: 1.12, letterSpacing: "-0.01em" }
  stat-hero: { size: "72px", weight: 700, color: "#2F5D4E", lineHeight: 0.9, letterSpacing: "-0.01em" }
  stat-mid: { size: "48px", weight: 700, color: "#2F5D4E", lineHeight: 0.85 }
  body: { size: "22px", weight: 400, color: "#565A55", lineHeight: 1.55 }
  label: { size: "14px", weight: 600, color: "#2F5D4E", letterSpacing: "0.08em" }
  caption: { size: "16px", weight: 400, color: "#565A55", lineHeight: 1.5 }
spacing:
  frame-padding: 56px
  logo-top: 32px
  logo-left: 32px
  section-gap: 24px
  card-gap: 12px
components:
  wordmark:
    mark-stroke: "#2F5D4E"
    text-family: "Fraunces"
    text-size: "18px"
    text-weight: 600
    text-color: "#2F5D4E"
  stat-card:
    bg: "#F1EDE2"
    border: "1px solid #DBD5C4"
    border-left: "3px solid #2F5D4E"
    border-radius: 3px
    padding: "18px"
    value-font: "IBM Plex Mono"
    value-size: "30px"
    desc-font: "Inter"
    desc-size: "15px"
  glide-bar:
    height: "40px"
    border-radius: "3px"
    age-30-color: "#2F5D4E"
    retirement-color: "#A85A24"
    track-width: "620px"
motion:
  ease-standard: "power2.out"
  ease-entrance: "back.out(1.7)"
  ease-draw: "power2.inOut"
