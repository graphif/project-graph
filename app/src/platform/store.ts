import { isMyGo } from "mygo-runtime";
import { Stores } from "@/generated/mygo";

export interface Store {
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
  entries<T>(): Promise<[string, T][]>;
  save(): Promise<void>;
}

export class DesktopStore implements Store {
  private pending: Promise<unknown> = Promise.resolve();

  constructor(private readonly name: string) {}

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.pending.then(operation, operation);
    this.pending = result;
    return result;
  }

  async get<T>(key: string): Promise<T | undefined> {
    const values = await this.enqueue(() => Stores.read(this.name));
    return Object.hasOwn(values, key) ? (values[key] as T) : undefined;
  }

  set(key: string, value: unknown) {
    return this.enqueue(() => Stores.set(this.name, key, value));
  }

  delete(key: string) {
    return this.enqueue(() => Stores.delete(this.name, key));
  }

  clear() {
    return this.enqueue(() => Stores.clear(this.name));
  }

  async entries<T>(): Promise<[string, T][]> {
    return Object.entries(await this.enqueue(() => Stores.read(this.name))) as [string, T][];
  }

  // Existing callers sometimes enqueue a set without awaiting it before save.
  async save() {
    await this.pending;
  }
}

export async function createStore(name: string): Promise<Store> {
  if (isMyGo()) return new DesktopStore(name);
  throw new Error("Desktop host missing: start Project Graph with MyGo, not a browser tab.");
}

export class LazyStore implements Store {
  private initialized?: Promise<Store>;

  constructor(private readonly name: string) {}

  private load() {
    return (this.initialized ??= createStore(this.name));
  }

  async init() {
    await this.load();
  }

  async get<T>(key: string) {
    return (await this.load()).get<T>(key);
  }

  async set(key: string, value: unknown) {
    await (await this.load()).set(key, value);
  }

  async delete(key: string) {
    return (await this.load()).delete(key);
  }

  async clear() {
    await (await this.load()).clear();
  }

  async entries<T>() {
    return (await this.load()).entries<T>();
  }

  async save() {
    await (await this.load()).save();
  }
}
