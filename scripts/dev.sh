#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
.venv/bin/python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload &
backend_pid=$!
(
  cd frontend
  exec node_modules/.bin/vite --host 127.0.0.1 --strictPort
) &
frontend_pid=$!
cleanup() {
  trap - EXIT INT TERM
  kill "$backend_pid" "$frontend_pid" 2>/dev/null || true
  wait "$backend_pid" "$frontend_pid" 2>/dev/null || true
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
wait -n "$backend_pid" "$frontend_pid"
