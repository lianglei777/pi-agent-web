import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const chatCenter = readFileSync(
  fileURLToPath(new URL("./chat-center.tsx", import.meta.url)),
  "utf8",
);
const en = readFileSync(
  fileURLToPath(new URL("../../i18n/dictionaries/en.ts", import.meta.url)),
  "utf8",
);
const zh = readFileSync(
  fileURLToPath(new URL("../../i18n/dictionaries/zh.ts", import.meta.url)),
  "utf8",
);

describe("chat welcome entry", () => {
  it("shows a description and four fill-only starter actions", () => {
    expect(chatCenter).toContain("t.chat.welcome.description");
    expect(chatCenter).toContain("starterPrompts.map");
    expect(chatCenter).toContain("onSelectPrompt(prompt)");
    expect(chatCenter).not.toContain("submit(prompt)");
    expect(chatCenter).not.toContain("{/* <p");
    expect(chatCenter).not.toContain("</div> */}");
  });

  it("keeps welcome copy synchronized in English and Chinese", () => {
    for (const source of [en, zh]) {
      expect(source).toContain("architecture:");
      expect(source).toContain("fixBug:");
      expect(source).toContain("addTest:");
      expect(source).toContain("reviewChanges:");
      expect(source).toContain("description:");
    }
  });
});
