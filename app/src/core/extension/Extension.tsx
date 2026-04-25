import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import Markdown from "@/components/ui/markdown";
import { PrgMetadata } from "@/types/metadata";
import { Decoder, Encoder } from "@msgpack/msgpack";
import { appDataDir, join } from "@tauri-apps/api/path";
import { mkdir, writeFile } from "@tauri-apps/plugin-fs";
import { Blocks } from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { URI } from "vscode-uri";
import { Settings } from "../service/Settings";
import { Tab } from "../Tab";
import { ExtensionManager } from "./ExtensionManager";

export class Extension extends Tab {
  public metadata: PrgMetadata = { version: "2.0.0" };
  public readmeContent: string = "";
  public code: string = "";

  public stage: any[] = []; // 占位以防止部分 Service 访问报错
  private _uri: URI;
  private _component: React.ComponentType | null = null;

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

    const decoder = new Decoder();

    const codeUri = this.uri.with({ path: this.uri.path + "/extension.js" });
    const metadataUri = this.uri.with({ path: this.uri.path + "/metadata.msgpack" });
    const readmeUri = this.uri.with({ path: this.uri.path + "/README.md" });

    try {
      const [codeContent, metadataContent, readmeContent] = await Promise.all([
        fs.read(codeUri),
        fs.read(metadataUri),
        fs.read(readmeUri),
      ]);

      this.code = new TextDecoder().decode(codeContent);
      this.metadata = decoder.decode(metadataContent) as PrgMetadata;
      this.readmeContent = new TextDecoder().decode(readmeContent);
    } catch (e) {
      console.error("Failed to load extension from folder", e);
      toast.error("加载扩展失败，请检查文件结构是否正确");
    }

    if (this.metadata.extension?.id ?? "" !== this.uri.path.split("/").slice(-1)[0]) {
      const newUri = this.uri.with({
        path: this.uri.path.replace(/\/?[^/]*$/, `/${this.metadata.extension?.id || "unknown"}`),
      });
      this.fs.rename(this.uri, newUri);
      this._uri = newUri;
      toast.warning("扩展文件夹名称与实际扩展 ID 不一致，已自动重命名");
    }
  }

  getComponent(): React.ComponentType {
    if (this._component) return this._component;

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    this._component = function ExtensionComponent() {
      const [installed, setInstalled] = useState(false);
      const [disabledExtensions, setDisabledExtensions] = Settings.use("disabledExtensions");
      const disabled = disabledExtensions.includes(self.metadata.extension?.id || "");

      useEffect(() => {
        (async () => {
          const extensions = await ExtensionManager.getExtensions();
          console.log("已安装的扩展", extensions);
          setInstalled(
            extensions.includes((self.metadata.extension?.id || "") + ".prg") ||
              extensions.includes(self.metadata.extension?.id || ""),
          );
        })();
      }, []);

      return (
        <div className="mx-auto h-full max-w-4xl space-y-6 overflow-auto p-16">
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
            <div className="flex gap-2">
              {installed ? (
                <>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      if (await Dialog.confirm("确认卸载", "将彻底删除此扩展，无法恢复。请确认是否继续。")) {
                        await self.fs.remove(
                          URI.file(await join(await appDataDir(), "extensions", self.metadata.extension?.id || "")),
                        );
                        setDisabledExtensions(disabledExtensions.filter((id) => id !== self.metadata.extension?.id));
                        setInstalled(false);
                        toast.success("扩展已卸载");
                      }
                    }}
                  >
                    卸载
                  </Button>
                  {disabled ? (
                    <Button
                      variant="outline"
                      onClick={async () => {
                        setDisabledExtensions(disabledExtensions.filter((id) => id !== self.metadata.extension?.id));
                        toast.success("扩展已启用");
                      }}
                    >
                      启用
                    </Button>
                  ) : (
                    <Button
                      onClick={async () => {
                        setDisabledExtensions([...disabledExtensions, self.metadata.extension?.id || ""]);
                        toast.success("扩展已禁用");
                      }}
                    >
                      禁用
                    </Button>
                  )}
                </>
              ) : (
                <Button
                  onClick={async () => {
                    const base = await join(await appDataDir(), "extensions", self.metadata.extension?.id || "unknown");
                    await mkdir(base);
                    await writeFile(
                      await join(base, "metadata.msgpack"),
                      new Uint8Array(new Encoder().encode(self.metadata)),
                    );
                    await writeFile(await join(base, "extension.js"), new TextEncoder().encode(self.code));
                    await writeFile(await join(base, "README.md"), new TextEncoder().encode(self.readmeContent));
                    setInstalled(true);
                    toast.success("扩展已安装");
                  }}
                >
                  安装
                </Button>
              )}
            </div>
          </div>

          {self.readmeContent && (
            <div className="max-w-none">
              <Markdown source={self.readmeContent} />
            </div>
          )}
        </div>
      );
    };

    return this._component;
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
