---
name: Pi Agent Web
description: A precise, calm web interface for the Pi coding agent.
colors:
  canvas: "#f7f7f5"
  panel: "#ffffff"
  hover: "#f1f1ef"
  selected: "#ebebe8"
  border: "#dededb"
  ink: "#171717"
  muted: "#6f6f6b"
  dim: "#9d9d97"
  accent: "#171717"
  destructive: "#dc2626"
  success: "#16a34a"
  ring: "#73736e"
typography:
  display:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
  title:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.35
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "var(--font-noto-mono), JetBrains Mono, Fira Code, monospace"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.025em"
  mono:
    fontFamily: "var(--font-noto-mono), JetBrains Mono, Fira Code, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: "10px"
  md: "12px"
  lg: "14px"
  xl: "20px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-outline:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  input:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "4px 12px"
  card:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "20px"
  tooltip:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "6px 10px"
---

# Design System: Pi Agent Web

## 1. Overview

**Creative North Star: "The Focused Desk"**

Pi Agent Web is a clean, well-lit desk for working with an AI coding agent. The interface exists to keep the developer in control: sessions, files, chat, and model settings are arranged in a three-panel workspace where every surface has a job and nothing competes for attention. The personality is precise, calm, and utilitarian — the agent is a tool, not a character.

The visual system rejects decoration for its own sake. Color is almost entirely Warm Paper and Ink; hierarchy comes from tone, spacing, and border rather than heavy shadows or saturated accents. Components feel like precision instruments: rounded just enough to be approachable, but never playful. Motion is short and state-driven, not choreographed. The result should feel like a focused productivity tool built by people who use it themselves.

**Key Characteristics:**
- Warm Paper & Ink palette with near-zero chroma except for status signals.
- Flat-by-default elevation; soft shadows only for floating surfaces.
- Precision-instrument components: consistent radius, clear states, no flourish.
- Inter for UI type; Noto Sans Mono for code paths and compact labels.
- Light and dark modes that respect `prefers-color-scheme` and user preference.

## 2. Colors

The palette is **Warm Paper & Ink**: warm-tinted neutrals for surfaces, near-black for text and primary action, and a small set of functional signals for status. It deliberately avoids brand color as decoration; the accent *is* the ink.

### Primary
- **Warm Paper** (`#f7f7f5`): The main canvas behind the workspace. Used for `body`, `bg-canvas`, and the empty-state background. Slightly warm so the screen does not feel clinical.

### Neutral
- **White** (`#ffffff`): Panels, cards, popovers, and the assistant-message background. The clean sheet on top of Warm Paper.
- **Warm Paper Hover** (`#f1f1ef`): Hover states for list rows, buttons, and selectable items. One step darker than the canvas.
- **Selected Paper** (`#ebebe8`): Active/selected rows and pressed states. Two steps darker than the canvas.
- **Titanium Line** (`#dededb`): Borders, dividers, and input strokes. Low contrast by design; structure without noise.
- **Ink** (`#171717`): Primary text, primary buttons, and the default accent. In light mode this is the dominant dark value.
- **Warm Graphite** (`#6f6f6b`): Secondary text, labels, timestamps, and muted metadata. The workhorse text color for non-primary information.
- **Ash** (`#9d9d97`): Placeholders, disabled hints, and the least-prominent metadata. Use sparingly; it must still hit 4.5:1 on Warm Paper.

### Semantic
- **Signal Red** (`#dc2626`): Errors, destructive actions, stop buttons, and validation failures.
- **Signal Green** (`#16a34a`): Success badges and positive status.

### Named Rules
**The One Voice Rule.** The accent color is the same as the ink. Color is used for state — selection, error, success, running — not for branding or decoration.

## 3. Typography

**Display Font:** Inter (with `ui-sans-serif`, `-apple-system`, `BlinkMacSystemFont`, `"Segoe UI"`, `"PingFang SC"`, `"Microsoft YaHei"`, sans-serif fallbacks)
**Mono Font:** Noto Sans Mono (with `JetBrains Mono`, `Fira Code`, `Consolas`, `ui-monospace`, `"PingFang SC"`, `"Microsoft YaHei"`, monospace fallbacks)

**Character:** Inter carries the entire UI in a neutral, familiar voice. Noto Sans Mono is reserved for code snippets, file paths, and compact labels where a fixed-width rhythm improves scanning. The pairing is functional, not expressive.

### Hierarchy
- **Display** (semibold, `1.875rem` / 30px, line-height 1.2, letter-spacing `-0.03em`): The welcome headline only — "What should we work on?" This is the largest type in the product; it should not appear elsewhere.
- **Headline** (semibold, `1.25rem` / 20px, line-height 1.3): Dialog titles, model-config header, and major section headers.
- **Title** (semibold, `1rem` / 16px, line-height 1.35): Card titles, sidebar section labels, and emphasized inline labels.
- **Body** (regular, `0.875rem` / 14px, line-height 1.5): Primary readable text, chat messages, descriptions, and form copy. Cap line length at 65–75ch for prose.
- **Label** (semibold, `0.75rem` / 12px, line-height 1.4, letter-spacing `0.025em`): Mono labels, file paths, compact metadata, and the "Pi Agent Web" kicker. Not uppercase; the mono width provides the rhythm.

