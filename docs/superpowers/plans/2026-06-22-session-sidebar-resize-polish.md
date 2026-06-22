# Session Sidebar Resize Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the session/file-explorer split stable under sidebar resizing, visually quiet by default, clearly keyboard-focusable, and transient for the current page lifetime only.

**Architecture:** Add a small pure layout module that calculates valid split bounds and clamps the current height. `SessionSidebar` continues to own measurement, open state, and transient height; the shared `ResizeHandle` continues to own pointer and keyboard interaction. Visual changes stay in the existing UI and feature components.

**Tech Stack:** Next.js 16.2.1, React 19, TypeScript, Tailwind CSS 4, Vitest.

---

## File Map

- Create `src/features/session-sidebar/session-panel-layout.ts`: pure constants and functions for split bounds, initialization, and clamping.
- Create `src/features/session-sidebar/session-panel-layout.test.ts`: unit tests for normal, shrinking, boundary, and short-container behavior.
- Modify `src/features/session-sidebar/session-sidebar.tsx`: use the pure layout functions inside `ResizeObserver` and keep the transient split state stable across project changes and explorer collapse.
- Modify `src/components/ui/resize-handle.tsx`: apply the selected quiet-default/explicit-focus treatment while preserving axis-aware interaction.
- Modify `src/components/ui/ui-visual-contract.test.ts`: assert the shared resize handle retains its enlarged hit target and explicit focus-visible treatment.
- Modify `src/features/session-sidebar/file-explorer.tsx`: make the header own its top border only while collapsed, preventing a double boundary when expanded.
- Modify `src/features/session-sidebar/cwd-picker.tsx`: restore modest top and bottom spacing around the project picker.
- Keep `src/i18n/dictionaries/en.ts` and `src/i18n/dictionaries/zh.ts`: retain the already-added localized separator label.

### Task 1: Add Tested Split Layout Arithmetic

**Files:**
- Create: `src/features/session-sidebar/session-panel-layout.test.ts`
- Create: `src/features/session-sidebar/session-panel-layout.ts`

- [ ] **Step 1: Write the failing split-layout tests**

Create `src/features/session-sidebar/session-panel-layout.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  getSessionPanelBounds,
  resolveSessionPanelHeight,
} from "./session-panel-layout";

describe("session panel layout", () => {
  it("initializes the session panel to 60 percent within valid bounds", () => {
    expect(resolveSessionPanelHeight(null, 500)).toBe(300);
  });

  it("clamps an existing height when the available region shrinks", () => {
    expect(resolveSessionPanelHeight(360, 400)).toBe(279);
  });

  it("clamps values to the normal minimum and maximum", () => {
    expect(resolveSessionPanelHeight(20, 500)).toBe(80);
    expect(resolveSessionPanelHeight(450, 500)).toBe(379);
  });

  it("keeps bounds valid for an exceptionally short container", () => {
    expect(getSessionPanelBounds(100)).toEqual({ min: 0, max: 0 });
    expect(resolveSessionPanelHeight(null, 100)).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
npx vitest run src/features/session-sidebar/session-panel-layout.test.ts
```

Expected: FAIL because `./session-panel-layout` does not exist.

- [ ] **Step 3: Implement the minimal pure layout module**

Create `src/features/session-sidebar/session-panel-layout.ts`:

```ts
export const SESSION_PANEL_MIN = 80;
export const FILE_EXPLORER_MIN = 120;
export const SPLIT_HANDLE_SIZE = 1;
const DEFAULT_SESSION_PANEL_RATIO = 0.6;

export function getSessionPanelBounds(regionHeight: number) {
  const max = Math.max(
    0,
    regionHeight - FILE_EXPLORER_MIN - SPLIT_HANDLE_SIZE,
  );
  return {
    min: Math.min(SESSION_PANEL_MIN, max),
    max,
  };
}

export function resolveSessionPanelHeight(
  currentHeight: number | null,
  regionHeight: number,
) {
  const bounds = getSessionPanelBounds(regionHeight);
  const preferredHeight =
    currentHeight ?? Math.round(regionHeight * DEFAULT_SESSION_PANEL_RATIO);
  return Math.min(bounds.max, Math.max(bounds.min, preferredHeight));
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```powershell
npx vitest run src/features/session-sidebar/session-panel-layout.test.ts
```

Expected: 4 tests PASS.

- [ ] **Step 5: Commit the layout arithmetic**

```powershell
git add -- src/features/session-sidebar/session-panel-layout.ts src/features/session-sidebar/session-panel-layout.test.ts
git commit -m "test: define session sidebar split bounds"
```

### Task 2: Clamp the Live Split During Container Resizes

**Files:**
- Modify: `src/features/session-sidebar/session-sidebar.tsx`
- Modify: `src/i18n/dictionaries/en.ts`
- Modify: `src/i18n/dictionaries/zh.ts`

- [ ] **Step 1: Add a source contract test for transient state ownership**

Extend the import section at the top of
`src/features/session-sidebar/session-panel-layout.test.ts` with:

```ts
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
```

Then append:

```ts
const sidebarSource = readFileSync(
  fileURLToPath(new URL("./session-sidebar.tsx", import.meta.url)),
  "utf8",
);

