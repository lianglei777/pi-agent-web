import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const root = fileURLToPath(new URL("../../", import.meta.url));
const css = readFileSync(`${root}/src/app/globals.css`, "utf8");
const layout = readFileSync(`${root}/src/app/layout.tsx`, "utf8");

describe("visual foundation contract", () => {
  test("defines the approved light and dark semantic tokens", () => {
    expect(css).toContain("--bg: #f5f5f4");
    expect(css).toContain("--bg-panel: #ffffff");
    expect(css).toContain("--border-subtle: #d6d6d2");
    expect(css).toContain("--border-strong: #8a8a84");
    expect(css).toContain("--bg: #111111");
    expect(css).toContain("--bg-panel: #181818");
    expect(css).toContain("--border-strong: #5b5b58");
  });

  test("registers approved display fonts without replacing the UI font", () => {
    expect(layout).toContain("Playfair_Display");
    expect(layout).toContain("Noto_Serif_SC");
    expect(layout).toContain("--font-display-latin");
    expect(layout).toContain("--font-display-cjk");
    expect(css).toContain("--font-display:");
  });

  test("defines reduced-motion fallback and shared motion durations", () => {
    expect(css).toContain("--motion-fast: 150ms");
    expect(css).toContain("--motion-standard: 200ms");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("animation-duration: 0.01ms");
  });
});
