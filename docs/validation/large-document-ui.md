# Large-document UI refresh

The welcome/status UI used to encode the complete document twice every 0.3 s:
for dirty tab titles and for hidden Outline/References/Find windows. With the
1029-object imported tutorial, one UI tick averaged 332 ms in the debug engine.

Dirty checks now compare native persisted values against an independent saved
baseline, preserving stable object IDs across restore. Arrays, dictionaries and
packed arrays are copied into the baseline. File serialization is unchanged.
Hidden auxiliary windows do not request a serialized graph.

This reuses Godot Variant equality and native array/dictionary copying; no
hashing or serialization dependency is added. The initial 6 ms measurement
used an incomplete saved baseline; a subsequent clean-document check measured
about 25 ms. This change alone does not achieve 120 FPS. The later navigation
optimization caches checks by document revision and only examines active
editors; see `large-document-navigation.md` for the measured final behavior.

`native_dirty_smoke` verifies save cleanliness, camera-only navigation, text,
references, containment, transforms, loading/replacing objects, object addition
and packed-array edits. The first run caught shared packed-array references;
copying the packed baseline fixed the regression. X11/Compatibility passed.
Godot resources were read, modified and tested via Godot MCP.

Pending manual check: open the large tutorial, pan/zoom, then edit a node and
undo back to the saved state. The tab should only show the unsaved marker for
actual document differences. Open Outline/References/Find and change text;
results should refresh. If not, inspect comparison baselines and window
visibility gates. New release/RPM installation and all export platforms have
not been tested for this change.
