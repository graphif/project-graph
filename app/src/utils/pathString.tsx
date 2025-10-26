import { family } from "@/utils/platform";

export namespace PathString {
  /**
   * 获取当前平台的路径分隔符
   * @returns
   */
  export function getSep(): string {
    const fam = family();
    if (fam === "windows") {
      return "\\";
    } else {
      return "/";
    }
  }

  /**
   * 将绝对路径转换为文件名
   * @param path
   * @returns
   */
  export function absolute2file(path: string): string {
    const fam = family();
    // const fam = "windows"; // vitest 测试时打开此行注释

    if (fam === "windows") {
      path = path.replace(/\\/g, "/");
    }
    const file = path.split("/").pop();
    if (!file) {
      throw new Error("Invalid path");
    }
    const parts = file.split(".");
    if (parts.length > 1) {
      return parts.slice(0, -1).join(".");
    } else {
      return file;
    }
  }

  /**
   * 根据文件的绝对路径，获取当前文件所在目录的路径
   * 结尾不带 /
   * @param path 必须是一个文件的路径，不能是文件夹的路径
   * @returns
   */
  export function dirPath(path: string): string {
    const fam = family();
    // const fam = "windows"; // vitest 测试时打开此行注释

    if (fam === "windows") {
      path = path.replace(/\\/g, "/"); // 将反斜杠替换为正斜杠
    }

    const file = path.split("/").pop(); // 获取文件名
    if (!file) {
      throw new Error("Invalid path");
    }

    let directory = path.substring(0, path.length - file.length); // 获取目录路径
    if (directory.endsWith("/")) {
      directory = directory.slice(0, -1); // 如果目录路径以斜杠结尾，去掉最后的斜杠
    }

    if (fam === "windows") {
      // 再换回反斜杠
      return directory.replace(/\//g, "\\");
    }

    return directory; // 返回目录路径
  }

  /**
   * 通过路径字符串中，提取出文件名
   * 例如：
   * path = "C:/Users/admin/Desktop/test.txt"
   * 则返回 "test"
   * @param path
   */
  export function getFileNameFromPath(path: string): string {
    path = path.replace(/\\/g, "/");
    const parts = path.split("/");
    const fileName = parts[parts.length - 1];
    const parts2 = fileName.split(".");
    if (parts2.length > 1) {
      return parts2.slice(0, -1).join(".");
    } else {
      return fileName;
    }
  }

  /**
   * 获取符合路径文件名规则的时间字符串
   */
  export function getTime(): string {
    const dateTime = new Date().toLocaleString().replaceAll(/\//g, "-").replaceAll(" ", "_").replaceAll(":", "-");
    return dateTime;
  }

  /**
   * 获取简短压缩后的文件名，会省略中间部分
   * 用于显示在文件列表中
   * @param fileName 原始文件名
   * @param limitLength 文件名长度限制
   * @param splitRate 分割比例，默认0.66，表示省略掉一部分内容后，
   * 最后呈现的部分前半部分占比0.66，后半部分占比0.34
   */
  export function getShortedFileName(fileName: string, limitLength = 30, splitRate = 0.66): string {
    let result = fileName;
    if (fileName.length > limitLength) {
      // 只截取前20+后10个字符
      const frontEnd = Math.floor(limitLength * splitRate);
      const endLength = limitLength - frontEnd;
      result = `${fileName.slice(0, frontEnd)}…${fileName.slice(-endLength)}`;
    }
    return result;
  }

  /**
   * 将盘符转大写（先检测是否有盘符开头，如果有则转，没有则返回原来的字符串）
   * @param absolutePath
   * 例如：
   * 输入："d:/desktop/a.txt"
   * 输出："D:/desktop/a.txt"
   */
  export function uppercaseAbsolutePathDiskChar(absolutePath: string) {
    if (!absolutePath) return absolutePath;

    // 匹配 Windows 盘符格式，如 "c:", "D:\", "e:/"
    const windowsDiskPattern = /^[a-zA-Z]:[\\/]/;

    if (windowsDiskPattern.test(absolutePath)) {
      // 将盘符转为大写
      return absolutePath[0].toUpperCase() + absolutePath.slice(1);
    }

    // 非 Windows 路径或没有盘符，直接返回
    return absolutePath;
  }

  /**
   * 获取一个相对路径，从一个绝对路径到另一个绝对路径的跳转
   * 如果无法获取，或者路径不合法，则返回空字符串
   * @param from
   * @param to
   * @returns 相对路径
   * 例如：
   * from = "C:/Users/admin/Desktop/test.txt"
   * to = "C:/Users/admin/Desktop/test2.txt"
   * 则返回 "./test2.txt"
   * from = "C:/Users/admin/Desktop/test.txt"
   * to = "C:/Users/admin/test2.txt"
   * 则返回 "../test2.txt"
   */
  export function getRelativePath(from: string, to: string): string {
    // 统一替换反斜杠为正斜杠
    const fromNormalized = from.replace(/\\/g, "/");
    const toNormalized = to.replace(/\\/g, "/");

    console.log(fromNormalized, toNormalized);

    // 分割路径为数组
    const fromParts = fromNormalized.split("/").filter((part) => part && part !== ".");
    const toParts = toNormalized.split("/").filter((part) => part && part !== ".");

    // 检查是否在同一根目录下
    if (fromParts[0] !== toParts[0]) {
      return "";
    }

    // 找到共同路径的深度
    let commonDepth = 0;
    const maxCommonDepth = Math.min(fromParts.length, toParts.length);
    while (commonDepth < maxCommonDepth && fromParts[commonDepth] === toParts[commonDepth]) {
      commonDepth++;
    }

    // 计算需要向上退出的层数
    const upLevel = fromParts.length - commonDepth - 1; // -1 因为最后一部分是文件名

    // 构建向上部分
    const upPart = upLevel > 0 ? Array(upLevel).fill("..").join("/") : "";

    // 构建向下部分
    const downPart = toParts.slice(commonDepth).join("/");

    // 组合相对路径
    let relativePath = "";
    if (upPart && downPart) {
      relativePath = upPart + "/" + downPart;
    } else if (upPart) {
      relativePath = upPart;
    } else if (downPart) {
      relativePath = "./" + downPart;
    } else {
      relativePath = "./" + toParts[toParts.length - 1];
    }

    return relativePath;
  }

  // 这个函数用AI生成，DeepSeek整整思考了四分钟，252秒，一次性全部通过测试，而其他大模型都无法通过测试。
  /**
   * 根据一个绝对路径和一个相对路径，获取新文件的绝对路径
   * @param currentPath 绝对路径
   * @param relativePath 相对路径
   * 例如：
   * currentPath = "C:/Users/admin/Desktop/test.txt"
   * relativePath = "./test2.txt"
   * 则返回 "C:/Users/admin/Desktop/test2.txt"
   *
   * currentPath = "C:/Users/admin/Desktop/test.txt"
   * relativePath = "../test2.txt"
   * 则返回 "C:/Users/admin/test2.txt"
   * @returns
   */
  export function relativePathToAbsolutePath(currentPath: string, relativePath: string): string {
    const { drive, parts: currentParts } = splitCurrentPath(currentPath);
    const relativeParts = splitRelativePath(relativePath);

    // 如果当前路径是文件（有扩展名），则去掉文件名部分，只保留目录
    const isFile = hasFileExtension(currentParts[currentParts.length - 1]);
    const directoryParts = isFile ? currentParts.slice(0, -1) : [...currentParts];

    const mergedParts = [...directoryParts];
    for (const part of relativeParts) {
      if (part === "..") {
        if (mergedParts.length > 0) {
          mergedParts.pop();
        }
      } else if (part !== "." && part !== "") {
        mergedParts.push(part);
      }
    }

    let absolutePath;
    if (drive) {
      absolutePath = `${drive}/`;
    } else {
      absolutePath = "/";
    }
    absolutePath += mergedParts.join("/");

    // 处理根目录情况
    if (mergedParts.length === 0) {
      absolutePath = drive ? `${drive}/` : "/";
    }

    // 替换多个连续的斜杠为单个斜杠
    absolutePath = absolutePath.replace(/\/+/g, "/");

    return absolutePath;
  }

  function splitCurrentPath(path: string) {
    path = path.replace(/\\/g, "/");
    let drive = "";
    const driveMatch = path.match(/^([a-zA-Z]:)(\/|$)/);
    if (driveMatch) {
      drive = driveMatch[1];
      path = path.substring(drive.length);
    }
    const parts = path.split("/").filter((p) => p !== "");
    return { drive, parts };
  }

  function splitRelativePath(relativePath: string) {
    relativePath = relativePath.replace(/\\/g, "/");
    return relativePath.split("/").filter((p) => p !== "");
  }

  // 辅助函数：判断字符串是否有文件扩展名
  function hasFileExtension(filename: string): boolean {
    if (!filename) return false;
    // 简单的扩展名检测：包含点号且点号不在开头
    return filename.includes(".") && filename.indexOf(".") > 0;
  }

  /**
   * 检测一个字符串是否是一个有效的url网址
   * 用于判断是否可以打开浏览器
   * @param url
   * @returns
   */
  export function isValidURL(url: string): boolean {
    const trimmed = url.trim();
    if (!trimmed) return false;

    // 包含协议的正则（支持任意合法协议）
    const protocolPattern = /^[a-z][a-z0-9+.-]*:\/\//i;

    if (protocolPattern.test(trimmed)) {
      // 完整URL校验（包含协议）
      return /^[a-z][a-z0-9+.-]*:\/\/[^\s/?#].[^\s]*$/i.test(trimmed);
    } else {
      // 无协议时校验域名格式
      return /^(?:(localhost|(\d{1,3}\.){3}\d{1,3}|([a-z0-9-]+\.)+[a-z]{2,})|xn--[a-z0-9]+|[\p{L}\p{N}-]+(\.[\p{L}\p{N}-]+)+)(?::\d+)?(?:[/?#][^\s]*)?$/iu.test(
        trimmed,
      );
    }
  }

  /**
   * 识别一个url是否是一个markdown格式的url，并提取出内容
   * [text](url)
   * @param url
   */
  export function isMarkdownUrl(str: string): { valid: boolean; text: string; url: string } {
    const result = { valid: false, text: "", url: "" };
    if (typeof str !== "string") return result;
    str = str.trim();

    if (str.startsWith("[") && str.endsWith(")") && str.includes("](")) {
      const parts = str.split("](");
      if (parts.length === 2) {
        let [text, url] = parts;
        // text 去除左侧第一个 [
        text = text.substring(1);
        // url 去除右侧第一个 )
        url = url.substring(0, url.length - 1);
        // url可能是 `http://xxx "title"` 的格式
        if (url.includes(" ")) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const [url2, _] = url.split(" ");
          url = url2;
          // title就丢掉不要了
        }
        if (isValidURL(url)) {
          result.valid = true;
          result.text = text;
          result.url = url;
        }
      }
    }
    return result;
  }
}
