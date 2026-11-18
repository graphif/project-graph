import * as Comlink from "comlink";

export function setupComlink() {
  Comlink.transferHandlers.set("AUTO_PROXY", {
    canHandle: (e) =>
      typeof e === "object" &&
      e !== null &&
      !(e instanceof Promise) &&
      !(e instanceof Date) &&
      !(e instanceof RegExp) &&
      !(e instanceof ImageBitmap) &&
      !(e instanceof OffscreenCanvas) &&
      (Array.isArray(e) || e.constructor !== Object),
    serialize: (e) => {
      if (Array.isArray(e)) {
        const ports = [];
        const serializedArray = e.map((item) => {
          if (typeof item === "object" && item !== null) {
            const { port1, port2 } = new MessageChannel();
            Comlink.expose(item, port1);
            ports.push(port2);
            return port2;
          }
          return item;
        });
        return [{ __type: "PROXY_ARRAY", data: serializedArray }, ports];
      }
      const { port1, port2 } = new MessageChannel();
      Comlink.expose(e, port1);
      return [port2, [port2]];
    },
    deserialize: (e) => {
      if (e && e.__type === "PROXY_ARRAY") {
        return e.data.map((item) => (item instanceof MessagePort ? Comlink.wrap(item) : item));
      }
      return e instanceof MessagePort ? Comlink.wrap(e) : e;
    },
  });

  Comlink.transferHandlers.set("CUSTOM_TYPES", {
    canHandle: (v) => v !== null && typeof v === "object" && "_" in v && typeof v._ === "string",
    serialize: (v) => [v, []],
    deserialize: (v) => v,
  });

  Comlink.transferHandlers.set("LUCIDE_ICON", {
    canHandle: (v) => v !== null && typeof v === "object" && "$lucide" in v && typeof v.$lucide === "string",
    serialize: (v) => [v, []],
    deserialize: (v) => v,
  });

  Comlink.transferHandlers.set("IMAGE_BITMAP", {
    canHandle: (v) => v instanceof ImageBitmap || v instanceof OffscreenCanvas,
    serialize: (v) => {
      // ImageBitmap and OffscreenCanvas are transferable
      return [v, [v]];
    },
    deserialize: (v) => v,
  });
}
