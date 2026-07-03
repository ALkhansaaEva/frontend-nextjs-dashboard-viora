// =============================================================================
// Viora Dashboard — post-build script (pnpm build:vps helper)
// =============================================================================
//
// Called after `next build`. Assembles build-deploy/ — a self-contained
// deployable package that includes:
//   - Next.js standalone server (server.js, .next/static/, public/)
//   - All deploy configs (nginx, Docker, PM2, env, setup script)
//
// Just rsync build-deploy/ to the VPS and you're ready to go.
//
// Written in plain Node.js (not shell) so it works on any OS/shell,
// including Windows cmd.exe where `mkdir -p` and `tar` break.
//
// Usage (in package.json):
//   "build:vps": "next build && node deploy/build-vps.cjs"
// =============================================================================

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, '.next', 'standalone');
const STATIC = path.join(ROOT, '.next', 'static');
const PUBLIC = path.join(ROOT, 'public');
const DEPLOY_SRC = path.join(ROOT, 'deploy');
const DEST = path.join(ROOT, 'build-deploy');

// --- Clean destination ---
if (fs.existsSync(DEST)) {
  fs.rmSync(DEST, { recursive: true, force: true });
}
fs.mkdirSync(DEST, { recursive: true });

// --- 1. Copy standalone output (excluding node_modules & .env) ---
fs.cpSync(SRC, DEST, {
  recursive: true,
  filter: (src) => {
    const relative = path.relative(SRC, src);
    if (relative === 'node_modules' || relative.startsWith('node_modules' + path.sep)) {
      return false;
    }
    if (relative === '.env') {
      return false;
    }
    return true;
  },
});

// --- 2. Copy .next/static ---
const staticDest = path.join(DEST, '.next', 'static');
if (fs.existsSync(staticDest)) {
  fs.rmSync(staticDest, { recursive: true, force: true });
}
fs.cpSync(STATIC, staticDest, { recursive: true });

// --- 3. Copy public/ ---
const publicDest = path.join(DEST, 'public');
if (fs.existsSync(publicDest)) {
  fs.rmSync(publicDest, { recursive: true, force: true });
}
fs.cpSync(PUBLIC, publicDest, { recursive: true });

// --- 4. Copy all deploy/ configs ---
const deployDest = path.join(DEST, 'deploy');
fs.cpSync(DEPLOY_SRC, deployDest, { recursive: true });

// ponytail: only ship what the runtime needs
const extras = [
  '.dockerignore',
  'package.json',
];
for (const file of extras) {
  const srcPath = path.join(ROOT, file);
  if (fs.existsSync(srcPath)) {
    fs.cpSync(srcPath, path.join(DEST, file));
  }
}

// --- Verify ---
const hasServerJs = fs.existsSync(path.join(DEST, 'server.js'));
const hasPackageJson = fs.existsSync(path.join(DEST, 'package.json'));
const hasNodeModules = fs.existsSync(path.join(DEST, 'node_modules'));
const hasNginxConf = fs.existsSync(path.join(DEST, 'deploy', 'nginx.conf'));
const hasDockerfile = fs.existsSync(path.join(DEST, 'deploy', 'Dockerfile'));
const hasDockerCompose = fs.existsSync(path.join(DEST, 'deploy', 'docker-compose.yml'));
const hasEcosystem = fs.existsSync(path.join(DEST, 'deploy', 'ecosystem.config.cjs'));
const hasEnvProd = fs.existsSync(path.join(DEST, 'deploy', '.env.production'));
const hasSetupScript = fs.existsSync(path.join(DEST, 'deploy', 'setup-host.sh'));
const hasDockerignore = fs.existsSync(path.join(DEST, '.dockerignore'));

console.log('');
console.log('=== build-deploy/ — ready for VPS ===');
console.log('── App ─────────────────────────────────');
console.log(`  server.js:          ${hasServerJs ? '✓' : '✗'}`);
console.log(`  package.json:       ${hasPackageJson ? '✓' : '✗'}`);
console.log(`  node_modules:       ${hasNodeModules ? '✗ (excluded — run pnpm install --prod on VPS)' : '✓ (clean)'}`);
console.log(`  .next/static/:      ${fs.existsSync(staticDest) ? '✓' : '✗'}`);
console.log(`  public/:            ${fs.existsSync(publicDest) ? '✓' : '✗'}`);
console.log(`  .dockerignore:      ${hasDockerignore ? '✓' : '✗'}`);
console.log('── Deploy configs ──────────────────────');
console.log(`  deploy/nginx.conf:          ${hasNginxConf ? '✓' : '✗'}`);
console.log(`  deploy/Dockerfile:          ${hasDockerfile ? '✓' : '✗'}`);
console.log(`  deploy/docker-compose.yml:  ${hasDockerCompose ? '✓' : '✗'}`);
console.log(`  deploy/ecosystem.config.cjs:${hasEcosystem ? '✓' : '✗'}`);
console.log(`  deploy/.env.production:     ${hasEnvProd ? '✓' : '✗'}`);
console.log(`  deploy/setup-host.sh:       ${hasSetupScript ? '✓' : '✗'}`);
console.log(`────────────────────────────────────────`);
console.log(`  total size: ${(getDirSize(DEST) / 1024 / 1024).toFixed(1)} MB`);
console.log('');

function getDirSize(dir) {
  let size = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) size += getDirSize(fullPath);
    else size += fs.statSync(fullPath).size;
  }
  return size;
}
