# Session Sidebar Resize Polish Design

## Goal

Polish the in-progress resizable split between the session list and file
explorer so it remains compact, accessible, and stable as the sidebar height
changes.

## Scope

- Keep the current vertical resize capability.
- Keep the split state only for the lifetime of the mounted sidebar component.
- Preserve the adjusted height when switching projects or collapsing and
  reopening the file explorer.
- Restore the default 60/40 split after a page refresh.
- Do not add storage, dependencies, backend behavior, or API changes.

## Layout Behavior

The session region starts at approximately 60% of the available flexible
sidebar height. The session region and expanded file explorer each retain a
minimum usable height.

Whenever the available height changes, the current session-region height is
clamped to the latest valid range. This prevents the file explorer from being
compressed below its minimum and keeps the separator's ARIA value within its
reported bounds.

For exceptionally short containers where both desired minimums cannot fit, the
calculation must produce a valid, non-negative range without allowing an
inverted minimum and maximum.

## Visual Treatment

Use the selected “quiet default, explicit focus” treatment:

- Render one structural boundary between the two regions.
- Avoid stacking the resize-handle line with the file explorer header border.
- Keep the default boundary visually restrained.
- Strengthen the boundary on hover and while dragging.
- Show an unmistakable 2px focus-visible indicator without changing layout.
- Keep the existing enlarged pointer hit target.
- Restore modest top spacing around the project picker after removing the
  sidebar brand label.

## Accessibility

The shared resize handle continues to expose `role="separator"`, its current
value and bounds, and the correct ARIA orientation.

Horizontal handles use Left and Right arrow keys. Vertical handles use Up and
Down arrow keys. Home and End move to the minimum and maximum. All values are
clamped before being emitted.

Pointer cancellation, lost capture, unmounting, and normal pointer release must
restore body cursor and text-selection styles.

## Code Structure

Keep the shared axis-aware interaction behavior in
`src/components/ui/resize-handle.tsx`.

Extract the sidebar split-bound calculation into a small pure helper colocated
with the session sidebar feature. The component owns measurement and transient
state, while the helper owns initialization and clamping arithmetic. This keeps
resize behavior testable without introducing a browser DOM test dependency.

The file explorer remains controlled by `SessionSidebar` because its expanded
state affects the parent layout and determines whether the resize handle is
present.

## Testing

Add focused tests for the pure split calculation:

- Default 60% initialization.
- Clamping after the available height shrinks.
- Minimum and maximum boundary behavior.
- Extremely short container behavior.

Add a focused source-level contract test for the shared resize handle if needed
to cover axis-specific keyboard handling, ARIA orientation, and the
focus-visible styling without adding a DOM testing library.

Run:

```text
npm run check
npm run build
```

Existing failures outside the changed surface must be reported separately and
must not be silently attributed to this work.

## Non-goals

- Persisting the split in local storage or a server preference.
- Adding double-click reset, collapse-on-drag, or animated panel resizing.
- Refactoring unrelated sidebar, top-bar, or workspace behavior.
- Repairing unrelated visual-contract failures unless they are caused by these
  changes.
