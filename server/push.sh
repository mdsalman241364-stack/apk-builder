#!/data/data/com.termux/files/usr/bin/bash
#
# নতুন UI সার্ভারে পাঠায়। Termux-এ একবার চালালেই সব ফোনে পৌঁছে যাবে।
#
#   bash push.sh
#
# curl ছাড়া কিছু লাগে না (pkg install curl)।

set -e

SERVER="${NOVA_SERVER:-https://nova.mdsalman0177598.workers.dev}"
ADMIN="${NOVA_ADMIN:-}"
UI="${1:-../assets/ui.html}"

if [ -z "$ADMIN" ]; then
  printf 'অ্যাডমিন কোড: '
  read -r ADMIN
fi

if [ ! -f "$UI" ]; then
  echo "ui.html পাওয়া গেল না: $UI"
  echo "ব্যবহার: bash push.sh /sdcard/NOVA-AIDE/assets/ui.html"
  exit 1
fi

echo "পাঠাচ্ছি: $UI ($(wc -c < "$UI") বাইট)"

code=$(curl -s -o /tmp/nova_push.txt -w '%{http_code}' \
  -X PUT "$SERVER/ui/html" \
  -H "Authorization: Bearer $ADMIN" \
  -H "Content-Type: text/html; charset=utf-8" \
  --data-binary "@$UI")

cat /tmp/nova_push.txt
echo

if [ "$code" = "200" ]; then
  echo
  echo "হয়ে গেছে। শেষ ধাপ:"
  echo "  Cloudflare → nova → Settings → Variables"
  echo "  UI_VERSION এর সংখ্যাটা ১ বাড়াও → Deploy"
  echo
  echo "সবার অ্যাপ পরেরবার খুললেই নতুন চেহারা পাবে।"
else
  echo "পাঠানো যায়নি (HTTP $code)"
fi
