#!/usr/bin/python3
"""Render a bounded, offline overview of a PRG; never execute document content."""

import io
import json
import math
import os
import subprocess
import sys
import tempfile
import zipfile

import cairo
import gi

gi.require_version("Pango", "1.0")
gi.require_version("PangoCairo", "1.0")
from gi.repository import GLib, Pango, PangoCairo

MAX_JSON = 16 * 1024 * 1024


def prefers_light_theme():
    """Match the desktop color scheme when rendering file-manager previews."""
    gtk_theme = os.environ.get("GTK_THEME", "").lower()
    if ":dark" in gtk_theme or gtk_theme.endswith("-dark"):
        return False
    scheme = os.environ.get("COLOR_SCHEME", "").lower()
    if scheme in ("prefer-light", "light"):
        return True
    if scheme in ("prefer-dark", "dark"):
        return False
    try:
        result = subprocess.run(
            ["gsettings", "get", "org.gnome.desktop.interface", "color-scheme"],
            check=False,
            capture_output=True,
            text=True,
            timeout=0.25,
        )
        return "prefer-light" in result.stdout.lower()
    except (OSError, subprocess.SubprocessError):
        return False


def native_text(value):
    value = str(value)
    return value.removeprefix("s:")


def number(value, default=0.0):
    if isinstance(value, str) and value[:2] in ("i:", "f:"):
        try:
            value = float(value[2:])
        except ValueError:
            return default
    if isinstance(value, (int, float)) and math.isfinite(value):
        return max(-1e7, min(1e7, value))
    return default


def point(value):
    # JSON.from_native may encode vectors either as a plain array or as a
    # typed dictionary.  Accept both forms so a thumbnail never collapses
    # every object onto the origin when the native wrapper is present.
    if isinstance(value, dict):
        args = value.get("args")
        if isinstance(args, list) and len(args) == 2:
            return point(args)
        if "x" in value and "y" in value:
            return number(value["x"]), number(value["y"])
    if isinstance(value, list) and len(value) == 2:
        return number(value[0]), number(value[1])
    return 0.0, 0.0


def reference_id(value):
    if not isinstance(value, dict):
        return ""
    return native_text(value.get("$ref", ""))


def layout_for(ctx, text, size):
    layout = PangoCairo.create_layout(ctx)
    font = Pango.FontDescription("Sans")
    font.set_absolute_size(size * Pango.SCALE)
    layout.set_font_description(font)
    layout.set_text(text, -1)
    # Canvas text only breaks at saved newlines; fixed_width is a minimum.
    layout.set_width(-1)
    layout.set_alignment(Pango.Alignment.CENTER)
    return layout


def native_color(value):
    """Decode the saved Godot Color without treating transparent as opaque."""
    if isinstance(value, dict):
        value = value.get("args")
    if isinstance(value, list) and len(value) == 4:
        return tuple(max(0.0, min(1.0, number(channel))) for channel in value)
    return (0.0, 0.0, 0.0, 0.0)


def blend(background, foreground):
    alpha = foreground[3]
    return tuple(
        a * (1 - alpha) + b * alpha for a, b in zip(background, foreground[:3])
    )


def neutral_color(background, contrast=4.5):
    # Same neutral contrast rule as theme_palette.gd, in linear sRGB.
    linear = [
        c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
        for c in background[:3]
    ]
    luminance = sum(a * b for a, b in zip(linear, (0.2126, 0.7152, 0.0722)))
    dark = (luminance + 0.05) / 0.05 >= 1.05 / (luminance + 0.05)
    if contrast == 4.5:
        dark = luminance > 0.18
    level = (
        (luminance + 0.05) / contrast - 0.05
        if dark
        else contrast * (luminance + 0.05) - 0.05
    )
    level = max(0.0, min(1.0, level))
    srgb = level * 12.92 if level <= 0.0031308 else 1.055 * level ** (1 / 2.4) - 0.055
    return (srgb, srgb, srgb)


