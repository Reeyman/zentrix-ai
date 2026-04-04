#!/bin/bash

echo "=== FORȚARE REBUILD COMPLET ==="

echo "1. Oprire server processes..."
pkill -f "next dev" || true

echo "2. Clear Next.js cache..."
rm -rf .next
rm -rf node_modules/.cache

echo "3. Clear pnpm cache..."
pnpm store prune

echo "4. Reinstall dependencies..."
pnpm install

echo "5. Build project..."
pnpm build

echo "6. Start development server..."
pnpm dev

echo "=== REBUILD COMPLET ==="
