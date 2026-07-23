import { create as createDiffPatcher, type Delta } from "jsondiffpatch";

/**
 * 协作协议层文档：uuid → 序列化对象。
 * 内部引用用 { $u: uuid }，避免数组路径 $ 引用在 map 中失效。
 */
export type StageMapDoc = {
  objects: Record<string, unknown>;
  order: string[];
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const diffPatcher = createDiffPatcher({
  objectHash: (obj: unknown) => {
    if (obj && typeof obj === "object" && "uuid" in obj && typeof (obj as { uuid: unknown }).uuid === "string") {
      return (obj as { uuid: string }).uuid;
    }
    return undefined;
  },
  arrays: { detectMove: true, includeValueOnMove: false },
});

export function isStageMapDoc(value: unknown): value is StageMapDoc {
  if (!value || typeof value !== "object") return false;
  const doc = value as StageMapDoc;
  return typeof doc.objects === "object" && doc.objects !== null && Array.isArray(doc.order);
}

export function emptyStageMap(): StageMapDoc {
  return { objects: {}, order: [] };
}

export function cloneStageMap(doc: StageMapDoc): StageMapDoc {
  return {
    objects: structuredClone(doc.objects),
    order: [...doc.order],
  };
}

export function diffStageMap(left: StageMapDoc, right: StageMapDoc): Delta | undefined {
  return diffPatcher.diff(left, right);
}

export function patchStageMap(doc: StageMapDoc, delta: unknown): StageMapDoc {
  const next = cloneStageMap(doc);
  const patched = diffPatcher.patch(next, delta as Delta) as StageMapDoc;
  if (!isStageMapDoc(patched)) {
    throw new Error("Invalid stage map after patch");
  }
  return patched;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSerializedObject(value: unknown): value is Record<string, unknown> & { _: string } {
  return isPlainObject(value) && typeof value._ === "string";
}

function getByPath(root: unknown, path: string): unknown {
  const segments = path.split("/").filter((s) => s !== "");
  let result: unknown = root;
  for (const segment of segments) {
    if (result == null || (typeof result !== "object" && !Array.isArray(result))) {
      return undefined;
    }
    result = (result as Record<string, unknown>)[segment];
  }
  return result;
}

function indexPaths(value: unknown, path: string, pathToValue: Map<string, unknown>) {
  pathToValue.set(path || "/", value);
  if (Array.isArray(value)) {
    value.forEach((child, i) => indexPaths(child, `${path}/${i}`, pathToValue));
    return;
  }
  if (!isPlainObject(value)) return;
  if ("$" in value && Object.keys(value).length === 1) return;
  for (const [key, child] of Object.entries(value)) {
    if (key === "_") continue;
    indexPaths(child, `${path}/${key}`, pathToValue);
  }
}

/**
 * 将 serializer 输出的 stage 数组转为 map 文档，并把 { $: path } 换成 { $u: uuid }。
 */
export function stageArrayToMap(serializedStage: unknown[]): StageMapDoc {
  const objects: Record<string, unknown> = {};
  const order: string[] = [];
  const pathToValue = new Map<string, unknown>();
  indexPaths(serializedStage, "", pathToValue);

  for (const item of serializedStage) {
    if (!isSerializedObject(item) || typeof item.uuid !== "string") continue;
    order.push(item.uuid);
  }

  function resolveUuidFromPath(path: string): string | undefined {
    const normalized = path.startsWith("/") ? path : `/${path}`;
    const target = pathToValue.get(normalized) ?? pathToValue.get(path) ?? getByPath(serializedStage, normalized);
    if (isSerializedObject(target) && typeof target.uuid === "string") {
      return target.uuid;
    }
    return undefined;
  }

  function rewrite(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map(rewrite);
    }
    if (!isPlainObject(value)) return value;
    if ("$" in value && typeof value.$ === "string" && Object.keys(value).length === 1) {
      const uuid = resolveUuidFromPath(value.$);
      if (uuid) return { $u: uuid };
      return value;
    }
    const result: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      result[key] = rewrite(child);
    }
    return result;
  }

  for (const item of serializedStage) {
    if (!isSerializedObject(item) || typeof item.uuid !== "string") continue;
    objects[item.uuid] = rewrite(structuredClone(item));
  }

  return { objects, order };
}

/**
 * 将 map 文档还原为 serializer 可反序列化的 stage 数组，
 * 并把 { $u: uuid } 换回 { $: /index } 路径引用。
 */
export function stageMapToArray(doc: StageMapDoc): unknown[] {
  const order = doc.order.filter((uuid) => uuid in doc.objects);
  for (const uuid of Object.keys(doc.objects)) {
    if (!order.includes(uuid) && UUID_RE.test(uuid)) {
      order.push(uuid);
    }
  }

  const uuidToIndex = new Map<string, number>();
  order.forEach((uuid, index) => uuidToIndex.set(uuid, index));

  function rewrite(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map(rewrite);
    }
    if (!isPlainObject(value)) return value;
    if ("$u" in value && typeof value.$u === "string" && Object.keys(value).length === 1) {
      const index = uuidToIndex.get(value.$u);
      if (index === undefined) {
        throw new Error(`Unknown uuid reference: ${value.$u}`);
      }
      return { $: `/${index}` };
    }
    const result: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      result[key] = rewrite(child);
    }
    return result;
  }

  return order.map((uuid) => rewrite(structuredClone(doc.objects[uuid])));
}
