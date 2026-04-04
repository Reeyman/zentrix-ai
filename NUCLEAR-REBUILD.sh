#!/bin/bash

echo "=== NUCLEAR REBUILD ==="

echo "1. Oprire server..."
pkill -f "next dev" || true

echo "2. Ștergere cache complet..."
rm -rf .next
rm -rf node_modules/.cache
rm -rf node_modules/.vite

echo "3. Curățare pnpm..."
pnpm store prune

echo "4. Reinstalare completă..."
rm -rf node_modules package-lock.json pnpm-lock.yaml
pnpm install

echo "5. Build curat..."
pnpm build

echo "6. Start server curat..."
pnpm dev

echo "=== NUCLEAR REBUILD COMPLETE ==="
