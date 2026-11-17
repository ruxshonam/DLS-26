import * as THREE from 'three';
import {
  CameraMode,
  FoulEvent,
  GameMode,
  GameSettings,
  MatchPlayMode,
  MatchStats,
  OutEvent,
  PlayerData,
  TeamData,
} from '../types/game';
import { FORMATIONS_COORDINATES } from '../data/teamsData';
import { buildStadium, HALF_LENGTH, HALF_WIDTH, StadiumHandle } from './stadiumBuilder';
import { createPlayerMesh, PlayerMeshHandle } from './playerModel';
import { BALL_RADIUS, BallPhysics } from './ballPhysics';
import { soundEngine } from '../audio/soundEngine';
import { commentatorEngine } from '../audio/commentatorEngine';
import { onlineMatchClient, OnlineInputPayload, OnlineStateSnapshot } from '../network/onlineMatchClient';

interface SimPlayer {
  data: PlayerData;
  meshHandle: PlayerMeshHandle;
  isHome: boolean;
  index: number;
  homePos: THREE.Vector3;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  rotY: number;
  stamina: number;
  yellowCards: number;
  redCarded: boolean;
  tackleTimer: number;
  tackleCooldown: number;
  kickAnimTimer: number;
  diveDir: number;
  diveTimer: number;
}

export interface GameEngineCallbacks {
  onScoreUpdate: (stats: MatchStats) => void;
  onTimeUpdate: (matchMinute: number, half: 1 | 2 | 'extra' | 'penalties' | 'ended', periodStatus: string) => void;
  onGoalScored: (scorerName: string, isHome: boolean, teamName: string) => void;
  onFoul: (foul: FoulEvent) => void;
  onOut: (out: OutEvent) => void;
  onHalfTime: (stats: MatchStats) => void;
  onFullTime: (stats: MatchStats) => void;
  onStartExtraTime: () => void;
  onStartPenalties: () => void;
  onPenaltyAttemptResult: (isGoal: boolean, isHome: boolean, kickerName: string) => void;
  onPowerChange: (power: number) => void;
  onControlledPlayerChange: (player: PlayerData | null, p2Player?: PlayerData | null) => void;
  onRadarUpdate: (data: {
    ball: { x: number; z: number };
    home: { x: number; z: number; controlled: boolean }[];
    away: { x: number; z: number; controlled: boolean }[];
  }) => void;
}

export class GameEngine {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private stadium: StadiumHandle;
  private ball: BallPhysics;

  private homeTeam: TeamData;
  private awayTeam: TeamData;
  private mode: GameMode;
  private playMode: MatchPlayMode;
  private settings: GameSettings;
  private onlineRole: 'host' | 'guest' | null;
  private callbacks: GameEngineCallbacks;

  private homePlayers: SimPlayer[] = [];
  private awayPlayers: SimPlayer[] = [];
  private controlledHomeIdx = 9; // ST by default
  private controlledAwayIdx = 9; // For 2P local or Online guest

  private keys = new Set<string>();
  private touchMove = { x: 0, z: 0, sprint: false };
  private shootCharge = 0;
  private isChargingShoot = false;
  private p2ShootCharge = 0;
  private p2IsChargingShoot = false;

  private remoteGuestInput: OnlineInputPayload = { moveX: 0, moveZ: 0, sprint: false };
  private onlineUnsub: (() => void) | null = null;
  private netSendAccum = 0;
  private latestRemoteSnapshot: OnlineStateSnapshot | null = null;

  private stats: MatchStats = {
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

  private matchClockSeconds = 0; // 0..halfDuration*2
  private currentHalf: 1 | 2 | 'extra' | 'penalties' | 'ended' = 1;
  private extraHalf: 1 | 2 = 1;
  private extraClock = 0;
  private periodStatus = '1-TAYM';
  private paused = false;
  private celebrationTimer = 0;
  private freezeTimer = 0;
  private restartBannerTimer = 0;
  private lastTackleFoulCooldown = 0;

  private penaltyInProgress = false;
  private penaltyResetTimer = 0;

  private animFrameId = 0;
  private lastTime = performance.now();
  private totalTime = 0;
  private radarAccum = 0;

  private camTargetPos = new THREE.Vector3(0, 18, 28);
  private camLookTarget = new THREE.Vector3(0, 0, 0);

  constructor(
    container: HTMLElement,
    homeTeam: TeamData,
    awayTeam: TeamData,
    mode: GameMode,
    playMode: MatchPlayMode,
    settings: GameSettings,
    onlineRole: 'host' | 'guest' | null,
    callbacks: GameEngineCallbacks
  ) {
    this.container = container;
    this.homeTeam = homeTeam;
    this.awayTeam = awayTeam;
    this.mode = mode;
    this.playMode = playMode;
    this.settings = { ...settings };
    this.onlineRole = onlineRole;
    this.callbacks = callbacks;

    // Scene & Atmospheric Sky
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x091326);
    this.scene.fog = new THREE.FogExp2(0x091326, 0.0028);

    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(48, w / h, 0.5, 450);
    this.camera.position.set(0, 22, 34);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    container.innerHTML = '';
    container.appendChild(this.renderer.domElement);

    // Three-point + Stadium Floodlight Lighting
    const hemi = new THREE.HemisphereLight(0xdbeafe, 0x14532d, 0.95);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfffbeb, 1.85);
    sun.position.set(35, 55, 28);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 160;
    const d = 64;
    sun.shadow.camera.left = -d;
    sun.shadow.camera.right = d;
    sun.shadow.camera.top = d;
    sun.shadow.camera.bottom = -d;
    sun.shadow.bias = -0.0005;
    this.scene.add(sun);

    const fill = new THREE.DirectionalLight(0x93c5fd, 0.55);
    fill.position.set(-40, 28, -32);
    this.scene.add(fill);

    // Stadium & Ball
    this.stadium = buildStadium(homeTeam.primaryColor, awayTeam.primaryColor);
    this.scene.add(this.stadium.group);

    this.ball = new BallPhysics(this.scene);

    // Spawn 11v11 Teams
    this.spawnTeams();

    if (mode === 'penalty') {
      this.enterPenaltyShootoutMode();
    } else {
      this.resetKickoff(true);
      soundEngine.playWhistle('long');
      commentatorEngine.commentKickoff(homeTeam.name, awayTeam.name);
    }

