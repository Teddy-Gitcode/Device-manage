# Ketepa Print Fleet — Design System

A Fluent 2 / Microsoft 365-styled design system for the **Ketepa Print Fleet Manager**, the real-time print fleet monitoring product built for **Kenya Tea Packers Ltd (Ketepa)**. It monitors 29+ networked printers across 6 locations: paper jams, open covers, toner levels, print jobs, consumable stock, costs, and device reallocation.

The visual language is a faithful Microsoft 365 admin-tool aesthetic (Outlook, Teams Admin Center, M365 Admin Center) — Segoe UI, brand `#0f6cbd`, neutral canvas `#faf9f8`, card-based modular layout. This is not a marketing brand; it's an **internal enterprise admin** brand.

---

## Source material

- **Product spec:** `DESIGN/DESIGN.md` (attached codebase, read-only) — a 1,007-line frontend agent specification covering architecture, tokens, components, endpoints, WebSocket protocol, and migration order. All decisions in this system are lifted directly from that file.
- **Codebase:** no production frontend code was provided — only the spec. UI kits here are the first implementation; treat them as the reference build.
- **Figma:** none provided.
- **Slide decks:** none provided.

Because the spec is exhaustive and the component inventory is pinned, there is no ambiguity in tokens, components, or behavior. If you're extending the system, read the spec first — this design system is its visual mirror.

---

## Index

| File | Purpose |
| --- | --- |
| `README.md` | This file — manifest, content & visual foundations, iconography. |
| `SKILL.md` | Agent Skill manifest for Claude Code compatibility. |
| `colors_and_type.css` | Canonical CSS variables (colors, type ramp, spacing, radii, shadows) + semantic base type. |
| `fonts/` | **Empty by spec.** Segoe UI is the sole font family; no webfonts are shipped. See "Typography" below. |
| `assets/` | SVG logos and icons. Currently: `logo.svg` (Print Fleet product mark), `ketepa-mark.svg` (tenant identity). Lucide is used for all inline UI icons via CDN. |
| `preview/` | Design-system cards rendered for the Design System tab — palettes, type specimens, components, patterns. |
| `ui_kits/web/` | React (JSX) recreation of the Next.js dashboard. Includes `index.html` click-through prototype and modular JSX components. |

There is only one product in this system — a web dashboard (Next.js 14). No mobile app, no marketing site.

---

## Content Fundamentals

The product is an enterprise admin tool, and the voice reflects that: **terse, factual, scannable**. Every label does work.

### Tone
- **Operational, not conversational.** "Paper jam detected" — not "Oops! Your printer has a paper jam."
- **Status-led.** Sentences usually begin with a subject or status: *"Device offline"*, *"Toner low (12%)"*, *"Job held for release"*.
- **No second person in UI chrome.** "Schedule service" — not "Schedule your service". The exception is direct CTAs in empty states where addressing the user reduces ambiguity.

### Casing
- **Sentence case** for everything: page titles, card titles, buttons, menu items, column headers. `"Print Fleet Dashboard"`, `"Live events"`, `"Order toner"`, `"Active jobs"`.
- **ALL CAPS** is reserved for small eyebrow/caption labels with letter-spacing (`--fs-100`), sparingly, e.g. section dividers in the device detail panel.
- **ID strings keep their original casing**: `PR-004`, `TKT-2341`, `HP LaserJet M506`.

### Punctuation & formatting
- **Middot `·`** separates hierarchical chunks: `HQ · Floor 3 · Finance`, `PR-004 · Mombasa Export`, `Teresia Mwangi · 2h ago`.
- **Em-dash `—`** for inline asides (rare).
- **Parenthesized numerics** for magnitudes: `Toner low (12%)`, `Paper tray empty (Tray 2)`.
- **No trailing periods** on single-sentence UI strings, labels, or buttons.
- **Ampersands** only when space-constrained and part of a compound noun (`Jobs & queues`). Otherwise "and".

### Numerics
- **Tabular numerals** everywhere quantitative (`font-variant-numeric: tabular-nums`).
- **KES** currency prefix, space-separated thousands with comma: `KES 2.40`, `KES 148,200`.
- **Comma thousands** for page counts: `150,000 pp/mo`, `1,284,500 pages`.
- **Percents with no space**: `94%`, `42%`.
- **Relative time** in feeds: `2m ago`, `2h ago`, `3d ago`. Absolute timestamps in detail views: `2026-04-18 14:32`.

### Emoji
- **Never in product UI.** No emoji in labels, buttons, messages, headers.
- Status is communicated via colored dots, badges, and glyphs — not pictographs.
- The sole exception is the suite header's office-suite iconography (rendered as SVG, not emoji).

