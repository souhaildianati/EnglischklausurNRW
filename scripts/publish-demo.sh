#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
export npm_config_cache="${npm_config_cache:-$PWD/.cache/npm}"
npm run build:demo --prefix frontend

# Publish only the built browser app, with no database, PDFs or credentials.
# Use an independent tree so the developer's current checkout is preserved.
python3 - <<'PY'
from pathlib import Path
import subprocess

index = Path('frontend/demo-dist/index.html')
assert index.exists() and index.stat().st_size > 100000
remote = subprocess.check_output(['git', 'ls-remote', 'origin', 'refs/heads/gh-pages'], text=True).strip()
parents = []
if remote:
    previous = remote.split()[0]
    subprocess.run(['git', 'fetch', 'origin', 'refs/heads/gh-pages'], check=True)
    parents = ['-p', previous]
blob = subprocess.check_output(['git', 'hash-object', '-w', str(index)], text=True).strip()
empty = subprocess.check_output(['git', 'hash-object', '-w', '--stdin'], input='', text=True).strip()
tree = subprocess.check_output(['git', 'mktree'], input=f'100644 blob {empty}\t.nojekyll\n100644 blob {blob}\tindex.html\n', text=True).strip()
commit = subprocess.check_output(['git', 'commit-tree', tree, *parents, '-m', 'Publish browser test version without login'], text=True).strip()
subprocess.run(['git', 'push', 'origin', f'{commit}:refs/heads/gh-pages'], check=True)
print('Testseite im Veröffentlichungsbranch gespeichert:', commit)
print('Für einen öffentlichen Weblink muss GitHub Pages für gh-pages / aktiviert sein.')
PY
