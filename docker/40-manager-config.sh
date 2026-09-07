#!/bin/sh
set -eu
printf 'window.WPP_MANAGER_CONFIG = %s;\n' "$(jq -cn --arg serverUrl "${MANAGER_SERVER_URL:-}" '{serverUrl:$serverUrl}')" > /usr/share/nginx/html/manager/config.js