def rounded(ctx, x, y, w, h, radius=24):
    radius = min(radius, max(0, math.floor(min(w, h) / 2 - 3)))
    # Project-specific continuous corners; Cairo supplies the cubic renderer.
    curve = [
        (0, 0),
        (0.34, 0),
        (0.587401052, 0),
        (0.793700526, 0.206299474),
        (1, 0.412598948),
        (1, 0.66),
        (1, 1),
    ]
    origins = [
        (x + w - radius, y),
        (x + w, y + h - radius),
        (x + radius, y + h),
        (x, y + radius),
    ]
    for index, (ox, oy) in enumerate(origins):
        points = []
        for px, py in curve:
            px, py = px * radius, py * radius
            dx, dy = [(px, py), (-py, px), (-px, -py), (py, -px)][index]
            points.append((ox + dx, oy + dy))
        (ctx.move_to if index == 0 else ctx.line_to)(*points[0])
        for offset in (0, 3):
            ctx.curve_to(*points[offset + 1], *points[offset + 2], *points[offset + 3])
    ctx.close_path()


def connection_port(ctx, rect, toward):
    """Find a port on the same outline Cairo draws, using its hit test."""
    x, y, w, h = rect
    center = (x + w / 2, y + h / 2)
    dx, dy = toward[0] - center[0], toward[1] - center[1]
    distance = math.hypot(dx, dy)
    if distance < 1e-6:
        return center, (0.0, 0.0)
    dx, dy = dx / distance, dy / distance
    rounded(ctx, *rect)
    low, high = 0.0, math.hypot(w, h)
    for _ in range(24):
        mid = (low + high) / 2
        if ctx.in_fill(center[0] + dx * mid, center[1] + dy * mid):
            low = mid
        else:
            high = mid
    port = (center[0] + dx * low, center[1] + dy * low)
    # Cairo flattens the native path; the nearest segment gives its normal.
    closest, normal, previous, first = math.inf, (dx, dy), None, None
    for kind, coords in ctx.copy_path_flat():
        if kind == cairo.PATH_MOVE_TO:
            previous = first = coords
        elif kind in (cairo.PATH_LINE_TO, cairo.PATH_CLOSE_PATH):
            if kind == cairo.PATH_CLOSE_PATH:
                coords = first
            vx, vy = coords[0] - previous[0], coords[1] - previous[1]
            length = math.hypot(vx, vy)
            if length:
                t = max(
                    0,
                    min(
                        1,
                        ((port[0] - previous[0]) * vx + (port[1] - previous[1]) * vy)
                        / length**2,
                    ),
                )
                gap = math.dist(port, (previous[0] + t * vx, previous[1] + t * vy))
                if gap < closest:
                    closest, normal = gap, (vy / length, -vx / length)
            previous = coords
    ctx.new_path()
    return port, normal


def curve_path(ctx, curve):
    ctx.move_to(*curve[0])
    ctx.curve_to(*curve[1], *curve[2], *curve[3])


def archive_bytes(archive, name, limit=MAX_JSON):
    info = archive.getinfo(name)
    if info.file_size > limit:
        raise ValueError("Archive entry exceeds preview limit")
    with archive.open(info) as stream:
        data = stream.read(limit + 1)
    if len(data) > limit:
        raise ValueError("Archive entry exceeds preview limit")
    return data


