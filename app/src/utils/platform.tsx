export const isMac =
  "userAgentData" in navigator ? navigator.userAgentData?.platform === "macOS" : /Mac/.test(navigator.userAgent);
export const isLinux =
  "userAgentData" in navigator ? navigator.userAgentData?.platform === "Linux" : /Linux/.test(navigator.userAgent);
export const isWindows =
  "userAgentData" in navigator ? navigator.userAgentData?.platform === "Windows" : /Win/.test(navigator.userAgent);

export const isFrame = window.self !== window.top;
