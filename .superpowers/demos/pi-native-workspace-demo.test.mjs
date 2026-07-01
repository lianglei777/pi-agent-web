import { readFile } from "node:fs/promises";
import test from "node:test";
import assert from "node:assert/strict";

const demoUrl = new URL("./pi-native-workspace-demo.html", import.meta.url);

test("contains the approved Pi-native workspace visual contract", async () => {
  const html = await readFile(demoUrl, "utf8");

  for (const required of [
    "--canvas: #ebe7e4",
    "--canvas: #161d27",
    'class="workspace"',
    'class="sidebar"',
    'class="topbar"',
    'class="canvas-grid"',
    'class="reading-surface welcome"',
    'class="file-panel"',
    'class="composer"',
    'aria-label="Po Agent Web"',
    'data-action="theme"',
    'data-action="locale"',
  ]) {
    assert.ok(html.includes(required), `missing ${required}`);
  }

  assert.ok(!html.includes("backdrop-filter"));
  assert.ok(!html.includes("border-radius: 999px"));
});
