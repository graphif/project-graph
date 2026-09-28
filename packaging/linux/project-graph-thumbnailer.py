#!/usr/bin/python3
"""Render a bounded, offline overview of a PRG; never execute document content."""
import json
import math
import os
import subprocess
import sys
import tempfile
import zipfile

import cairo
import gi
gi.require_version('Pango', '1.0')
gi.require_version('PangoCairo', '1.0')
from gi.repository import Pango, PangoCairo

MAX_JSON = 16 * 1024 * 1024


def prefers_light_theme():
    """Match the desktop color scheme when rendering file-manager previews."""
    gtk_theme = os.environ.get('GTK_THEME', '').lower()
    if ':dark' in gtk_theme or gtk_theme.endswith('-dark'):
        return False
    scheme = os.environ.get('COLOR_SCHEME', '').lower()
    if scheme in ('prefer-light', 'light'):
        return True
    if scheme in ('prefer-dark', 'dark'):
        return False
    try:
        result = subprocess.run(
            ['gsettings', 'get', 'org.gnome.desktop.interface', 'color-scheme'],
            check=False,
            capture_output=True,
            text=True,
            timeout=0.25,
        )
        return 'prefer-light' in result.stdout.lower()
    except (OSError, subprocess.SubprocessError):
        return False


def native_text(value):
    value = str(value)
    return value[2:] if value.startswith('s:') else value


def number(value, default=0.0):
    if isinstance(value, str) and value[:2] in ('i:', 'f:'):
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
        args = value.get('args')
        if isinstance(args, list) and len(args) == 2:
            return point(args)
        if 'x' in value and 'y' in value:
            return number(value['x']), number(value['y'])
    if isinstance(value, list) and len(value) == 2:
        return number(value[0]), number(value[1])
    return 0.0, 0.0


def reference_id(value):
    if not isinstance(value, dict):
        return ''
    return native_text(value.get('$ref', ''))


def layout_for(ctx, text, size):
    layout = PangoCairo.create_layout(ctx)
    font = Pango.FontDescription('Sans')
    font.set_absolute_size(size * Pango.SCALE)
    layout.set_font_description(font)
    layout.set_text(text, -1)
    natural_width, _ = layout.get_pixel_size()
    layout.set_width(max(1, min(400, natural_width)) * Pango.SCALE)
    layout.set_wrap(Pango.WrapMode.WORD_CHAR)
    layout.set_alignment(Pango.Alignment.CENTER)
    return layout


def rounded(ctx, x, y, w, h):
    radius = min(7, w / 2, h / 2)
    ctx.new_sub_path()
    for cx, cy, angle in [(x+w-radius, y+radius, -math.pi/2),
                          (x+w-radius, y+h-radius, 0),
                          (x+radius, y+h-radius, math.pi/2),
                          (x+radius, y+radius, math.pi)]:
        ctx.arc(cx, cy, radius, angle, angle+math.pi/2)
    ctx.close_path()


