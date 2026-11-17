import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());

// In-memory room manager for Friend Matches
interface Room {
  id: string;
  host: WebSocket;
  guest?: WebSocket;
  hostTeam?: unknown;
  guestTeam?: unknown;
}

const rooms = new Map<string, Room>();

wss.on('connection', (ws: WebSocket) => {
  let userRoomId: string | null = null;

  ws.on('message', (data: string) => {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
        return;
      }

      if (msg.type === 'create_room') {
        const roomId = Math.floor(100000 + Math.random() * 900000).toString();
        rooms.set(roomId, {
          id: roomId,
          host: ws,
          hostTeam: msg.team,
        });
        userRoomId = roomId;
        ws.send(JSON.stringify({ type: 'room_created', roomId, role: 'host' }));
      } else if (msg.type === 'join_room') {
        const room = rooms.get(msg.roomId);
        if (!room) {
          ws.send(JSON.stringify({ type: 'error', message: 'Xona topilmadi (Room not found)' }));
          return;
        }
        if (room.guest) {
          ws.send(JSON.stringify({ type: 'error', message: 'Xona band (Room is already full)' }));
          return;
        }
        room.guest = ws;
        room.guestTeam = msg.team;
        userRoomId = msg.roomId;

        ws.send(JSON.stringify({ type: 'room_joined', roomId: msg.roomId, role: 'guest', hostTeam: room.hostTeam }));
        if (room.host.readyState === WebSocket.OPEN) {
          room.host.send(JSON.stringify({ type: 'guest_joined', guestTeam: msg.team }));
        }
      } else if (msg.type === 'relay') {
        if (userRoomId && rooms.has(userRoomId)) {
          const room = rooms.get(userRoomId)!;
          const target = ws === room.host ? room.guest : room.host;
          if (target && target.readyState === WebSocket.OPEN) {
            target.send(JSON.stringify(msg));
          }
        }
      }
    } catch {
      // ignore malformed message
    }
  });

  ws.on('close', () => {
    if (userRoomId && rooms.has(userRoomId)) {
      const room = rooms.get(userRoomId)!;
      const other = ws === room.host ? room.guest : room.host;
      if (other && other.readyState === WebSocket.OPEN) {
        other.send(JSON.stringify({ type: 'peer_disconnected' }));
      }
      rooms.delete(userRoomId);
    }
  });
});

// Google Search Console & Crawler endpoints
app.get('/robots.txt', (req, res) => {
  const baseUrl = (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
  res.type('text/plain').send(`User-agent: *\nAllow: /\nSitemap: ${baseUrl}/sitemap.xml\n`);
});

app.get('/sitemap.xml', (req, res) => {
  const baseUrl = (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`);
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', activeRooms: rooms.size });
});

async function start() {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
}

start();
