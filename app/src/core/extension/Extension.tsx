import { Button } from "@/components/ui/button";
import Markdown from "@/components/ui/markdown";
import { PrgMetadata } from "@/types/metadata";
import { Decoder } from "@msgpack/msgpack";
import { Uint8ArrayReader, Uint8ArrayWriter, ZipReader } from "@zip.js/zip.js";
import { Blocks } from "lucide-react";
import React from "react";
import { toast } from "sonner";
import { URI } from "vscode-uri";
import { Tab } from "../Tab";

export class Extension extends Tab {
  public metadata: PrgMetadata = { version: "2.0.0" };
  public readmeContent: string = "";
  public stage: any[] = []; // 占位以防止部分 Service 访问报错
  private _uri: URI;

  constructor(uri: URI) {
    super({});
    this._uri = uri;
  }

  get uri() {
    return this._uri;
  }

  async init() {
    const fs = (this as any).fs;
    if (!fs) {
      console.error("Extension fs is not initialized");
      return;
    }
    const fileContent = await fs.read(this.uri);
    const reader = new ZipReader(new Uint8ArrayReader(fileContent));
    const entries = await reader.getEntries();
    const decoder = new Decoder();

    for (const entry of entries) {
      if (entry.filename === "metadata.msgpack") {
        const metadataRawData = await entry.getData!(new Uint8ArrayWriter());
        this.metadata = decoder.decode(metadataRawData) as PrgMetadata;
      } else if (entry.filename === "README.md") {
        const readmeRawData = await entry.getData!(new Uint8ArrayWriter());
        this.readmeContent = new TextDecoder().decode(readmeRawData);
      }
    }
  }

  getComponent(): React.ComponentType {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    return function ExtensionComponent() {
      return (
        <div className="mx-auto h-full max-w-4xl space-y-6 overflow-auto p-8">
          <div className="flex items-start justify-between border-b pb-6">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold">{self.metadata.extension?.name || "未知扩展"}</h1>
              <div className="text-muted-foreground space-x-4 text-sm">
                <span>ID: {self.metadata.extension?.id}</span>
                <span>版本: {self.metadata.extension?.version}</span>
                <span>作者: {self.metadata.extension?.author}</span>
              </div>
              <p className="text-muted-foreground text-lg">{self.metadata.extension?.description}</p>
            </div>
            <Button size="lg" onClick={() => toast.success("扩展已安装（模拟）")}>
              安装扩展
            </Button>
          </div>

          {self.readmeContent && (
            <div className="max-w-none">
              <Markdown source={self.readmeContent} />
            </div>
          )}
        </div>
      );
    };
  }

  render(): React.ReactNode {
    const Component = this.getComponent();
    return <Component />;
  }

  get icon() {
    return Blocks;
  }
  get title() {
    return this.metadata.extension?.name || "扩展包";
  }
}
