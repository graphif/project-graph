export namespace Base64 {
  export function encode(str: string) {
    return btoa(Array.from(new TextEncoder().encode(str), (byte) => String.fromCodePoint(byte)).join(""));
  }
  export function decode(b64: string) {
    return new TextDecoder().decode(Uint8Array.from(atob(b64), (m) => m.codePointAt(0)!));
  }
}
