#!/usr/bin/env sh
cd "$(dirname "$0")" || exit 1
if command -v open >/dev/null 2>&1; then open index.html; elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$(pwd)/index.html"; else printf 'Open index.html in your browser.\n'; fi
