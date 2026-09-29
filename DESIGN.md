---
name: CSP Reporting Server
description: A quiet developer triage instrument for Content Security Policy reports.
colors:
  bg: "#fafaf9"
  surface: "#ffffff"
  surface-2: "#f4f4f3"
  surface-3: "#ececea"
  border: "#e5e5e2"
  border-strong: "#d3d3cf"
  text: "#18181b"
  text-2: "#4b4b53"
  text-3: "#6b6b74"
  accent: "#3451d1"
  accent-soft: "#eef1fd"
  accent-text: "#2a44b8"
  focus: "#3451d1"
  enforce: "#c9252d"
  enforce-soft: "#fdecec"
  report: "#9a5b00"
  report-soft: "#fdf3e2"
  live: "#16803c"
  code-key: "#7a3fc2"
  code-string: "#1f7a4d"
  code-number: "#b3510f"
  code-literal: "#3451d1"
  fam-script: "#b36b00"
  fam-style: "#c23a72"
  fam-media: "#0e8577"
  fam-connect: "#2d6ed6"
  fam-frame: "#7b4bd6"
  fam-other: "#71717a"
  dark-bg: "#0c0c0e"
  dark-surface: "#121215"
  dark-surface-2: "#19191d"
  dark-surface-3: "#222227"
  dark-border: "#26262b"
  dark-border-strong: "#35353c"
  dark-text: "#ececef"
  dark-text-2: "#b2b2ba"
  dark-text-3: "#8d8d97"
  dark-accent: "#8098ff"
  dark-accent-soft: "#1b2140"
  dark-accent-text: "#a9b8ff"
  dark-focus: "#8098ff"
  dark-enforce: "#ff6b70"
  dark-enforce-soft: "#3a1618"
  dark-report: "#f2b04e"
  dark-report-soft: "#33260f"
  dark-live: "#45d07e"
  dark-code-key: "#c5a1ff"
  dark-code-string: "#7fd6a4"
  dark-code-number: "#f5a86b"
  dark-code-literal: "#8fa6ff"
  dark-fam-script: "#e8ad4c"
  dark-fam-style: "#f07aa7"
  dark-fam-media: "#3fc7b5"
  dark-fam-connect: "#6fa6ff"
  dark-fam-frame: "#b497ff"
  dark-fam-other: "#a1a1aa"
typography:
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI Variable Text, Segoe UI, system-ui, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "-0.02em"
    fontFeature: '"cv11", "ss01"'
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI Variable Text, Segoe UI, system-ui, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "-0.02em"
    fontFeature: '"cv11", "ss01"'
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI Variable Text, Segoe UI, system-ui, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: '"cv11", "ss01"'
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI Variable Text, Segoe UI, system-ui, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1
    fontFeature: '"cv11", "ss01"'
  mono:
    fontFamily: "ui-monospace, SF Mono, Cascadia Code, Cascadia Mono, JetBrains Mono, Menlo, Consolas, monospace"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.6
rounded:
  sm: "4px"
  md: "6px"
  lg: "10px"
  pill: "999px"
spacing:
  xxs: "2px"
  xs: "4px"
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "12px"
  panel: "16px"
  page-x: "20px"
  page-y: "24px"
  topbar-h: "52px"
  bottom-room: "64px"
components:
  button-default:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0 10px"
    height: "30px"
  button-primary:
    backgroundColor: "{colors.text}"
    textColor: "{colors.bg}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0 10px"
    height: "30px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-2}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0 10px"
    height: "30px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0 10px"
    height: "30px"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
  pill-enforce:
    backgroundColor: "{colors.enforce-soft}"
    textColor: "{colors.enforce}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 7px"
    height: "20px"
  pill-report:
    backgroundColor: "{colors.report-soft}"
    textColor: "{colors.report}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 7px"
    height: "20px"
---

# Design System: CSP Reporting Server

## Overview

**Creative North Star: "The Quiet Triage Instrument"**

CSP Reporting Server is designed as an operating surface for a single developer, not as a promotional dashboard. The built world is restrained, neutral, and precise: quiet backgrounds, hairline panels, small controls, tabular numbers, and code-first detail create the feeling of a trustworthy diagnostic tool that stays out of the way while violations arrive live.

