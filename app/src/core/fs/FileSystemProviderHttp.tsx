import { FileSystemProvider } from "@/core/fs";
import { DirEntry } from "@tauri-apps/plugin-fs";
import { fetch } from "@tauri-apps/plugin-http";
import { toast } from "sonner";
import { URI } from "vscode-uri";

export class FileSystemProviderHttp implements FileSystemProvider {
  private auth(uri: URI): { url: string; headers: Record<string, string> } {
    const headers: Record<string, string> = {};
    let urlStr = uri.toString();

    if (uri.authority.includes("@")) {
      const authoritySegments = uri.authority.split("@");
      const hostPort = authoritySegments.pop(); // 移除 host:port 部分
      const auth = authoritySegments.join("@"); // 获取 user:pass

      // 优化 2: 处理非 ASCII 字符的用户名密码
      const encodedCredentials = btoa(
        encodeURIComponent(decodeURIComponent(auth)).replace(/%([0-9A-F]{2})/g, (_match, p1) =>
          String.fromCharCode(parseInt(p1, 16)),
        ),
      );

      headers["Authorization"] = `Basic ${encodedCredentials}`;

      // 重构 URL，移除 credentials 部分，防止 fetch 报错或泄露
      urlStr = uri.with({ authority: hostPort }).toString();
    }

    return { url: urlStr, headers };
  }

  read(uri: URI) {
    return toast
      .promise(
        async () => {
          const { url, headers } = this.auth(uri);
          const response = await fetch(url, {
            method: "GET",
            headers,
          });
          if (!response.ok) {
            throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
          }
          const arrayBuffer = await response.arrayBuffer();
          return new Uint8Array(arrayBuffer);
        },
        {
          loading: "从 HTTP 或 WebDAV 服务器读取文件…",
        },
      )
      .unwrap();
  }

  readDir(uri: URI) {
    return toast
      .promise(
        async () => {
          const { url, headers } = this.auth(uri);
          const response = await fetch(url, {
            method: "PROPFIND",
            headers: { ...headers, Depth: "1" },
          });

          if (!response.ok) {
            throw new Error(`Failed to read directory: ${response.status} ${response.statusText}`);
          }

          const text = await response.text();
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(text, "application/xml");

          // WebDAV 标准命名空间通常是 "DAV:"
          const responses = xmlDoc.getElementsByTagNameNS("DAV:", "response");
          // 如果服务器没返回标准 NS，降级尝试按 TagName 获取 (不太严谨但实用)
          const responseList = responses.length > 0 ? responses : xmlDoc.getElementsByTagName("d:response");

          const entries: DirEntry[] = [];

          // 规范化请求的路径用于比较 (移除末尾斜杠)
          const reqPath = new URL(url).pathname.replace(/\/$/, "");

          for (let i = 0; i < responseList.length; i++) {
            const resp = responseList[i];

            // 获取 href
            const hrefElem = resp.getElementsByTagNameNS("DAV:", "href")[0] || resp.getElementsByTagName("d:href")[0];
            let href = hrefElem?.textContent || "";

            // 修复: 过滤掉目录自身。WebDAV Depth:1 会包含目录自己，不过滤会导致无限递归
            // 需要处理 href 可能包含 host 或只是 path 的情况
            const hrefPath = href.startsWith("http") ? new URL(href).pathname : href;
            if (hrefPath.replace(/\/$/, "") === reqPath) {
              continue;
            }

            // 获取属性
            const propstat =
              resp.getElementsByTagNameNS("DAV:", "propstat")[0] || resp.getElementsByTagName("d:propstat")[0];
            const prop =
              propstat?.getElementsByTagNameNS("DAV:", "prop")[0] || propstat?.getElementsByTagName("d:prop")[0];
            const resType =
              prop?.getElementsByTagNameNS("DAV:", "resourcetype")[0] ||
              prop?.getElementsByTagName("d:resourcetype")[0];

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
        },
        {
          loading: "从 WebDAV 服务器读取目录…",
        },
      )
      .unwrap();
  }

  write(uri: URI, content: Uint8Array) {
    return toast
      .promise(
        async () => {
          const { url, headers } = this.auth(uri);
          const response = await fetch(url, {
            method: "PUT",
            headers,
            // 修复: 优先使用 Blob 以获得更好的兼容性
            body: new Blob([content as any]),
          });
          if (!response.ok) {
            throw new Error(`Failed to write file: ${response.status} ${response.statusText}`);
          }
          return uri;
        },
        {
          loading: "向 HTTP 或 WebDAV 服务器写入文件…",
        },
      )
      .unwrap();
  }

  remove(uri: URI) {
    return toast
      .promise(
        async () => {
          const { url, headers } = this.auth(uri);
          const response = await fetch(url, {
            method: "DELETE",
            headers,
          });
          if (!response.ok) {
            throw new Error(`Failed to delete file: ${response.status} ${response.statusText}`);
          }
        },
        {
          loading: "从 HTTP 或 WebDAV 服务器删除文件…",
        },
      )
      .unwrap();
  }

  exists(uri: URI) {
    return toast
      .promise(
        async () => {
          const { url, headers } = this.auth(uri);
          const response = await fetch(url, {
            method: "HEAD",
            headers,
          });
          // 200-299 视为存在
          return response.ok;
        },
        {
          loading: "检查 HTTP 或 WebDAV 服务器上的文件是否存在…",
        },
      )
      .unwrap();
  }

  mkdir(uri: URI) {
    return toast
      .promise(
        async () => {
          const { url, headers } = this.auth(uri);
          const response = await fetch(url, {
            method: "MKCOL",
            headers,
          });
          if (!response.ok) {
            throw new Error(`Failed to create directory: ${response.status} ${response.statusText}`);
          }
        },
        {
          loading: "在 WebDAV 服务器上创建目录…",
        },
      )
      .unwrap();
  }

  rename(oldUri: URI, newUri: URI) {
    return toast
      .promise(
        async () => {
          const src = this.auth(oldUri);
          const dest = this.auth(newUri);

          const response = await fetch(src.url, {
            method: "MOVE",
            headers: {
              ...src.headers,
              Destination: dest.url,
              Overwrite: "F", // 建议加上，防止意外覆盖
            },
          });
          if (!response.ok) {
            throw new Error(`Failed to rename/move file: ${response.status} ${response.statusText}`);
          }
        },
        {
          loading: "在 WebDAV 服务器上移动文件…",
        },
      )
      .unwrap();
  }

  stat(uri: URI) {
    return toast
      .promise(
        async () => {
          const { url, headers } = this.auth(uri);
          const response = await fetch(url, {
            method: "PROPFIND",
            headers: { ...headers, Depth: "0" },
          });
          if (!response.ok) {
            throw new Error(`Failed to stat file: ${response.status} ${response.statusText}`);
          }

          const text = await response.text();
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(text, "application/xml");

          // 同样使用兼容性更好的选择器
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
        },
        {
          loading: "从 WebDAV 服务器获取文件状态…",
        },
      )
      .unwrap();
  }
}
