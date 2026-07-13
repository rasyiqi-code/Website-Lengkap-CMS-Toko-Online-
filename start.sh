#!/bin/sh
# Exit immediately if a command exits with a non-zero status
set -e

echo "🚀 Checking database connectivity..."
bun prisma/wait-db.js

echo "🚀 Running database migrations (Prisma)..."
bunx prisma migrate deploy

echo "🚀 Running platform initialization (Admin account check)..."
bun prisma/init.cjs

echo "🚀 Starting Next.js application server with memory optimizations..."
# MALLOC_ARENA_MAX limits glibc memory allocation arenas to prevent memory bloat inside the container.
export MALLOC_ARENA_MAX=2

# Using exec ensures that Bun receives system OS signals (SIGTERM/SIGINT) directly for graceful shutdown.
exec bun server.js