The system follows the category-standard craft of Linear, Vercel, and GitHub without borrowing their brands. Its personality comes from density control, exact typography, and purposeful data encoding rather than decoration. Light and dark modes are equal citizens: the same semantic tokens are defined in `:root`, mirrored through `prefers-color-scheme`, and overridden by `[data-theme="dark"]` or `[data-theme="light"]`.

**Key Characteristics:**
- Quiet neutral surfaces with one restrained blue interactive accent.
- Red means enforced CSP; amber means report-only; directive colors are data encoding only.
- System sans carries UI copy while monospace carries directives, URLs, policies, JSON, and endpoint values.
- Hairline borders and tonal layers define structure; shadows are reserved for popovers and the inspector overlay.
- Motion is nearly absent except for the authored arriving-report row.

## Colors

The palette is an engineered neutral instrument: soft warm light surfaces, near-black dark surfaces, one blue accent for interaction, semantic severity colors for CSP state, and six categorical directive-family colors used only where data needs encoding.

### Primary
- **Diagnostic Blue** (`accent`): The single interactive accent for selected filters, links, focus color, code literals, and endpoint emphasis.
- **Diagnostic Blue Wash** (`accent-soft`): The selected-row, selected-facet, and selected-chip backing tone.
- **Diagnostic Blue Text** (`accent-text`): Link and inline endpoint emphasis when the accent must remain legible on light surfaces.

### Neutral
- **Canvas** (`bg`, `dark-bg`): The page background; it stays quieter than cards and top bars.
- **Panel Surface** (`surface`, `dark-surface`): The default card, input, tooltip, inspector, and table surface.
- **Inset Surface** (`surface-2`, `dark-surface-2`): The secondary layer for toolbars, snippets, endpoint fields, hovered rows, and empty-state code blocks.
- **Pressed Surface** (`surface-3`, `dark-surface-3`): The deepest resting layer for active controls, chip remove hover, and low-contrast fills.
- **Hairline Border** (`border`, `dark-border`): The default divider and panel edge.
- **Strong Hairline** (`border-strong`, `dark-border-strong`): The control outline, keyboard key edge, and stronger affordance stroke.
- **Primary Text** (`text`, `dark-text`): Headings, metric numbers, primary labels, and icon frames.
- **Secondary Text** (`text-2`, `dark-text-2`): Body support text, source labels, active live text, and muted-but-actionable metadata.
- **Tertiary Text** (`text-3`, `dark-text-3`): Axis labels, placeholders, timestamps, helper copy, and idle live state.

### Data & State
- **Enforced Red** (`enforce`, `dark-enforce`): Enforced CSP disposition, destructive hover, failed checks, live-down state, and highlighted policy hits.
- **Enforced Red Wash** (`enforce-soft`, `dark-enforce-soft`): Backing fill for enforced pills and highlighted policy rows.
- **Report Amber** (`report`, `dark-report`): Report-only disposition and chart series.
- **Report Amber Wash** (`report-soft`, `dark-report-soft`): Backing fill for report-only pills.
- **Live Green** (`live`, `dark-live`): SSE live state, successful copy state, and blocked test checks.
- **Directive Family Set** (`fam-script`, `fam-style`, `fam-media`, `fam-connect`, `fam-frame`, `fam-other` plus dark equivalents): Six categorical colors for script, style, media, connect, frame, and other directives.
- **Syntax Set** (`code-key`, `code-string`, `code-number`, `code-literal` plus dark equivalents): JSON and policy syntax colors inside raw report and snippet blocks.

### Named Rules
**The Semantic Severity Rule.** Red is reserved for enforced, destructive, failed, or policy-hit states; amber is reserved for report-only. Do not use either as decoration.

**The Categorical Color Rule.** The directive-family palette is only a data encoding system. Do not reuse script/style/media/connect/frame/other colors for brand moments, charts unrelated to directives, or general UI ornament.

## Typography

**Display Font:** System sans stack (`-apple-system`, `BlinkMacSystemFont`, `Segoe UI Variable Text`, `Segoe UI`, `system-ui`, `Roboto`, `Helvetica Neue`, `Arial`, `sans-serif`)
**Body Font:** System sans stack (`-apple-system`, `BlinkMacSystemFont`, `Segoe UI Variable Text`, `Segoe UI`, `system-ui`, `Roboto`, `Helvetica Neue`, `Arial`, `sans-serif`)
**Label/Mono Font:** UI monospace stack (`ui-monospace`, `SF Mono`, `Cascadia Code`, `Cascadia Mono`, `JetBrains Mono`, `Menlo`, `Consolas`, `monospace`)

