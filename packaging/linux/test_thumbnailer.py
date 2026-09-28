"""Offline regressions for preview framing and output resolution."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import zipfile

import cairo


MODULE_PATH = Path(__file__).with_name('project-graph-thumbnailer.py')
SPEC = importlib.util.spec_from_file_location('thumbnailer', MODULE_PATH)
thumbnailer = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(thumbnailer)


class ThumbnailTests(unittest.TestCase):
    def render_nested(self, directory, name, container_x):
        objects = []
        for identifier, parent, x, text in (
            ('outer', '', container_x, 'Outer'),
            ('inner', 'outer', container_x + 100, 'Inner'),
            ('leaf', 'inner', 200, 'Project Graph'),
        ):
            props = {'id': identifier, 'text': text, 'font_size': 24}
            if parent:
                props['container'] = {'$ref': parent}
            objects.append({'type': 'text_node', 'properties': props,
                            'transform': {'position': [x, 100]}})
        # Cover connections to a container as well as the container itself.
        objects.append({'type': 'line_edge', 'properties': {
            'source': {'$ref': 'outer'}, 'target': {'$ref': 'leaf'}}})
        source = Path(directory, name + '.prg')
        output = Path(directory, name + '.png')
        with zipfile.ZipFile(source, 'w') as archive:
            archive.writestr('stage.json', json.dumps({'objects': objects}))
        with patch.object(thumbnailer, 'prefers_light_theme', return_value=False):
            thumbnailer.render(str(source), str(output), 256)
        return output

    def test_hidden_container_positions_do_not_change_preview(self):
        with tempfile.TemporaryDirectory() as directory:
            first = self.render_nested(directory, 'near', 0)
            second = self.render_nested(directory, 'far', -2000)
            self.assertEqual(first.read_bytes(), second.read_bytes())

    def test_preview_has_two_pixels_per_requested_pixel(self):
        with tempfile.TemporaryDirectory() as directory:
            output = self.render_nested(directory, 'resolution', 0)
            surface = cairo.ImageSurface.create_from_png(str(output))
            self.assertEqual((surface.get_width(), surface.get_height()), (512, 512))


if __name__ == '__main__':
    unittest.main()
