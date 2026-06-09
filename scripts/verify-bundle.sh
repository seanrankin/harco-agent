#!/bin/bash
set -e

echo "==> Running production build..."
npm run build

echo ""
echo "==> Checking for react-devtools in production chunks..."
if grep -r "react-devtools" .next/static/ 2>/dev/null; then
  echo "ERROR: react-devtools found in production bundle!"
  exit 1
fi
echo "OK: No react-devtools references found in .next/static/"

echo ""
echo "==> Recording bundle size baseline..."
BUNDLE_SIZE=$(du -sh .next/static/ | cut -f1)
echo "Bundle size (.next/static/): $BUNDLE_SIZE"
echo "$BUNDLE_SIZE" > .next/bundle-size-baseline.txt
echo "Baseline recorded in .next/bundle-size-baseline.txt"

echo ""
echo "==> All checks passed."
