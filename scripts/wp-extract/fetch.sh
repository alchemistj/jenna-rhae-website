#!/bin/bash
# Fetch raw HTML for each page into $1 (default /tmp/wp-raw)
OUT="${1:-/tmp/wp-raw}"
mkdir -p "$OUT"
for s in about free-trauma-test tenacious-grace blog what-does-a-trauma-coach-do what-causes-complex-trauma the-gift-hidden-in-the-ask is-grief-trauma what-to-do-after-trauma trauma-nightmares how-to-trust-after-trauma trauma-coaching life-coach-columbia-mo; do
  curl -sS -L -o "$OUT/$s.html" "https://jennarhae.com/$s/"
done
curl -sS -L -o "$OUT/home.html" "https://jennarhae.com/"
ls -la "$OUT"
curl -sS -L -o "$OUT/posts.json" "https://jennarhae.com/wp-json/wp/v2/posts?per_page=100&_fields=slug,date,modified,excerpt,title"
