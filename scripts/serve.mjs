import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const outputDirectory = path.resolve(projectRoot, '..', 'dist');
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

const server = createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' });
    response.end('Method not allowed');
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
  } catch {
    response.writeHead(400);
    response.end('Bad request');
    return;
  }

  const requestedPath = pathname === '/' ? 'index.html' : pathname.slice(1);
  const filePath = path.resolve(outputDirectory, requestedPath);
  if (!filePath.startsWith(`${outputDirectory}${path.sep}`)) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }

  try {
    const content = await readFile(filePath);
    response.writeHead(200, {
      'Content-Type': contentTypes[path.extname(filePath)] ?? 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
    });
    response.end(request.method === 'HEAD' ? undefined : content);
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'EISDIR') {
      response.writeHead(404);
      response.end('Not found');
      return;
    }

    console.error('Failed to serve file:', error);
    response.writeHead(500);
    response.end('Internal server error');
  }
});

server.on('error', (error) => {
  console.error('Could not start ContaClara server:', error);
  process.exitCode = 1;
});

server.listen(8080, '127.0.0.1', () => {
  console.log('ContaClara is available at http://localhost:8080/');
  console.log('Press Ctrl+C to stop.');
});
