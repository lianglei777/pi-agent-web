# Product

## Register

product

## Users

Solo developers running Pi Agent locally to write, edit, and review code alongside an AI assistant. They are in a focused, screen-heavy workflow — often with an editor, terminal, and browser open at the same time — and need a reliable surface for managing agent sessions, inspecting files, and reviewing generated changes.

## Product Purpose

Pi Agent Web is the local web interface for the Pi coding agent. It turns agent sessions into a navigable, inspectable workspace: start a session, watch the agent's reasoning and tool calls, browse and open files, switch models and skills, and resume or fork past sessions. The interface exists to keep the developer in control, not to entertain them.

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

1. **Information density is a feature.** The workspace should show sessions, chat, files, and context without feeling cramped, because the user is here to get work done.
2. **Quiet surfaces, active states.** At rest the UI is neutral and flat; focus, hover, and selection provide the only accent.
3. **The agent is a tool, not a character.** No personality avatars, no confetti, no cheerleading copy.
4. **Respect system conventions.** Honor `prefers-color-scheme`, support reduced motion, and keep keyboard paths obvious.
5. **Monochrome first.** Color is used sparingly for status, errors, and selection. The palette should feel like a well-tuned code editor, not a brand campaign.

## Accessibility & Inclusion

- Target WCAG 2.1 AA for contrast and focus visibility.
- Keep keyboard navigation and visible focus states intact across panels, dialogs, and tooltips.
- Support reduced motion: disable or replace non-essential animations when `prefers-reduced-motion: reduce` is set.
