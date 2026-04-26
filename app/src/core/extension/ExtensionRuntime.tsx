import { expose, Remote, wrap } from "comlink";
import comlinkMinJs from "comlink/dist/esm/comlink.min.js?raw";
import { Extension } from "./Extension";
import { extensionHostApiFactory } from "./api/host";
import { ExtensionRemoteApi } from "./api/remote";

import { setupComlink } from "./setupComlink/host";
import setupComlinkJs from "./setupComlink/remote?raw";
setupComlink();
const comlinkBlob = new Blob([comlinkMinJs], { type: "application/javascript" });
const comlinkUrl = URL.createObjectURL(comlinkBlob);

export class ExtensionRuntime {
  private worker: Worker;
  public remote: Remote<ExtensionRemoteApi>;

  constructor(public extension: Extension) {
    const blob = new Blob(
      [
        `
${setupComlinkJs.replace('from "comlink";', `from "${comlinkUrl}";`)}
setupComlink();
self.prg = Comlink.wrap(self);
(async () => {
  ${extension.code}
})();
      `.trim(),
      ],
      { type: "application/javascript" },
    );
    this.worker = new Worker(URL.createObjectURL(blob), { type: "module" });
    expose(extensionHostApiFactory(extension), this.worker);
    this.remote = wrap(this.worker);
  }
}