### Example strings lifted from the spec
- Alert feed: `"Paper jam detected"`, `"Cover open"`, `"Toner low (12%)"`, `"Paper tray empty"`, `"Job held for release"`, `"Job completed"`, `"Device back online"`
- Device row recommendations: `Keep` · `Relocate` · `Service`
- Badge labels: `Online` · `Warning` · `Needs service` · `Idle`
- KPI tile labels: `"Active devices"`, `"Pages last 30 days"`, `"Avg utilization"`, `"Open alerts"`
- Detail panel tabs: `Overview` · `Consumables` · `Activity` · `Specs`

### Vibe
Monitoring-room calm. The dashboard handles urgency visually (red badges, pulsing dots) so the copy can stay dry. Think of it as reading a flight-ops display: every word is a reading.

---

## Visual Foundations

### Colors
- **Brand** is a single ink: `#0f6cbd`. Used for the suite header bar, primary buttons, focus rings, selected nav item, active tab underlines, and sparkline strokes.
- **Canvas** is a warm near-white `#faf9f8` (the page background). **Cards** are `#ffffff`. Nav, table headers, and the command bar are `#fafafa`. These three neutrals are the entire chrome.
- **Status colors** (success / warning / danger / info) always appear as a **bg + fg + border** triad — never raw color. Badges and event chips use the tint-bg with its matching border; foreground text uses the matching `-fg` token.
- **No gradients anywhere.** Not on buttons, not on backgrounds, not on cards. The one exception is a very subtle `#f5f5f5 → #ffffff` on progress tracks under a fill — and that's optional.
- **Toner channel colors** (`#242424 #009dd8 #d83b9d #f2c811`) are used only for KCMY bars. Do not borrow them for general accents.

### Type
- **Segoe UI** stack only. No Google Fonts, no custom webfonts, no monospace for UI text. (Device IDs like `PR-004` use `font-variant-numeric: tabular-nums` to align, still in Segoe UI.)
- Three weights in play: **400** (body), **500** (labels, nav items), **600** (headings, KPI numerics).
- Type ramp is the Fluent 2 ramp, from `--fs-100` (10px caption) up to `--fs-900` (40px title-1). Page titles sit at `--fs-600` (24/32). KPI numerics at `--fs-800` (32/40).
- **Letter-spacing** is tightened slightly (`-0.01em`) on headings and numerics for optical tightness; otherwise leave it at 0.

### Spacing & layout
- **4/8 grid.** Tokens `--sp-1` (4) through `--sp-9` (48).
- Page padding: **24px vertical, 32px horizontal**. Side nav is **240px** wide. Detail panel is **480px** wide.
- Cards have **16px inner padding** (sometimes 20px for hero cards) and a **12px gap** between a card's head (title + action) and body.
- The dashboard grid is a **two-column 1.7fr / 1fr split** in the main area; KPI tiles are 4 even columns. These ratios are fixed by spec.

### Backgrounds & textures
- **Flat color only.** No background images, no repeating patterns, no grain, no illustrations, no hand-drawn anything.
- The heat-map component uses a 7×24 grid of opacity-varied brand swatches on white — this is the closest thing to a "pattern" in the system.

### Borders
- **1px solid `--neutral-stroke-2`** (`#e0e0e0`) on all card outer edges.
- **1px solid `--neutral-stroke-divider`** (`#f0f0f0`) for row dividers in tables and event lists.
- **1px solid `--neutral-stroke-1`** (`#d1d1d1`) on secondary button borders.
- Status badges use a 1px border in the matching `-border` token (softer than `-fg`).

### Corner radii
- **8px** for cards, panels, popovers (`--radius-card`).
- **4px** for buttons, inputs, chips, progress bars (`--radius-control`).
- **2px** for thin bar fills inside progress tracks.
- **999px** for the status dot and avatar pill.

### Shadows (Fluent depth)
Four levels, all very subtle — this is a light, paper-based UI:
- `--shadow-2` on resting cards (barely visible).
- `--shadow-4` on hovered cards and the sticky suite header.
- `--shadow-8` on popovers and menus.
- `--shadow-16` on the detail panel and modals.
- `--shadow-28` reserved for command palettes (not currently used).
Shadows are always 2-layer (`key + ambient`) with `rgba(0,0,0,0.14)` / `rgba(0,0,0,0.12)`. Never colored shadows.

### Hover, press, focus
- **Hover** on buttons/chips/rows: background shifts one step darker — e.g. `--neutral-bg-1 → --neutral-bg-3`; primary button `brand → brand-hover`.
- **Press**: one step darker again — `brand-hover → brand-pressed`. No scale transform. No ripple.
- **Focus**: 2px outline in `--m365-brand` offset by 1px — never rely on color alone.
- **Disabled**: `--neutral-fg-disabled` foreground; 0.6 opacity on the control.

