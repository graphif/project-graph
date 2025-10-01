export class ObservableArray<T> extends Array<T> {
  constructor(
    private onAdd: (item: T) => void,
    private onRemove: (item: T) => void,
    items: T[] = [],
  ) {
    super(...items);
    items.forEach((item) => this.onAdd(item));
    Object.setPrototypeOf(this, ObservableArray.prototype);
  }
  push(...items: T[]): number {
    items.forEach((item) => this.onAdd(item));
    return super.push(...items);
  }
  pop(): T | undefined {
    const item = super.pop();
    if (item !== undefined) {
      this.onRemove(item);
    }
    return item;
  }
  splice(start: number, deleteCount?: number, ...items: T[]): T[] {
    const removedItems = super.splice(start, deleteCount ?? 0, ...items);
    removedItems.forEach((item) => this.onRemove(item));
    items.forEach((item) => this.onAdd(item));
    return removedItems;
  }
  shift(): T | undefined {
    const item = super.shift();
    if (item !== undefined) {
      this.onRemove(item);
    }
    return item;
  }
  unshift(...items: T[]): number {
    items.forEach((item) => this.onAdd(item));
    return super.unshift(...items);
  }
}
