// بث الطلبات الجديدة إلى لوحة المدير لحظياً (Server-Sent Events).
const clients = new Set();

export function add(res) {
  res.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-store',
    connection: 'keep-alive',
    'x-accel-buffering': 'no'
  });
  res.write('retry: 3000\n\nevent: hello\ndata: {}\n\n');
  clients.add(res);
  res.on('close', () => clients.delete(res));
}

export function broadcast(event, data) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const c of clients) c.write(msg);
}

setInterval(() => { for (const c of clients) c.write(': ping\n\n'); }, 25000).unref();
