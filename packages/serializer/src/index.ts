type SerializableClass = {
  className?: string;
  name: string;
  new (...args: any[]): any;
};

export interface SerializableSchema {
  /** Field order is also the argument order for positional constructors. */
  fields: readonly string[];
  id?: string;
  construct?: "object" | "arguments";
  extra?: "first" | "last";
  rawFields?: readonly string[];
  /** Link these fields after construction so relationships may refer to each other. */
  deferredFields?: readonly string[];
  create?: (data: Record<string, any>, extra: any) => any;
}

type Registration = SerializableSchema & { name: string; type: SerializableClass };
const types = new Map<string, Registration>();
const constructors = new WeakMap<SerializableClass, Registration>();

/** Explicit wire names remain stable across minification and source file renames. */
export function serializableType(name: string, schema: SerializableSchema) {
  return <T extends SerializableClass>(type: T): void => {
    if (!name || new Set(schema.fields).size !== schema.fields.length || schema.fields.includes("_")) {
      throw new TypeError(`[Serializer] Invalid schema for ${name}`);
    }
    if (types.has(name) && types.get(name)!.type !== type) {
      throw new TypeError(`[Serializer] Duplicate type ${name}`);
    }
    const registration = { ...schema, fields: [...schema.fields], name, type };
    types.set(name, registration);
    constructors.set(type, registration);
  };
}

// Legacy decorators are retained for package consumers; application types use explicit schemas.
type LegacySchema = { fields: string[]; id?: string; construct?: "object"; first?: boolean; last?: boolean };
const legacySchemas = new WeakMap<object, LegacySchema>();
const legacyTypes = new Set<SerializableClass>();
let getOriginalNameOf = (type: SerializableClass): string =>
  Object.hasOwn(type, "className") ? (type.className ?? type.name) : type.name;

export function configureSerializer(resolveName: (type: SerializableClass) => string) {
  getOriginalNameOf = (type) => (Object.hasOwn(type, "className") ? resolveName(type) : type.name);
}

function legacySchema(target: object): LegacySchema {
  let schema = legacySchemas.get(target);
  if (!schema) {
    schema = { fields: [] };
    legacySchemas.set(target, schema);
  }
  return schema;
}

/** @deprecated Use serializableType with an explicit schema. */
export function serializable(target: any, key: string) {
  legacySchema(target).fields.push(key);
  legacyTypes.add(target.constructor);
}
/** @deprecated Use the schema's id field. */
export function id(target: object, key: string) {
  legacySchema(target).id = key;
}
/** @deprecated Use construct: "object". */
export function passObject(target: SerializableClass) {
  legacySchema(target).construct = "object";
}
/** @deprecated Use extra: "first". */
export function passExtraAtArg1(target: SerializableClass) {
  legacySchema(target).first = true;
}
/** @deprecated Use extra: "last". */
export function passExtraAtLastArg(target: SerializableClass) {
  legacySchema(target).last = true;
}

function legacyRegistration(type: SerializableClass): Registration {
  const fields = new Set<string>();
  let id: string | undefined;
  const lineage: object[] = [];
  for (let prototype = type.prototype; prototype; prototype = Object.getPrototypeOf(prototype)) {
    lineage.unshift(prototype);
  }
  for (const prototype of lineage) {
    const schema = legacySchemas.get(prototype);
    for (const field of schema?.fields ?? []) fields.add(field);
    if (schema?.id) id = schema.id;
  }
  let construct: "object" | undefined;
  let first = false;
  let last = false;
  for (let ctor: object | null = type; ctor; ctor = Object.getPrototypeOf(ctor)) {
    const schema = legacySchemas.get(ctor);
    construct ??= schema?.construct;
    first ||= schema?.first ?? false;
    last ||= schema?.last ?? false;
  }
  return {
    type,
    name: getOriginalNameOf(type),
    fields: [...fields],
    id,
    construct,
    extra: first ? "first" : last ? "last" : undefined,
  };
}

function findType(name: string): Registration {
  const explicit = types.get(name);
  if (explicit) return explicit;
  // Resolve after class initialization, when static className fields are available.
  const matches = [...legacyTypes].filter((type) => getOriginalNameOf(type) === name);
  if (matches.length !== 1) {
    throw new TypeError(`[Serializer] ${matches.length ? "Ambiguous" : "Unknown"} type ${name}`);
  }
  return legacyRegistration(matches[0]);
}

const own = (object: object, key: string, value: any) =>
  Object.defineProperty(object, key, { value, enumerable: true, writable: true, configurable: true });
