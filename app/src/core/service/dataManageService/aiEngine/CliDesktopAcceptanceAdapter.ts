let enabled = false;

export function enableCliDesktopAcceptanceAdapter(): void {
  if (!import.meta.env.DEV) throw new Error("CLI desktop acceptance adapters are development-only");
  enabled = true;
}

export function getCliDesktopAcceptanceImage(): Blob | undefined {
  if (!enabled) return undefined;
  return new Blob(
    [
      Uint8Array.from(
        atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="),
        (character) => character.charCodeAt(0),
      ),
    ],
    { type: "image/png" },
  );
}

export function getCliDesktopAcceptanceRecognition(): string | undefined {
  return enabled ? "desktop acceptance image" : undefined;
}
