#!/usr/bin/env bash
# Package the plugin folder as an installable .ccx (a zip of plugin/).
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p dist
rm -f dist/Flowframe.ccx
(cd plugin && zip -qr ../dist/Flowframe.ccx . -x '.*')
echo "Built dist/Flowframe.ccx"