**Character:** Typography is compact, native, and data-literate. The sans stack keeps the tool aligned with the operating system, while monospace gives directives, URLs, headers, JSON, and code snippets a distinct factual voice.

### Hierarchy
- **Headline** (600, `24px`, `1.5`, `-0.02em`): Test-page headings and large summary metric values.
- **Title** (600, `18px`, `1.5`, `-0.02em`): Empty-state headings and inspector directive titles.
- **Panel Title** (600, `13px`, `1.5`): Card headings, toolbar group labels, and section titles.
- **Body** (400, `14px`, `1.5`): Default UI copy, explanations, and dashboard text.
- **Dense Data** (400-500, `12px` to `12.5px`, tabular numerals where numeric): timestamps, URLs, policies, endpoint values, facet labels, table metadata, and raw JSON.
- **Label** (500, `12px` to `13px`): Buttons, chips, segmented controls, facet titles, field labels, and status text.

### Named Rules
**The Data Monospace Rule.** Directives, URLs, policies, raw JSON, endpoint values, and header snippets stay monospace. Interface copy, labels, and explanations stay in the sans stack.

**The Compact Authority Rule.** The dashboard earns clarity through tight type sizes and weight, not oversized headings. Keep new UI in the `12px`-`14px` control range unless it is a page heading, empty state, or primary metric.

## Layout

The dashboard uses a two-tier operating layout. A sticky `52px` top bar anchors brand, live status, tools, and theme. The main page sits in a centered container capped at `1600px` with `20px` side padding, `24px` top padding, and generous bottom room.

The first viewport starts with a two-column overview: activity chart on the left and app connection endpoints on the right (`minmax(0, 1fr)` plus `340px-460px`). Below it, the workspace is a `300px` sticky facets rail plus a flexible report table. On medium widths the overview collapses to one column; below `860px` the report list leads and facets follow in responsive cards; below `640px` the brand text, button labels, page/source/time columns, and search shortcut key are hidden.

Spacing is dense but regular: panels use `14px-16px` internal gutters, toolbars use `12px`, control gaps are `6px-8px`, and major dashboard gaps are `16px`. Lists and tables prefer scannable row rhythm over white-space drama: report rows are `42px` tall, table headers are `34px`, buttons and fields are `30px`, small controls are `24px`, and pills are `20px`.

### Named Rules
**The Lenses-First Rule.** Directive, blocked URL, app, disposition, and search controls are primary navigation. New screens should let every number or item quickly become a filter or drill-down path.

**The Dense-But-Breathable Rule.** Use compact rows and controls, but preserve `12px-16px` panel padding and clear border separations so the surface reads as an instrument, not a log dump.

## Elevation & Depth

Depth is mostly structural, not atmospheric. The resting interface is flat and separated by hairline borders, tonal layers, and sticky positioning. Shadows appear only when a surface temporarily floats above the workspace: chart tooltip and right-side inspector.

### Shadow Vocabulary
- **Pop Shadow** (`shadow-pop`): Used for the chart tooltip and inspector overlay. In light mode it is a restrained ambient stack; in dark mode it becomes a stronger black overlay shadow so floating surfaces separate from the near-black canvas.

### Named Rules
**The Overlay-Only Shadow Rule.** Panels, tables, controls, and facets are flat at rest. Use the pop shadow only for temporary or floating surfaces that overlap other content.

## Shapes

The form language is softly squared, not bubbly. Small controls use gently rounded `6px` corners, small mechanical details use `4px`, and larger panels or overlays use `10px`. Pills are fully rounded (`999px`) because they function as compact state badges or removable filters. Swatches use tiny `2px` rounding to read as data marks rather than decoration.

Borders are almost always one-pixel hairlines. The brand mark is the exception: a rounded-square frame (`7px` inside the SVG) containing three horizontal lines, with the middle line carrying the violation hit color.

## Components

### Buttons
- **Shape:** Gently squared control (`6px`) with `30px` default height, `24px` small height, and `6px` icon/text gap.
- **Primary:** Inverts the text and background tokens: primary buttons use `text` as the fill and `bg` as the label color.
- **Default:** White or dark surface fill, strong hairline border, primary text, and a tonal hover to `surface-2`.
- **Ghost:** Transparent at rest, secondary text, no border, and a tonal hover to `surface-2` with primary text.
- **Danger:** Starts as a ghost/default action and only turns enforced red on hover.
- **Focus:** Uses a `2px` solid focus outline with `2px` offset; inputs replace the outline with a focused border and a soft color-mixed focus halo.

