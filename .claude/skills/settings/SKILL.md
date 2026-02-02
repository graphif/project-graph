---
name: settings
description: Management and modification of application settings defined in project-graph. Use this skill when the user wants to add, remove, or modify application settings, categories, or their visual representations (icons, labels, controls). It covers the structure of the Settings struct, category hierarchy, and the define_settings macro.
---

# Settings

## Overview

This skill provides guidance for managing application settings in the `project-graph` codebase, specifically within `crates/project_graph/src/settings.rs`.

## Setting Structure

Settings are organized into a three-level hierarchy:

1. **Major Category**: High-level groups (e.g., "General", "Appearance").
2. **Minor Category**: Groups within a major category (e.g., "Account" under "General").
3. **Setting Item**: Individual configuration fields (e.g., "User Name" under "Account").

### The `define_settings!` Macro

All settings are defined using the `define_settings!` macro. This macro generates the `Settings` struct, its `Default` implementation, and metadata functions.

```rust
define_settings! {
    major_key: "Major Label" | Icon::MajorIcon {
        minor_key: "Minor Label" | Icon::MinorIcon {
            #[serde(default)] // Optional attributes
            field_name: Type = DefaultValue => {
                label: "Field Label",
                icon: Icon::FieldIcon,
                control: SettingControl::ControlType,
                description: "Optional field description"
            },
            // ... more fields
        },
        // ... more minor categories
    },
    // ... more major categories
}
```

## Available Controls

Controls are defined by the `SettingControl` enum:

- `SettingControl::Input`: Simple text input (for `String`).
- `SettingControl::Checkbox`: Boolean toggle (for `bool`).
- `SettingControl::Slider { min, max, step, suffix }`: Numeric slider (for `f32`, `u64`).
- `SettingControl::Select { options }`: Dropdown menu (for `String`). `options` is a slice of `(&str, &str)` (value, label).

## Implementation Details

- **Global Access**: Settings are managed via a global `LazyLock<Arc<RwLock<Settings>>>`.
- **API**:
  - `Settings::get()`: Returns a clone of the current settings.
  - `Settings::modify(|s| s.field = value)`: Thread-safe modification.
  - `Settings::load(storage)` / `Settings::save(storage)`: Persistence using `eframe` storage.

## Adding a New Setting

1.  Identify the appropriate major and minor category in `crates/project_graph/src/settings.rs`.
2.  Add a new field entry inside the macro call.
3.  Ensure the type implements `ControlRenderable`. Existing implementations: `String`, `bool`, `f32`, `u64`.
4.  If a new type is needed, implement `ControlRenderable` for it, handling the relevant `SettingControl` variants in the `render` method using `egui`.
5.  If a new control type is needed, update `SettingControl` enum and `ControlRenderable` implementations.
