import { expose, Remote, wrap } from "comlink";
import { Extension } from "./Extension";
import { extensionHostApiFactory } from "./api/host";
import { ExtensionRemoteApi } from "./api/remote";

export class ExtensionRuntime {
  private worker: Worker;
  public remote: Remote<ExtensionRemoteApi>;

  constructor(public extension: Extension) {
    const blob = new Blob([extension.code], { type: "application/javascript" });
    this.worker = new Worker(URL.createObjectURL(blob));
    expose(extensionHostApiFactory(extension.metadata.extension?.name || "未知扩展"), this.worker);
    this.remote = wrap(this.worker);
  }
}
