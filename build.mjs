import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const outputDirectory = path.join(projectRoot, 'dist');
const [repositoryOwner, repositoryName] = (
  process.env.GITHUB_REPOSITORY ?? ''
).split('/');
const basePath =
  repositoryName && repositoryName !== `${repositoryOwner}.github.io`
    ? `/${repositoryName}/`
    : '/';

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });
await cp(path.join(projectRoot, 'public'), outputDirectory, { recursive: true });
const html = await readFile(path.join(projectRoot, 'index.html'), 'utf8');
await writeFile(
  path.join(outputDirectory, 'index.html'),
  html.replace(/(href|src)="\/(?!\/)/g, `$1="${basePath}`)
);

await build({
  entryPoints: [path.join(projectRoot, 'src', 'main.tsx')],
  bundle: true,
  minify: true,
  format: 'esm',
  target: 'es2020',
  jsx: 'automatic',
  outdir: path.join(outputDirectory, 'assets'),
  entryNames: 'app',
  assetNames: '[name]-[hash]',
  loader: { '.png': 'file' },
});