### Named Rules
**The One Family Rule.** Inter handles every sans-serif role. Do not introduce a second sans or a display font for "personality."

## 4. Elevation

The system is **flat + tonal**. Depth is conveyed by background-tone shifts and 1px borders, not by default shadows. Surfaces rest on the canvas; only floating elements — cards, popovers, tooltips, and the chat composer — receive a shadow, and even those are soft and diffuse.

### Shadow Vocabulary
- **Soft** (`box-shadow: 0 1px 2px rgba(23, 23, 23, 0.05), 0 10px 30px rgba(23, 23, 23, 0.05)`): Cards, tooltips, and any element that lifts slightly above the canvas.
- **Composer** (`box-shadow: 0 1px 2px rgba(23, 23, 23, 0.04), 0 14px 40px rgba(23, 23, 23, 0.07)`): The chat input composer. Its shadow is the strongest non-modal shadow because it must feel anchored at the bottom of the viewport.
- **Composer Active** (`box-shadow: 0 1px 2px rgba(23, 23, 23, 0.05), 0 16px 44px rgba(202, 138, 4, 0.09)`): The composer while the agent is running. The subtle amber tint signals activity without a literal status dot.

### Named Rules
**The Tonal-First Rule.** Surfaces are flat at rest. Shadows appear only when an element genuinely floats above the content plane (popover, dialog, composer, tooltip).

## 5. Components

Components are precision instruments: consistent radius, clear interactive states, and no decorative flourishes. Every interactive element has default, hover, focus, active, and disabled treatments.

### Buttons
- **Shape:** `rounded-lg` (12px radius), height 36px by default (`h-9`).
- **Primary:** Ink background (`#171717`), white text, subtle shadow. Hover shifts to pure black (`#000000`). Focus shows a 2px ring at 35% opacity with 2px offset.
- **Outline:** White/card background, 1px Titanium Line border, ink text. Hover lightens the background to Warm Paper Hover and darkens the border toward Warm Graphite.
- **Ghost:** Transparent background, Warm Graphite text. Hover fills with Warm Paper Hover and shifts text to Ink.
- **Icon buttons:** Square 36px or 32px variants, ghost treatment by default.

### Chips / Badges
- **Shape:** Pill (`rounded-full`), 10px text, px-2 py-0.5.
- **Default:** Ink background, white text.
- **Secondary:** Warm Paper Hover background, Ink text.
- **Outline:** Transparent background, Titanium Line border, Warm Graphite text.
- **Success:** Green tint (`bg-green-600/10`, `text-green-700`, border `green-600/20`).
- **Destructive:** Red tint (`bg-red-600/10`, `text-red-700`, border `red-600/20`).

### Cards / Containers
- **Corner Style:** `rounded-2xl` (14px radius).
- **Background:** White in light mode, charcoal panel in dark mode.
- **Shadow Strategy:** Soft shadow by default.
- **Border:** 1px Titanium Line.
- **Internal Padding:** 20px (`p-5`).

### Inputs / Fields
- **Style:** `rounded-md` (10px radius), 1px Titanium Line border, transparent background, `px-3 py-1`, 14px text.
- **Focus:** Border shifts to Ring (`#73736e`) and a 3px ring at 50% opacity.
- **Error:** Border and ring shift to Signal Red.
- **Disabled:** Reduced opacity (`opacity-50`), `cursor-not-allowed`.

### Navigation
- **Sidebar:** Fixed on mobile (`z-200`), relative on desktop, Warm Paper/Charcoal Panel background, right border in Titanium Line. Slides out on narrow viewports with a dark overlay.
- **Top bar:** Canvas background, bottom border in Titanium Line, contains session controls, branch selector, stats, and theme toggle.
- **Resize handles:** 4px draggable borders between panels, no visible track until hover.

### Tooltip
- **Style:** `rounded-lg` (12px), Popover/White background, 1px Titanium Line ring, Soft shadow, `px-2.5 py-1.5`, 12px text.
- **Arrow:** Filled to match the popover background.

### Chat Composer (signature component)
- **Shape:** `rounded-[20px]` (20px radius), larger than standard components because it is the persistent input surface.
- **Style:** White/Card background, 1px Titanium Line border, Composer shadow. Running state switches border to amber at 40% opacity and uses Composer Active shadow.
- **Internal layout:** Image attachments, auto-resizing textarea, model/tool controls, and a status footer. The textarea itself is borderless and ringless; the container carries the focus state.

## 6. Do's and Don'ts

### Do:
- **Do** keep the canvas Warm Paper and panels White in light mode.
- **Do** use Ink/accent for primary actions, current selection, and primary text only.
- **Do** rely on tone and border for hierarchy before reaching for shadow.
- **Do** use the mono font for file paths, code snippets, and compact labels.
- **Do** support reduced motion and respect `prefers-color-scheme`.
- **Do** cap body prose at 65–75ch.

### Don't:
- **Don't** use chatty mascots, emoji overload, or bubbly rounded everything.
- **Don't** use gradient text, glassmorphism, or purple-blue gradients.
- **Don't** use neon accents or high-chroma "gamer" dark mode.
- **Don't** use shadows as the default state for every container.
- **Don't** use display fonts in UI labels or buttons.
- **Don't** use side-stripe borders greater than 1px as a colored accent.
- **Don't** animate layout properties; keep motion to color, opacity, transform, and shadow.
