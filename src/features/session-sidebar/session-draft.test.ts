import { describe, expect, it } from "vitest";
import { createDraftSession } from "./session-draft";
import { buildSessionTree, getSessionTitle } from "./session-utils";

describe("createDraftSession", () => {
  it("creates a selectable local session item for a new-session draft", () => {
    const draft = createDraftSession({
      cwd: "C:\\work",
      label: "New session",
      now: "2026-06-17T00:00:00.000Z",
      temporaryId: "draft-1",
    });

    expect(draft).toMatchObject({
      id: "draft-1",
      cwd: "C:\\work",
      name: "New session",
      firstMessage: "",
      messageCount: 0,
      draft: true,
    });
    expect(getSessionTitle(draft)).toBe("New session");
  });

  it("appears as the newest root item in the session tree", () => {
    const draft = createDraftSession({
      cwd: "C:\\work",
      label: "New session",
      now: "2026-06-17T00:00:00.000Z",
      temporaryId: "draft-1",
    });
    const tree = buildSessionTree([
      {
        id: "older",
        path: "older.json",
        cwd: "C:\\work",
        created: "2026-06-16T00:00:00.000Z",
        modified: "2026-06-16T00:00:00.000Z",
        messageCount: 1,
        firstMessage: "Older",
      },
      draft,
    ]);

    expect(tree[0]?.session.id).toBe("draft-1");
  });
});
