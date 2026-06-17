import * as esbuild from 'esbuild';
import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const DIST = path.join(ROOT, 'dist');
const BLOB = 'sea-prep.blob';
const BUNDLE = 'sea-bundle.cjs';
const OUTPUT = process.platform === 'win32' ? 'stackrb.exe' : 'stackrb';

async function main() {
  fs.mkdirSync(DIST, { recursive: true });

  console.log('Bundling with esbuild...');
  await esbuild.build({
    entryPoints: [path.join(ROOT, 'src/index.js')],
    bundle: true,
    platform: 'node',
    target: 'node22',
    outfile: path.join(DIST, BUNDLE),
    format: 'cjs',
    legalComments: 'none',
    define: {
      'import.meta.url': 'undefined',
    },
  });

  console.log('Creating SEA config...');
  const seaConfig = {
    main: path.join(DIST, BUNDLE),
    output: path.join(DIST, BLOB),
    disableExperimentalSEAWarning: true,
  };
  fs.writeFileSync(path.join(DIST, 'sea-config.json'), JSON.stringify(seaConfig, null, 2));

  console.log('Generating SEA blob...');
  execSync(`node --experimental-sea-config "${path.join(DIST, 'sea-config.json')}"`, {
    stdio: 'inherit',
    cwd: process.cwd(),
  });

  const nodePath = process.execPath;
  const outputPath = path.join(DIST, OUTPUT);

  console.log(`Copying Node.js binary (${nodePath}) → ${outputPath}...`);
  fs.copyFileSync(nodePath, outputPath);
  fs.chmodSync(outputPath, 0o755);

  if (process.platform === 'darwin') {
    console.log('Removing code signature (macOS)...');
    try {
      execSync(`codesign --remove-signature "${outputPath}"`, { stdio: 'pipe' });
    } catch {
      console.log('codesign not available or failed, continuing...');
    }
  }

  if (process.platform === 'linux') {
    console.log('Removing code signature (Linux)...');
    try {
      execSync(`${outputPath} --help >/dev/null 2>&1 || true`);
    } catch {
      // ignore
    }
  }

  const blobPath = path.join(DIST, BLOB);
  console.log('Injecting SEA blob...');
  execSync(
    `npx postject "${outputPath}" NODE_SEA_BLOB "${blobPath}" --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2`,
    { stdio: 'inherit', cwd: process.cwd() },
  );

  console.log(`\nDone! Binary created at: ${outputPath}`);
  console.log('Place a .env file next to the binary and run it.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
