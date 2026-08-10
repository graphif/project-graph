const availableSettings: Record<string, unknown> = {
  defaultFontFamily: "PingFang SC, PingFang TC, -apple-system",
  defaultEdgeLineType: "solid",
  defaultEdgeArrowType: "default",
  historyManagerMode: "timeEfficient",
  historySize: 150,
  showDebug: false,
  watch: () => () => {},
};

export const Settings = new Proxy(availableSettings, {
  get(target, property) {
    if (typeof property === "string" && property in target) return target[property];
    throw new Error(`Closed Project Runtime Host did not acquire the Settings capability: ${String(property)}`);
  },
});
