# ─────────────────────────────────────────────────────────────
# Stage 1: Install dependencies
# ─────────────────────────────────────────────────────────────
FROM oven/bun:debian AS deps
WORKDIR /app

# ca-certificates: agar bun install bisa download Prisma binaries via HTTPS
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package.json bun.lock ./
COPY patches ./patches
RUN bun install --frozen-lockfile

# ─────────────────────────────────────────────────────────────
# Stage 2: Build the application
# ─────────────────────────────────────────────────────────────
FROM oven/bun:debian AS builder
WORKDIR /app

# ca-certificates untuk HTTPS, openssl agar Prisma generate binary yang sesuai runtime
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN bun run prisma:generate
RUN bun run build

# ─────────────────────────────────────────────────────────────
# Stage 3: Production runner
# ─────────────────────────────────────────────────────────────
FROM oven/bun:debian AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Batasi arena alokasi memory glibc untuk mencegah fragmentasi RAM virtual di lingkungan Linux/Docker
ENV MALLOC_ARENA_MAX=2

# Batasi heap Node.js ke 512MB untuk mencegah RAM membengkak tak terkendali di production
# Nilai ini di-override oleh start.sh, tapi diset di sini sebagai fallback jika start.sh tidak dipakai
ENV NODE_OPTIONS='--max-old-space-size=512 --optimize-for-size --gc-interval=100'

# Jalankan sebagai non-root user (best practice keamanan)
RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

# Buat folder .next dan atur ownership ke nextjs user
RUN mkdir .next \
    && chown nextjs:nodejs .next

# Memanfaatkan Next.js standalone hasil tracing untuk optimalisasi ukuran image
# Salin ini terlebih dahulu agar folder public bawaan standalone bisa ditimpa oleh folder public lengkap kita
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/next.config.js ./next.config.js
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/start.sh ./start.sh

# Copy public dan prisma lengkap dari builder stage
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Menyalin Prisma CLI & Client langsung dari builder stage (Tanpa unduh/install ulang!)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.bin ./node_modules/.bin
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

# Pastikan script startup dapat dieksekusi oleh user nextjs
RUN chmod +x /app/start.sh

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check agar Dokploy tahu container sudah siap menerima traffic
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD bun -e "fetch('http://localhost:3000/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["./start.sh"]


