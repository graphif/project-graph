# @graphif/serializer

[Documentation](https://project-graph.top/docs/serializer)

Types declare their wire name, fields and constructor convention explicitly. Serialization does not use
`reflect-metadata`, emitted type metadata, inferred constructor arguments or runtime class names.

```ts
import { deserialize, serialize, serializableType } from "@graphif/serializer";

@serializableType("Vector", { fields: ["x", "y"] })
class Vector {
  constructor(
    public x: number,
    public y: number,
  ) {}
}

const data = serialize(new Vector(1.23456789, 2));
// { _: "Vector", x: 1.23456789, y: 2 }
const vector = deserialize(data); // Vector instance
```

- `fields` is the allowlist of stored fields and the positional constructor argument order.
  JSON property order never determines constructor argument order.
- `construct: "object"` passes one decoded field object instead of positional arguments.
- `extra: "first" | "last"` passes the second argument of `deserialize(data, context)` to the constructor.
- `id` deduplicates instances of the same registered type with the same ID, as the old `@id` decorator did.
- `create(data, context)` overrides construction for models with additional constructor options.
- `deferredFields` links relationships after construction and caching. Use this for cyclic model relationships;
  constructors must accept these fields being omitted. Other cyclic constructor dependencies throw an error.
- `rawFields` clones opaque payloads without interpreting `_` or `$` keys as protocol markers.

The wire format remains `{ _: "TypeName", ...fields }` with `{ $: "/path/to/value" }` references, including
forward references. Both reads and writes allocate fresh containers. Shared references keep their identity
within each decoded graph. Numbers retain their full precision; they are no longer rounded to two decimals.
Unknown types, unregistered runtime instances and invalid reference paths throw errors.

Existing `serializable`, `id`, `passObject`, `passExtraAtArg1`, `passExtraAtLastArg` and `configureSerializer`
exports remain as deprecated compatibility APIs for package consumers. They use local maps instead of reflection.
Their names are resolved after static class initialization. Application models should use `serializableType`
so that compressed class names and decorator initialization order cannot change the wire format.
