import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import Markdown from "@/components/ui/markdown";
import { PrgMetadata } from "@/types/metadata";
import { Decoder, Encoder } from "@msgpack/msgpack";
import { appDataDir, join } from "@tauri-apps/api/path";
import { mkdir, writeFile } from "@tauri-apps/plugin-fs";
import { Uint8ArrayReader, Uint8ArrayWriter, ZipReader } from "@zip.js/zip.js";
import { Blocks } from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { URI } from "vscode-uri";
import { Settings } from "../service/Settings";
import { Tutorials } from "../service/Tourials";
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

    if (this.uri.path.endsWith(".prg")) {
      const fileContent = await fs.read(this.uri);
      const reader = new ZipReader(new Uint8ArrayReader(fileContent));
      const entries = await reader.getEntries();

      for (const entry of entries) {
        if (entry.filename === "metadata.msgpack") {
          const metadataRawData = await entry.getData!(new Uint8ArrayWriter());
          this.metadata = decoder.decode(metadataRawData) as PrgMetadata;
        } else if (entry.filename === "README.md") {
          const readmeRawData = await entry.getData!(new Uint8ArrayWriter());
          this.readmeContent = new TextDecoder().decode(readmeRawData);
        } else if (entry.filename === "extension.js") {
          const codeRawData = await entry.getData!(new Uint8ArrayWriter());
          this.code = new TextDecoder().decode(codeRawData);
        }
      }

      if (this.metadata.extension?.id ?? "" !== this.uri.path.split("/").slice(-1)[0].replace(".prg", "")) {
        const newUri = this.uri.with({
          path: this.uri.path.replace(/\/?[^/]*$/, `/${this.metadata.extension?.id || "unknown"}.prg`),
        });
        this.fs.rename(this.uri, newUri);
        this._uri = newUri;
        toast.warning("扩展包名称与实际扩展 ID 不一致，已自动重命名");
      }
    } else {
      // 直接读文件夹
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
                    if (!(await Tutorials.isFinished("thirdPartyExtensionsWarning"))) {
                      const s = await Dialog.buttons(
                        "安装第三方扩展",
                        "在您继续安装第三方扩展之前，请务必仔细阅读并理解以下声明：\nProject Graph 作为一个开放生态系统，允许用户通过扩展增强其功能。您当前尝试安装的扩展程序由第三方开发者独立提供，未经 Project Graph 开发者审核、测试或验证，其安全性、稳定性及对隐私保护的合规性无法得到保证。\n根据 GPL-3.0 的相关条款，本软件及其所有配套扩展均按「原样（AS IS）」提供，不附带任何形式的明示或暗示担保。在适用法律允许的最大范围内，开发者明确声明不承担任何关于适销性、特定用途适用性或不侵权的担保责任。您需自行承担因安装、运行此类扩展而可能导致的任何风险，包括但不限于数据丢失、系统损坏、隐私泄露或工作中断。\n一旦点击“确认安装”，即表示您已阅读并同意上述条款，并确认开发者不对任何因使用该第三方扩展而产生的直接或间接损害承担法律责任。",
                        [
                          { id: "cancel", label: "取消安装", variant: "outline" },
                          { id: "proceed", label: "我已了解风险，继续安装且不再提醒", variant: "destructive" },
                        ],
                      );
                      if (s === "cancel") return;
                      await Tutorials.finish("thirdPartyExtensionsWarning");
                    }
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
