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

# --max-old-space-size=512: Batasi heap Node.js ke 512MB untuk mencegah RAM membengkak tak terkendali.
# --optimize-for-size: Prioritaskan penggunaan RAM kecil daripada kecepatan eksekusi.
# --gc-interval=100: Jalankan garbage collection lebih agresif untuk membebaskan memory lebih cepat.
# --max-semi-space-size=16: Kurangi ukuran semi-space di generational GC untuk mengurangi peak memory.
export NODE_OPTIONS='--max-old-space-size=512 --optimize-for-size --gc-interval=100 --max-semi-space-size=16'

# Using exec ensures that Bun receives system OS signals (SIGTERM/SIGINT) directly for graceful shutdown.
exec bun server.js
