<!-- BEGIN:nextjs-agent-rules -->
# Next.js: ALWAYS read docs before coding

Before any Next.js work, find and read the relevant guide in
`node_modules/next/dist/docs/`. The installed documentation is the source of
truth because this Next.js version may differ from training data.
<!-- END:nextjs-agent-rules -->

# Pi Agent Web Project Instructions

## Sources Of Truth

- Read the relevant implementation and tests before editing.
- Read `docs/architecture.md` before changing module boundaries or adding a
  backend capability.
- Treat `docs/agent-api-reference.md` as the public HTTP contract, and keep it
  synchronized with endpoint changes.
- Prefer installed package documentation and types over remembered APIs.

## Required Workflow

1. Inspect the owning module, its callers, its tests, and relevant docs.
2. Identify the correct architectural layer before writing code.
3. Make the smallest coherent change that fully solves the task.
4. Add or update focused tests for changed behavior.
5. Run `npm run check`.
6. For Next.js routing, rendering, configuration, or production behavior
   changes, also run `npm run build`.

Do not start broad refactors unless they are required for correctness or
explicitly requested.

## Server Architecture

The dependency direction is:

`domain <- ports <- application <- transport`

Infrastructure implements ports. Composition constructs concrete
implementations. Route Handlers expose transport to Next.js.

- `src/server/domain`: business data and errors; no framework or adapter code.
- `src/server/ports`: interfaces owned by the application boundary.
- `src/server/application`: use cases depending only on domain and ports.
- `src/server/infrastructure`: Node.js and Pi SDK adapters implementing ports.
- `src/server/transport`: HTTP validation, response mapping, and SSE mechanics.
- `src/server/composition`: the only production composition root.
- `src/app/api`: thin Route Handlers that parse, delegate, and return.

The ESLint configuration enforces the most important import boundaries. Do not
bypass it with relative paths, re-exports, lint disables, or duplicated types.

## Backend Rules

- Validate untrusted input at the transport boundary.
- Represent expected operational failures with `AppError`.
- Keep Pi SDK and other vendor types inside infrastructure adapters.
- Add or extend a port before application code uses a new external capability.
- Do not construct infrastructure implementations inside application services.
- Keep Route Handlers free of business logic.
- Preserve SSE heartbeat, cleanup, cancellation, and disconnect behavior.
- Do not change public response shapes or error codes silently.
- Keep filesystem access inside registered workspace roots.

## Frontend Rules

- Use Server Components by default.
- Add `"use client"` only for state, effects, event handlers, custom hooks, or
  browser APIs, and keep the client boundary narrow.
- Never import `src/server` modules into UI code.
- Reuse primitives in `src/components/ui` before creating new primitives.
- Keep feature-specific components, hooks, constants, and types together.
- Do not duplicate API contracts in multiple components; create a shared
  client-side contract when integration work requires one.
- Split files by responsibility when a component or hook owns multiple
  independent workflows. File length alone is not a reason to split.
- Preserve keyboard access, visible focus, labels, and semantic HTML.

## Change Discipline

- Preserve unrelated user changes in the worktree.
- Do not edit generated files such as `next-env.d.ts`.
- Do not add a dependency without a concrete need and codebase-level benefit.
- Do not weaken TypeScript, ESLint, tests, or build settings to make a change
  pass.
- Avoid `any`, `@ts-ignore`, and lint disables. If unavoidable, keep the scope
  narrow and explain the reason in code.
- Use existing naming, import aliases, response helpers, validators, and test
  patterns.
- Add abstractions only when they enforce a boundary, remove meaningful
  duplication, or isolate external behavior.

## Testing Expectations

- Domain and application behavior: focused unit tests.
- Infrastructure adapters: tests around mapping, persistence, process, and
  failure behavior.
- HTTP validators and error mapping: transport tests.
- SSE changes: lifecycle and cleanup tests.
- UI interaction changes: component tests when available; otherwise verify the
  affected workflow in the browser.
- Bug fixes should include a regression test when practical.

## Completion

A task is complete only when the relevant behavior is implemented, docs are
updated when contracts or boundaries changed, and these checks pass:

```bash
npm run check
```

Run `npm run build` as well when the change can affect Next.js production
compilation or runtime behavior.
