export class ObservableArray<T> extends Array<T> {
  constructor(
    private onAdd: (item: T) => void,
    private onRemove: (item: T, index: number) => void,
    items: T[] = [],
  ) {
    super(...items);
    this.forEach((item) => this.onAdd(item));
  }
  push(...items: T[]): number {
    items.forEach((item) => this.onAdd(item));
    return super.push(...items);
  }
  pop(): T | undefined {
    const item = super.pop();
    if (item !== undefined) {
      this.onRemove(item, this.length);
    }
    return item;
  }
  splice(start: number, deleteCount?: number, ...items: T[]): T[] {
    const removedItems = super.splice(start, deleteCount ?? 0, ...items);
    removedItems.forEach((item, i) => this.onRemove(item, start + i));
    items.forEach((item) => this.onAdd(item));
    return removedItems;
  }
  shift(): T | undefined {
    const item = super.shift();
    if (item !== undefined) {
      this.onRemove(item, 0);
    }
    return item;
  }
  unshift(...items: T[]): number {
    items.forEach((item) => this.onAdd(item));
    return super.unshift(...items);
  }
}
