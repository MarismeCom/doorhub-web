#!/bin/sh
set -eu

: "${API_BASE_URL:=/api/v1}"

envsubst '${API_BASE_URL}' \
    < /usr/share/nginx/html/config.js.tpl \
    > /usr/share/nginx/html/config.js

exec "$@"
