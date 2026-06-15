export const DEFAULT_SIDEBAR_WIDTH = 260;
export const DEFAULT_FILE_PANEL_WIDTH = 480;
export const MIN_SIDEBAR_WIDTH = 200;
export const MAX_SIDEBAR_WIDTH = 420;
export const MIN_FILE_PANEL_WIDTH = 300;
export const MIN_CHAT_WIDTH = 360;

const RESIZE_HANDLE_WIDTH = 1;
const MIN_NARROW_CHAT_WIDTH = 140;

export type PanelWidths = {
  filePanel: number;
  sidebar: number;
};

type PanelVisibility = {
  filePanelOpen: boolean;
  sidebarOpen: boolean;
};

export type WidthBounds = {
  max: number;
  min: number;
};

function clamp(value: number, { max, min }: WidthBounds) {
  return Math.min(max, Math.max(min, value));
}

function availablePanelWidth(
  containerWidth: number,
  otherPanelWidth: number,
  visibleHandleCount: number,
) {
  const chatWidth = Math.min(
    MIN_CHAT_WIDTH,
    Math.max(
      MIN_NARROW_CHAT_WIDTH,
      containerWidth -
        MIN_SIDEBAR_WIDTH -
        MIN_FILE_PANEL_WIDTH -
        visibleHandleCount * RESIZE_HANDLE_WIDTH,
    ),
  );
  return Math.max(
    0,
    containerWidth -
      otherPanelWidth -
      chatWidth -
      visibleHandleCount * RESIZE_HANDLE_WIDTH,
  );
}

export function getSidebarWidthBounds(
  containerWidth: number,
  filePanelWidth: number,
  filePanelOpen: boolean,
): WidthBounds {
  const available = availablePanelWidth(
    containerWidth,
    filePanelOpen ? filePanelWidth : 0,
    filePanelOpen ? 2 : 1,
  );
  const max = Math.min(MAX_SIDEBAR_WIDTH, available);
  return {
    max,
    min: Math.min(MIN_SIDEBAR_WIDTH, max),
  };
}

export function getFilePanelWidthBounds(
  containerWidth: number,
  sidebarWidth: number,
  sidebarOpen: boolean,
): WidthBounds {
  const available = availablePanelWidth(
    containerWidth,
    sidebarOpen ? sidebarWidth : 0,
    sidebarOpen ? 2 : 1,
  );
  const max = Math.min(containerWidth * 0.6, available);
  return {
    max,
    min: Math.min(MIN_FILE_PANEL_WIDTH, max),
  };
}

export function fitPanelWidths(
  containerWidth: number,
  widths: PanelWidths,
  visibility: PanelVisibility,
): PanelWidths {
  let sidebar = visibility.sidebarOpen
    ? clamp(widths.sidebar, {
        max: MAX_SIDEBAR_WIDTH,
        min: MIN_SIDEBAR_WIDTH,
      })
    : widths.sidebar;
  const filePanelMax = containerWidth * 0.6;
  let filePanel = visibility.filePanelOpen
    ? clamp(widths.filePanel, {
        max: filePanelMax,
        min: Math.min(MIN_FILE_PANEL_WIDTH, filePanelMax),
      })
    : widths.filePanel;
  const visibleHandleCount =
    Number(visibility.sidebarOpen) + Number(visibility.filePanelOpen);
  const available = availablePanelWidth(
    containerWidth,
    0,
    visibleHandleCount,
  );
  let overflow =
    (visibility.sidebarOpen ? sidebar : 0) +
    (visibility.filePanelOpen ? filePanel : 0) -
    available;

  if (overflow > 0 && visibility.filePanelOpen) {
    const reduction = Math.min(
      overflow,
      Math.max(0, filePanel - MIN_FILE_PANEL_WIDTH),
    );
    filePanel -= reduction;
    overflow -= reduction;
  }
  if (overflow > 0 && visibility.sidebarOpen) {
    const reduction = Math.min(
      overflow,
      Math.max(0, sidebar - MIN_SIDEBAR_WIDTH),
    );
    sidebar -= reduction;
    overflow -= reduction;
  }
  if (overflow > 0 && visibility.filePanelOpen) {
    const reduction = Math.min(overflow, filePanel);
    filePanel -= reduction;
    overflow -= reduction;
  }
  if (overflow > 0 && visibility.sidebarOpen) {
    sidebar = Math.max(0, sidebar - overflow);
  }

  return { filePanel, sidebar };
}