def legacy_graph(stage):
    """Adapt master's serializer paths to the thumbnailer's stable ID graph."""
    paths, entities = {}, {}

    def visit(value, path="", depth=0):
        if depth > 100 or len(paths) > 300000:
            raise ValueError("Legacy graph exceeds preview limit")
        paths[path] = value
        if isinstance(value, dict):
            if value.get("uuid"):
                entities[value["uuid"]] = value
            for key, child in value.items():
                visit(child, path + "/" + str(key), depth + 1)
        elif isinstance(value, list):
            for index, child in enumerate(value):
                visit(child, path + "/" + str(index), depth + 1)

    if not isinstance(stage, list):
        raise TypeError("Legacy stage must be an array")
    visit(stage)
    if len(entities) > 5000:
        raise ValueError("Too many legacy entities")

    def resolve(value):
        if isinstance(value, dict) and "$" in value:
            value = paths.get(value["$"])
        if not isinstance(value, dict) or not value.get("uuid"):
            raise ValueError("Broken legacy object reference")
        return value["uuid"]

    parents = {}
    for identifier, obj in entities.items():
        if obj.get("_") == "Section":
            for child in obj.get("children", []):
                parents[resolve(child)] = identifier

    def color(value):
        return {
            "type": "Color",
            "args": [number(value.get(k)) / 255 for k in ("r", "g", "b")]
            + [number(value.get("a"))],
        }

    def rect(obj):
        shapes = obj.get("collisionBox", obj.get("_collisionBoxNormal", {})).get(
            "shapes", []
        )
        for shape in shapes:
            if shape.get("_") == "Rectangle":
                return (*point(shape.get("location")), *point(shape.get("size")))
        return (0, 0, 30, 30)

    objects = []
    for identifier, obj in entities.items():
        kind = obj.get("_")
        props = {"id": identifier}
        if identifier in parents:
            props["container"] = {"$ref": parents[identifier]}
        position = rect(obj)[:2]
        if kind in (
            "TextNode",
            "Section",
            "UrlNode",
            "ConnectPoint",
            "ImageNode",
            "SvgNode",
        ):
            props.update(
                text=obj.get("text", obj.get("title", "")),
                font_size=32 * 2 ** (number(obj.get("fontScaleLevel")) / 2),
                fill_color=color(obj.get("color", {})),
                preview_rect=rect(obj),
            )
            if kind in ("ImageNode", "SvgNode"):
                props["preview_attachment"] = obj.get("attachmentId", "")
            objects.append(
                {
                    "type": "text_node",
                    "properties": props,
                    "transform": {"position": position},
                }
            )
        elif kind == "PenStroke":
            props["points"] = [
                point(v.get("location")) for v in obj.get("segments", [])
            ]
            objects.append({"type": "pen_stroke", "properties": props})
        elif kind in ("LineEdge", "ArcEdge", "MultiTargetUndirectedEdge"):
            endpoints = [resolve(v) for v in obj.get("associationList", [])]
            for index, target in enumerate(endpoints[1:]):
                edge = dict(
                    props,
                    source={"$ref": endpoints[0]},
                    target={"$ref": target},
                    text=obj.get("text", "") if index == 0 else "",
                    show_arrow=kind != "MultiTargetUndirectedEdge"
                    and obj.get("arrowType") != "none",
                    use_theme_color=number(obj.get("color", {}).get("a")) == 0,
                    stroke_color=color(obj.get("color", {})),
                )
                objects.append({"type": "line_edge", "properties": edge})
        else:
            raise ValueError("Unsupported legacy entity: " + str(kind))
    return {"objects": objects}


def image_surface(data, extension):
    # Native decoders handle PNG, JPEG and SVG; no document URLs are fetched.
    if extension.lower() == "svg":
        gi.require_version("Rsvg", "2.0")
        from gi.repository import Rsvg

        handle = Rsvg.Handle.new_from_data(data)
        surface = cairo.ImageSurface(cairo.FORMAT_ARGB32, 512, 512)
        viewport = Rsvg.Rectangle()
        viewport.x = viewport.y = 0
        viewport.width = viewport.height = 512
        handle.render_document(cairo.Context(surface), viewport)
        return surface
    gi.require_version("GdkPixbuf", "2.0")
    from gi.repository import GdkPixbuf, Gio

    pixbuf = GdkPixbuf.Pixbuf.new_from_stream_at_scale(
        Gio.MemoryInputStream.new_from_bytes(GLib.Bytes.new(data)),
        1024,
        1024,
        True,
        None,
    )
    _, encoded = pixbuf.save_to_bufferv("png", [], [])
    return cairo.ImageSurface.create_from_png(io.BytesIO(encoded))


def write_preview(surface, output):
    fd, temp = tempfile.mkstemp(
        dir=os.path.dirname(os.path.abspath(output)), suffix=".png"
    )
    os.close(fd)
    try:
        surface.write_to_png(temp)
        os.replace(temp, output)
    finally:
        if os.path.exists(temp):
            os.unlink(temp)


