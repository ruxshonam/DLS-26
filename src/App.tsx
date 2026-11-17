import React, { useCallback, useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  CameraMode,
  FoulEvent,
  GameMode,
  GameSettings,
  MatchPlayMode,
  MatchStats,
  OutEvent,
  PenaltyKickerState,
  PlayerData,
  TeamData,
  TournamentMatch,
  TournamentState,
} from './types/game';
import { getCustomClub, getSavedUserTeam, INITIAL_TEAMS, saveUserTeam } from './data/teamsData';
import { addCoins, addMatchCoachProgress } from './data/clubEconomy';
import { GameEngine } from './game/gameEngine';
import { MainMenu } from './components/MainMenu';
import { ScoreboardHUD } from './components/ScoreboardHUD';
import { TouchControls } from './components/TouchControls';
import { PenaltyOverlay } from './components/PenaltyOverlay';
import { TeamManagementModal } from './components/TeamManagementModal';
import { TransferMarketModal } from './components/TransferMarketModal';
import { CustomClubModal } from './components/CustomClubModal';
import { SettingsModal } from './components/SettingsModal';
import { TournamentModal } from './components/TournamentModal';
import { MatchSummaryModal } from './components/MatchSummaryModal';
import { FriendMatchModal } from './components/FriendMatchModal';
import { soundEngine } from './audio/soundEngine';
import { commentatorEngine } from './audio/commentatorEngine';

const DEFAULT_SETTINGS: GameSettings = {
  cameraMode: 'broadcast',
  difficulty: 'pro',
  matchDurationMinutes: 3,
  sfxVolume: 0.75,
  crowdVolume: 0.45,
  commentaryEnabled: true,
  commentaryLanguage: 'uz',
  showRadar: true,
  autoSwitch: true,
};

const EMPTY_STATS: MatchStats = {
  homeScore: 0,
  awayScore: 0,
  homeShots: 0,
  awayShots: 0,
  homeShotsOnTarget: 0,
  awayShotsOnTarget: 0,
  homePossessionTime: 1,
  awayPossessionTime: 1,
  homePasses: 0,
  awayPasses: 0,
  homeTackles: 0,
  awayTackles: 0,
  homeYellowCards: 0,
  awayYellowCards: 0,
  homeRedCards: 0,
  awayRedCards: 0,
  homeCorners: 0,
  awayCorners: 0,
  goalLog: [],
};

function createTournament(userTeamId: string): TournamentState {
  const pool = INITIAL_TEAMS.filter(t => t.id !== userTeamId).slice(0, 7);
  const all = [userTeamId, ...pool.map(t => t.id)];
  const matches: TournamentMatch[] = [
    { id: 'qf1', round: 'Quarter-Final', homeTeamId: all[0], awayTeamId: all[1] },
    { id: 'qf2', round: 'Quarter-Final', homeTeamId: all[2], awayTeamId: all[3] },
    { id: 'qf3', round: 'Quarter-Final', homeTeamId: all[4], awayTeamId: all[5] },
    { id: 'qf4', round: 'Quarter-Final', homeTeamId: all[6], awayTeamId: all[7] },
  ];
  return { active: true, currentRound: 'Quarter-Final', matches, userTeamId };
}

