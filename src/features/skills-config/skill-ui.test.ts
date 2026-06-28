import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const detailSource = readFileSync(
  fileURLToPath(new URL("./skill-detail.tsx", import.meta.url)),
  "utf8",
);
const listSource = readFileSync(
  fileURLToPath(new URL("./skill-list.tsx", import.meta.url)),
  "utf8",
);
const hookSource = readFileSync(
  fileURLToPath(new URL("./use-skills-config.ts", import.meta.url)),
  "utf8",
);
const dialogSource = readFileSync(
  fileURLToPath(new URL("./skills-config-dialog.tsx", import.meta.url)),
  "utf8",
);

describe("skills config UI contract", () => {
  it("describes model invocation instead of whole-skill enablement", () => {
    expect(listSource).toContain("t.skills.modelInvocationAllowed");
    expect(listSource).toContain("t.skills.manualInvocationOnly");
    expect(listSource).not.toContain("CircleSlash2");
  });

  it("keeps the switch thumb positioned and explains read-only state", () => {
    expect(detailSource).toContain("left-0.5");
    expect(detailSource).toContain("<Tooltip>");
    expect(detailSource).toContain("t.skills.readOnlySymlink");
  });

  it("clears an interrupted save when refreshing", () => {
    const refreshStart = hookSource.indexOf("const refresh");
    const refreshEnd = hookSource.indexOf("useEffect", refreshStart);
    expect(hookSource.slice(refreshStart, refreshEnd)).toContain(
      "setSavingSkillId(null)",
    );
  });

  it("clears an interrupted refresh when saving", () => {
    const toggleStart = hookSource.indexOf("const toggleModelInvocation");
    const toggleEnd = hookSource.indexOf("return {", toggleStart);
    expect(hookSource.slice(toggleStart, toggleEnd)).toContain(
      "setLoading(false)",
    );
  });

  it("selects the installed skill and returns to its details", () => {
    expect(dialogSource).toContain("result.skills[0]?.skillId");
    expect(dialogSource).toContain("skills.setSelectedSkillId");
    expect(dialogSource).toContain("setAdding(false)");
    expect(dialogSource).toContain("skills.refresh()");
  });

  it("labels every diagnostic severity with semantic color", () => {
    expect(dialogSource).toContain(
      "t.skills.diagnosticSeverity[diagnostic.severity]",
    );
    expect(dialogSource).toContain('"text-warning"');
    expect(dialogSource).toContain('"text-destructive"');
    expect(dialogSource).toContain('"text-primary"');
  });
});