def render(source, output, requested_size):
    # Keep two device pixels per requested pixel for high-density previews.
    size = 2 * max(32, min(1024, int(requested_size)))
    if os.path.getsize(source) > 256 * 1024 * 1024:
        raise ValueError("Document exceeds thumbnail size limit")
    with zipfile.ZipFile(source) as archive:
        if len(archive.infolist()) > 10000:
            raise ValueError("Too many archive entries")
        attachments = {}
        if "stage.json" in archive.namelist():
            graph = json.loads(archive_bytes(archive, "stage.json"))
        elif "stage.msgpack" in archive.namelist():
            if "thumbnail.png" in archive.namelist():
                original = image_surface(archive_bytes(archive, "thumbnail.png"), "png")
                surface = cairo.ImageSurface(cairo.FORMAT_ARGB32, size, size)
                ctx = cairo.Context(surface)
                factor = min(size / original.get_width(), size / original.get_height())
                ctx.translate(
                    (size - original.get_width() * factor) / 2,
                    (size - original.get_height() * factor) / 2,
                )
                ctx.scale(factor, factor)
                ctx.set_source_surface(original)
                ctx.paint()
                write_preview(surface, output)
                return
            import msgpack

            graph = legacy_graph(
                msgpack.unpackb(
                    archive_bytes(archive, "stage.msgpack"),
                    max_str_len=MAX_JSON,
                    max_array_len=300000,
                    max_map_len=300000,
                )
            )
            for obj in graph["objects"]:
                identifier = obj["properties"].get("preview_attachment")
                if not identifier:
                    continue
                for name in archive.namelist():
                    if name.startswith("attachments/" + identifier + "."):
                        attachments[identifier] = image_surface(
                            archive_bytes(archive, name), name.rsplit(".", 1)[-1]
                        )
                        break
        else:
            raise ValueError("Missing stage.json or stage.msgpack")
    objects = graph.get("objects")
    if not isinstance(objects, list) or len(objects) > 5000:
        raise ValueError("Invalid or oversized graph")
    surface = cairo.ImageSurface(cairo.FORMAT_ARGB32, size, size)
    ctx = cairo.Context(surface)
    font_options = cairo.FontOptions()
    font_options.set_hint_metrics(cairo.HINT_METRICS_OFF)
    ctx.set_font_options(font_options)
    light = prefers_light_theme()
    canvas = (
        (239 / 255, 241 / 255, 245 / 255) if light else (30 / 255, 30 / 255, 46 / 255)
    )
    ctx.set_source_rgb(*canvas)
    ctx.paint()
    # The thumbnail is the canvas itself, including its opaque corners.
    nodes, by_id, strokes = [], {}, []
    # Containers are regular text nodes whose ``container`` property points
    # at them from one or more child entities.  Keep the relationships so we
    # can reproduce the automatically sized container panel in the preview.
    container_members = {}
    node_props, parents, fills, fill_layers = {}, {}, {}, {}
    for obj in objects:
        if not isinstance(obj, dict):
            continue
        props = obj.get("properties", {})
        transform = obj.get("transform", {})
        if not isinstance(props, dict) or not isinstance(transform, dict):
            continue
        x, y = point(transform.get("position"))
        if obj.get("type") == "text_node":
            text = native_text(props.get("text", ""))[:512]
            font = max(8, min(64, number(props.get("font_size"), 24)))
            layout = layout_for(ctx, text, font)
            width, height = layout.get_pixel_size()
            node = (
                x,
                y,
                max(width + 62, number(props.get("fixed_width"))),
                height + 20,
                layout,
            )
            if "preview_rect" in props:
                node = (*props["preview_rect"], layout)
            nodes.append(node)
            object_id = native_text(props.get("id", ""))
            by_id[object_id] = node
            node_props[object_id] = props
            fills[object_id] = native_color(props.get("fill_color"))
            container_members.setdefault(object_id, [])
            container = props.get("container")
            if isinstance(container, dict):
                parent_id = reference_id(container)
                if parent_id:
                    container_members.setdefault(parent_id, []).append(object_id)
                    parents[object_id] = parent_id
        elif obj.get("type") == "pen_stroke":
            points = props.get("points", [])
            # Godot JSON native PackedVector2Array can be a typed dictionary.
            if isinstance(points, dict):
                points = points.get("args", [])
            if isinstance(points, list):
                line = [(x + px, y + py) for px, py in map(point, points[:2000])]
                if len(line) >= 2:
                    strokes.append(line)

    # Resolve container rectangles before calculating the camera fit.  The
    # old fit was based only on child nodes, so nested containers or a tall
    # title could extend beyond the thumbnail even though the panel itself
    # was drawn later.
    container_rects = {}
    resolving = set()

    def rect_for(object_id):
        if object_id in container_rects:
            return container_rects[object_id]
        if object_id in resolving:
            return None
        resolving.add(object_id)
        member_rects = []
        for member_id in container_members.get(object_id, []):
            nested = rect_for(member_id) if container_members.get(member_id) else None
            member_rects.append(
                nested or (by_id.get(member_id) and by_id[member_id][:4])
            )
        member_rects = [rect for rect in member_rects if rect]
        resolving.discard(object_id)
        if not member_rects or object_id not in by_id:
            return None
        title_node = by_id[object_id]
        title_width, title_height = title_node[2:4]
        panel_left = min(rect[0] for rect in member_rects) - 30
        panel_top = min(rect[1] for rect in member_rects) - 30 - title_height
        panel_right = max(rect[0] + rect[2] for rect in member_rects) + 30
        panel_bottom = max(rect[1] + rect[3] for rect in member_rects) + 30
        rect = (
            panel_left,
            panel_top,
            max(panel_right - panel_left, title_width),
            max(panel_bottom - panel_top, title_height),
        )
        container_rects[object_id] = rect
        return rect

    for object_id, members in container_members.items():
        if members and object_id in by_id:
            rect_for(object_id)

    def ancestry(object_id):
        chain = []
        while object_id in by_id and object_id not in chain:
            chain.append(object_id)
            object_id = parents.get(object_id)
        return list(reversed(chain))

    chains = {key: ancestry(key) for key in by_id}
    # Resolve alpha from leaves outward; draw panels in the reverse order.
    ordered_ids = sorted(by_id, key=lambda key: (len(chains[key]), key))
    for key in reversed(ordered_ids):
        same_color = [
            fill_layers.get(child, 1)
            for child in container_members[key]
            if child in fills
            and all(abs(a - b) < 1e-5 for a, b in zip(fills[key][:3], fills[child][:3]))
        ]
        fill_layers[key] = 1 + max(same_color, default=0)
    display_fills = {
        key: (*fill[:3], fill[3] * 0.78 ** (fill_layers[key] - 1))
        for key, fill in fills.items()
    }
    backgrounds = {}
    for key in by_id:
        background = canvas
        for ancestor in chains[key]:
            background = blend(background, display_fills[ancestor])
        backgrounds[key] = background

    def draw_node(key, rect, title=False):
        x, y, w, h = rect
        attachment = attachments.get(node_props[key].get("preview_attachment"))
        if attachment:
            ctx.save()
            ctx.translate(x, y)
            ctx.scale(w / attachment.get_width(), h / attachment.get_height())
            ctx.set_source_surface(attachment)
            ctx.paint()
            ctx.restore()
            return
        rounded(ctx, x, y, w, h)
        ctx.set_source_rgba(*display_fills[key])
        ctx.fill_preserve()
        ctx.set_source_rgb(*neutral_color(backgrounds[key]))
        ctx.set_line_width(max(1, 1 / scale))
        ctx.stroke()
        foreground = native_color(node_props[key].get("text_color"))
        if foreground[3] == 0:
            ctx.set_source_rgb(*neutral_color(backgrounds[key], 7))
        else:
            ctx.set_source_rgba(*foreground)
        layout = by_id[key][4]
        # A container header includes the same vertical padding as a node.
        text_height = layout.get_pixel_size()[1]
        header_height = by_id[key][3] if title else h
        ctx.move_to(
            x + (w - layout.get_pixel_size()[0]) / 2,
            y + (header_height - text_height) / 2,
        )
        PangoCairo.show_layout(ctx, layout)

    # Container title nodes are not drawn at their saved position. Fit only
    # the resolved panels and visible leaf nodes, just as the drawing pass does.
    container_node_ids = {id(by_id[key]) for key in container_rects}
    visible_nodes = [node for node in nodes if id(node) not in container_node_ids]
    bounds = [(n[0], n[1]) for n in visible_nodes]
    bounds += [(n[0] + n[2], n[1] + n[3]) for n in visible_nodes]
    bounds += [p for line in strokes for p in line]
    for x, y, w, h in container_rects.values():
        bounds.extend([(x, y), (x + w, y + h)])
    connection_rects = {
        key: container_rects.get(key, node[:4]) for key, node in by_id.items()
    }
    edges = []
    for obj in objects:
        if not isinstance(obj, dict) or obj.get("type") != "line_edge":
            continue
        props = obj.get("properties", {})
        if not isinstance(props, dict):
            continue
        source_id, target_id = [
            reference_id(props.get(k)) for k in ("source", "target")
        ]
        source, target = (
            connection_rects.get(source_id),
            connection_rects.get(target_id),
        )
        if not source or not target:
            continue
        # Connections into a container's own descendant use its title header.
        if source_id in chains[target_id][:-1]:
            source = (*source[:3], by_id[source_id][3])
        if target_id in chains[source_id][:-1]:
            target = (*target[:3], by_id[target_id][3])
        a_center = (source[0] + source[2] / 2, source[1] + source[3] / 2)
        b_center = (target[0] + target[2] / 2, target[1] + target[3] / 2)
        a, normal_a = connection_port(ctx, source, b_center)
        b, normal_b = connection_port(ctx, target, a_center)
        gap = (b[0] - a[0]) * normal_a[0] + (b[1] - a[1]) * normal_a[1]
        if gap <= 1:
            continue
        stroke_width = max(1, min(12, number(props.get("stroke_width"), 2)))
        head_length = (
            min(max(6, 3 * stroke_width + 2), 0.45 * gap)
            if props.get("show_arrow", True)
            else 0
        )
        end = (b[0] + normal_b[0] * head_length, b[1] + normal_b[1] * head_length)
        handle = min(max(0, gap - head_length) * 0.45, 96)
        curve = (
            a,
            (a[0] + normal_a[0] * handle, a[1] + normal_a[1] * handle),
            (end[0] + normal_b[0] * handle, end[1] + normal_b[1] * handle),
            end,
        )
        # Convex hull of the control points also bounds the native cubic curve.
        bounds.extend(curve)
        midpoint = tuple(
            (curve[0][i] + 3 * curve[1][i] + 3 * curve[2][i] + curve[3][i]) / 8
            for i in (0, 1)
        )
        background = canvas
        ancestors = set(chains[source_id][:-1] + chains[target_id][:-1])
        for key in ordered_ids:
            if key not in ancestors or key not in container_rects:
                continue
            x, y, w, h = container_rects[key]
            if x <= midpoint[0] <= x + w and y <= midpoint[1] <= y + h:
                background = blend(background, display_fills[key])
        color = (
            (*neutral_color(background), 1)
            if props.get("use_theme_color", True)
            else native_color(props.get("stroke_color"))
        )
        caption = None
        text = native_text(props.get("text", ""))[:512]
        if text:
            layout = layout_for(ctx, text, 16)
            w, h = layout.get_pixel_size()
            rect = (
                midpoint[0] - (w + 58) / 2,
                midpoint[1] - (h + 12) / 2,
                w + 58,
                h + 12,
            )
            caption = (layout, rect)
            bounds.extend([rect[:2], (rect[0] + rect[2], rect[1] + rect[3])])
        head = []
        if head_length:
            nx, ny = normal_b
            head = [
                b,
                (end[0] - ny * head_length * 0.4, end[1] + nx * head_length * 0.4),
                (end[0] + ny * head_length * 0.4, end[1] - nx * head_length * 0.4),
            ]
            bounds.extend(head)
        edges.append((curve, head, stroke_width, color, caption))
    if bounds:
        left, top = min(p[0] for p in bounds), min(p[1] for p in bounds)
        width = max(1, max(p[0] for p in bounds) - left)
        height = max(1, max(p[1] for p in bounds) - top)
        # Container panels add their member padding and a title header around
        # the raw node bounds. Reserve that space before fitting the overview
        # so the outer border is not clipped at the thumbnail edges.
        fit_left, fit_top = left, top
        fit_width, fit_height = width, height
        # Fit the actual graph bounds, not a square proxy.  One shared pixel
        # margin is applied on every side, so wide and tall graphs both keep
        # equal empty borders without being forced into a square layout.
        frame_padding = max(12.0, size * 0.12)
        available_width = max(1.0, size - frame_padding * 2.0)
        available_height = max(1.0, size - frame_padding * 2.0)
        scale = min(available_width / fit_width, available_height / fit_height)
        content_width = fit_width * scale
        content_height = fit_height * scale
        ctx.translate((size - content_width) / 2, (size - content_height) / 2)
        ctx.scale(scale, scale)
        ctx.translate(-fit_left, -fit_top)
        # Layouts were measured before the world-to-image transform. Refresh
        # their Cairo context so glyphs are rasterized at the output scale.
        for node in nodes:
            PangoCairo.update_layout(ctx, node[4])
        ctx.set_line_cap(cairo.LINE_CAP_ROUND)
        for key in ordered_ids:
            if key in container_rects:
                draw_node(key, container_rects[key], title=True)
        ctx.set_line_width(max(2, 1 / scale))
        ctx.set_source_rgb(*neutral_color(canvas))
        for curve, head, stroke_width, color, caption in edges:
            ctx.set_line_width(max(stroke_width, 1 / scale))
            ctx.set_source_rgba(*color)
            curve_path(ctx, curve)
            ctx.stroke()
            if head:
                ctx.move_to(*head[0])
                for vertex in head[1:]:
                    ctx.line_to(*vertex)
                ctx.close_path()
                ctx.fill()
        ctx.set_line_width(max(2, 1 / scale))
        ctx.set_source_rgb(*neutral_color(canvas))
        for line in strokes:
            ctx.move_to(*line[0])
            for p in line[1:]:
                ctx.line_to(*p)
            ctx.stroke()
        ctx.set_source_rgb(*neutral_color(canvas))
        ctx.set_line_width(max(2, 1 / scale))
        for key in ordered_ids:
            if key not in container_rects:
                draw_node(key, by_id[key][:4])
        # Captions sit above the line and nodes, as in the editor scene.
        for _, _, _, color, caption in edges:
            if not caption:
                continue
            layout, (x, y, w, h) = caption
            PangoCairo.update_layout(ctx, layout)
            rounded(ctx, x, y, w, h, radius=12)
            ctx.set_source_rgba(*color)
            ctx.fill()
            foreground = neutral_color(color, 7)
            ctx.set_source_rgb(*((0, 0, 0) if foreground[0] < 0.5 else (1, 1, 1)))
            ctx.move_to(
                x + (w - layout.get_pixel_size()[0]) / 2,
                y + (h - layout.get_pixel_size()[1]) / 2,
            )
            PangoCairo.show_layout(ctx, layout)
    else:
        layout = layout_for(ctx, "Project Graph\n空白画布", max(10, size / 14))
        ctx.set_source_rgb(*neutral_color(canvas, 7))
        ctx.move_to((size - layout.get_pixel_size()[0]) / 2, size * 0.4)
        PangoCairo.show_layout(ctx, layout)
    write_preview(surface, output)


if __name__ == "__main__":
    try:
        render(*sys.argv[1:])
    except Exception as error:  # noqa: BLE001 - thumbnailers must report failure to the desktop
        print(f"Project Graph thumbnail: {error}", file=sys.stderr)
        sys.exit(1)
