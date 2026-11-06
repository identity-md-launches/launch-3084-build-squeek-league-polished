import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
export async function preview() {
  const root = resolve('dist');
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain' };
  const server = createServer(async (req,res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/preview\//, '/');
      let file = resolve(root, '.' + pathname);
      if (file !== root && !file.startsWith(root + sep)) { res.writeHead(403);res.end();return; }
      if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
      res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' });res.end(await readFile(file));
    } catch {res.writeHead(404);res.end('Not found');}
  });
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  return { url: `http://127.0.0.1:${server.address().port}/preview/`, close: () => new Promise(resolve=>server.close(resolve)) };
}
