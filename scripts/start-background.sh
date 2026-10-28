#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

# Codespaces restarts containers; reuse a healthy instance instead of starting two.
if .venv/bin/python - <<'PY'
import json, os, sys
from urllib.request import urlopen
try:
    with urlopen('http://127.0.0.1:' + os.environ.get('PORT', '8000') + '/api/status', timeout=2) as response:
        value = json.load(response)
        sys.exit(0 if value.get('status') == 'ok' and value.get('mode') == 'private-prototype' else 1)
except Exception:
    sys.exit(1)
PY
then
  echo 'Klausurwerk läuft bereits.'
  exit 0
fi

mkdir -p data
nohup bash scripts/start.sh > data/server.log 2>&1 < /dev/null &
app_pid=$!
trap 'kill "$app_pid" 2>/dev/null || true' ERR

# An open port alone does not establish readiness: require the app's JSON response.
.venv/bin/python - "$app_pid" <<'PY'
import json, os, sys, time
from urllib.request import urlopen

pid = int(sys.argv[1])
for _ in range(40):
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        sys.exit('Start fehlgeschlagen. Details stehen in data/server.log.')
    try:
        with urlopen('http://127.0.0.1:' + os.environ.get('PORT', '8000') + '/api/status', timeout=1) as response:
            status = json.load(response)
            if status.get('status') == 'ok' and status.get('mode') == 'private-prototype':
                print('Klausurwerk ist bereit. Unter Ports die private Testoberfläche öffnen.')
                sys.exit(0)
    except Exception:
        pass
    time.sleep(0.25)
sys.exit('Klausurwerk ist noch nicht bereit. Bitte data/server.log prüfen.')
PY
