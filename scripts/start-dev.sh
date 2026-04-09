#!/bin/sh
# Start ngrok tunnel + Metro for development.
# Expo's --tunnel flag has a bug in @expo/ngrok that prevents it from
# starting. This script works around it by running ngrok directly and
# telling Metro the public URL via EXPO_PACKAGER_PROXY_URL.

cleanup() {
  kill "$NGROK_PID" 2>/dev/null
}
trap cleanup EXIT INT TERM

ngrok http 8081 --log /dev/null &
NGROK_PID=$!
sleep 3

TUNNEL_URL=$(curl -s http://localhost:4040/api/tunnels | node -e "
  const j = JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf8'));
  const t = j.tunnels.find(t => t.proto === 'https') || j.tunnels[0];
  process.stdout.write(t.public_url);
")

if [ -z "$TUNNEL_URL" ]; then
  echo "ERROR: Failed to start ngrok tunnel. Check ngrok status: https://status.ngrok.com/"
  exit 1
fi

echo ""
echo "Tunnel: $TUNNEL_URL"
echo "Enter this URL manually in the dev client if QR scan doesn't work."
echo ""

EXPO_PACKAGER_PROXY_URL="$TUNNEL_URL" npx expo start --lan "$@"
