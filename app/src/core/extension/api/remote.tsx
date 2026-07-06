export interface ExtensionRemoteApi {
  themes_register(
    metadata: { id: string; name: string; description?: string; type: "light" | "dark" },
    themeContent: any,
  ): Promise<void>;
}
