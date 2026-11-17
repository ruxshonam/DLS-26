import React from 'react';
import { TeamData, TournamentState } from '../types/game';
import { INITIAL_TEAMS } from '../data/teamsData';
import { Play, RotateCcw, Trophy, X } from 'lucide-react';

interface TournamentModalProps {
  tournament: TournamentState;
  userTeam: TeamData;
  onPlayMatch: (opponent: TeamData) => void;
  onResetTournament: () => void;
  onClose: () => void;
}

export const TournamentModal: React.FC<TournamentModalProps> = ({
  tournament,
  userTeam,
  onPlayMatch,
  onResetTournament,
  onClose,
}) => {
  const findTeam = (id: string) =>
    id === userTeam.id ? userTeam : INITIAL_TEAMS.find(t => t.id === id) || INITIAL_TEAMS[0];

  const userNextMatch = tournament.matches.find(
    m =>
      !m.winnerId &&
      (m.homeTeamId === tournament.userTeamId || m.awayTeamId === tournament.userTeamId)
  );

  const nextOpponent = userNextMatch
    ? findTeam(
        userNextMatch.homeTeamId === tournament.userTeamId
          ? userNextMatch.awayTeamId
          : userNextMatch.homeTeamId
      )
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-4xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/75">
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6 text-amber-400" />
            <div>
              <h2 className="font-athletic text-2xl font-black uppercase tracking-wider text-white">
                Jahon Kubogi · Turnir Jadvali
              </h2>
              <span className="text-xs text-slate-400">
                Bosqich: <strong className="text-amber-300">{tournament.currentRound}</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onResetTournament}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Qaytadan</span>
            </button>
            <button onClick={onClose} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bracket View */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-3 gap-5">
          {(['Quarter-Final', 'Semi-Final', 'Final'] as const).map(round => {
            const roundMatches = tournament.matches.filter(m => m.round === round);
            return (
              <div key={round} className="flex flex-col gap-3">
                <h3 className="text-xs font-black uppercase tracking-widest text-amber-400 border-b border-slate-800 pb-2">
                  {round === 'Quarter-Final'
                    ? '1/4 Final'
                    : round === 'Semi-Final'
                    ? 'Yarim Final'
                    : 'Final'}
                </h3>

                {roundMatches.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/70 text-xs text-slate-500 text-center">
                    Hali shakllanmagan
                  </div>
                ) : (
                  roundMatches.map(m => {
                    const home = findTeam(m.homeTeamId);
                    const away = findTeam(m.awayTeamId);
                    const involvesUser =
                      m.homeTeamId === tournament.userTeamId || m.awayTeamId === tournament.userTeamId;
                    return (
                      <div
                        key={m.id}
                        className={`p-3 rounded-xl border ${
                          involvesUser
                            ? 'bg-sky-950/50 border-sky-400/60'
                            : 'bg-slate-950/70 border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-bold py-1">
                          <span className={m.winnerId === home.id ? 'text-emerald-400' : 'text-white'}>
                            {home.name}
                          </span>
                          <span className="font-mono-numbers">{m.homeScore ?? '-'}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs font-bold py-1 border-t border-white/5">
                          <span className={m.winnerId === away.id ? 'text-emerald-400' : 'text-white'}>
                            {away.name}
                          </span>
                          <span className="font-mono-numbers">{m.awayScore ?? '-'}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Status / Play Next Match */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex flex-wrap items-center justify-between gap-3">
          {tournament.currentRound === 'Champion' ? (
            <div className="text-emerald-400 font-athletic text-2xl font-black uppercase">
              TABRIKLAYMIZ! SIZ KUBOK SOHIBISIZ!
            </div>
          ) : tournament.currentRound === 'Eliminated' ? (
            <div className="text-rose-400 font-athletic text-xl font-black uppercase">
              Turnirdan chiqib ketdingiz — Qaytadan urinib ko&apos;ring!
            </div>
          ) : nextOpponent ? (
            <>
              <div className="text-xs text-slate-300">
                Navbatdagi raqib: <strong className="text-white text-sm">{nextOpponent.name}</strong>
              </div>
              <button
                onClick={() => onPlayMatch(nextOpponent)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-athletic text-lg font-black uppercase tracking-wider shadow-lg whitespace-nowrap shrink-0"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>O&apos;yinni Boshlash</span>
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};
