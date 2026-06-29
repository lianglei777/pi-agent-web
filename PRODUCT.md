# Product

## Register

product

## Users

Solo developers running Pi Agent locally through a desktop Web workspace to write, edit, and review code alongside an AI assistant. They are in a focused, screen-heavy workflow — often with an editor, terminal, and browser open at the same time — and need a reliable surface for managing projects and sessions, inspecting files when needed, and reviewing generated changes.

## Product Purpose

Po Agent Web is the local desktop Web interface for the Pi coding agent. It turns projects and agent sessions into a navigable, inspectable workspace: start a session, watch the agent's reasoning and tool calls, optionally open a file workspace, configure model providers and project skills, and resume or fork past sessions. The interface exists to keep the developer in control, not to entertain them.

## Brand Personality

Precise, calm, utilitarian.

Voice is quiet and confident. The UI gets out of the way so the user can focus on code and decisions. Every visual choice should feel intentional and load-bearing — no decoration for its own sake.

## References

Focused productivity tools: Linear, Vercel dashboard, Notion. The relevant quality is density without clutter — clear hierarchy, fast scanning, and a sense that the interface was built by people who use it themselves.

## Anti-references

- Overly friendly AI assistant UI: chatty mascots, emoji overload, bubbly rounded everything, anthropomorphic flourishes.
- SaaS landing-page clichés: big hero metrics, gradient text, glassmorphism, purple-blue gradients, animated explainers.
- Dark-mode gamer aesthetic: neon accents, high chroma, aggressive shadows, "cyber" styling.

## Design Principles

1. **Information density is a feature.** Project and session navigation stay visible, while Chat, configuration, and the optional File Workspace reveal only the context needed for the current task.
2. **Quiet surfaces, active states.** At rest the UI is neutral and flat; focus, hover, and selection provide the only accent.
3. **The agent is a tool, not a character.** No personality avatars, no confetti, no cheerleading copy.
4. **Respect system conventions.** Honor `prefers-color-scheme`, support reduced motion, and keep keyboard paths obvious.
5. **Monochrome first.** Color is used sparingly for status, errors, and selection. The palette should feel like a well-tuned code editor, not a brand campaign.
6. **Stable workflows over novelty.** Preserve Chat state and established operation paths while central workspace views change; configuration navigation must not interrupt a running conversation.
7. **Explicit destructive actions.** Important deletion, credential removal, and disconnect operations require confirmation with concrete action language.
8. **Dialogs close deliberately.** Dialogs remain open on backdrop clicks and Escape; users leave through visible close, cancel, save, or confirmation actions.

## Accessibility & Inclusion

- Target WCAG 2.1 AA for contrast and focus visibility.
- Keep keyboard navigation and visible focus states intact across panels, dialogs, and tooltips.
- Support reduced motion: disable or replace non-essential animations when `prefers-reduced-motion: reduce` is set.
- Never discard unsaved configuration changes without an explicit confirmation.