def render(source, output, requested_size):
    # Keep two device pixels per requested pixel for high-density previews.
    size = 2 * max(32, min(1024, int(requested_size)))
    if os.path.getsize(source) > 256 * 1024 * 1024:
        raise ValueError('Document exceeds thumbnail size limit')
    with zipfile.ZipFile(source) as archive:
        if len(archive.infolist()) > 10000:
            raise ValueError('Too many archive entries')
        info = archive.getinfo('stage.json')
        if info.file_size > MAX_JSON:
            raise ValueError('Graph exceeds thumbnail size limit')
        with archive.open(info) as stream:
            raw = stream.read(MAX_JSON + 1)
        if len(raw) > MAX_JSON:
            raise ValueError('Graph exceeds thumbnail size limit')
        graph = json.loads(raw)
    objects = graph.get('objects')
    if not isinstance(objects, list) or len(objects) > 5000:
        raise ValueError('Invalid or oversized graph')
    surface = cairo.ImageSurface(cairo.FORMAT_ARGB32, size, size)
    ctx = cairo.Context(surface)
    font_options = cairo.FontOptions()
    font_options.set_hint_metrics(cairo.HINT_METRICS_OFF)
    ctx.set_font_options(font_options)
    light = prefers_light_theme()
    palette = {
        'canvas': (0.965, 0.98, 0.965) if light else (0.094, 0.094, 0.145),
        'card': (1.0, 1.0, 1.0) if light else (0.118, 0.118, 0.18),
        'line': (0.38, 0.53, 0.42) if light else (0.537, 0.706, 0.98),
        'panel_line': (0.45, 0.58, 0.48) if light else (0.345, 0.357, 0.439),
        'panel_text': (0.14, 0.27, 0.17) if light else (0.804, 0.839, 0.957),
        'node': (0.91, 0.96, 0.92) if light else (0.19, 0.196, 0.267),
        'node_line': (0.255, 0.533, 0.337) if light else (0.796, 0.651, 0.969),
        'text': (0.14, 0.27, 0.17) if light else (0.804, 0.839, 0.957),
    }
    # Paint an opaque canvas first.  The previous rounded-only clip left the
    # four corners transparent, so file managers showed the desktop wallpaper
    # through the thumbnail and made the preview look cropped/inconsistent.
    ctx.set_source_rgb(*palette['canvas'])
    ctx.paint()
    # Keep the inner thumbnail card rounded while retaining a stable backdrop.
    ctx.save()
    rounded(ctx, 2, 2, size - 4, size - 4)
    ctx.clip()
    ctx.set_source_rgb(*palette['card'])
    ctx.fill()
    nodes, by_id, strokes = [], {}, []
    # Containers are regular text nodes whose ``container`` property points
    # at them from one or more child entities.  Keep the relationships so we
    # can reproduce the automatically sized container panel in the preview.
    container_members = {}
    for obj in objects:
        if not isinstance(obj, dict):
            continue
        props = obj.get('properties', {})
        transform = obj.get('transform', {})
        if not isinstance(props, dict) or not isinstance(transform, dict):
            continue
        x, y = point(transform.get('position'))
        if obj.get('type') == 'text_node':
            text = native_text(props.get('text', ''))[:512]
            font = max(8, min(64, number(props.get('font_size'), 24)))
            layout = layout_for(ctx, text, font)
            width, height = layout.get_pixel_size()
            node = (x, y, max(48, width+30), max(40, height+20), layout)
            nodes.append(node)
            object_id = native_text(props.get('id', ''))
            by_id[object_id] = node
            container_members.setdefault(object_id, [])
            container = props.get('container')
            if isinstance(container, dict):
                parent_id = reference_id(container)
                if parent_id:
                    container_members.setdefault(parent_id, []).append(object_id)
        elif obj.get('type') == 'pen_stroke':
            points = props.get('points', [])
            # Godot JSON native PackedVector2Array can be a typed dictionary.
            if isinstance(points, dict):
                points = points.get('args', [])
            if isinstance(points, list):
                line = [(x+px, y+py) for px, py in map(point, points[:2000])]
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
            member_rects.append(nested or (by_id.get(member_id) and by_id[member_id][:4]))
        member_rects = [rect for rect in member_rects if rect]
        resolving.discard(object_id)
        if not member_rects or object_id not in by_id:
            return None
        title_node = by_id[object_id]
        title_width, title_height = title_node[4].get_pixel_size()
        panel_left = min(rect[0] for rect in member_rects) - 30
        panel_top = min(rect[1] for rect in member_rects) - 30 - title_height
        panel_right = max(rect[0] + rect[2] for rect in member_rects) + 30
        panel_bottom = max(rect[1] + rect[3] for rect in member_rects) + 30
        rect = (panel_left, panel_top,
                max(panel_right-panel_left, title_width),
                max(panel_bottom-panel_top, title_height))
        container_rects[object_id] = rect
        return rect

    for object_id, members in container_members.items():
        if members and object_id in by_id:
            rect_for(object_id)

    # Container title nodes are not drawn at their saved position. Fit only
    # the resolved panels and visible leaf nodes, just as the drawing pass does.
    container_node_ids = {id(by_id[key]) for key in container_rects}
    visible_nodes = [node for node in nodes if id(node) not in container_node_ids]
    bounds = [(n[0], n[1]) for n in visible_nodes]
    bounds += [(n[0]+n[2], n[1]+n[3]) for n in visible_nodes]
    bounds += [p for line in strokes for p in line]
    for x, y, w, h in container_rects.values():
        bounds.extend([(x, y), (x+w, y+h)])
    connection_rects = {key: container_rects.get(key, node[:4])
                        for key, node in by_id.items()}
    # Include resolved connection curves in the fit.  A line can extend past
    # both node rectangles, especially for diagonal layouts, and must not be
    # clipped after scaling.
    for obj in objects:
        if not isinstance(obj, dict) or obj.get('type') != 'line_edge':
            continue
        props = obj.get('properties', {})
        if not isinstance(props, dict):
            continue
        source = connection_rects.get(reference_id(props.get('source')))
        target = connection_rects.get(reference_id(props.get('target')))
        if not source or not target:
            continue
        ax, ay = source[0]+source[2]/2, source[1]+source[3]/2
        bx, by = target[0]+target[2]/2, target[1]+target[3]/2
        bounds.extend([(ax, ay), (bx, by)])
    if bounds:
        left, top = min(p[0] for p in bounds), min(p[1] for p in bounds)
        width = max(1, max(p[0] for p in bounds)-left)
        height = max(1, max(p[1] for p in bounds)-top)
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
        ctx.translate((size-content_width)/2, (size-content_height)/2)
        ctx.scale(scale, scale)
        ctx.translate(-fit_left, -fit_top)
        # Layouts were measured before the world-to-image transform. Refresh
        # their Cairo context so glyphs are rasterized at the output scale.
        for node in nodes:
            PangoCairo.update_layout(ctx, node[4])
        ctx.set_line_width(max(2, 1/scale))
        ctx.set_line_cap(cairo.LINE_CAP_ROUND)
        ctx.set_source_rgb(*palette['line'])
        # Draw container panels behind connections and child nodes.  Their
        # size follows the same padding and header rules as TextNode's
        # update_container_layout method in the editor.
        ctx.set_line_width(max(2, 1/scale))
        ctx.set_source_rgb(*palette['panel_line'])
        for object_id, (x, y, w, h) in container_rects.items():
            ctx.set_source_rgb(*palette['panel_line'])
            rounded(ctx, x, y, w, h)
            ctx.stroke()
            title_layout = by_id[object_id][4]
            ctx.set_source_rgb(*palette['panel_text'])
            ctx.move_to(x + (w-title_layout.get_pixel_size()[0])/2, y + 10)
            PangoCairo.show_layout(ctx, title_layout)
        ctx.set_source_rgb(*palette['line'])
        for obj in objects:
            if not isinstance(obj, dict) or obj.get('type') != 'line_edge':
                continue
            props = obj.get('properties', {})
            if not isinstance(props, dict):
                continue
            refs = [props.get(k, {}) for k in ('source', 'target')]
            ends = [connection_rects.get(reference_id(r)) for r in refs]
            if all(ends):
                a, b = ends
                ax, ay = a[0]+a[2]/2, a[1]+a[3]/2
                bx, by = b[0]+b[2]/2, b[1]+b[3]/2
                ctx.move_to(ax, ay)
                ctx.curve_to((ax+bx)/2, ay, (ax+bx)/2, by, bx, by)
                ctx.stroke()
        for line in strokes:
            ctx.move_to(*line[0])
            for p in line[1:]:
                ctx.line_to(*p)
            ctx.stroke()
        for node in visible_nodes:
            x, y, w, h, layout = node
            rounded(ctx, x, y, w, h)
            ctx.set_source_rgb(*palette['node'])
            ctx.fill_preserve()
            ctx.set_source_rgb(*palette['node_line'])
            ctx.stroke()
            ctx.set_source_rgb(*palette['text'])
            ctx.move_to(x+(w-layout.get_pixel_size()[0])/2, y+10)
            PangoCairo.show_layout(ctx, layout)
    else:
        layout = layout_for(ctx, 'Project Graph\n空白画布', max(10, size/14))
        ctx.set_source_rgb(*palette['text'])
        ctx.move_to((size-layout.get_pixel_size()[0])/2, size*0.4)
        PangoCairo.show_layout(ctx, layout)
    fd, temp = tempfile.mkstemp(dir=os.path.dirname(os.path.abspath(output)), suffix='.png')
    os.close(fd)
    try:
        surface.write_to_png(temp)
        os.replace(temp, output)
    finally:
        if os.path.exists(temp):
            os.unlink(temp)


if __name__ == '__main__':
    try:
        render(*sys.argv[1:])
    except Exception as error:
        print(f'Project Graph thumbnail: {error}', file=sys.stderr)
        sys.exit(1)