### Chips
- **Style:** Filter chips are pill-shaped, bordered, and surface-backed; the chip value is monospace and clipped with ellipsis when needed.
- **State:** Disposition pills use filled semantic washes: enforced red wash for enforced, amber wash for report-only, neutral tonal fill for other reports.
- **Behavior:** Removable filter chips include a circular remove target that only gains a tonal fill on hover.

### Cards / Containers
- **Corner Style:** Large softly squared panels (`10px`).
- **Background:** Panels sit on `surface`; nested code, headers, endpoint blocks, and chip bars use `surface-2`; active controls and deeper hover targets use `surface-3`.
- **Shadow Strategy:** No shadow at rest; see the Overlay-Only Shadow Rule.
- **Border:** One-pixel hairline border on every panel and most inset blocks.
- **Internal Padding:** Panel headers use `14px 16px 0`; panel bodies use `12px-16px`; table and toolbar rhythm uses `12px`.

### Inputs / Fields
- **Style:** `30px` height, `6px` radius, strong hairline border, surface background, `13px` type, and `0 10px` padding.
- **Search:** Adds a leading `14px` icon and trailing keyboard hint; the input expands from `260px` to `420px`.
- **Endpoint Fields:** Use inset tonal backgrounds, monospace URL text, and accent-colored final path segments.
- **Focus:** Focused fields use the focus border plus a soft `color-mix` halo derived from the focus token.

### Navigation
- **Top Bar:** Sticky, translucent, and blurred with `saturate(1.4) blur(10px)`. It uses a hairline bottom border and compact action buttons.
- **Brand:** A 22px inline SVG mark, medium-weight product name, and optional subdued sub-label separated by a strong-border-colored slash.
- **Segmented Controls:** A strong-border container with `2px` padding and `surface-2` fill. Active items lift to `surface` with a tiny border-and-shadow combination.
- **Mobile:** Brand text and button labels disappear below `640px`, leaving the mark, live state, and icon actions.

### Report Table
- **Rows:** `42px` tall, clipped single-line cells, tabular received times, monospace directive/URL/page cells, and semantic disposition pills.
- **Selection:** Hover rows use `surface-2`; selected rows use the accent wash.
- **Arrival Motion:** New reports play the one authored motion: a `1600ms` row reveal that starts with an accent wash and a left-to-right clip-path opening.

### Facets
- **Structure:** Sticky rail cards contain button-like facet rows with label, count, and a 3px progress bar.
- **Encoding:** Directive facets include the categorical swatch; blocked URL labels use right-to-left clipping so the host/path ending stays useful.
- **State:** Pressed facets use accent wash and accent text for the count; progress bars animate scale on the x-axis using the standard ease-out curve.

### Inspector
- **Structure:** A fixed right drawer, `min(520px, calc(100vw - 16px))`, offset from the top bar and viewport edges.
- **Motion:** Opens with a `320ms` transform transition using the shared ease-out curve; visibility delay prevents hidden focus targets.
- **Content:** The violated directive heads the drawer in monospace, policy hits are highlighted with enforced red wash, and raw JSON uses the syntax token set.

## Do's and Don'ts

### Do:
- **Do** keep the dashboard self-contained: external CSS and JS only, no external fonts, no CDNs, and no decorative remote assets.
- **Do** add new data visualizations with semantic color first: severity for enforcement/report-only, categorical family color only for directive families, neutral gray for all else.
- **Do** route dynamic presentation through CSS custom properties and CSSOM so the strict CSP-compatible model remains intact.
- **Do** preserve light and dark parity whenever adding a reusable color token.
- **Do** keep tables, policies, URLs, and JSON scannable with monospace type, tabular numerals, clipping, and copy affordances.

### Don't:
- **Don't** introduce gradients, big hero treatments, marketing-card flourishes, or generic SaaS illustrations.
- **Don't** use red, amber, or directive-family colors for decoration or brand expression.
- **Don't** add new shadows to resting panels, tables, or controls.
- **Don't** promote one-off data values or asset-local SVG colors into reusable system tokens.
- **Don't** add inline script or inline style as a design shortcut; the dashboard is built to run under its own strict CSP.
