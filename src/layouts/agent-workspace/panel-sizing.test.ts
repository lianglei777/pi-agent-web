import { describe, expect, it } from "vitest";
import {
  fitPanelWidths,
  getFilePanelWidthBounds,
  getSidebarWidthBounds,
} from "./panel-sizing";

describe("agent workspace panel sizing", () => {
  it("keeps the chat width available while both panels are open", () => {
    expect(getSidebarWidthBounds(1200, 480, true)).toEqual({
      min: 200,
      max: 358,
    });
    expect(getFilePanelWidthBounds(1200, 260, true)).toEqual({
      min: 300,
      max: 578,
    });
  });

  it("limits the file panel to sixty percent of the workspace", () => {
    expect(getFilePanelWidthBounds(1600, 260, true)).toEqual({
      min: 300,
      max: 960,
    });
  });

  it("shrinks visible panels when the workspace becomes narrow", () => {
    expect(
      fitPanelWidths(
        700,
        { filePanel: 480, sidebar: 260 },
        { filePanelOpen: true, sidebarOpen: true },
      ),
    ).toEqual({
      filePanel: 300,
      sidebar: 200,
    });
  });

  it("preserves the stored width of a closed panel", () => {
    expect(
      fitPanelWidths(
        900,
        { filePanel: 520, sidebar: 390 },
        { filePanelOpen: false, sidebarOpen: true },
      ),
    ).toEqual({
      filePanel: 520,
      sidebar: 390,
    });
  });
});