    soundEngine.startCrowdAmbience();
    this.bindInputs();
    this.bindOnlineSync();
    window.addEventListener('resize', this.handleResize);

    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  private spawnTeams() {
    this.homePlayers.forEach(p => this.scene.remove(p.meshHandle.group));
    this.awayPlayers.forEach(p => this.scene.remove(p.meshHandle.group));
    this.homePlayers = [];
    this.awayPlayers = [];

    const homeCoords = FORMATIONS_COORDINATES[this.homeTeam.formation] || FORMATIONS_COORDINATES['4-3-3'];
    const awayCoords = FORMATIONS_COORDINATES[this.awayTeam.formation] || FORMATIONS_COORDINATES['4-3-3'];

    const homeStarters = this.homeTeam.players.slice(0, 11);
    const awayStarters = this.awayTeam.players.slice(0, 11);

    homeStarters.forEach((p, idx) => {
      const c = homeCoords[idx] || { x: -20, z: 0 };
      const meshHandle = createPlayerMesh(p, this.homeTeam);
      const pos = new THREE.Vector3(c.x, 0, c.z);
      meshHandle.group.position.copy(pos);
      this.scene.add(meshHandle.group);
      this.homePlayers.push({
        data: p,
        meshHandle,
        isHome: true,
        index: idx,
        homePos: pos.clone(),
        pos,
        vel: new THREE.Vector3(),
        rotY: Math.PI / 2,
        stamina: 100,
        yellowCards: 0,
        redCarded: false,
        tackleTimer: 0,
        tackleCooldown: 0,
        kickAnimTimer: 0,
        diveDir: 0,
        diveTimer: 0,
      });
    });

    awayStarters.forEach((p, idx) => {
      // Training mode spawns fewer defenders for relaxed practice, still shows GK + defenders
      const c = awayCoords[idx] || { x: 20, z: 0 };
      const meshHandle = createPlayerMesh(p, this.awayTeam);
      const pos = new THREE.Vector3(-c.x, 0, -c.z);
      meshHandle.group.position.copy(pos);
      this.scene.add(meshHandle.group);
      this.awayPlayers.push({
        data: p,
        meshHandle,
        isHome: false,
        index: idx,
        homePos: pos.clone(),
        pos,
        vel: new THREE.Vector3(),
        rotY: -Math.PI / 2,
        stamina: 100,
        yellowCards: 0,
        redCarded: false,
        tackleTimer: 0,
        tackleCooldown: 0,
        kickAnimTimer: 0,
        diveDir: 0,
        diveTimer: 0,
      });
    });

    this.updateControlledIndicators();
  }

  public applyTeamUpdate(updatedTeam: TeamData, isHome: boolean) {
    if (isHome) {
      this.homeTeam = updatedTeam;
    } else {
      this.awayTeam = updatedTeam;
    }
    const list = isHome ? this.homePlayers : this.awayPlayers;
    const coords = FORMATIONS_COORDINATES[updatedTeam.formation] || FORMATIONS_COORDINATES['4-3-3'];

    updatedTeam.players.slice(0, 11).forEach((pData, idx) => {
      const sp = list[idx];
      if (!sp) return;
      sp.data = pData;
      const c = coords[idx] || { x: -20, z: 0 };
      sp.homePos.set(isHome ? c.x : -c.x, 0, isHome ? c.z : -c.z);
      // Rebuild player mesh to reflect updated name/number/kit changes
      const oldPos = sp.pos.clone();
      const oldRot = sp.rotY;
      this.scene.remove(sp.meshHandle.group);
      sp.meshHandle = createPlayerMesh(pData, updatedTeam);
      sp.meshHandle.group.position.copy(oldPos);
      sp.meshHandle.group.rotation.y = oldRot;
      this.scene.add(sp.meshHandle.group);
    });

    this.updateControlledIndicators();
  }

  private updateControlledIndicators() {
    this.homePlayers.forEach((p, idx) => {
      p.meshHandle.setControlled(idx === this.controlledHomeIdx && this.onlineRole !== 'guest', 0x38bdf8);
    });
    const showAwayRing = this.playMode === '2p' || this.onlineRole === 'guest';
    this.awayPlayers.forEach((p, idx) => {
      p.meshHandle.setControlled(showAwayRing && idx === this.controlledAwayIdx, 0xf43f5e);
    });

    const p1 = this.homePlayers[this.controlledHomeIdx]?.data || null;
    const p2 = showAwayRing ? this.awayPlayers[this.controlledAwayIdx]?.data || null : null;
    this.callbacks.onControlledPlayerChange(
      this.onlineRole === 'guest' ? p2 : p1,
      this.playMode === '2p' ? p2 : null
    );
  }

  private resetKickoff(homeKickoff: boolean) {
    this.ball.reset(0, 0);
    this.homePlayers.forEach(p => {
      if (p.redCarded) return;
      p.pos.copy(p.homePos);
      if (p.pos.x > -1.2) p.pos.x = -1.2;
      p.vel.set(0, 0, 0);
      p.rotY = Math.PI / 2;
      p.meshHandle.group.position.copy(p.pos);
    });
    this.awayPlayers.forEach(p => {
      if (p.redCarded) return;
      p.pos.copy(p.homePos);
      if (p.pos.x < 1.2) p.pos.x = 1.2;
      p.vel.set(0, 0, 0);
      p.rotY = -Math.PI / 2;
      p.meshHandle.group.position.copy(p.pos);
    });

    if (homeKickoff && this.homePlayers[9]) {
      this.homePlayers[9].pos.set(-0.6, 0, 0);
      this.controlledHomeIdx = 9;
    } else if (!homeKickoff && this.awayPlayers[9]) {
      this.awayPlayers[9].pos.set(0.6, 0, 0);
      this.controlledAwayIdx = 9;
    }
    this.updateControlledIndicators();
  }

  private enterPenaltyShootoutMode() {
    this.currentHalf = 'penalties';
    this.periodStatus = 'PENALTILAR SERIYASI';
    this.callbacks.onTimeUpdate(120, 'penalties', this.periodStatus);
    this.setupNextPenaltyShot(true);
  }

  private setupNextPenaltyShot(homeTakes: boolean) {
    this.penaltyInProgress = false;
    this.ball.reset(HALF_LENGTH - 11, 0);

    // Park players around center circle except kicker & goalkeeper
    this.homePlayers.forEach((p, idx) => {
      p.vel.set(0, 0, 0);
      p.diveDir = 0;
      p.diveTimer = 0;
      if (idx === 0 && !homeTakes) {
        p.pos.set(HALF_LENGTH - 0.5, 0, 0);
        p.rotY = -Math.PI / 2;
      } else if (idx === 9 && homeTakes) {
        p.pos.set(HALF_LENGTH - 13.5, 0, 0);
        p.rotY = Math.PI / 2;
      } else {
        p.pos.set(-6 + (idx % 4) * 2, 0, -10 + idx * 2);
      }
      p.meshHandle.group.position.copy(p.pos);
    });

    this.awayPlayers.forEach((p, idx) => {
      p.vel.set(0, 0, 0);
      p.diveDir = 0;
      p.diveTimer = 0;
      if (idx === 0 && homeTakes) {
        p.pos.set(HALF_LENGTH - 0.5, 0, 0);
        p.rotY = -Math.PI / 2;
      } else if (idx === 9 && !homeTakes) {
        p.pos.set(HALF_LENGTH - 13.5, 0, 0);
        p.rotY = Math.PI / 2;
      } else {
        p.pos.set(-10 + (idx % 4) * 2, 0, -10 + idx * 2);
      }
      p.meshHandle.group.position.copy(p.pos);
    });
  }

  public executePenaltyKick(aimX: number, aimY: number, power: number) {
    if (this.currentHalf !== 'penalties' || this.penaltyInProgress) return;
    this.penaltyInProgress = true;
    this.penaltyResetTimer = 2.6;

    const kicker = this.homePlayers[9] || this.homePlayers[1];
    const gk = this.awayPlayers[0];
    if (kicker) {
      kicker.pos.set(HALF_LENGTH - 11.4, 0, 0);
      kicker.kickAnimTimer = 0.35;
    }

    const vx = 20 + power * 14;
    const vy = 1.8 + Math.max(0, aimY) * 5.2;
    const vz = aimX * 4.4;
    this.ball.kick(vx, vy, vz, true, kicker?.data.name || 'Kicker', this.homeTeam.name, aimX * 0.8);

    // GK guesses a corner
    if (gk) {
      const gkGuess = (Math.random() - 0.5) * 2;
      gk.vel.z = gkGuess * 4.8;
      gk.diveDir = gkGuess >= 0 ? 1 : -1;
      gk.diveTimer = 0.75;
    }

    setTimeout(() => {
      const isGoal =
        this.ball.pos.x > HALF_LENGTH &&
        Math.abs(this.ball.pos.z) < 3.6 &&
        this.ball.pos.y < 2.4;
      if (isGoal) {
        soundEngine.playGoalCelebration();
      }
      this.callbacks.onPenaltyAttemptResult(isGoal, true, kicker?.data.name || 'Player');
      this.setupNextPenaltyShot(false);
    }, 1850);
  }

