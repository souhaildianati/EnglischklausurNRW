#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
if [[ ! -f frontend/dist/index.html ]]; then
  echo 'Frontend fehlt. Zuerst bash scripts/setup.sh ausführen.' >&2
  exit 1
fi
exec .venv/bin/python -m uvicorn backend.main:app --host 127.0.0.1 --port "${PORT:-8000}"
