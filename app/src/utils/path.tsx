import { isTauri } from "@tauri-apps/api/core";
import { sep } from "@tauri-apps/api/path";
import { URI } from "vscode-uri";

export class Path {
  private readonly path: string;
  static sep = isTauri() ? sep() : "/";

  constructor(path: string);
  constructor(uri: URI);
  constructor(pathOrUri: string | URI) {
    if (typeof pathOrUri === "string") {
      this.path = pathOrUri;
    } else {
      this.path = pathOrUri.fsPath;
    }
  }

  get parent() {
    const parts = this.path.replace(/\/$/g, "").split(Path.sep);
    parts.pop();
    return new Path(parts.join(Path.sep));
  }
  get name() {
    const parts = this.path.split(Path.sep);
    return parts[parts.length - 1];
  }
  get ext() {
    const parts = this.path.split(".");
    if (parts.length > 1) {
      return parts[parts.length - 1];
    } else {
      return "";
    }
  }
  get nameWithoutExt() {
    const parts = this.name.split(".");
    if (parts.length > 1) {
      parts.pop();
    }
    return parts.join(".");
  }
  join(path: string) {
    return new Path(this.path + (this.path.endsWith(Path.sep) ? "" : Path.sep) + path);
  }
  toUri() {
    return URI.file(this.path);
  }
  toString() {
    return this.path;
  }
}