export default function App() {
  const [userTeam, setUserTeam] = useState<TeamData>(() => {
    const saved = getSavedUserTeam();
    const custom = getCustomClub();
    return custom || saved;
  });
  const [opponentTeam, setOpponentTeam] = useState<TeamData>(() => INITIAL_TEAMS[1]);
  const [activeMode, setActiveMode] = useState<GameMode>('menu');
  const [playMode, setPlayMode] = useState<MatchPlayMode>('1p');
  const [onlineRole, setOnlineRole] = useState<'host' | 'guest' | null>(null);

  const [settings, setSettings] = useState<GameSettings>(() => {
    try {
      const raw = localStorage.getItem('dls3d_settings');
      if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch {}
    return DEFAULT_SETTINGS;
  });

  // Modals
  const [showSquadModal, setShowSquadModal] = useState(false);
  const [showMarketModal, setShowMarketModal] = useState(false);
  const [showCustomClubModal, setShowCustomClubModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showFriendModal, setShowFriendModal] = useState(false);
  const [showTournamentModal, setShowTournamentModal] = useState(false);
  const [tournament, setTournament] = useState<TournamentState>(() => createTournament(userTeam.id));

  // Match HUD State
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [stats, setStats] = useState<MatchStats>(EMPTY_STATS);
  const [matchMinute, setMatchMinute] = useState(0);
  const [half, setHalf] = useState<1 | 2 | 'extra' | 'penalties' | 'ended'>(1);
  const [periodStatus, setPeriodStatus] = useState('1-TAYM');
  const [powerMeter, setPowerMeter] = useState(0);
  const [controlledPlayer, setControlledPlayer] = useState<PlayerData | null>(null);
  const [p2ControlledPlayer, setP2ControlledPlayer] = useState<PlayerData | null>(null);
  const [goalBanner, setGoalBanner] = useState<{ scorer: string; teamName: string; isHome: boolean } | null>(null);
  const [foulBanner, setFoulBanner] = useState<FoulEvent | null>(null);
  const [outBanner, setOutBanner] = useState<OutEvent | null>(null);
  const [radarData, setRadarData] = useState<{
    ball: { x: number; z: number };
    home: { x: number; z: number; controlled: boolean }[];
    away: { x: number; z: number; controlled: boolean }[];
  } | null>(null);
  const [isSoundOn, setIsSoundOn] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [summaryType, setSummaryType] = useState<'halftime' | 'fulltime' | null>(null);
  const [matchReward, setMatchReward] = useState<{ coins: number; fitsecPct: number; technacolPct: number } | null>(null);

  // 5-Round Penalty State
  const [penaltyState, setPenaltyState] = useState<PenaltyKickerState | null>(null);

  useEffect(() => {
    soundEngine.setVolumes(settings.sfxVolume, settings.crowdVolume);
    commentatorEngine.setMuted(!settings.commentaryEnabled);
    commentatorEngine.setLanguage(settings.commentaryLanguage);
    try {
      localStorage.setItem('dls3d_settings', JSON.stringify(settings));
    } catch {}
  }, [settings]);

  const handleUpdateUserTeam = useCallback((updated: TeamData) => {
    setUserTeam(updated);
    saveUserTeam(updated);
    engineRef.current?.applyTeamUpdate(updated, onlineRole !== 'guest');
  }, [onlineRole]);

  const grantMatchRewards = useCallback((homeGoals: number, awayGoals: number) => {
    const won = homeGoals > awayGoals;
    const draw = homeGoals === awayGoals;
    const rewardCoins = won ? 1800 : draw ? 950 : 550;
    const fitsecPct = won ? 40 : 25;
    const technacolPct = won ? 40 : 25;
    addCoins(rewardCoins);
    addMatchCoachProgress(fitsecPct, technacolPct);
    setMatchReward({ coins: rewardCoins, fitsecPct, technacolPct });
  }, []);

  const advanceTournamentOnResult = useCallback(
    (homeGoals: number, awayGoals: number) => {
      setTournament(prev => {
        const idx = prev.matches.findIndex(
          m => !m.winnerId && (m.homeTeamId === prev.userTeamId || m.awayTeamId === prev.userTeamId)
        );
        if (idx === -1) return prev;
        const updatedMatches = [...prev.matches];
        const m = updatedMatches[idx];
        const homeWon = homeGoals >= awayGoals;
        updatedMatches[idx] = {
          ...m,
          homeScore: homeGoals,
          awayScore: awayGoals,
          winnerId: homeWon ? m.homeTeamId : m.awayTeamId,
        };

        // Simulate other matches in same round
        updatedMatches.forEach((om, i) => {
          if (om.round === m.round && !om.winnerId) {
            const s1 = Math.floor(Math.random() * 3) + 1;
            const s2 = Math.floor(Math.random() * 2);
            updatedMatches[i] = {
              ...om,
              homeScore: s1,
              awayScore: s2,
              winnerId: s1 >= s2 ? om.homeTeamId : om.awayTeamId,
            };
          }
        });

        const userLost = updatedMatches[idx].winnerId !== prev.userTeamId;
        if (userLost) {
          return { ...prev, currentRound: 'Eliminated', matches: updatedMatches };
        }
        if (m.round === 'Final') {
          return { ...prev, currentRound: 'Champion', matches: updatedMatches };
        }

        const nextRound = m.round === 'Quarter-Final' ? 'Semi-Final' : 'Final';
        const winners = updatedMatches.filter(x => x.round === m.round).map(x => x.winnerId!);
        for (let i = 0; i < winners.length; i += 2) {
          if (winners[i] && winners[i + 1]) {
            updatedMatches.push({
              id: `${nextRound}_${i}`,
              round: nextRound,
              homeTeamId: winners[i],
              awayTeamId: winners[i + 1],
            });
          }
        }
        return { ...prev, currentRound: nextRound, matches: updatedMatches };
      });
    },
    []
  );

  const initPenaltyShootoutState = useCallback(() => {
    setPenaltyState({
      round: 1,
      maxRounds: 5,
      turn: 'home',
      homeResults: ['pending', 'pending', 'pending', 'pending', 'pending'],
      awayResults: ['pending', 'pending', 'pending', 'pending', 'pending'],
      homeScore: 0,
      awayScore: 0,
      finished: false,
      winner: null,
    });
  }, []);

  const launchMatch = useCallback(
    (mode: GameMode, opponent: TeamData, role: 'host' | 'guest' | null = null) => {
      setOpponentTeam(opponent);
      setOnlineRole(role);
      setStats(EMPTY_STATS);
      setMatchMinute(0);
      setHalf(mode === 'penalty' ? 'penalties' : 1);
      setPeriodStatus(mode === 'penalty' ? 'PENALTILAR' : '1-TAYM');
      setSummaryType(null);
      setMatchReward(null);
      setIsPaused(false);
      setGoalBanner(null);
      setFoulBanner(null);
      setOutBanner(null);
      if (mode === 'penalty') initPenaltyShootoutState();
      else setPenaltyState(null);
      setActiveMode(mode);
    },
    [initPenaltyShootoutState]
  );

  // Mount & Dispose 3D GameEngine when activeMode !== 'menu'
  useEffect(() => {
    if (activeMode === 'menu' || !containerRef.current) return;

    const home = onlineRole === 'guest' ? opponentTeam : userTeam;
    const away = onlineRole === 'guest' ? userTeam : opponentTeam;

    const engine = new GameEngine(
      containerRef.current,
      home,
      away,
      activeMode,
      playMode,
      settings,
      onlineRole,
      {
        onScoreUpdate: s => setStats(s),
        onTimeUpdate: (min, h, status) => {
          setMatchMinute(min);
          setHalf(h);
          setPeriodStatus(status);
        },
        onGoalScored: (scorer, isHome, teamName) => {
          setGoalBanner({ scorer, isHome, teamName });
          confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
          setTimeout(() => setGoalBanner(null), 3200);
        },
        onFoul: foul => {
          setFoulBanner(foul);
          setTimeout(() => setFoulBanner(null), 2800);
        },
        onOut: out => {
          setOutBanner(out);
          setTimeout(() => setOutBanner(null), 2200);
        },
        onHalfTime: s => {
          setStats(s);
          setSummaryType('halftime');
        },
        onFullTime: s => {
          setStats(s);
          grantMatchRewards(s.homeScore, s.awayScore);
          if (activeMode === 'tournament') {
            advanceTournamentOnResult(s.homeScore, s.awayScore);
          }
          setSummaryType('fulltime');
        },
        onStartExtraTime: () => {
          setOutBanner({ type: 'freekick' as never, teamName: "QO'SHIMCHA 2x15s TAYM BOSHLANDI!", isHome: true });
          setTimeout(() => setOutBanner(null), 3000);
        },
        onStartPenalties: () => {
          initPenaltyShootoutState();
        },
        onPenaltyAttemptResult: (isGoal, isHome) => {
          setPenaltyState(prev => {
            if (!prev) return prev;
            const next = {
              ...prev,
              homeResults: [...prev.homeResults],
              awayResults: [...prev.awayResults],
            };
            const idx = next.round - 1;
            if (isHome) {
              if (idx < next.homeResults.length) next.homeResults[idx] = isGoal ? 'goal' : 'miss';
              if (isGoal) next.homeScore++;
              next.turn = 'away';
              setTimeout(() => engineRef.current?.executeAiPenaltyKick(), 950);
            } else {
              if (idx < next.awayResults.length) next.awayResults[idx] = isGoal ? 'goal' : 'miss';
              if (isGoal) next.awayScore++;

              if (next.round >= next.maxRounds && next.homeScore !== next.awayScore) {
                next.finished = true;
                next.winner = next.homeScore > next.awayScore ? 'home' : 'away';
                setTimeout(() => {
                  grantMatchRewards(next.homeScore, next.awayScore);
                  if (activeMode === 'tournament') {
                    advanceTournamentOnResult(next.homeScore, next.awayScore);
                  }
                  setSummaryType('fulltime');
                }, 900);
              } else {
                if (next.round >= next.maxRounds && next.homeScore === next.awayScore) {
                  next.maxRounds++;
                  next.homeResults.push('pending');
                  next.awayResults.push('pending');
                }
                next.round++;
                next.turn = 'home';
              }
            }
            return next;
          });
        },
        onPowerChange: p => setPowerMeter(p),
        onControlledPlayerChange: (p1, p2) => {
          setControlledPlayer(p1);
          setP2ControlledPlayer(p2 || null);
        },
        onRadarUpdate: data => setRadarData(data),
      }
    );

    engineRef.current = engine;
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
    // Intentionally mount engine on mode/opponent/role start only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMode, opponentTeam.id, onlineRole, playMode]);

  const handleCycleCamera = () => {
    const order: CameraMode[] = ['broadcast', 'tv_wide', 'pro', 'action', 'sideline'];
    const next = order[(order.indexOf(settings.cameraMode) + 1) % order.length];
    setSettings(s => ({ ...s, cameraMode: next }));
    engineRef.current?.setCameraMode(next);
  };

  if (activeMode === 'menu') {
    return (
      <>
        <MainMenu
          userTeam={userTeam}
          opponentTeam={opponentTeam}
          playMode={playMode}
          onChangePlayMode={setPlayMode}
          onSelectOpponent={setOpponentTeam}
          onStartMode={m => launchMatch(m, opponentTeam, null)}
          onOpenTeamManagement={() => setShowSquadModal(true)}
          onOpenTransferMarket={() => setShowMarketModal(true)}
          onOpenCustomClub={() => setShowCustomClubModal(true)}
          onOpenSettings={() => setShowSettingsModal(true)}
          onOpenFriendMatch={() => setShowFriendModal(true)}
          onOpenTournament={() => setShowTournamentModal(true)}
        />

        {showSquadModal && (
          <TeamManagementModal
            team={userTeam}
            onUpdateTeam={handleUpdateUserTeam}
            onOpenTransferMarket={() => setShowMarketModal(true)}
            onClose={() => setShowSquadModal(false)}
          />
        )}

        {showMarketModal && (
          <TransferMarketModal
            userTeam={userTeam}
            onUpdateUserTeam={handleUpdateUserTeam}
            onOpenSquad={() => setShowSquadModal(true)}
            onClose={() => setShowMarketModal(false)}
          />
        )}

        {showCustomClubModal && (
          <CustomClubModal
            currentTeam={userTeam}
            onSaveClub={handleUpdateUserTeam}
            onClose={() => setShowCustomClubModal(false)}
          />
        )}

        {showSettingsModal && (
          <SettingsModal
            settings={settings}
            onUpdateSettings={setSettings}
            onClose={() => setShowSettingsModal(false)}
          />
        )}

        {showFriendModal && (
          <FriendMatchModal
            userTeam={userTeam}
            onStartOnlineMatch={(role, opp) => {
              setShowFriendModal(false);
              launchMatch('friend', opp, role);
            }}
            onClose={() => setShowFriendModal(false)}
          />
        )}

        {showTournamentModal && (
          <TournamentModal
            tournament={tournament}
            userTeam={userTeam}
            onPlayMatch={opp => {
              setShowTournamentModal(false);
              launchMatch('tournament', opp, null);
            }}
            onResetTournament={() => setTournament(createTournament(userTeam.id))}
            onClose={() => setShowTournamentModal(false)}
          />
        )}
      </>
    );
  }

  const displayHome = onlineRole === 'guest' ? opponentTeam : userTeam;
  const displayAway = onlineRole === 'guest' ? userTeam : opponentTeam;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 select-none">
      <div ref={containerRef} className="w-full h-full" />

      <ScoreboardHUD
        homeTeam={displayHome}
        awayTeam={displayAway}
        stats={stats}
        matchMinute={matchMinute}
        half={half}
        periodStatus={periodStatus}
        mode={activeMode}
        playMode={playMode}
        powerMeter={powerMeter}
        controlledPlayer={controlledPlayer}
        p2ControlledPlayer={p2ControlledPlayer}
        goalBanner={goalBanner}
        foulBanner={foulBanner}
        outBanner={outBanner}
        radarData={radarData}
        showRadar={settings.showRadar}
        cameraMode={settings.cameraMode}
        isSoundOn={isSoundOn}
        isCommentaryMuted={!settings.commentaryEnabled}
        isPaused={isPaused}
        onToggleSound={() => {
          const next = !isSoundOn;
          setIsSoundOn(next);
          soundEngine.setSoundEnabled(next);
        }}
        onToggleCommentary={() => {
          setSettings(s => ({ ...s, commentaryEnabled: !s.commentaryEnabled }));
        }}
        onCycleCamera={handleCycleCamera}
        onTogglePause={() => {
          const next = !isPaused;
          setIsPaused(next);
          engineRef.current?.setMatchTimeState(half === 'ended' ? 2 : half, next);
        }}
        onExitMatch={() => {
          setActiveMode('menu');
        }}
      />

      {half === 'penalties' && penaltyState && (
        <PenaltyOverlay
          penaltyState={penaltyState}
          homeName={displayHome.name}
          awayName={displayAway.name}
          onShoot={(aimX, aimY, pwr) => engineRef.current?.executePenaltyKick(aimX, aimY, pwr)}
        />
      )}

      {half !== 'penalties' && <TouchControls engineRef={engineRef} />}

      {summaryType && (
        <MatchSummaryModal
          type={summaryType}
          homeTeam={displayHome}
          awayTeam={displayAway}
          stats={stats}
          penaltyState={penaltyState}
          matchReward={matchReward}
          onContinueSecondHalf={() => {
            setSummaryType(null);
            engineRef.current?.resumeSecondHalf();
          }}
          onReplay={() => launchMatch(activeMode, opponentTeam, onlineRole)}
          onBackToMenu={() => setActiveMode('menu')}
        />
      )}
    </div>
  );
}
