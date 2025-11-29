import { FsProvider } from "@graphif/fs";
import { DirEntry } from "@tauri-apps/plugin-fs";
import { URI } from "vscode-uri";

export class FsProviderHttp implements FsProvider {
  static schemes = ["http", "https", "webdav", "webdavs", "dav", "davs"];

  constructor(private fetch: typeof window.fetch = window.fetch) {}

  private auth(uri: URI): { url: string; headers: Record<string, string> } {
    const headers: Record<string, string> = {};
    let urlStr = uri.toString();

    if (uri.authority.includes("@")) {
      const authoritySegments = uri.authority.split("@");
      const hostPort = authoritySegments.pop();
      const auth = authoritySegments.join("@");
      const encodedCredentials = btoa(
        encodeURIComponent(decodeURIComponent(auth)).replace(/%([0-9A-F]{2})/g, (_match, p1) =>
          String.fromCharCode(parseInt(p1, 16)),
        ),
      );
      headers["Authorization"] = `Basic ${encodedCredentials}`;
      urlStr = uri.with({ authority: hostPort }).toString();
    }

    return { url: urlStr, headers };
  }

  async read(uri: URI) {
    const { url, headers } = this.auth(uri);
    const response = await this.fetch(url, {
      method: "GET",
      headers,
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  }

  async readDir(uri: URI) {
    const { url, headers } = this.auth(uri);
    const response = await this.fetch(url, {
      method: "PROPFIND",
      headers: { ...headers, Depth: "1" },
    });
    if (!response.ok) {
      throw new Error(`Failed to read directory: ${response.status} ${response.statusText}`);
    }
    const text = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, "application/xml");
    const responses = xmlDoc.getElementsByTagNameNS("DAV:", "response");
    const responseList = responses.length > 0 ? responses : xmlDoc.getElementsByTagName("d:response");
    const entries: DirEntry[] = [];
    const reqPath = new URL(url).pathname.replace(/\/$/, "");
    for (let i = 0; i < responseList.length; i++) {
      const resp = responseList[i];
      const hrefElem = resp.getElementsByTagNameNS("DAV:", "href")[0] || resp.getElementsByTagName("d:href")[0];
      let href = hrefElem?.textContent || "";
      const hrefPath = href.startsWith("http") ? new URL(href).pathname : href;
      if (hrefPath.replace(/\/$/, "") === reqPath) {
        continue;
      }
      const propstat = resp.getElementsByTagNameNS("DAV:", "propstat")[0] || resp.getElementsByTagName("d:propstat")[0];
      const prop = propstat?.getElementsByTagNameNS("DAV:", "prop")[0] || propstat?.getElementsByTagName("d:prop")[0];
      const resType =
        prop?.getElementsByTagNameNS("DAV:", "resourcetype")[0] || prop?.getElementsByTagName("d:resourcetype")[0];

      const isCollection =
        resType?.getElementsByTagNameNS("DAV:", "collection").length > 0 ||
        resType?.getElementsByTagName("d:collection").length > 0;

      const name = decodeURIComponent(
        hrefPath
          .split("/")
          .filter((part) => part)
          .pop() || "",
      );

      if (name) {
        entries.push({ name, isDirectory: isCollection, isFile: !isCollection, isSymlink: false });
      }
    }
    return entries;
  }

  async write(uri: URI, content: Uint8Array) {
    const { url, headers } = this.auth(uri);
    const response = await this.fetch(url, {
      method: "PUT",
      headers,
      body: new Blob([content as any]),
    });
    if (!response.ok) {
      throw new Error(`Failed to write file: ${response.status} ${response.statusText}`);
    }
    return uri;
  }

  async remove(uri: URI) {
    const { url, headers } = this.auth(uri);
    const response = await this.fetch(url, {
      method: "DELETE",
      headers,
    });
    if (!response.ok) {
      throw new Error(`Failed to delete file: ${response.status} ${response.statusText}`);
    }
  }

  async exists(uri: URI) {
    const { url, headers } = this.auth(uri);
    const response = await this.fetch(url, {
      method: "HEAD",
      headers,
    });
    return response.ok;
  }

  async mkdir(uri: URI) {
    const { url, headers } = this.auth(uri);
    const response = await this.fetch(url, {
      method: "MKCOL",
      headers,
    });
    if (!response.ok) {
      throw new Error(`Failed to create directory: ${response.status} ${response.statusText}`);
    }
  }

  async rename(oldUri: URI, newUri: URI) {
    // Check if src and dest are in the same server
    if (oldUri.authority !== newUri.authority) {
      // First copy, then remove
      const content = await this.read(oldUri);
      await this.write(newUri, content);
      await this.remove(oldUri);
      return;
    }
    const src = this.auth(oldUri);
    const dest = this.auth(newUri);
    const response = await this.fetch(src.url, {
      method: "MOVE",
      headers: {
        ...src.headers,
        Destination: dest.url,
        // Overwrite: "F",
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to rename/move file: ${response.status} ${response.statusText}`);
    }
  }

  async stat(uri: URI) {
    const { url, headers } = this.auth(uri);
    const response = await this.fetch(url, {
      method: "PROPFIND",
      headers: { ...headers, Depth: "0" },
    });
    if (!response.ok) {
      throw new Error(`Failed to stat file: ${response.status} ${response.statusText}`);
    }
    const text = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, "application/xml");
    const prop = xmlDoc.querySelector("prop, d\\:prop");
    if (!prop) throw new Error("Invalid WebDAV response");
    const resType = prop.querySelector("resourcetype, d\\:resourcetype");
    const isDirectory = resType ? resType.querySelector("collection, d\\:collection") !== null : false;
    const sizeElem = prop.querySelector("getcontentlength, d\\:getcontentlength");
    const mtimeElem = prop.querySelector("getlastmodified, d\\:getlastmodified");
    return {
      isFile: !isDirectory,
      isDirectory: isDirectory,
      isSymlink: false,
      size: sizeElem ? parseInt(sizeElem.textContent || "0", 10) : 0,
      mtime: mtimeElem ? new Date(mtimeElem.textContent || "") : new Date(),
      atime: new Date(),
      birthtime: new Date(),
      readonly: false,
      fileId: 0,
      dev: 0,
      ino: 0,
      mode: 0,
      nlink: 0,
      uid: 0,
      gid: 0,
      rdev: 0,
      blksize: 0,
      blocks: 0,
      fileAttributes: 0,
    };
  }
}
