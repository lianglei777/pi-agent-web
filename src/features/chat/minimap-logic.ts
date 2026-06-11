export function minimapViewport(
  scrollTop: number,
  scrollHeight: number,
  clientHeight: number,
) {
  if (scrollHeight <= 0) {
    return { visible: false, top: 0, height: 1 };
  }
  return {
    visible: scrollHeight - clientHeight > 20,
    top: Math.max(0, Math.min(1, scrollTop / scrollHeight)),
    height: Math.max(0, Math.min(1, clientHeight / scrollHeight)),
  };
}

export function minimapSeek(
  pointerY: number,
  trackTop: number,
  trackHeight: number,
  scrollHeight: number,
) {
  if (trackHeight <= 0) return 0;
  const ratio = Math.max(0, Math.min(1, (pointerY - trackTop) / trackHeight));
  return ratio * scrollHeight;
}
