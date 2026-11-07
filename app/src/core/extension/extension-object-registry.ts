import { ExtensionEntityConfig } from "../stage/stageObject/entity/ExtensionEntity";

export interface ClickEventPayload {
  relativeWorldX: number;
  relativeWorldY: number;
  worldX: number;
  worldY: number;
  customData: any;
  uuid: string;
}

class ExtensionObjectRegistry {
  private renderFns = new Map<string, (data: any, pixelRatio?: number) => Promise<ImageBitmap>>();
  private clickHandlers = new Map<string, (payload: ClickEventPayload) => void>();
  private configs = new Map<string, ExtensionEntityConfig>();

  private key(extensionId: string, typeName: string) {
    return `${extensionId}:${typeName}`;
  }

  public registerType(
    extensionId: string,
    typeName: string,
    config: ExtensionEntityConfig,
    renderFn: (data: any, pixelRatio?: number) => Promise<ImageBitmap>,
  ) {
    const k = this.key(extensionId, typeName);
    this.configs.set(k, config);
    this.renderFns.set(k, renderFn);
  }

  public registerClickHandler(extensionId: string, typeName: string, handler: (payload: ClickEventPayload) => void) {
    this.clickHandlers.set(this.key(extensionId, typeName), handler);
  }

  public getClickHandler(extensionId: string, typeName: string) {
    return this.clickHandlers.get(this.key(extensionId, typeName));
  }

  public getRenderFn(extensionId: string, typeName: string) {
    return this.renderFns.get(this.key(extensionId, typeName));
  }

  public getConfig(extensionId: string, typeName: string) {
    return this.configs.get(this.key(extensionId, typeName));
  }
}

export const extensionObjectRegistry = new ExtensionObjectRegistry();
