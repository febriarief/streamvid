const { execFileSync } = require('node:child_process');
const { existsSync, readdirSync, rmSync, statSync } = require('node:fs');
const path = require('node:path');

const backendRoot = path.resolve(__dirname, '..');
const outDir = path.join(backendRoot, '.seed-dist');
const tscBin = path.join(backendRoot, 'node_modules', 'typescript', 'bin', 'tsc');

function collectTypeScriptFiles(directory) {
  const entries = readdirSync(directory);
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      files.push(...collectTypeScriptFiles(fullPath));
      continue;
    }

    if (entry.endsWith('.ts')) {
      files.push(path.relative(backendRoot, fullPath));
    }
  }

  return files;
}

if (existsSync(outDir)) {
  rmSync(outDir, { recursive: true, force: true });
}

const generatedFiles = collectTypeScriptFiles(path.join(backendRoot, 'generated', 'prisma'));

execFileSync(
  process.execPath,
  [
    tscBin,
    '--outDir',
    '.seed-dist',
    '--module',
    'commonjs',
    '--target',
    'ES2023',
    '--esModuleInterop',
    '--rootDir',
    '.',
    'prisma/seed.ts',
    ...generatedFiles,
  ],
  {
    cwd: backendRoot,
    stdio: 'inherit',
  },
);

execFileSync('node', ['.seed-dist/prisma/seed.js'], {
  cwd: backendRoot,
  stdio: 'inherit',
});
