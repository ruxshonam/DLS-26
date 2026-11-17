import { TeamData } from '../types/game';

export interface OnlineInputPayload {
  moveX: number;
  moveZ: number;
  sprint: boolean;
  action?: 'shoot' | 'pass' | 'through' | 'tackle' | 'switch';
  power?: number;
}

export interface OnlineStateSnapshot {
  ball: { x: number; y: number; z: number; vx: number; vy: number; vz: number };
  homePlayers: { x: number; z: number; ry: number }[];
  awayPlayers: { x: number; z: number; ry: number }[];
  homeScore: number;
  awayScore: number;
  matchTimeSeconds: number;
  currentHalf: 1 | 2 | 'extra' | 'penalties' | 'ended';
  periodStatus: string;
}

type MessageHandler = (msg: any) => void;

class OnlineMatchClient {
  private ws: WebSocket | null = null;
  private listeners = new Set<MessageHandler>();
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  public role: 'host' | 'guest' | null = null;
  public roomId: string | null = null;
  public remoteTeam: TeamData | null = null;

  public connect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
    }

    return new Promise((resolve, reject) => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}`;
      const ws = new WebSocket(wsUrl);
      this.ws = ws;

      const timeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          reject(new Error('Server bilan ulanish vaqti tugadi'));
        }
      }, 8000);

      ws.onopen = () => {
        clearTimeout(timeout);
        this.startHeartbeat();
        resolve();
      };

      ws.onmessage = event => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'pong') return;
          if (msg.type === 'room_created') {
            this.role = 'host';
            this.roomId = msg.roomId;
          } else if (msg.type === 'room_joined') {
            this.role = 'guest';
            this.roomId = msg.roomId;
            this.remoteTeam = msg.hostTeam;
          } else if (msg.type === 'guest_joined') {
            this.remoteTeam = msg.guestTeam;
          }
          this.listeners.forEach(cb => cb(msg));
        } catch {}
      };

      ws.onerror = () => {
        clearTimeout(timeout);
        this.listeners.forEach(cb => cb({ type: 'error', message: 'Serverga ulanishda xatolik yuz berdi' }));
        reject(new Error('WebSocket error'));
      };

      ws.onclose = () => {
        this.stopHeartbeat();
      };
    });
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.pingTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 20000);
  }

  private stopHeartbeat() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  public subscribe(handler: MessageHandler): () => void {
    this.listeners.add(handler);
    return () => {
      this.listeners.delete(handler);
    };
  }

  public async createRoom(team: TeamData) {
    await this.connect();
    this.ws?.send(JSON.stringify({ type: 'create_room', team }));
  }

  public async joinRoom(roomId: string, team: TeamData) {
    await this.connect();
    this.ws?.send(JSON.stringify({ type: 'join_room', roomId: roomId.trim(), team }));
  }

  public sendRelay(payload: Record<string, any>) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'relay', ...payload }));
    }
  }

  public disconnect() {
    this.stopHeartbeat();
    this.role = null;
    this.roomId = null;
    this.remoteTeam = null;
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
  }
}

export const onlineMatchClient = new OnlineMatchClient();
