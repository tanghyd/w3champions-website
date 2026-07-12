#!/bin/bash

# The fork must never serve unwalled (w3c branding on a URL of ours) — fail
# closed if the wall credentials are missing. Hash is bcrypt, same credential
# pair as the warehouse deploy's `friends` wall.
if [ -z "$W3SITE_BASIC_AUTH_USER" ] || [ -z "$W3SITE_BASIC_AUTH_HASH" ]; then
  echo "W3SITE_BASIC_AUTH_USER/_HASH unset — refusing to serve the fork unwalled" >&2
  exit 1
fi
printf '%s:%s\n' "$W3SITE_BASIC_AUTH_USER" "$W3SITE_BASIC_AUTH_HASH" > /etc/nginx/.htpasswd

sh /usr/share/nginx/html/env.sh $BASE_URL $IDENTIFICATION_URL $IS_LAUNCHER_ENABLED $LAUNCHER_UPDATE_URL $INGAME_STATIC_RESOURCES_URL $BNET_API_CLIENT_ID $TURNSTILE_SITE_KEY