  public executeAiPenaltyKick() {
    if (this.currentHalf !== 'penalties' || this.penaltyInProgress) return;
    this.penaltyInProgress = true;
    this.penaltyResetTimer = 2.6;

    const kicker = this.awayPlayers[9] || this.awayPlayers[1];
    const gk = this.homePlayers[0];
    if (kicker) {
      kicker.pos.set(HALF_LENGTH - 11.4, 0, 0);
      kicker.kickAnimTimer = 0.35;
    }

    const aimZ = (Math.random() - 0.5) * 6.4;
    const vy = 2.0 + Math.random() * 4.2;
    const vx = 24 + Math.random() * 9;
    this.ball.kick(vx, vy, aimZ, false, kicker?.data.name || 'Striker', this.awayTeam.name);

    if (gk) {
      const userDive = this.keys.has('KeyA') || this.keys.has('ArrowLeft')
        ? -1
        : this.keys.has('KeyD') || this.keys.has('ArrowRight')
        ? 1
        : Math.random() < 0.5 ? -1 : 1;
      gk.vel.z = userDive * 4.6;
      gk.diveDir = userDive;
      gk.diveTimer = 0.75;
    }

    setTimeout(() => {
      const isGoal =
        this.ball.pos.x > HALF_LENGTH &&
        Math.abs(this.ball.pos.z) < 3.6 &&
        this.ball.pos.y < 2.4;
      if (isGoal) {
        soundEngine.playGoalCelebration();
      }
      this.callbacks.onPenaltyAttemptResult(isGoal, false, kicker?.data.name || 'Opponent');
      this.setupNextPenaltyShot(true);
    }, 1850);
  }

  private bindOnlineSync() {
    if (this.mode !== 'friend' || !this.onlineRole) return;
    this.onlineUnsub = onlineMatchClient.subscribe(msg => {
      if (msg.type !== 'relay') return;
      if (this.onlineRole === 'host' && msg.action === 'guest_input') {
        this.remoteGuestInput = msg.input as OnlineInputPayload;
        if (msg.input?.action) {
          this.executePlayerAction(false, msg.input.action, msg.input.power ?? 0.6);
        }
      } else if (this.onlineRole === 'guest' && msg.action === 'state') {
        this.latestRemoteSnapshot = msg.snapshot as OnlineStateSnapshot;
      }
    });
  }

  private handleResize = () => {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }
    this.keys.add(e.code);

    const isGuest = this.onlineRole === 'guest';

    // P1 Actions
    if (e.code === 'Space' && !e.repeat) {
      if (isGuest) {
        onlineMatchClient.sendRelay({ action: 'guest_input', input: { moveX: 0, moveZ: 0, sprint: false, action: 'shoot', power: 0.72 } });
      } else {
        this.isChargingShoot = true;
        this.shootCharge = 0.22;
      }
    }
    if (e.code === 'KeyX' && !e.repeat) {
      if (isGuest) onlineMatchClient.sendRelay({ action: 'guest_input', input: { moveX: 0, moveZ: 0, sprint: false, action: 'pass' } });
      else this.executePlayerAction(true, 'pass', 0.55);
    }
    if (e.code === 'KeyQ' && !e.repeat) {
      if (isGuest) onlineMatchClient.sendRelay({ action: 'guest_input', input: { moveX: 0, moveZ: 0, sprint: false, action: 'through' } });
      else this.executePlayerAction(true, 'through', 0.72);
    }
    if (e.code === 'KeyC' && !e.repeat) {
      if (isGuest) onlineMatchClient.sendRelay({ action: 'guest_input', input: { moveX: 0, moveZ: 0, sprint: false, action: 'tackle' } });
      else this.executePlayerAction(true, 'tackle', 0.8);
    }
    if (e.code === 'Tab' && !e.repeat) {
      if (isGuest) onlineMatchClient.sendRelay({ action: 'guest_input', input: { moveX: 0, moveZ: 0, sprint: false, action: 'switch' } });
      else this.switchControlledPlayer(true);
    }

    // P2 Local Actions
    if (this.playMode === '2p') {
      if (e.code === 'KeyL' && !e.repeat) {
        this.p2IsChargingShoot = true;
        this.p2ShootCharge = 0.25;
      }
      if (e.code === 'KeyK' && !e.repeat) this.executePlayerAction(false, 'pass', 0.55);
      if (e.code === 'KeyI' && !e.repeat) this.executePlayerAction(false, 'through', 0.72);
      if (e.code === 'KeyP' && !e.repeat) this.executePlayerAction(false, 'tackle', 0.8);
      if (e.code === 'KeyO' && !e.repeat) this.switchControlledPlayer(false);
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
    if (e.code === 'Space' && this.isChargingShoot) {
      this.isChargingShoot = false;
      this.executePlayerAction(true, 'shoot', this.shootCharge);
      this.shootCharge = 0;
      this.callbacks.onPowerChange(0);
    }
    if (e.code === 'KeyL' && this.p2IsChargingShoot && this.playMode === '2p') {
      this.p2IsChargingShoot = false;
      this.executePlayerAction(false, 'shoot', this.p2ShootCharge);
      this.p2ShootCharge = 0;
    }
  };

  private bindInputs() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  public setTouchInput(moveX: number, moveZ: number, sprint: boolean) {
    this.touchMove.x = moveX;
    this.touchMove.z = moveZ;
    this.touchMove.sprint = sprint;
  }

  public triggerTouchAction(action: 'shoot' | 'pass' | 'through' | 'tackle' | 'switch', power = 0.72) {
    if (this.onlineRole === 'guest') {
      onlineMatchClient.sendRelay({
        action: 'guest_input',
        input: { moveX: this.touchMove.x, moveZ: this.touchMove.z, sprint: this.touchMove.sprint, action, power },
      });
      return;
    }
    if (action === 'switch') {
      this.switchControlledPlayer(true);
    } else {
      this.executePlayerAction(true, action, power);
    }
  }

  public setCameraMode(mode: CameraMode) {
    this.settings.cameraMode = mode;
  }

  public setMatchTimeState(half: 1 | 2 | 'extra' | 'penalties', paused: boolean) {
    this.currentHalf = half;
    this.paused = paused;
  }

  public resumeSecondHalf() {
    this.currentHalf = 2;
    this.periodStatus = '2-TAYM';
    this.paused = false;
    this.resetKickoff(false);
    soundEngine.playWhistle('short');
  }

  private switchControlledPlayer(isHome: boolean) {
    const list = isHome ? this.homePlayers : this.awayPlayers;
    const currentIdx = isHome ? this.controlledHomeIdx : this.controlledAwayIdx;
    let bestIdx = currentIdx;
    let bestDist = Infinity;

    list.forEach((p, idx) => {
      if (idx === 0 || p.redCarded || idx === currentIdx) return;
      const d = p.pos.distanceTo(this.ball.pos);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = idx;
      }
    });

