# Canvas text editing

Node and edge-caption editing reuse their visible background. Entering an editor
keeps the object's position and bounds; typing grows the shared text layout without
moving its origin. Captions remain attached to the curve midpoint.

Reuse evaluated: Godot Label, TextEdit, native font metrics and theme constants
already supply shaping, IME, caret and selection behavior. No third-party widget
or custom text renderer is needed. TextEdit's `wrap_offset` and rounded row height
must be accounted for when matching Label geometry. TextEdit includes spacing after
the last row; reserve that space in the displayed label before editing begins.
See [Godot TextEdit implementation](https://github.com/godotengine/godot/blob/master/scene/gui/text_edit.cpp).

Automatic wrapping is disabled, including for nodes with a preferred fixed width.
Only Shift+Enter adds a line; Enter commits one history transaction, Escape cancels.
Long drafts grow the text background. Label remains the background and TextEdit
renders only editable text, selection and caret.

Regression checks: `text_edit_geometry_smoke.gd`, `canvas_text_focus_smoke.gd` and
`edge_caption_smoke.gd`. Pointer tests map SubViewport pixels to container size so
OS scale and canvas zoom do not send synthetic clicks outside the intended control.

Manual: double-click short Chinese text on both endpoints and the edge caption.
Verify all trailing characters remain visible, entering editing does not move the
box, and clicking inside selected text places the caret. Type a long line, press
Shift+Enter, then Enter. Verify no automatic wrapping, one explicit newline, and
undo/redo restores the complete edit. Check for clipping, unexpected scrollbars,
or a shifted background at different canvas and desktop scale settings. Native
IME candidate selection should also be checked on the user's desktop.
