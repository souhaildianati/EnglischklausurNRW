"""Allow only the current host or this container's own Codespaces HTTPS origin."""

import os
import re
from urllib.parse import urlsplit


def origin_allowed(origin: str, host: str) -> bool:
    try:
        parsed = urlsplit(origin)
    except ValueError:
        return False
    if parsed.scheme not in ("http", "https") or parsed.username or parsed.password:
        return False
    if parsed.path or parsed.query or parsed.fragment:
        return False
    if parsed.netloc == host:
        return True
    # Do not trust client-supplied forwarded-host headers or wildcard domains.
    if os.environ.get("CODESPACES") != "true":
        return False
    name = os.environ.get("CODESPACE_NAME", "")
    domain = os.environ.get("GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN", "")
    port = os.environ.get("PORT", "8000")
    if not re.fullmatch(r"[a-zA-Z0-9-]+", name):
        return False
    if not re.fullmatch(r"[a-zA-Z0-9.-]+", domain) or not port.isdigit():
        return False
    expected = f"https://{name}-{port}.{domain}"
    return origin == expected
