import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  fileURLToPath(new URL("./confirm-action-dialog.tsx", import.meta.url)),
  "utf8",
);

describe("ConfirmActionDialog visual contract", () => {
  it("renders a controlled Dialog with title, description, and two actions", () => {
    expect(source).toContain("export function ConfirmActionDialog");
    expect(source).toContain("<Dialog");
    expect(source).toContain("<DialogTitle>");
    expect(source).toContain("<DialogDescription>");
    expect(source).toContain("<DialogFooter");
  });

  it("calls onDismiss when the dialog requests close and onConfirm on confirm", () => {
    expect(source).toContain("if (!nextOpen) onDismiss()");
    expect(source).toContain("onClick={onConfirm}");
    expect(source).toContain("onClick={onDismiss}");
  });

  it("supports a destructive tone for cautious actions", () => {
    expect(source).toContain('tone?: "default" | "danger"');
    expect(source).toContain('tone === "danger" ? "destructive" : "default"');
  });
});
