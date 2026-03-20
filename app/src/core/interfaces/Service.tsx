export interface Service {
  tick?(): void;
  dispose?(): void | Promise<void>;
}