const escapeSegment = (key: string) => key.replaceAll("~", "~0").replaceAll("/", "~1");

export function serialize(original: any): any {
  const paths = new WeakMap<object, string>();
  const ids = new Map<SerializableClass, Map<any, string>>();
  function encode(value: any, path: string): any {
    if (value === null || value === undefined || typeof value === "string" || typeof value === "boolean") {
      return value;
    }
    if (typeof value === "number") {
      if (!Number.isFinite(value)) throw new TypeError(`[Serializer] Non-finite number at ${path}`);
      return value;
    }
    if (typeof value !== "object") throw new TypeError(`[Serializer] Unsupported value at ${path}`);
    if (paths.has(value)) return { $: paths.get(value) };
    const prototype = Object.getPrototypeOf(value);
    const type = prototype?.constructor as SerializableClass | undefined;
    const schema = type && (constructors.get(type) ?? (legacyTypes.has(type) ? legacyRegistration(type) : undefined));
    if (schema?.id && value[schema.id] !== undefined && value[schema.id] !== null) {
      let classIds = ids.get(schema.type);
      if (!classIds) ids.set(schema.type, (classIds = new Map()));
      const id = value[schema.id];
      if (classIds.has(id)) return { $: classIds.get(id) };
      classIds.set(id, path);
    }
    paths.set(value, path);
    if (Array.isArray(value)) return value.map((item, index) => encode(item, `${path}/${index}`));
    if (!schema && prototype !== Object.prototype && prototype !== null) {
      throw new TypeError(`[Serializer] Unregistered object at ${path}`);
    }
    const result: Record<string, any> = schema ? { _: schema.name } : {};
    for (const key of schema?.fields ?? Object.keys(value)) {
      if (Object.hasOwn(value, key)) {
        own(
          result,
          key,
          schema?.rawFields?.includes(key)
            ? structuredClone(value[key])
            : encode(value[key], `${path}/${escapeSegment(key)}`),
        );
      }
    }
    return result;
  }
  return encode(original, "");
}

export function deserialize(original: any, extra?: any): any {
  const cache = new WeakMap<object, any>();
  const pending = new Set<object>();

  function resolve(path: unknown): any {
    if (typeof path !== "string" || (path !== "" && !path.startsWith("/"))) {
      throw new TypeError("[Serializer] Invalid reference path");
    }
    let value = original;
    for (const part of path === "" ? [] : path.slice(1).split("/")) {
      const key = part.replaceAll("~1", "/").replaceAll("~0", "~");
      if (value === null || typeof value !== "object" || !Object.hasOwn(value, key)) {
        throw new TypeError(`[Serializer] Cannot find object at path ${path}`);
      }
      value = value[key];
    }
    return value;
  }

  function decode(value: any): any {
    if (value === null || typeof value !== "object") return value;
    if (cache.has(value)) return cache.get(value);
    if (pending.has(value)) throw new TypeError("[Serializer] Cyclic constructor or reference dependency");
    if (Object.hasOwn(value, "$")) {
      if (Object.keys(value).length !== 1) throw new TypeError("[Serializer] Invalid reference object");
      pending.add(value);
      const result = decode(resolve(value.$));
      pending.delete(value);
      cache.set(value, result);
      return result;
    }
    if (Array.isArray(value)) {
      const result: any[] = [];
      cache.set(value, result);
      for (const item of value) result.push(decode(item));
      return result;
    }
    if (!Object.hasOwn(value, "_")) {
      const result: Record<string, any> = {};
      cache.set(value, result);
      for (const key of Object.keys(value)) own(result, key, decode(value[key]));
      return result;
    }
    if (typeof value._ !== "string") throw new TypeError("[Serializer] Invalid type tag");
    const schema = findType(value._);
    pending.add(value);
    const data: Record<string, any> = {};
    for (const key of schema.fields) {
      if (Object.hasOwn(value, key) && !schema.deferredFields?.includes(key)) {
        own(data, key, schema.rawFields?.includes(key) ? structuredClone(value[key]) : decode(value[key]));
      }
    }
    let instance: any;
    if (schema.create) instance = schema.create(data, extra);
    else {
      const args = schema.construct === "object" ? [data] : schema.fields.map((key) => data[key]);
      if (schema.extra === "first") args.unshift(extra);
      if (schema.extra === "last") args.push(extra);
      instance = new schema.type(...args);
    }
    pending.delete(value);
    cache.set(value, instance);
    for (const key of schema.deferredFields ?? []) {
      if (Object.hasOwn(value, key)) instance[key] = decode(value[key]);
    }
    return instance;
  }
  return decode(original);
}
