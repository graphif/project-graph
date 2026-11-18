export function findFirstImageInChildren<T>(
  children: T[],
  isImage: (node: T) => boolean,
  getChildren: (node: T) => T[] | undefined,
): T | undefined {
  for (const child of children) {
    if (isImage(child)) return child;
    const sub = getChildren(child);
    if (sub) {
      const found = findFirstImageInChildren(sub, isImage, getChildren);
      if (found) return found;
    }
  }
  return undefined;
}
