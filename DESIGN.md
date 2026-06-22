---
name: Po Agent Web
description: A precise, calm developer workspace built from independently tuned cool-light and charcoal-dark themes, restrained accent color, and linear structure.
colors:
  light:
    canvas: "#f1f3f2"
    panel: "#f8f9f8"
    elevated: "#fbfcfb"
    subtle: "#edf0ee"
    hover: "#e8ece9"
    selected: "#e2e9e5"
    text: "#151816"
    muted: "#53605b"
    dim: "#76817c"
    borderSubtle: "#d8ddda"
    borderStrong: "#aab3ae"
    borderEmphasis: "#17624b"
    accent: "#17624b"
    accentForeground: "#ffffff"
    destructive: "#a63f38"
    success: "#346b4d"
    warning: "#815b18"
  dark:
    canvas: "#121514"
    panel: "#181b1a"
    elevated: "#1f2421"
    subtle: "#242a27"
    hover: "#29302c"
    selected: "#26312c"
    text: "#eef1ed"
    muted: "#a8b0aa"
    dim: "#747d77"
    borderSubtle: "#2d332f"
    borderStrong: "#57625c"
    borderEmphasis: "#8bc7b0"
    accent: "#8bc7b0"
    accentForeground: "#102019"
    destructive: "#e07a73"
    success: "#78b28f"
    warning: "#d2a65a"
typography:
  display: "Noto Serif SC, Playfair Display, Georgia, serif"
  ui: "Inter, ui-sans-serif, system-ui, sans-serif"
  mono: "Noto Sans Mono, JetBrains Mono, Fira Code, Consolas, monospace"
radius:
  small: "4px"
  control: "6px"
  floating: "8px"
motion:
  fast: "150ms"
  standard: "200ms"
  slow: "220ms"
---

# Design System: Po Agent Web

## Direction

The interface is a focused developer tool, not a marketing surface. Preserve its dense three-panel workspace and established workflows. The light theme is Adaptive Workbench: cool neutral surfaces with a restrained pine-green focus color. The dark theme is Deep Focus: charcoal surfaces with a mint focus color. The themes share semantic roles but are tuned independently rather than mechanically inverted.

## Token architecture

The dependency direction is:

`base values → semantic tokens → shared UI components → feature surfaces`

Feature components must consume semantic tokens or shared primitives. Do not introduce one-off colors, radii, shadows, or transition durations.

## Typography

- Use Playfair Display for Latin display text and Noto Serif SC for Chinese display text.
- Display serif is limited to the welcome title, current session title, and major Dialog titles.
- UI labels, controls, forms, lists, chat content, and navigation remain sans-serif.
- Paths, code, compact metadata, and technical values use the mono stack.
- Display titles use weight 600 and letter spacing no tighter than `-0.03em`.
- Body prose should generally remain within 65–75 characters per line.

## Linear structure

Use three boundary roles:

1. `border-subtle` for internal dividers, rows, form groups, and message details.
2. `border-strong` for primary panels, toolbars, composer boundaries, and selected structure.
3. A complete `border-strong` frame plus `shadow-floating` for Dialogs, Dropdowns, Select content, Tooltips, and Popovers.

Do not use thick colored side stripes, repeated heavy rules, decorative grids, noise, or textured backgrounds.

## Shape and elevation

- Small icon controls: 4px.
- Buttons, inputs, textareas, and inline controls: 6px.
- Dialogs and floating surfaces: 8px.
- Pills and circles are reserved for badges, status dots, and switch tracks.
- Ordinary panels, cards, lists, messages, and the Composer are shadowless.
- Only genuine floating surfaces use `0 2px 8px` low-opacity shadows.

## Component states

Every interactive component must account for default, hover, focus-visible, active, selected, disabled, loading, and error states.

- Hover changes tone, not geometry.
- Focus-visible uses a clear 2px semantic focus ring.
- Selected state combines background, text weight, and boundary.
- Disabled state blocks interaction and uses disabled surface/text tokens.
- Loading prevents duplicate submission and keeps labels understandable.
- Error, success, and warning use semantic color plus text, icon, border, or shape.

## Color usage

Neutral first. Accent color is reserved for primary actions, focus, selection, and live agent state; it is never decorative.

## Dialog safety

- Backdrop clicks never close Dialogs.
- Escape never closes Dialogs.
- A visible close, cancel, save, or confirmation action is always available.
- Unsaved model configuration requires a discard confirmation.
- The safe action receives default focus in destructive confirmations.
- Provider deletion, model removal, API key removal, and OAuth disconnect require confirmation.
- Session deletion remains the existing inline confirmation.
- Dangerous buttons use specific verbs rather than a generic “Confirm”.

## Motion

- State transitions use 150–220ms.
- Animate color, opacity, transform, and short shadows only when they communicate state.
- Avoid decorative page entrances, background motion, particles, magnetic effects, and cursor trails.
- `prefers-reduced-motion: reduce` changes non-essential animation to near-instant transitions.
- ReactBits is not part of this implementation and requires a separate proposal.

## Do

- Preserve light/dark theme behavior and tune both themes independently.
- Prefer semantic tokens and shared primitives.
- Keep focus visible, keyboard paths intact, and labels accessible.
- Use semantic colors only for state.
- Verify desktop, medium, and mobile widths in both languages.

## Do not

- Do not use gradients, glassmorphism, neon, decorative textures, or marketing-page patterns.
- Do not apply serif type to buttons, navigation, forms, lists, or long chat content.
- Do not use 12–32px card radii or wide soft shadows.
- Do not create cards for every piece of information.
- Do not silently change business logic, API contracts, or operation paths.
