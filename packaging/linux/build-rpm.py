#!/usr/bin/env python3
"""Package an already exported, embedded-PCK Linux executable; does not run Godot."""
import argparse
from pathlib import Path
import re
import shutil
import struct
import subprocess
import tarfile
import tempfile

parser = argparse.ArgumentParser()
parser.add_argument('--binary', required=True, type=Path)
parser.add_argument('--version', required=True)
parser.add_argument('--output', type=Path, default=Path('dist'))
args = parser.parse_args()
if not re.fullmatch(r'[0-9]+(?:\.[0-9]+){1,3}', args.version):
    parser.error('version must be numeric, e.g. 0.1.0')
binary = args.binary.resolve()
with binary.open('rb') as stream:
    header = stream.read(20)
if header[:4] != b'\x7fELF' or header[4:6] != b'\x02\x01':
    parser.error('binary must be a 64-bit Linux ELF export with embedded PCK, not a .pck file')
machine = int.from_bytes(header[18:20], 'little')
architecture = {62: 'x86_64', 183: 'aarch64'}.get(machine)
if architecture is None:
    parser.error('unsupported ELF architecture')
with binary.open('rb') as stream:
    stream.seek(-4, 2)
    if stream.read() != b'GDPC':
        parser.error('export with binary_format/embed_pck enabled')
    stream.seek(-12, 2)
    pack_size = struct.unpack('<Q', stream.read(8))[0]
    if pack_size > binary.stat().st_size - 12:
        parser.error('invalid embedded PCK size')
    stream.seek(-12 - pack_size, 2)
    if stream.read(4) != b'GDPC':
        parser.error('invalid embedded PCK header')
    pack_format, major, minor, patch = struct.unpack('<4I', stream.read(16))
runner_version = subprocess.check_output([str(binary), '--version'], text=True, timeout=10).strip()
match = re.match(r'(\d+)\.(\d+)', runner_version)
if not match or tuple(map(int, match.groups())) != (major, minor):
    parser.error(f'export template {runner_version} does not match PCK {major}.{minor}.{patch}; install matching Godot export templates')
assets = Path(__file__).resolve().parent
output = args.output.resolve()
output.mkdir(parents=True, exist_ok=True)
with tempfile.TemporaryDirectory(prefix='project-graph-rpm-') as temporary:
    top = Path(temporary)
    for directory in ['BUILD', 'BUILDROOT', 'RPMS', 'SOURCES', 'SPECS', 'SRPMS']:
        (top / directory).mkdir()
    payload = top / f'project-graph-{args.version}'

    def install(source, destination, executable=False):
        target = payload / destination
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)
        target.chmod(0o755 if executable else 0o644)

    install(binary, 'usr/bin/project-graph', True)
    install(assets / 'project-graph-thumbnailer.py', 'usr/libexec/project-graph-thumbnailer', True)
    install(assets / 'mime-default.py', 'usr/libexec/project-graph-mime-default', True)
    install(assets / 'dev.graphif.ProjectGraph.desktop', 'usr/share/applications/dev.graphif.ProjectGraph.desktop')
    install(assets / 'project-graph.xml', 'usr/share/mime/packages/project-graph.xml')
    install(assets / 'project-graph.thumbnailer', 'usr/share/thumbnailers/project-graph.thumbnailer')
    install(assets.parent.parent / 'project-graph-icon.svg', 'usr/share/icons/hicolor/scalable/apps/dev.graphif.ProjectGraph.svg')
    install(assets.parent.parent / 'project-graph-icon.svg', 'usr/share/icons/hicolor/scalable/mimetypes/application-x-project-graph.svg')
    install(assets / 'project-graph.png', 'usr/share/icons/hicolor/256x256/apps/dev.graphif.ProjectGraph.png')
    install(assets / 'project-graph.png', 'usr/share/icons/hicolor/256x256/mimetypes/application-x-project-graph.png')
    archive = top / 'SOURCES' / f'project-graph-{args.version}.tar.gz'
    with tarfile.open(archive, 'w:gz') as tar:
        tar.add(payload, arcname=payload.name)
    spec = (assets / 'project-graph.spec.in').read_text().replace('@VERSION@', args.version).replace('@ARCH@', architecture)
    spec_path = top / 'SPECS' / 'project-graph.spec'
    spec_path.write_text(spec)
    subprocess.run(['rpmbuild', '-bb', '--target', architecture, '--define', f'_topdir {top}', str(spec_path)], check=True)
    for package in (top / 'RPMS').rglob('*.rpm'):
        destination = output / package.name
        shutil.copyfile(package, destination)
        print(destination)
