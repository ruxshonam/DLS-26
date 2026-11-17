import React, { useEffect, useState } from 'react';
import { TeamData } from '../types/game';
import { onlineMatchClient } from '../network/onlineMatchClient';
import { Check, Copy, Play, Users, Wifi, X } from 'lucide-react';

interface FriendMatchModalProps {
  userTeam: TeamData;
  onStartOnlineMatch: (role: 'host' | 'guest', opponentTeam: TeamData) => void;
  onClose: () => void;
}

export const FriendMatchModal: React.FC<FriendMatchModalProps> = ({
  userTeam,
  onStartOnlineMatch,
  onClose,
}) => {
  const [tab, setTab] = useState<'host' | 'join'>('host');
  const [roomCode, setRoomCode] = useState<string>('');
  const [joinInput, setJoinInput] = useState<string>('');
  const [status, setStatus] = useState<string>('Xona yaratish yoki do\'stingiz kodini kiritish mumkin');
  const [connectedOpponent, setConnectedOpponent] = useState<TeamData | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsub = onlineMatchClient.subscribe(msg => {
      if (msg.type === 'room_created') {
        setRoomCode(msg.roomId);
        setStatus(`Xona yaratildi! Kod: ${msg.roomId}. Do'stingiz ulanishini kuting...`);
        setLoading(false);
      } else if (msg.type === 'guest_joined') {
        setConnectedOpponent(msg.guestTeam);
        setStatus(`${msg.guestTeam.name} xonaga ulandi! Matchni boshlashingiz mumkin.`);
      } else if (msg.type === 'room_joined') {
        setRoomCode(msg.roomId);
        setConnectedOpponent(msg.hostTeam);
        setLoading(false);
        setStatus(`${msg.hostTeam.name} xonasiga ulandiniz! Mezbon o'yinni boshlashini kuting...`);
      } else if (msg.type === 'relay' && msg.action === 'start_match') {
        onStartOnlineMatch('guest', msg.hostTeam || connectedOpponent || userTeam);
      } else if (msg.type === 'opponent_disconnected') {
        setConnectedOpponent(null);
        setStatus('Do\'stingiz uzildi.');
      } else if (msg.type === 'error') {
        setLoading(false);
        setStatus(msg.message || 'Xatolik yuz berdi');
      }
    });

    return () => {
      // Do NOT call onlineMatchClient.disconnect() on unmount so active game keeps WebSocket alive!
      unsub();
    };
  }, [connectedOpponent, onStartOnlineMatch, userTeam]);

  const handleCreateRoom = async () => {
    setLoading(true);
    try {
      await onlineMatchClient.createRoom(userTeam);
    } catch {
      setLoading(false);
      setStatus('Serverga ulanib bo\'lmadi.');
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinInput.trim()) return;
    setLoading(true);
    try {
      await onlineMatchClient.joinRoom(joinInput.trim(), userTeam);
    } catch {
      setLoading(false);
      setStatus('Xonaga ulanib bo\'lmadi.');
    }
  };

  const handleCopyCode = () => {
    if (!roomCode) return;
    navigator.clipboard?.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleHostStartMatch = () => {
    if (!connectedOpponent) return;
    onlineMatchClient.sendRelay({ action: 'start_match', hostTeam: userTeam });
    onStartOnlineMatch('host', connectedOpponent);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden text-slate-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/75">
          <div className="flex items-center gap-2.5">
            <Wifi className="w-5 h-5 text-emerald-400" />
            <h2 className="font-athletic text-2xl font-black uppercase tracking-wider text-white">
              Do&apos;stlar Bilan (Onlayn)
            </h2>
          </div>
          <button
            onClick={() => {
              onlineMatchClient.disconnect();
              onClose();
            }}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-950 border border-slate-800">
            <button
              onClick={() => setTab('host')}
              className={`py-2 rounded-lg text-xs font-black uppercase transition-all ${
                tab === 'host' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Xona Yaratish
            </button>
            <button
              onClick={() => setTab('join')}
              className={`py-2 rounded-lg text-xs font-black uppercase transition-all ${
                tab === 'join' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Kod Orqali Kirish
            </button>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-sky-300 font-semibold text-center">
            {status}
          </div>

          {tab === 'host' ? (
            <div className="flex flex-col gap-3">
              {!roomCode ? (
                <button
                  onClick={handleCreateRoom}
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-athletic text-lg font-black uppercase tracking-wider shadow-lg"
                >
                  {loading ? 'Ulanmoqda...' : '6-Raqamli Kod Yaratish'}
                </button>
              ) : (
                <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/40 flex flex-col items-center gap-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Do&apos;stingizga yuboring:</span>
                  <div className="flex items-center gap-3">
                    <span className="font-mono-numbers text-3xl font-black tracking-widest text-amber-300">
                      {roomCode}
                    </span>
                    <button
                      onClick={handleCopyCode}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {connectedOpponent && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-200 font-bold">
                    <Users className="w-4 h-4" />
                    <span>Raqib tayyor: {connectedOpponent.name}</span>
                  </div>
                  <button
                    onClick={handleHostStartMatch}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-athletic text-xl font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    <span>Matchni Boshlash</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleJoinRoom} className="flex flex-col gap-3">
              <input
                type="text"
                value={joinInput}
                onChange={e => setJoinInput(e.target.value)}
                placeholder="6-raqamli xona kodini kiriting..."
                maxLength={6}
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-center font-mono-numbers text-2xl font-black tracking-widest text-white focus:outline-none focus:border-sky-500"
              />
              <button
                type="submit"
                disabled={loading || joinInput.trim().length < 4}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-sky-600 hover:from-emerald-500 hover:to-sky-500 text-white font-athletic text-lg font-black uppercase tracking-wider shadow-lg disabled:opacity-50"
              >
                {loading ? 'Ulanmoqda...' : 'Xonaga Ulanish'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
