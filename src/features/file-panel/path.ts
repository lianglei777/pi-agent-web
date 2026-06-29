export function joinPath(parent: string, name: string) {
  const separator = parent.includes("\\") ? "\\" : "/";
  return `${parent.replace(/[\\/]+$/, "")}${separator}${name}`;
}

export function relativePath(root: string, target: string) {
  const rootParts = root.split(/[\\/]+/).filter(Boolean);
  const targetParts = target.split(/[\\/]+/).filter(Boolean);
  let index = 0;
  while (
    index < rootParts.length &&
    rootParts[index]?.toLowerCase() === targetParts[index]?.toLowerCase()
  ) {
    index += 1;
  }
  return targetParts.slice(index).join("/");
}
