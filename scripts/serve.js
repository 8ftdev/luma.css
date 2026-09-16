const root = new URL('../', import.meta.url);

Bun.serve({
  hostname: '127.0.0.1',
  port: 4173,
  async fetch(request) {
    const pathname = decodeURIComponent(new URL(request.url).pathname);
    if (pathname.includes('\0') || pathname.split('/').includes('..')) {
      return new Response('Not found', { status: 404 });
    }
    const url = new URL(pathname === '/' ? 'index.html' : pathname.slice(1), root);
    if (!url.pathname.startsWith(root.pathname)) return new Response('Not found', { status: 404 });
    const file = Bun.file(url);
    if (!(await file.exists())) return new Response('Not found', { status: 404 });
    return new Response(file, { headers: { 'Cache-Control': 'no-store' } });
  },
});

console.log('Luma: http://127.0.0.1:4173');
