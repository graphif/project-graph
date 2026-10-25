declare module "jsdom" {
  export class JSDOM {
    constructor(html?: string, options?: { url?: string });

    readonly window: Window &
      typeof globalThis & {
        close(): void;
        HTMLCanvasElement: typeof HTMLCanvasElement;
      };
  }
}
