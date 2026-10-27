#!/usr/bin/env bash
# Compatibility entry point. Preflight, backups and recoverable updates live in one helper.
set -eu
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
if ! command -v python3 >/dev/null 2>&1; then
    echo 'ERROR: Python 3 is required; no files were changed.' >&2
    exit 2
fi
exec python3 "$SCRIPT_DIR/.opencode/scripts/change-model.py" "$@"
