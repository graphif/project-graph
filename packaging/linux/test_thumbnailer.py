"""Offline regressions for preview framing and output resolution."""

import importlib.util
import json
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest.mock import patch

import cairo

MODULE_PATH = Path(__file__).with_name("project-graph-thumbnailer.py")
SPEC = importlib.util.spec_from_file_location("thumbnailer", MODULE_PATH)
thumbnailer = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(thumbnailer)


class ThumbnailTests(unittest.TestCase):
    def render_graph(self, objects, light=False):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory, "graph.prg")
            output = Path(directory, "graph.png")
            with zipfile.ZipFile(source, "w") as archive:
                archive.writestr("stage.json", json.dumps({"objects": objects}))
            with patch.object(thumbnailer, "prefers_light_theme", return_value=light):
                thumbnailer.render(str(source), str(output), 256)
            return output.read_bytes()

    def pixels(self, png):
        import io
        import sys

        surface = cairo.ImageSurface.create_from_png(io.BytesIO(png))
        data = surface.get_data()
        return [
            tuple(int.from_bytes(data[i : i + 4], sys.byteorder).to_bytes(4, "big")[1:])
            for i in range(0, len(data), 4)
        ]

    def node(self, identifier, text, parent="", fill=(1, 1, 1, 0), x=0, y=0):
        props = {
            "id": "s:" + identifier,
            "text": "s:" + text,
            "font_size": "i:24",
            "fill_color": {"type": "Color", "args": list(fill)},
            "text_color": {"type": "Color", "args": [1, 1, 1, 0]},
        }
        if parent:
            props["container"] = {"$ref": parent}
        return {
            "type": "text_node",
            "properties": props,
            "transform": {"position": [x, y]},
        }

    def test_saved_purple_fill_and_dark_text_match_canvas(self):
        # Same serialization and containment as Desktop/project/未命名.prg.
        png = self.render_graph(
            [
                self.node("parent", "中心主题"),
                self.node(
                    "child", "你好", "parent", (203 / 255, 166 / 255, 247 / 255, 1)
                ),
            ]
        )
        pixels = self.pixels(png)
        self.assertGreater(sum(p == (203, 166, 247) for p in pixels), 10000)
        purple = [
            (i % 512, i // 512) for i, p in enumerate(pixels) if p == (203, 166, 247)
        ]
        left, right = min(x for x, y in purple), max(x for x, y in purple)
        top, bottom = min(y for x, y in purple), max(y for x, y in purple)
        self.assertGreater(
            sum(
                max(pixels[y * 512 + x]) < 65
                for y in range(top + 20, bottom - 20)
                for x in range(left + 20, right - 20)
            ),
            300,
        )

    def test_transparent_node_keeps_canvas_background(self):
        pixels = self.pixels(self.render_graph([self.node("leaf", "")]))
        self.assertEqual(pixels[256 * 512 + 256], (30, 30, 46))

    def test_nested_fills_are_order_independent_and_use_layer_opacity(self):
        blue = (137 / 255, 180 / 255, 250 / 255, 1)
        outer = self.node("outer", "Outer", fill=blue)
        inner = self.node("inner", "Inner", "outer", blue)
        leaf = self.node("leaf", "Leaf", "inner", blue)
        first = self.render_graph([outer, inner, leaf])
        self.assertEqual(first, self.render_graph([leaf, inner, outer]))
        pixels = self.pixels(first)
        self.assertGreater(sum(p == (137, 180, 250) for p in pixels), 1000)
        # Outer: alpha .78**2, blended over #1e1e2e, not an opaque blue.
        expected = tuple(
            round(a * 0.78**2 + b * (1 - 0.78**2))
            for a, b in zip((137, 180, 250), (30, 30, 46))
        )
        self.assertGreater(
            sum(all(abs(a - b) <= 1 for a, b in zip(p, expected)) for p in pixels), 1000
        )

    def test_partial_alpha_blends_over_canvas_in_both_themes(self):
        for light, canvas in [(False, (30, 30, 46)), (True, (239, 241, 245))]:
            with self.subTest(light=light):
                node = self.node("leaf", "", fill=(1, 0, 0, 0.5))
                pixels = self.pixels(self.render_graph([node], light=light))
                expected = tuple(
                    round(a * 0.5 + b * 0.5) for a, b in zip((255, 0, 0), canvas)
                )
                self.assertTrue(
                    all(
                        abs(a - b) <= 1
                        for a, b in zip(pixels[256 * 512 + 256], expected)
                    )
                )

    def test_saved_text_color_is_preserved(self):
        node = self.node("leaf", "你好")
        node["properties"]["text_color"]["args"] = [1, 0, 0, 1]
        pixels = self.pixels(self.render_graph([node]))
        self.assertGreater(
            sum(r > 200 and g < 50 and b < 50 for r, g, b in pixels), 100
        )

    def test_node_text_does_not_wrap_at_preview_width(self):
        node = self.node("leaf", "Project Graph " * 8)
        node["properties"]["fixed_width"] = "f:40.0"
        layouts = []
        original = thumbnailer.layout_for

        def capture(*args):
            layout = original(*args)
            layouts.append(layout)
            return layout

        with patch.object(thumbnailer, "layout_for", side_effect=capture):
            self.render_graph([node])
        self.assertEqual(layouts[0].get_line_count(), 1)

    def test_preview_includes_saved_edge_caption_and_arrow(self):
        source = self.node("source", "Source")
        target = self.node("target", "Target", x=350)
        edge = {
            "type": "line_edge",
            "properties": {
                "source": {"$ref": "source"},
                "target": {"$ref": "target"},
                "text": "s:你好",
                "show_arrow": True,
                "use_theme_color": True,
            },
        }
        labels = []
        original = thumbnailer.layout_for

        def capture(ctx, text, size):
            labels.append(text)
            return original(ctx, text, size)

        with patch.object(thumbnailer, "layout_for", side_effect=capture):
            arrow = self.render_graph([source, target, edge])
        self.assertIn("你好", labels)
        edge["properties"]["show_arrow"] = False
        self.assertNotEqual(arrow, self.render_graph([source, target, edge]))

    def render_nested(self, directory, name, container_x):
        objects = []
        for identifier, parent, x, text in (
            ("outer", "", container_x, "Outer"),
            ("inner", "outer", container_x + 100, "Inner"),
            ("leaf", "inner", 200, "Project Graph"),
        ):
            props = {"id": identifier, "text": text, "font_size": 24}
            if parent:
                props["container"] = {"$ref": parent}
            objects.append(
                {
                    "type": "text_node",
                    "properties": props,
                    "transform": {"position": [x, 100]},
                }
            )
        # Cover connections to a container as well as the container itself.
        objects.append(
            {
                "type": "line_edge",
                "properties": {"source": {"$ref": "outer"}, "target": {"$ref": "leaf"}},
            }
        )
        source = Path(directory, name + ".prg")
        output = Path(directory, name + ".png")
        with zipfile.ZipFile(source, "w") as archive:
            archive.writestr("stage.json", json.dumps({"objects": objects}))
        with patch.object(thumbnailer, "prefers_light_theme", return_value=False):
            thumbnailer.render(str(source), str(output), 256)
        return output

    def test_hidden_container_positions_do_not_change_preview(self):
        with tempfile.TemporaryDirectory() as directory:
            first = self.render_nested(directory, "near", 0)
            second = self.render_nested(directory, "far", -2000)
            self.assertEqual(first.read_bytes(), second.read_bytes())

    def test_preview_has_two_pixels_per_requested_pixel(self):
        with tempfile.TemporaryDirectory() as directory:
            output = self.render_nested(directory, "resolution", 0)
            surface = cairo.ImageSurface.create_from_png(str(output))
            self.assertEqual((surface.get_width(), surface.get_height()), (512, 512))


if __name__ == "__main__":
    unittest.main()
