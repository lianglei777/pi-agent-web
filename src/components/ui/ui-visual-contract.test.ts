import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const read = (name: string) =>
  readFileSync(`${root}/src/components/ui/${name}.tsx`, "utf8");

describe("shared UI visual contract", () => {
  test("keeps controls within the approved radius scale", () => {
    for (const name of ["button", "input", "textarea", "select", "dialog"]) {
      expect(read(name)).not.toMatch(/rounded-(xl|2xl|3xl)|rounded-\[20px\]/);
    }
  });

  test("reserves shadows for floating surfaces", () => {
    expect(read("card")).not.toContain("shadow-[var(--shadow");
    expect(read("dialog")).toContain("shadow-[var(--shadow-floating)]");
    expect(read("tooltip")).toContain("shadow-[var(--shadow-floating)]");
    expect(read("select")).toContain("shadow-[var(--shadow-floating)]");
  });

  test("uses shared motion tokens for interactive controls", () => {
    expect(read("button")).toContain("duration-[var(--motion-fast)]");
    expect(read("accordion")).toContain("duration-[var(--motion-standard)]");
  });

  test("keeps resize handles quiet by default and explicit on focus", () => {
    const resizeHandle = read("resize-handle");
    expect(resizeHandle).toContain("before:h-[9px]");
    expect(resizeHandle).toContain("before:w-[9px]");
    expect(resizeHandle).toContain("focus-visible:ring-2");
    expect(resizeHandle).toContain("focus-visible:ring-ring");
    expect(resizeHandle).toContain(
      "data-[dragging=true]:bg-line-emphasis",
    );
  });

  test("uses semantic accent and readable state tokens", () => {
    const button = read("button");
    const input = read("input");
    const textarea = read("textarea");
    const select = read("select");

    expect(button).toContain("focus-visible:ring-ring/40");
    expect(button).toContain("active:translate-y-px");
    expect(button).toContain("disabled:border-transparent");
    expect(input).toContain("hover:border-line-strong");
    expect(input).toContain("placeholder:text-muted");
    expect(textarea).toContain("hover:border-line-strong");
    expect(textarea).toContain("placeholder:text-muted");
    expect(select).toContain("focus-visible:ring-ring/40");
  });
});
