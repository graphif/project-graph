# Master / 2.x PRG compatibility

Master stores MessagePack arrays in `stage.msgpack` and uses serializer path
references (`$`) to share entities. The Godot 3.x format uses `stage.json`.
Opening an archive must select its format before validating its required entries.

## Dependency review

Godot provides ZIPReader, JSON, StreamPeerBuffer and native Image decoders, but
no MessagePack reader. Godot4MessagePack 0.5 (MIT, Luis Chirlaque Hernández,
commit 3804906acd98cd91101215c223ff10c23daf6991) was reviewed. It reads unbounded
container lengths, does not reject truncated buffers or trailing data, emits
console output for nil/false, and returns an error/data pair for binary values.
The older xtpor/godot-msgpack targets Godot 3. Neither is suitable for importing
untrusted files unchanged. The import reader therefore implements only the
bounded JSON-compatible subset emitted by master's serializer. It uses
StreamPeerBuffer for all numeric decoding and rejects binary/extension values.
It is not a general-purpose MessagePack implementation.

The Linux thumbnailer reuses msgpack-python 1.1.2 (Apache-2.0), supporting Python
3 including the installed 3.14 runtime. Its source release SHA256 is
3b60763c1373dd60f398488069bcdc703cd08a711477b5d480eecc9f9626f47e.
The RPM requires this version; `requirements-thumbnailer.txt` pins the source
release for hash-checked installs. Cairo/Pango/GdkPixbuf/librsvg supply rendering.

## Conversion contract

Import preserves UUIDs, world positions, grouping and edge endpoints. Existing
Godot text, pen and line nodes provide editing and history. Image/SVG attachments
use native TextureRect nodes. Multi-target edges become independent pairwise
branches; arcs use the existing Godot curve. These are visual approximations,
not full master editing parity. Collapse/lock state, details, custom font and
border/arrow styles remain in original data but do not gain new editor behavior.
Every source archive entry is retained under `legacy/` in the converted archive.
Saving produces a Godot 3.x archive: master cannot consume the edited graph.
The preserved source can be recovered by removing the `legacy/` entry prefix.
Opening and testing never writes the supplied source files.

## Verification

Authorized X11 / Compatibility regression runs passed independently for all
three Desktop/project source documents. Restored objects: 1029 / 180 / 625;
extra objects are multi-target branches. Each run exercised stage loading,
endpoint references, attachment textures and collisions, editing, undo/redo,
save/reload, source checksum preservation and byte-identical archived entries.
Malformed MessagePack and float64 decoding are covered. The initial combined
headless run reached the 60-second limit after completing the first two files;
X11 per-document runs completed with exit code 0. PNG screenshots were inspected.
Godot resources were handled using MCP script read/create/modify and editor
execution (PackedScene/ResourceSaver and authorized engine test processes).

User manual validation, still pending:
1. Open each old project from the file dialog. It should open and fit the graph,
   without asking for metadata.json/stage.json. Inspect images and nested groups.
   If loading fails, check missing attachments and unsupported type messages.
2. Zoom out: retain nested group summaries while ordinary members disappear;
   zoom back in: members and their input areas return.
3. Move an imported image and edit a text node. Undo/redo should restore the
   change. Save to a new file, reopen it and verify geometry, text and pictures.
   If images cannot be picked, inspect the native TextureRect/CollisionShape,
   EntityLayerMover and registry entry.
4. Inspect `legacy/` in the converted ZIP to recover source entries. Conversion
   is one-way to the Godot format; master does not read the edited stage.json.

New RPM installation, platform export compatibility and every legacy style
variant have not been verified. Unknown entity types fail explicitly instead of
silently skipping objects.
