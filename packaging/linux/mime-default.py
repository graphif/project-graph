#!/usr/bin/python3
"""Package hook: edit only our MIME entry, preserving other defaults and comments."""
import os
from pathlib import Path
import sys
import tempfile

path = Path('/etc/xdg/mimeapps.list')
mime = 'application/x-project-graph'
desktop = 'dev.graphif.ProjectGraph.desktop'
install = sys.argv[1] == 'install'
lines = path.read_text().splitlines() if path.exists() else []
section = ''
found = False
has_section = False
result = []
for line in lines:
    stripped = line.strip()
    if stripped.startswith('['):
        if section == '[Default Applications]' and not found and install:
            result.append(f'{mime}={desktop};')
            found = True
        section = stripped
        has_section |= section == '[Default Applications]'
    if section == '[Default Applications]' and stripped.partition('=')[0].strip() == mime:
        values = [v for v in stripped.partition('=')[2].split(';') if v and v != desktop]
        if install:
            values.insert(0, desktop)
        if values:
            result.append(f'{mime}={";".join(values)};')
        found = True
    else:
        result.append(line)
if install and not found:
    if not has_section:
        result.extend(['', '[Default Applications]'])
    result.append(f'{mime}={desktop};')
if path.exists() or install:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, name = tempfile.mkstemp(dir=path.parent, prefix='.project-graph-')
    try:
        with os.fdopen(fd, 'w') as stream:
            stream.write('\n'.join(result) + '\n')
        os.chmod(name, path.stat().st_mode & 0o777 if path.exists() else 0o644)
        os.replace(name, path)
    finally:
        if os.path.exists(name):
            os.unlink(name)
