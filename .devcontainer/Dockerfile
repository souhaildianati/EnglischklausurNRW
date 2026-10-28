FROM node:24.19.0-bookworm-slim AS node
FROM python:3.12.14-slim-bookworm

COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/npm

# Optional public CA bundle for environments with a TLS proxy; no credentials.
RUN --mount=type=secret,id=trusted_ca,mode=0444 \
    set -eu; \
    ca_bundle=/etc/ssl/certs/ca-certificates.crt; \
    if [ -f /run/secrets/trusted_ca ]; then ca_bundle=/run/secrets/trusted_ca; fi; \
    sed -i 's|http://deb.debian.org|https://deb.debian.org|g' /etc/apt/sources.list.d/debian.sources \
    && apt-get -o "Acquire::https::CaInfo=$ca_bundle" update -o Acquire::Retries=0 -o APT::Update::Error-Mode=any \
    && apt-get -o "Acquire::https::CaInfo=$ca_bundle" install -y --no-install-recommends ca-certificates curl git libstdc++6 openssh-client procps sudo \
    && rm -rf /var/lib/apt/lists/* \
    && ln -s /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
    && ln -s /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx \
    && python -m pip install --no-cache-dir --index-url https://pypi.org/simple --cert "$ca_bundle" uv==0.12.23 \
    && useradd --create-home --shell /bin/bash --uid 1000 vscode \
    && printf '%s\n' 'vscode ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/vscode \
    && chmod 0440 /etc/sudoers.d/vscode

USER vscode
