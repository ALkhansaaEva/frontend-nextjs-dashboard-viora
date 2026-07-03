// =============================================================================
// Viora Dashboard — PM2 ecosystem config
// =============================================================================
//
// IMPORTANT: replace YOUR_HOME below with your server user's home directory.
//   root  → /root/viora-dashboard
//   ubuntu → /home/ubuntu/viora-dashboard
//   deploy → /home/deploy/viora-dashboard
//
// Usage (after pnpm build:vps):
//   rsync -avz build-deploy/ YOUR_USER@vps:~/viora-dashboard/build-deploy/
//   ssh YOUR_USER@vps "cd ~/viora-dashboard/build-deploy && pnpm install --prod"
//   ssh YOUR_USER@vps "pm2 start ~/viora-dashboard/deploy/ecosystem.config.cjs --update-env"
//   ssh YOUR_USER@vps "pm2 save"
//
// Multi-site VPS:
//   Host nginx handles SSL. This app runs on PORT 4179 internally.
//   Change PORT if 4179 conflicts with another site on the same VPS.
//   Each site on this server gets a unique port (4179, 4180, 4181...)
//
// Directory layout (~/viora-dashboard/):
//   build-deploy/        ← produced by pnpm build:vps (no node_modules)
//     server.js
//     package.json       ← pnpm install --prod on server creates node_modules
//     .next/static/      ← nginx serves this
//     public/            ← nginx serves this
//   deploy/              ← configs (nginx, this file, Dockerfile, ...)
// =============================================================================

module.exports = {
  apps: [{
    name: 'viora-dashboard',
    script: 'server.js',
    cwd: 'YOUR_HOME/viora-dashboard/build-deploy',   // ← replace YOUR_HOME

    // Cluster mode — one worker per CPU core, zero-downtime reload
    instances: 'max',
    exec_mode: 'cluster',

    env: {
      NODE_ENV: 'production',
      PORT: 4179,               // change if another site uses this port
      HOSTNAME: '0.0.0.0',
    },

    // Auto-restart if memory exceeds 384MB RSS
    max_memory_restart: '384M',

    // Graceful shutdown
    kill_timeout: 5000,
    listen_timeout: 10000,
    shutdown_with_message: true,

    // Logs
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: 'YOUR_HOME/viora-dashboard/logs/err.log',     // ← replace YOUR_HOME
    out_file: 'YOUR_HOME/viora-dashboard/logs/out.log',       // ← replace YOUR_HOME
    merge_logs: true,
  }],
};
