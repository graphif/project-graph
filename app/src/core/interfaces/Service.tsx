// export interface Service<AllowSubServices extends boolean = true> {
//   readonly subServices?: AllowSubServices extends true ? readonly Service<false>[] : never;
export interface Service {
  tick?(): void;
  dispose?(): void | Promise<void>;
}
export interface ServiceConstructor<T extends Service = Service> {
  id?: string;
  new (...args: any[]): T;
}