it("keeps the split transient and clamps it from ResizeObserver measurements", () => {
  expect(sidebarSource).toContain("new ResizeObserver(sync)");
  expect(sidebarSource).toContain(
    "resolveSessionPanelHeight(current, height)",
  );
  expect(sidebarSource).not.toContain("localStorage");
  expect(sidebarSource).not.toContain("sessionStorage");
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
npx vitest run src/features/session-sidebar/session-panel-layout.test.ts
```

Expected: the new source contract FAILS because `SessionSidebar` still initializes only once and does not call `resolveSessionPanelHeight`.

- [ ] **Step 3: Replace component-local arithmetic with the tested helper**

In `src/features/session-sidebar/session-sidebar.tsx`:

1. Remove the local `SESSION_PANEL_MIN` and `FILE_EXPLORER_MIN` constants.
2. Add:

```ts
import {
  getSessionPanelBounds,
  resolveSessionPanelHeight,
} from "./session-panel-layout";
```

3. Replace the `sync` callback with:

```ts
const sync = () => {
  const height = el.clientHeight;
  setFlexRegionHeight(height);
  setSessionPanelHeight((current) =>
    resolveSessionPanelHeight(current, height),
  );
};
```

4. Replace the `sessionBounds` calculation with:

```ts
const sessionBounds = useMemo(
  () => getSessionPanelBounds(flexRegionHeight),
  [flexRegionHeight],
);
```

5. Keep `fileExplorerOpen` and `sessionPanelHeight` in `SessionSidebar`; do not reset either value when `selectedCwd` changes.
6. Keep the existing localized `resizeExplorer` entries in both dictionaries.

- [ ] **Step 4: Run focused tests and type checking**

Run:

```powershell
npx vitest run src/features/session-sidebar/session-panel-layout.test.ts
npm run typecheck
```

Expected: focused tests PASS and TypeScript exits with code 0.

- [ ] **Step 5: Commit the live clamping behavior**

```powershell
git add -- src/features/session-sidebar/session-sidebar.tsx src/features/session-sidebar/session-panel-layout.test.ts src/i18n/dictionaries/en.ts src/i18n/dictionaries/zh.ts
git commit -m "fix: clamp session sidebar split on resize"
```

### Task 3: Apply the Quiet Resize-Handle Focus Treatment

**Files:**
- Modify: `src/components/ui/ui-visual-contract.test.ts`
- Modify: `src/components/ui/resize-handle.tsx`

- [ ] **Step 1: Write failing visual contract assertions**

Append to `src/components/ui/ui-visual-contract.test.ts`:

```ts
test("keeps resize handles quiet by default and explicit on focus", () => {
  const resizeHandle = read("resize-handle");
  expect(resizeHandle).toContain("before:h-[9px]");
  expect(resizeHandle).toContain("before:w-[9px]");
  expect(resizeHandle).toContain("focus-visible:ring-2");
  expect(resizeHandle).toContain("focus-visible:ring-ring");
  expect(resizeHandle).toContain("data-[dragging=true]:bg-line-emphasis");
});
```

- [ ] **Step 2: Run the visual contract test and verify RED**

Run:

```powershell
npx vitest run src/components/ui/ui-visual-contract.test.ts
```

Expected: FAIL because the resize handle does not yet provide a 2px ring or a dragging-state class.

- [ ] **Step 3: Implement the selected B visual treatment**

In `src/components/ui/resize-handle.tsx`, keep the current axis, pointer, ARIA,
and keyboard behavior. Replace the axis-specific class strings with:

```ts
isVertical
  ? "group relative z-20 h-px w-full flex-none cursor-row-resize bg-line-strong outline-none ring-offset-background before:absolute before:inset-x-0 before:-top-1 before:h-[9px] hover:bg-line-emphasis focus-visible:bg-line-emphasis focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 data-[dragging=true]:bg-line-emphasis"
  : "group relative z-20 hidden w-px flex-none cursor-col-resize bg-line-strong outline-none ring-offset-background before:absolute before:inset-y-0 before:-left-1 before:w-[9px] hover:bg-line-emphasis focus-visible:bg-line-emphasis focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 data-[dragging=true]:bg-line-emphasis min-[641px]:block"
```

Do not add a visible grip, wider resting track, animation, or layout-changing
border.

- [ ] **Step 4: Run the focused contract and type checking**

Run:

```powershell
npx vitest run src/components/ui/ui-visual-contract.test.ts
npm run typecheck
```

Expected: visual contract PASS and TypeScript exits with code 0.

- [ ] **Step 5: Commit the shared handle polish**

```powershell
git add -- src/components/ui/resize-handle.tsx src/components/ui/ui-visual-contract.test.ts
git commit -m "style: clarify resize handle focus state"
```

### Task 4: Remove the Double Boundary and Restore Picker Spacing

**Files:**
- Modify: `src/features/session-sidebar/file-explorer.tsx`
- Modify: `src/features/session-sidebar/cwd-picker.tsx`
- Modify: `src/features/session-sidebar/session-panel-layout.test.ts`

- [ ] **Step 1: Add failing source contracts for the feature styling**

Append to `src/features/session-sidebar/session-panel-layout.test.ts`:

```ts
const fileExplorerSource = readFileSync(
  fileURLToPath(new URL("./file-explorer.tsx", import.meta.url)),
  "utf8",
);
const cwdPickerSource = readFileSync(
  fileURLToPath(new URL("./cwd-picker.tsx", import.meta.url)),
  "utf8",
);

it("uses one expanded split boundary and keeps project-picker spacing", () => {
  expect(fileExplorerSource).toContain(
    '${open ? "" : "border-t border-line-strong"}',
  );
  expect(cwdPickerSource).toContain('className="relative mx-2.5 my-2"');
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
npx vitest run src/features/session-sidebar/session-panel-layout.test.ts
```

Expected: FAIL because the file explorer always renders a top border and the picker has no vertical margin.

- [ ] **Step 3: Make the explorer border conditional**

In `src/features/session-sidebar/file-explorer.tsx`, replace the header class
with:

```tsx
<div
  className={`flex h-8 flex-none items-center px-2 ${
    open ? "" : "border-t border-line-strong"
  }`}
>
```

When expanded, the resize handle is the sole structural boundary. When
collapsed, the explorer header supplies its own top boundary because the handle
is absent.

- [ ] **Step 4: Restore compact project-picker breathing room**

In `src/features/session-sidebar/cwd-picker.tsx`, use:

```tsx
<div className="relative mx-2.5 my-2" ref={rootRef}>
```

Keep the current default-height outline button; do not restore the removed
sidebar brand label.

- [ ] **Step 5: Run focused tests and type checking**

Run:

```powershell
npx vitest run src/features/session-sidebar/session-panel-layout.test.ts
npm run typecheck
```

Expected: focused tests PASS and TypeScript exits with code 0.

- [ ] **Step 6: Commit the feature-level polish**

```powershell
git add -- src/features/session-sidebar/file-explorer.tsx src/features/session-sidebar/cwd-picker.tsx src/features/session-sidebar/session-panel-layout.test.ts
git commit -m "style: polish session sidebar split layout"
```

### Task 5: Verify the Complete Change

**Files:**
- Review only; do not broaden scope unless verification exposes a regression caused by this work.

- [ ] **Step 1: Review the final diff for scope and accidental storage**

Run:

```powershell
git diff f027cbb -- src/components/ui/resize-handle.tsx src/components/ui/ui-visual-contract.test.ts src/features/session-sidebar/cwd-picker.tsx src/features/session-sidebar/file-explorer.tsx src/features/session-sidebar/session-panel-layout.ts src/features/session-sidebar/session-panel-layout.test.ts src/features/session-sidebar/session-sidebar.tsx src/i18n/dictionaries/en.ts src/i18n/dictionaries/zh.ts
rg -n "localStorage|sessionStorage" src/features/session-sidebar src/components/ui/resize-handle.tsx
```

Expected: only the planned UI and test changes appear; the storage search returns no split-persistence code.

- [ ] **Step 2: Run the complete required check**

Run:

```powershell
npm run check
```

Expected: lint has no errors, typecheck passes, and all tests related to this
change pass. If the two pre-existing `src/app/visual-foundation.test.ts`
assertions still fail against `workspace-top-bar.tsx`, record them separately
and do not modify unrelated top-bar code.

- [ ] **Step 3: Run the production build**

Run:

```powershell
npm run build
```

Expected: Next.js production build exits with code 0.

- [ ] **Step 4: Perform browser verification when the in-app browser is available**

Open the local development app and verify:

1. The sidebar begins near a 60/40 session/file split.
2. Dragging vertically adjusts both regions.
3. Up, Down, Home, and End work while the horizontal separator is focused.
4. Focus shows a clear 2px indicator.
5. Collapsing and reopening the explorer preserves the adjusted split.
6. Switching projects preserves the adjusted split.
7. Shrinking the viewport keeps both ARIA bounds and the visible split valid.
8. The expanded explorer has one boundary line; the collapsed explorer header
   still has a top boundary.
9. Light and dark themes remain visually restrained.

If the in-app browser is unavailable, report that manual visual verification
remains outstanding.

- [ ] **Step 5: Commit any verification-only corrections caused by this work**

Only if Tasks 1-4 require a scoped correction:

```powershell
git add -- src/components/ui/resize-handle.tsx src/components/ui/ui-visual-contract.test.ts src/features/session-sidebar/cwd-picker.tsx src/features/session-sidebar/file-explorer.tsx src/features/session-sidebar/session-panel-layout.ts src/features/session-sidebar/session-panel-layout.test.ts src/features/session-sidebar/session-sidebar.tsx src/i18n/dictionaries/en.ts src/i18n/dictionaries/zh.ts
git commit -m "fix: address session sidebar resize verification"
```

Do not commit unrelated workspace changes or repair the existing top-bar visual
contract as part of this plan.
