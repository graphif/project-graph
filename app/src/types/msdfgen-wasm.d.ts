declare module "@playcanvas/msdfgen-wasm" {
  export interface MsdfGlyph {
    width: number;
    height: number;
    rgba: Uint8Array;
    advance: number;
    translateX: number;
    translateY: number;
    boundsL: number;
    boundsB: number;
    boundsR: number;
    boundsT: number;
    range: number;
  }

  export interface MsdfFont {
    generateGlyph(codepoint: number, size: number, pxrange: number): MsdfGlyph | null;
    delete(): void;
  }

  export function createMsdfgen(options?: {
    moduleOverrides?: { locateFile?: (path: string) => string };
  }): Promise<{ loadFont(bytes: Uint8Array | ArrayBuffer): MsdfFont | null }>;
}