    if (isHome) this.controlledHomeIdx = bestIdx;
    else this.controlledAwayIdx = bestIdx;
    this.updateControlledIndicators();
  }

  private executePlayerAction(isHome: boolean, action: 'shoot' | 'pass' | 'through' | 'tackle' | 'switch', power: number) {
    if (this.paused || this.currentHalf === 'ended' || this.currentHalf === 'penalties') return;
    if (action === 'switch') {
      this.switchControlledPlayer(isHome);
      return;
    }

    const list = isHome ? this.homePlayers : this.awayPlayers;
    const oppList = isHome ? this.awayPlayers : this.homePlayers;
    const actor = list[isHome ? this.controlledHomeIdx : this.controlledAwayIdx];
    if (!actor || actor.redCarded) return;

    if (action === 'tackle') {
      if (actor.tackleCooldown > 0) return;
      actor.tackleTimer = 0.38;
      actor.tackleCooldown = 1.05;
      const forward = new THREE.Vector3(Math.sin(actor.rotY), 0, Math.cos(actor.rotY));
      actor.vel.copy(forward).multiplyScalar(13.5);
      commentatorEngine.commentSlideTackle(actor.data.name);

      if (isHome) this.stats.homeTackles++;
      else this.stats.awayTackles++;
      this.callbacks.onScoreUpdate({ ...this.stats });

      // Check tackle contact with opponent carrying ball
      this.checkSlideTackleContact(actor, oppList);
      return;
    }

    const distToBall = actor.pos.distanceTo(this.ball.pos);
    if (distToBall > 2.65) {
      // Auto switch if far away on pass/through
      if (action === 'pass' || action === 'through') {
        this.switchControlledPlayer(isHome);
      }
      return;
    }

    actor.kickAnimTimer = 0.28;
    const teamName = isHome ? this.homeTeam.name : this.awayTeam.name;
    const goalX = isHome ? HALF_LENGTH : -HALF_LENGTH;

    if (action === 'shoot') {
      const shootAttr = actor.data.attributes.shooting / 100;
      const aimZ = Math.sin(actor.rotY) * 1.2 + Math.cos(actor.rotY) * 3.8;
      const dx = goalX - this.ball.pos.x;
      const dz = Math.max(-3.6, Math.min(3.6, this.ball.pos.z * 0.4 + (aimZ - this.ball.pos.z) * 0.35)) - this.ball.pos.z;
      const len = Math.max(0.1, Math.hypot(dx, dz));
      const speed = 19 + power * 18 * (0.85 + shootAttr * 0.3);
      const lift = 2.8 + power * 5.8;

      this.ball.kick((dx / len) * speed, lift, (dz / len) * speed, isHome, actor.data.name, teamName, (Math.random() - 0.5) * 1.4);
      if (isHome) {
        this.stats.homeShots++;
        if (Math.abs(dz) < 6) this.stats.homeShotsOnTarget++;
      } else {
        this.stats.awayShots++;
        if (Math.abs(dz) < 6) this.stats.awayShotsOnTarget++;
      }
      commentatorEngine.commentShot(actor.data.name);
      this.callbacks.onScoreUpdate({ ...this.stats });
      return;
    }

    // Pass / Through Pass to best teammate in facing direction
    const forward = new THREE.Vector3(Math.sin(actor.rotY), 0, Math.cos(actor.rotY));
    let bestMate: SimPlayer | null = null;
    let bestScore = -Infinity;

    list.forEach((mate, idx) => {
      if (mate === actor || mate.redCarded || idx === 0) return;
      const toMate = mate.pos.clone().sub(actor.pos);
      const d = toMate.length();
      if (d < 2 || d > 52) return;
      const align = toMate.normalize().dot(forward);
      const score = align * 24 - d * 0.25;
      if (score > bestScore) {
        bestScore = score;
        bestIdxMate = idx;
        bestMate = mate;
      }
    });

    let bestIdxMate = -1;
    list.forEach((mate, idx) => {
      if (mate === bestMate) bestIdxMate = idx;
    });

    if (bestMate) {
      const targetPos = (bestMate as SimPlayer).pos.clone();
      if (action === 'through') {
        targetPos.x += isHome ? 7.5 : -7.5;
      }
      const delta = targetPos.sub(this.ball.pos);
      const dist = Math.max(1, delta.length());
      const speed = action === 'through' ? Math.min(26, 12 + dist * 0.45) : Math.min(22, 10 + dist * 0.42);
      const loft = action === 'through' ? Math.min(4.5, dist * 0.09) : 0.7;
      this.ball.kick(
        (delta.x / dist) * speed,
        loft,
        (delta.z / dist) * speed,
        isHome,
        actor.data.name,
        teamName
      );
      if (isHome) this.stats.homePasses++;
      else this.stats.awayPasses++;
      commentatorEngine.commentPass(actor.data.name);
      if (bestIdxMate > 0) {
        if (isHome) this.controlledHomeIdx = bestIdxMate;
        else this.controlledAwayIdx = bestIdxMate;
        this.updateControlledIndicators();
      }
    } else {
      const speed = action === 'through' ? 21 : 16;
      this.ball.kick(forward.x * speed, 1.2, forward.z * speed, isHome, actor.data.name, teamName);
    }
  }

  private checkSlideTackleContact(tackler: SimPlayer, oppList: SimPlayer[]) {
    if (this.lastTackleFoulCooldown > 0) return;

    for (const opp of oppList) {
      if (opp.redCarded) continue;
      const dist = tackler.pos.distanceTo(opp.pos);
      const ballDist = tackler.pos.distanceTo(this.ball.pos);

      // Foul check: hits opponent hard without winning the ball cleanly
      if (dist < 1.35 && ballDist > 1.25) {
        this.lastTackleFoulCooldown = 4.5;
        this.freezeTimer = 1.6;
        soundEngine.playWhistle('double');

        const isHomeTackler = tackler.isHome;
        const attackingTeamName = isHomeTackler ? this.awayTeam.name : this.homeTeam.name;
        const defendingTeamName = isHomeTackler ? this.homeTeam.name : this.awayTeam.name;

        // Check if foul occurred inside defending penalty area (16.5m x 20.16m)
        const defGoalX = isHomeTackler ? -HALF_LENGTH : HALF_LENGTH;
        const insideBox = Math.abs(opp.pos.x - defGoalX) < 16.5 && Math.abs(opp.pos.z) < 20.16;

        // Assign Yellow / Red card
        let cardType: 'yellow' | 'red' | null = null;
        if (tackler.yellowCards === 0) {
          tackler.yellowCards = 1;
          cardType = 'yellow';
          if (isHomeTackler) this.stats.homeYellowCards++;
          else this.stats.awayYellowCards++;
        } else {
          tackler.yellowCards = 2;
          tackler.redCarded = true;
          cardType = 'red';
          tackler.meshHandle.group.visible = false;
          if (isHomeTackler) this.stats.homeRedCards++;
          else this.stats.awayRedCards++;
        }

        tackler.meshHandle.showCard(cardType);
        setTimeout(() => tackler.meshHandle.showCard(null), 3200);

        if (insideBox) {
          // Spot penalty kick!
          const spotX = isHomeTackler ? -HALF_LENGTH + 11 : HALF_LENGTH - 11;
          this.ball.reset(spotX, 0);
          commentatorEngine.commentPenalty(attackingTeamName);
          this.callbacks.onFoul({
            type: 'penalty',
            playerName: tackler.data.name,
            teamName: defendingTeamName,
            isHome: isHomeTackler,
          });
          // Quick automated penalty shot by fouled team if AI, or free shot setup for human
          if (!isHomeTackler && this.homePlayers[9]) {
            this.homePlayers[9].pos.set(spotX - 1.4, 0, 0);
            this.controlledHomeIdx = 9;
            this.updateControlledIndicators();
          } else {
            setTimeout(() => {
              this.ball.kick(isHomeTackler ? -24 : 24, 2.2, (Math.random() - 0.5) * 4.5, !isHomeTackler, opp.data.name, attackingTeamName);
            }, 900);
          }
        } else {
          // Free kick from foul spot
          this.ball.reset(opp.pos.x, opp.pos.z);
          commentatorEngine.commentFoul(tackler.data.name, cardType || 'none');
          this.callbacks.onFoul({
            type: cardType === 'red' ? 'red' : cardType === 'yellow' ? 'yellow' : 'freekick',
            playerName: tackler.data.name,
            teamName: defendingTeamName,
            isHome: isHomeTackler,
          });
        }
        this.callbacks.onScoreUpdate({ ...this.stats });
        return;
      }
    }
  }

  private getDifficultyFactor(): number {
    switch (this.settings.difficulty) {
      case 'amateur':
        return 0.65;
      case 'pro':
        return 0.85;
      case 'world_class':
        return 1.02;
      case 'legendary':
        return 1.18;
      default:
        return 0.88;
    }
  }

  private loop = (now: number) => {
    this.animFrameId = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this.totalTime += dt;

    if (this.onlineRole === 'guest' && this.mode === 'friend') {
      this.stepGuestClient(dt);
      this.updateCamera(dt);
      this.stadium.updateCrowd(this.totalTime, 0.25);
      this.stadium.updateAdBoards(this.totalTime);
      this.renderer.render(this.scene, this.camera);
      return;
    }

    if (!this.paused && this.currentHalf !== 'ended') {
      this.stepSimulation(dt);
    }

    this.updateCamera(dt);
    const crowdExcite = this.celebrationTimer > 0 ? 1 : Math.abs(this.ball.pos.x) > 35 ? 0.65 : 0.22;
    this.stadium.updateCrowd(this.totalTime, crowdExcite);
    this.stadium.updateAdBoards(this.totalTime);
    this.renderer.render(this.scene, this.camera);
  };

  private stepGuestClient(dt: number) {
    // Capture local WASD + Touch and stream to Host at ~20Hz
    let mx = this.touchMove.x;
    let mz = this.touchMove.z;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) mz -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) mz += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) mx -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) mx += 1;
    const sprint = this.touchMove.sprint || this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');

    this.netSendAccum += dt;
    if (this.netSendAccum >= 0.05) {
      this.netSendAccum = 0;
      onlineMatchClient.sendRelay({
        action: 'guest_input',
        input: { moveX: mx, moveZ: mz, sprint },
      });
    }

    const snap = this.latestRemoteSnapshot;
    if (snap) {
      this.ball.pos.lerp(new THREE.Vector3(snap.ball.x, snap.ball.y, snap.ball.z), 0.45);
      this.ball.mesh.position.copy(this.ball.pos);

      snap.homePlayers.forEach((hp, i) => {
        const sp = this.homePlayers[i];
        if (!sp) return;
        const prevX = sp.pos.x;
        const prevZ = sp.pos.z;
        sp.pos.lerp(new THREE.Vector3(hp.x, 0, hp.z), 0.45);
        sp.rotY = hp.ry;
        sp.meshHandle.group.position.copy(sp.pos);
        sp.meshHandle.group.rotation.y = sp.rotY;
        const spd = Math.hypot(sp.pos.x - prevX, sp.pos.z - prevZ) / Math.max(0.016, dt);
        sp.meshHandle.updateAnimation(dt, spd, false, false, 0, false);
      });

      snap.awayPlayers.forEach((ap, i) => {
        const sp = this.awayPlayers[i];
        if (!sp) return;
        const prevX = sp.pos.x;
        const prevZ = sp.pos.z;
        sp.pos.lerp(new THREE.Vector3(ap.x, 0, ap.z), 0.45);
        sp.rotY = ap.ry;
        sp.meshHandle.group.position.copy(sp.pos);
        sp.meshHandle.group.rotation.y = sp.rotY;
        const spd = Math.hypot(sp.pos.x - prevX, sp.pos.z - prevZ) / Math.max(0.016, dt);
        sp.meshHandle.updateAnimation(dt, spd, false, false, 0, false);
      });

      if (snap.homeScore !== this.stats.homeScore || snap.awayScore !== this.stats.awayScore) {
        this.stats.homeScore = snap.homeScore;
        this.stats.awayScore = snap.awayScore;
        this.callbacks.onScoreUpdate({ ...this.stats });
      }
      this.currentHalf = snap.currentHalf;
      this.periodStatus = snap.periodStatus;
      this.callbacks.onTimeUpdate(Math.round(snap.matchTimeSeconds), snap.currentHalf, snap.periodStatus);
    }
  }

  private stepSimulation(dt: number) {
    if (this.lastTackleFoulCooldown > 0) this.lastTackleFoulCooldown -= dt;
    if (this.restartBannerTimer > 0) this.restartBannerTimer -= dt;

    if (this.isChargingShoot) {
      this.shootCharge = Math.min(1, this.shootCharge + dt * 1.45);
      this.callbacks.onPowerChange(this.shootCharge);
    }
    if (this.p2IsChargingShoot) {
      this.p2ShootCharge = Math.min(1, this.p2ShootCharge + dt * 1.45);
    }

    if (this.celebrationTimer > 0) {
      this.celebrationTimer -= dt;
      this.homePlayers.forEach(p => p.meshHandle.updateAnimation(dt, 0, false, false, 0, true));
      this.awayPlayers.forEach(p => p.meshHandle.updateAnimation(dt, 0, false, false, 0, false));
      if (this.celebrationTimer <= 0) {
        this.resetKickoff(this.stats.homeScore <= this.stats.awayScore);
      }
      return;
    }

    if (this.freezeTimer > 0) {
      this.freezeTimer -= dt;
      return;
    }

    // Match Clock Progression
    if (this.currentHalf !== 'penalties' && this.mode !== 'training') {
      const halfSecondsReal = (this.settings.matchDurationMinutes * 60) / 2;
      if (this.currentHalf === 1) {
        this.matchClockSeconds += dt;
        const displayMin = Math.min(45, Math.floor((this.matchClockSeconds / halfSecondsReal) * 45));
        this.callbacks.onTimeUpdate(displayMin, 1, '1-TAYM');
        if (this.matchClockSeconds >= halfSecondsReal) {
          this.paused = true;
          soundEngine.playWhistle('long');
          this.callbacks.onHalfTime({ ...this.stats });
          return;
        }
      } else if (this.currentHalf === 2) {
        this.matchClockSeconds += dt;
        const elapsed2 = this.matchClockSeconds - halfSecondsReal;
        const displayMin = Math.min(90, 45 + Math.floor((elapsed2 / halfSecondsReal) * 45));
        this.callbacks.onTimeUpdate(displayMin, 2, '2-TAYM');
        if (this.matchClockSeconds >= halfSecondsReal * 2) {
          soundEngine.playWhistle('double');
          // Check tie -> Two 15-second Extra Time halves!
          if (this.stats.homeScore === this.stats.awayScore) {
            this.currentHalf = 'extra';
            this.extraHalf = 1;
            this.extraClock = 0;
            this.periodStatus = "QO'SHIMCHA 1-TAYM (15s)";
            this.resetKickoff(true);
            commentatorEngine.commentExtraTime(1);
            this.callbacks.onStartExtraTime();
            return;
          }
          this.currentHalf = 'ended';
          this.callbacks.onFullTime({ ...this.stats });
          return;
        }
      } else if (this.currentHalf === 'extra') {
        this.extraClock += dt;
        const displayMin = this.extraHalf === 1
          ? 90 + Math.min(15, Math.floor(this.extraClock))
          : 105 + Math.min(15, Math.floor(this.extraClock));
        this.periodStatus = this.extraHalf === 1 ? "QO'SHIMCHA 1-TAYM (15s)" : "QO'SHIMCHA 2-TAYM (15s)";
        this.callbacks.onTimeUpdate(displayMin, 'extra', this.periodStatus);

        if (this.extraClock >= 15) {
          if (this.extraHalf === 1) {
            this.extraHalf = 2;
            this.extraClock = 0;
            this.resetKickoff(false);
            soundEngine.playWhistle('short');
            commentatorEngine.commentExtraTime(2);
          } else {
            soundEngine.playWhistle('double');
            if (this.stats.homeScore === this.stats.awayScore) {
              // 5-round Penalty Shootout!
              commentatorEngine.commentPenalties();
              this.enterPenaltyShootoutMode();
              this.callbacks.onStartPenalties();
            } else {
              this.currentHalf = 'ended';
              this.callbacks.onFullTime({ ...this.stats });
            }
          }
          return;
        }
      }
    }

    // In penalty shootout mode, only step ball & GK/Kicker physics
    if (this.currentHalf === 'penalties') {
      const stepRes = this.ball.step(dt, true);
      [...this.homePlayers, ...this.awayPlayers].forEach(p => {
        if (p.diveTimer > 0) {
          p.diveTimer -= dt;
          p.pos.addScaledVector(p.vel, dt);
          p.meshHandle.group.position.copy(p.pos);
          // GK Save check
          if (p.pos.distanceTo(this.ball.pos) < 1.15 && this.ball.pos.y < 2.2) {
            this.ball.vel.x = -Math.abs(this.ball.vel.x) * 0.45;
            this.ball.vel.z += p.diveDir * 3;
            commentatorEngine.commentSave(p.data.name);
          }
        }
        p.meshHandle.updateAnimation(dt, p.vel.length(), p.kickAnimTimer > 0, false, p.diveTimer > 0 ? p.diveDir : 0, false);
        if (p.kickAnimTimer > 0) p.kickAnimTimer -= dt;
      });
      if (stepRes.goal) {
        this.ball.vel.multiplyScalar(0.3);
      }
      return;
    }

    // Update Human Input + AI Players
    this.updateTeamPlayers(this.homePlayers, this.awayPlayers, true, dt);
    this.updateTeamPlayers(this.awayPlayers, this.homePlayers, false, dt);

    // Ball Physics + Dribble / Possession + Goal & Out checks
    const result = this.ball.step(dt, false);

    // Possession time tracking
    if (this.ball.lastTouchIsHome === true) this.stats.homePossessionTime += dt;
    else if (this.ball.lastTouchIsHome === false) this.stats.awayPossessionTime += dt;

    if (result.goal) {
      const isHomeGoal = result.goal === 'home';
      const scoringTeam = isHomeGoal ? this.homeTeam.name : this.awayTeam.name;
      const scorer = this.ball.lastTouchPlayerName || (isHomeGoal ? this.homePlayers[9].data.name : this.awayPlayers[9].data.name);

      if (isHomeGoal) this.stats.homeScore++;
      else this.stats.awayScore++;

      const currentMin = Math.max(1, Math.min(120, Math.round((this.matchClockSeconds / (this.settings.matchDurationMinutes * 60)) * 90)));
      this.stats.goalLog.push({ minute: currentMin, scorer, isHome: isHomeGoal });

      soundEngine.playWhistle('long');
      soundEngine.playGoalCelebration();
      commentatorEngine.commentGoal(scorer, scoringTeam);

      this.celebrationTimer = 2.8;
      this.callbacks.onScoreUpdate({ ...this.stats });
      this.callbacks.onGoalScored(scorer, isHomeGoal, scoringTeam);
      return;
    }

    if (result.outOfBounds) {
      this.handleOutOfBounds(result.outOfBounds);
    }

    // Auto-switch closest defender when not holding ball
    if (this.settings.autoSwitch && this.ball.lastTouchIsHome === false) {
      const curr = this.homePlayers[this.controlledHomeIdx];
      if (curr && curr.pos.distanceTo(this.ball.pos) > 12) {
        this.switchControlledPlayer(true);
      }
    }

    // Radar update ~12Hz
    this.radarAccum += dt;
    if (this.radarAccum >= 0.08) {
      this.radarAccum = 0;
      this.callbacks.onRadarUpdate({
        ball: { x: this.ball.pos.x, z: this.ball.pos.z },
        home: this.homePlayers.map((p, i) => ({
          x: p.pos.x,
          z: p.pos.z,
          controlled: i === this.controlledHomeIdx,
        })),
        away: this.awayPlayers.map((p, i) => ({
          x: p.pos.x,
          z: p.pos.z,
          controlled: (this.playMode === '2p' || this.onlineRole === 'guest') && i === this.controlledAwayIdx,
        })),
      });
    }

    // Host Online State Broadcast (~20Hz)
    if (this.mode === 'friend' && this.onlineRole === 'host') {
      this.netSendAccum += dt;
      if (this.netSendAccum >= 0.05) {
        this.netSendAccum = 0;
        const snapshot: OnlineStateSnapshot = {
          ball: {
            x: this.ball.pos.x,
            y: this.ball.pos.y,
            z: this.ball.pos.z,
            vx: this.ball.vel.x,
            vy: this.ball.vel.y,
            vz: this.ball.vel.z,
          },
          homePlayers: this.homePlayers.map(p => ({ x: p.pos.x, z: p.pos.z, ry: p.rotY })),
          awayPlayers: this.awayPlayers.map(p => ({ x: p.pos.x, z: p.pos.z, ry: p.rotY })),
          homeScore: this.stats.homeScore,
          awayScore: this.stats.awayScore,
          matchTimeSeconds: Math.round((this.matchClockSeconds / (this.settings.matchDurationMinutes * 60)) * 90),
          currentHalf: this.currentHalf,
          periodStatus: this.periodStatus,
        };
        onlineMatchClient.sendRelay({ action: 'state', snapshot });
      }
    }
  }

  private handleOutOfBounds(out: { side: 'side' | 'end'; x: number; z: number }) {
    soundEngine.playWhistle('short');
    this.freezeTimer = 1.1;

    const awardedToHome = this.ball.lastTouchIsHome === false;
    const teamName = awardedToHome ? this.homeTeam.name : this.awayTeam.name;
    const list = awardedToHome ? this.homePlayers : this.awayPlayers;

    if (out.side === 'side') {
      // Throw-in (Aut)
      const restartZ = out.z > 0 ? HALF_WIDTH - 0.6 : -HALF_WIDTH + 0.6;
      this.ball.reset(out.x, restartZ);
      const taker = list[2] || list[1];
      if (taker) {
        taker.pos.set(out.x, 0, out.z > 0 ? HALF_WIDTH + 0.3 : -HALF_WIDTH - 0.3);
        taker.rotY = out.z > 0 ? Math.PI : 0;
        taker.meshHandle.group.position.copy(taker.pos);
        setTimeout(() => {
          this.ball.kick(
            (awardedToHome ? 5 : -5),
            2.4,
            out.z > 0 ? -7 : 7,
            awardedToHome,
            taker.data.name,
            teamName
          );
        }, 650);
      }
      commentatorEngine.commentThrowIn(teamName);
      this.callbacks.onOut({ type: 'throw_in', teamName, isHome: awardedToHome });
      return;
    }

    // Endline out: Corner vs Goal Kick
    const isRightEnd = out.x > 0; // Right end is Away's goal defended by Away
    const defendingTouchedLast =
      (isRightEnd && this.ball.lastTouchIsHome === false) ||
      (!isRightEnd && this.ball.lastTouchIsHome === true);

    if (defendingTouchedLast) {
      // Corner Kick (Burchak zarbasi)
      const attackingHome = isRightEnd;
      const cornerTeam = attackingHome ? this.homeTeam.name : this.awayTeam.name;
      const cornerZ = out.z >= 0 ? HALF_WIDTH - 0.8 : -HALF_WIDTH + 0.8;
      const cornerX = isRightEnd ? HALF_LENGTH - 0.8 : -HALF_LENGTH + 0.8;
      this.ball.reset(cornerX, cornerZ);

      if (attackingHome) this.stats.homeCorners++;
      else this.stats.awayCorners++;
      this.callbacks.onScoreUpdate({ ...this.stats });

      const takerList = attackingHome ? this.homePlayers : this.awayPlayers;
      const taker = takerList[8] || takerList[10];
      if (taker) {
        taker.pos.set(cornerX, 0, cornerZ);
        taker.meshHandle.group.position.copy(taker.pos);
        setTimeout(() => {
          this.ball.kick(
            attackingHome ? -6.5 : 6.5,
            5.2,
            cornerZ > 0 ? -10 : 10,
            attackingHome,
            taker.data.name,
            cornerTeam,
            1.2
          );
        }, 700);
      }
      commentatorEngine.commentCorner(cornerTeam);
      this.callbacks.onOut({ type: 'corner', teamName: cornerTeam, isHome: attackingHome });
    } else {
      // Goal Kick (Darvozadan zarba)
      const defendingHome = !isRightEnd;
      const gkTeam = defendingHome ? this.homeTeam.name : this.awayTeam.name;
      const kickX = defendingHome ? -HALF_LENGTH + 5.5 : HALF_LENGTH - 5.5;
      this.ball.reset(kickX, 0);
      const gk = (defendingHome ? this.homePlayers : this.awayPlayers)[0];
      if (gk) {
        gk.pos.set(kickX - (defendingHome ? 1 : -1), 0, 0);
        gk.meshHandle.group.position.copy(gk.pos);
        setTimeout(() => {
          this.ball.kick(
            defendingHome ? 21 : -21,
            4.8,
            (Math.random() - 0.5) * 8,
            defendingHome,
            gk.data.name,
            gkTeam
          );
        }, 700);
      }
      commentatorEngine.commentGoalKick(gkTeam);
      this.callbacks.onOut({ type: 'goal_kick', teamName: gkTeam, isHome: defendingHome });
    }
  }

  private updateTeamPlayers(team: SimPlayer[], opps: SimPlayer[], isHome: boolean, dt: number) {
    const diff = this.getDifficultyFactor();
    const ctrlIdx = isHome ? this.controlledHomeIdx : this.controlledAwayIdx;
    const isHumanTeam = isHome || this.playMode === '2p' || (this.mode === 'friend' && this.onlineRole === 'host');

    // Identify closest AI chaser to ball
    let chaserIdx = -1;
    let bestChaserDist = Infinity;
    team.forEach((p, idx) => {
      if (idx === 0 || p.redCarded || (isHumanTeam && idx === ctrlIdx)) return;
      const d = p.pos.distanceTo(this.ball.pos);
      if (d < bestChaserDist) {
        bestChaserDist = d;
        chaserIdx = idx;
      }
    });

    team.forEach((p, idx) => {
      if (p.redCarded) return;
      if (p.tackleCooldown > 0) p.tackleCooldown -= dt;
      if (p.kickAnimTimer > 0) p.kickAnimTimer -= dt;
      if (p.diveTimer > 0) p.diveTimer -= dt;

      if (p.tackleTimer > 0) {
        p.tackleTimer -= dt;
        p.pos.addScaledVector(p.vel, dt);
        p.vel.multiplyScalar(0.92);
        this.clampAndSyncPlayer(p, dt, true);
        return;
      }

      const maxSpeed = 6.2 + (p.data.attributes.pace / 100) * 3.1;
      let desiredVel = new THREE.Vector3(0, 0, 0);

      const isControlledHuman =
        (isHome && idx === ctrlIdx) ||
        (!isHome && (this.playMode === '2p' || (this.mode === 'friend' && this.onlineRole === 'host')) && idx === ctrlIdx);

      if (isControlledHuman) {
        let mx = 0;
        let mz = 0;
        let sprint = false;

        if (isHome) {
          mx = this.touchMove.x;
          mz = this.touchMove.z;
          sprint = this.touchMove.sprint || this.keys.has('ShiftLeft');
          if (this.keys.has('KeyW') || (this.playMode === '1p' && this.keys.has('ArrowUp'))) mz -= 1;
          if (this.keys.has('KeyS') || (this.playMode === '1p' && this.keys.has('ArrowDown'))) mz += 1;
          if (this.keys.has('KeyA') || (this.playMode === '1p' && this.keys.has('ArrowLeft'))) mx -= 1;
          if (this.keys.has('KeyD') || (this.playMode === '1p' && this.keys.has('ArrowRight'))) mx += 1;
        } else if (this.mode === 'friend' && this.onlineRole === 'host') {
          mx = this.remoteGuestInput.moveX;
          mz = this.remoteGuestInput.moveZ;
          sprint = this.remoteGuestInput.sprint;
        } else {
          // 2P Local Arrow Keys
          if (this.keys.has('ArrowUp')) mz -= 1;
          if (this.keys.has('ArrowDown')) mz += 1;
          if (this.keys.has('ArrowLeft')) mx -= 1;
          if (this.keys.has('ArrowRight')) mx += 1;
          sprint = this.keys.has('ShiftRight') || this.keys.has('ControlRight');
        }

        const mag = Math.hypot(mx, mz);
        if (mag > 0.05) {
          const boost = sprint && p.stamina > 8 ? 1.32 : 1.0;
          if (sprint) p.stamina = Math.max(0, p.stamina - 14 * dt);
          else p.stamina = Math.min(100, p.stamina + 6 * dt);
          desiredVel.set((mx / Math.max(1, mag)) * maxSpeed * boost, 0, (mz / Math.max(1, mag)) * maxSpeed * boost);
        } else {
          p.stamina = Math.min(100, p.stamina + 10 * dt);
        }
      } else if (idx === 0) {
        // Goalkeeper AI
        const goalX = isHome ? -HALF_LENGTH + 1.4 : HALF_LENGTH - 1.4;
        const targetZ = Math.max(-3.5, Math.min(3.5, this.ball.pos.z * 0.48));
        const toTarget = new THREE.Vector3(goalX - p.pos.x, 0, targetZ - p.pos.z);
        if (toTarget.length() > 0.25) {
          desiredVel = toTarget.normalize().multiplyScalar(5.8 * diff);
        }

        // Goalkeeper clear / catch if ball arrives fast inside 6-yard box
        if (p.pos.distanceTo(this.ball.pos) < 1.35 && this.ball.pos.y < 2.2) {
          const clearDir = isHome ? 1 : -1;
          this.ball.kick(
            clearDir * (16 + Math.random() * 8),
            3.6,
            (Math.random() - 0.5) * 11,
            isHome,
            p.data.name,
            isHome ? this.homeTeam.name : this.awayTeam.name
          );
          p.kickAnimTimer = 0.3;
          commentatorEngine.commentSave(p.data.name);
        }
      } else {
        // Outfield AI Positioning & Ball Chasing
        const ballDist = p.pos.distanceTo(this.ball.pos);
        const isRelaxedTraining = !isHome && this.mode === 'training';

        if (!isRelaxedTraining && idx === chaserIdx && ballDist < 34) {
          const toBall = new THREE.Vector3(this.ball.pos.x - p.pos.x, 0, this.ball.pos.z - p.pos.z);
          if (toBall.length() > 0.2) {
            desiredVel = toBall.normalize().multiplyScalar(maxSpeed * 0.88 * diff);
          }

          // Opponent AI shoots or passes when on ball
          if (!isHome && ballDist < 1.25 && this.playMode === '1p' && this.mode !== 'friend') {
            const targetGoalX = -HALF_LENGTH;
            const distGoal = Math.abs(targetGoalX - p.pos.x);
            if (distGoal < 26 && Math.random() < 0.08 * diff) {
              const aimZ = (Math.random() - 0.5) * 5.2;
              const dx = targetGoalX - this.ball.pos.x;
              const dz = aimZ - this.ball.pos.z;
              const len = Math.max(1, Math.hypot(dx, dz));
              this.ball.kick((dx / len) * 24, 3.2, (dz / len) * 24, false, p.data.name, this.awayTeam.name);
              this.stats.awayShots++;
              p.kickAnimTimer = 0.28;
              commentatorEngine.commentShot(p.data.name);
              this.callbacks.onScoreUpdate({ ...this.stats });
            } else if (Math.random() < 0.045) {
              // Forward dribble or pass
              const dirX = -1;
              this.ball.kick(dirX * 12.5, 0.5, (Math.random() - 0.5) * 6, false, p.data.name, this.awayTeam.name);
              p.kickAnimTimer = 0.22;
            }
          }
        } else {
          // Formation shift with ball position
          const shiftX = this.ball.pos.x * 0.42;
          const shiftZ = this.ball.pos.z * 0.24;
          const anchor = new THREE.Vector3(
            Math.max(-HALF_LENGTH + 4, Math.min(HALF_LENGTH - 4, p.homePos.x + shiftX)),
            0,
            Math.max(-HALF_WIDTH + 3, Math.min(HALF_WIDTH - 3, p.homePos.z + shiftZ))
          );
          const toAnchor = anchor.sub(p.pos);
          if (toAnchor.length() > 1.2) {
            desiredVel = toAnchor.normalize().multiplyScalar(maxSpeed * 0.65);
          }
        }
      }

      p.vel.lerp(desiredVel, Math.min(1, dt * 8));
      p.pos.addScaledVector(p.vel, dt);

      // Gentle player-player separation
      for (const other of opps) {
        if (other.redCarded) continue;
        const dx = p.pos.x - other.pos.x;
        const dz = p.pos.z - other.pos.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.72 && dist > 0.001) {
          const push = (0.72 - dist) * 0.5;
          p.pos.x += (dx / dist) * push;
          p.pos.z += (dz / dist) * push;
        }
      }

      // Close-range automatic dribble touch
      if (idx !== 0 && p.pos.distanceTo(this.ball.pos) < 0.92 && this.ball.pos.y < 1.1) {
        const moveLen = p.vel.length();
        const dirX = moveLen > 0.4 ? p.vel.x / moveLen : Math.sin(p.rotY);
        const dirZ = moveLen > 0.4 ? p.vel.z / moveLen : Math.cos(p.rotY);
        const dribbleSpeed = Math.max(4.5, moveLen * 1.18);
        this.ball.vel.x = dirX * dribbleSpeed;
        this.ball.vel.z = dirZ * dribbleSpeed;
        this.ball.lastTouchIsHome = isHome;
        this.ball.lastTouchPlayerName = p.data.name;
        this.ball.lastTouchTeamName = isHome ? this.homeTeam.name : this.awayTeam.name;
      }

      this.clampAndSyncPlayer(p, dt, false);
    });
  }

  private clampAndSyncPlayer(p: SimPlayer, dt: number, isTackling: boolean) {
    p.pos.x = Math.max(-HALF_LENGTH - 2.5, Math.min(HALF_LENGTH + 2.5, p.pos.x));
    p.pos.z = Math.max(-HALF_WIDTH - 2.5, Math.min(HALF_WIDTH + 2.5, p.pos.z));

    const spd = p.vel.length();
    if (spd > 0.35 && !isTackling) {
      const targetRot = Math.atan2(p.vel.x, p.vel.z);
      let diff = targetRot - p.rotY;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      p.rotY += diff * Math.min(1, dt * 10);
    }

    p.meshHandle.group.position.copy(p.pos);
    p.meshHandle.group.rotation.y = p.rotY;
    p.meshHandle.updateAnimation(dt, spd, p.kickAnimTimer > 0, isTackling, p.diveTimer > 0 ? p.diveDir : 0, false);
  }

  private updateCamera(dt: number) {
    const bx = this.ball.pos.x;
    const bz = this.ball.pos.z;

    if (this.currentHalf === 'penalties') {
      this.camTargetPos.set(HALF_LENGTH - 19.5, 4.4, 0.5);
      this.camLookTarget.set(HALF_LENGTH, 1.4, 0);
    } else {
      switch (this.settings.cameraMode) {
        case 'tv_wide':
          this.camTargetPos.set(bx * 0.65, 29, bz * 0.35 + 42);
          this.camLookTarget.set(bx * 0.72, 0, bz * 0.45);
          break;
        case 'pro':
          this.camTargetPos.set(bx - 16, 8.5, bz * 0.8);
          this.camLookTarget.set(bx + 10, 1.2, bz * 0.6);
          break;
        case 'action':
          this.camTargetPos.set(bx * 0.82 - 5, 13.5, bz * 0.6 + 21);
          this.camLookTarget.set(bx, 0.8, bz * 0.8);
          break;
        case 'sideline':
          this.camTargetPos.set(bx * 0.7, 15.5, HALF_WIDTH + 16);
          this.camLookTarget.set(bx * 0.85, 0.5, bz * 0.5);
          break;
        case 'broadcast':
        default:
          this.camTargetPos.set(bx * 0.72, 21.5, bz * 0.48 + 31);
          this.camLookTarget.set(bx * 0.82, 0.4, bz * 0.65);
          break;
      }
    }

    const alpha = Math.min(1, dt * 5.2);
    this.camera.position.lerp(this.camTargetPos, alpha);
    const lookNow = new THREE.Vector3();
    this.camera.getWorldDirection(lookNow);
    this.camera.lookAt(this.camLookTarget);
  }

  public dispose() {
    cancelAnimationFrame(this.animFrameId);
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    if (this.onlineUnsub) this.onlineUnsub();
    soundEngine.stopCrowdAmbience();
    this.renderer.dispose();
  }
}
