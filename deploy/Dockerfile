# =============================================================================
# Viora Dashboard — production Docker image (pre-built)
# =============================================================================
#
# Used by docker-compose.yml. The build step runs ON THE HOST before Docker:
#   pnpm build
#   pnpm install --prod
#
# Docker just wraps the already-built artifact for isolation & dependency mgmt.
# =============================================================================

FROM node:22-alpine

# --- Runtime deps & user ---
RUN apk add --no-cache tini curl && \
    addgroup --system --gid 1001 dashboard && \
    adduser --system --uid 1001 dashboard && \
    mkdir -p /app/.next/cache && \
    chown dashboard:dashboard /app/.next/cache

WORKDIR /app

# --- Environment ---
ENV NODE_ENV=production \
    PORT=4179 \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_OPTIONS="--max-old-space-size=384"

# --- App code (pre-built on host) ---
COPY --link --chown=dashboard:dashboard server.js      ./server.js
COPY --link --chown=dashboard:dashboard .next          ./.next
COPY --link --chown=dashboard:dashboard public         ./public
COPY --link --chown=dashboard:dashboard package.json   ./package.json
COPY --link --chown=dashboard:dashboard node_modules   ./node_modules

USER dashboard
EXPOSE 4179

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -sf http://localhost:4179/ || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