### Animation
- **Fast and honest.** Durations: **100–200ms** for micro (hover, button press), **200ms** for panels, **150ms** for dropdowns. Nothing slower.
- **Easing**: Fluent's `cubic-bezier(0.33, 0, 0.67, 1)` (ease-both). Never bounce, never spring, never elastic.
- **Detail panel** slides in from right: 200ms ease-out, opacity + translateX.
- **Connection dot** pulses only when disconnected (amber), at 1.2s intervals. The connected green dot is static.
- **Alert feed entries** fade in (120ms); they do not slide or bounce.
- No page transitions. No scroll-triggered animations. No parallax.

### Transparency & blur
- **No backdrop-filter blur.** This is a light, performant admin UI — glass effects are off-brand.
- **Overlay** behind the detail panel: `rgba(0,0,0,0.32)` solid, no blur.
- **Popover shadows** do the separation work; transparency is avoided on surfaces themselves.

### Cards (anatomy)
- Surface `--neutral-bg-1`, border `--neutral-stroke-2`, radius 8px, shadow `--shadow-2`, padding 16px.
- Card head: title (`h2`, 20/28 semibold) on the left, optional subtitle + actions right-aligned, 12px margin-bottom.
- No card headers with tinted backgrounds. No "accent colored left border" cards — ticket priority is conveyed by a 3px colored left border only on ServiceTicket rows, not as a general card motif.

### Density
Medium-dense. Table row height ~48px. Button min-height 32px (28 for small). Event feed items ~56px. This is a dashboard for operators scanning many rows quickly; it is not airy.

### Imagery
- **No photography**, no illustration, no stock. The product never shows user-generated visual content.
- The only "imagery" is the 3×3 waffle app-launcher mark in the suite header, a printer glyph for the product lockup, and user avatars (initials on a deterministic pastel background).

### Layout rules (fixed)
- Suite header: **48px**, sticky top, brand background.
- Side nav: **240px**, sticky, `--neutral-bg-2`, right border `--neutral-stroke-2`.
- Main: padding `24px 32px`, overflow-y auto.
- KPI tiles: 4 equal columns.
- Two-column content grid: **1.7fr / 1fr**.
- Detail panel: slides in from right, 480px, full-height.

---

## Iconography

### Approach
The spec dictates a Microsoft 365 / Fluent admin look; the closest royalty-free icon family at that stroke weight is **Fluent UI System Icons**, but to keep this design system portable and easy to use from an agent context we standardize on **Lucide** loaded from CDN. Stroke weight is `1.75`, line caps rounded, size `16×16` or `20×20` in dense UI, `24×24` in the suite header. Color inherits from `currentColor` so icons follow text color semantics.

> **Substitution flag:** the production app in the spec does not specify an icon library. Lucide is our substitution to match the Fluent stroke weight and geometry. If the user prefers genuine Fluent icons, swap to `@fluentui/react-icons` or the Fluent System Icons SVG set — the semantic usage documented below carries over 1:1.

### Usage
- **Inline SVG** everywhere (`<svg>` children in JSX), not icon fonts. This lets us stroke-style them per context.
- **CDN:** `https://unpkg.com/lucide-static@latest/icons/<name>.svg` for static previews. In JSX we inline the path data for the ~20 icons we actually use.
- **No emoji. No unicode glyphs** used as icons (no `✓`, `×`, `•` — use `check`, `x`, a rendered dot instead). The one exception: the `·` (middot) character in text separators, which is typography, not iconography.
- **No PNG icons.** The system is vector-only.
- **App-launcher waffle** in the suite header is a 3×3 grid of brand rectangles — rendered as SVG primitives in `assets/logo.svg`. This is an icon, not a logo per se.

### The icons we use (mapping)
| Concept | Lucide name | Where |
| --- | --- | --- |
| App launcher | `grid-3x3` | Suite header left |
| Printer | `printer` | Product lockup, device rows |
| Search | `search` | Suite header search input |
| Notifications | `bell` | Suite header, alert feed |
| Settings | `settings` | Suite header, side nav |
| Dashboard | `layout-dashboard` | Side nav |
| Devices | `printer` | Side nav |
| Consumables | `package` | Side nav |
| Analytics | `bar-chart-3` | Side nav |
| Alerts | `alert-triangle` | Side nav, danger event |
| Jobs | `list` | Side nav |
| Reallocation | `arrow-right-left` | Side nav, reallocation cards |
| Reports | `file-text` | Side nav |
| Users | `users` | Side nav, top users |
| Jam | `alert-octagon` | Event feed critical |
| Cover open | `door-open` | Event feed critical |
| Toner low | `droplet` | Event feed warning |
| Offline | `power-off` | Event feed critical |
| Success | `check-circle-2` | Event feed OK |
| Close | `x` | Detail panel close |
| Chevron | `chevron-right` | Nav, breadcrumbs |
| Refresh | `refresh-cw` | "Poll now" action |
| More | `more-horizontal` | Row overflow menus |

If an icon is missing here, pick the closest Lucide match at the same stroke weight. Never draw one from scratch.
