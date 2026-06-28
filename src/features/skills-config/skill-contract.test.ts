import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const domainSource = readFileSync(
  fileURLToPath(new URL("../../server/domain/skill.ts", import.meta.url)),
  "utf8",
);
const providerSource = readFileSync(
  fileURLToPath(
    new URL("../../server/infrastructure/pi/pi-skill-provider.ts", import.meta.url),
  ),
  "utf8",
);
const clientTypesSource = readFileSync(
  fileURLToPath(new URL("./types.ts", import.meta.url)),
  "utf8",
);

describe("skills config response contract", () => {
  it("does not expose unused load or install fields", () => {
    expect(domainSource).not.toContain("homeDir: string");
    expect(domainSource).not.toContain("output?: string");
    expect(providerSource).not.toContain("homeDir: os.homedir()");
    expect(providerSource).not.toContain("output: cleanAnsi(");
    expect(clientTypesSource).not.toContain("homeDir: string");
    expect(clientTypesSource).not.toContain("output?: string");
  });
});
