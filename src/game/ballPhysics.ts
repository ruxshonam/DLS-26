import * as THREE from 'three';
import { HALF_LENGTH, HALF_WIDTH, GOAL_WIDTH, GOAL_HEIGHT, GOAL_DEPTH } from './stadiumBuilder';
import { soundEngine } from '../audio/soundEngine';

export const BALL_RADIUS = 0.22;

export interface BallStepResult {
  goal: 'home' | 'away' | null;
  outOfBounds: { side: 'side' | 'end'; x: number; z: number } | null;
}

function createFootballTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 512, 256);

  ctx.fillStyle = '#0f172a';
  const spots = [
    [64, 64], [192, 64], [320, 64], [448, 64],
    [128, 128], [256, 128], [384, 128],
    [64, 192], [192, 192], [320, 192], [448, 192],
  ];
  spots.forEach(([x, y]) => {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (i * 2 * Math.PI) / 5 - Math.PI / 2;
      const px = x + Math.cos(a) * 24;
      const py = y + Math.sin(a) * 24;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  });

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class BallPhysics {
  public mesh: THREE.Mesh;
  public pos = new THREE.Vector3(0, BALL_RADIUS, 0);
  public vel = new THREE.Vector3(0, 0, 0);
  public spin = new THREE.Vector3(0, 0, 0);
  public lastTouchIsHome: boolean | null = null;
  public lastTouchPlayerName = '';
  public lastTouchTeamName = '';
  public isPenaltySpotMode = false;

  constructor(scene: THREE.Scene) {
    const geo = new THREE.SphereGeometry(BALL_RADIUS, 24, 24);
    const mat = new THREE.MeshStandardMaterial({
      map: createFootballTexture(),
      roughness: 0.35,
      metalness: 0.05,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.castShadow = true;
    this.mesh.position.copy(this.pos);
    scene.add(this.mesh);
  }

  public reset(x = 0, z = 0) {
    this.pos.set(x, BALL_RADIUS, z);
    this.vel.set(0, 0, 0);
    this.spin.set(0, 0, 0);
    this.mesh.position.copy(this.pos);
  }

  public kick(vx: number, vy: number, vz: number, isHome: boolean, playerName: string, teamName: string, curveY = 0) {
    this.vel.set(vx, vy, vz);
    this.spin.set(0, curveY, 0);
    this.lastTouchIsHome = isHome;
    this.lastTouchPlayerName = playerName;
    this.lastTouchTeamName = teamName;
    soundEngine.playKick(Math.min(1, Math.hypot(vx, vy, vz) / 30));
  }

  public step(dt: number, ignoreBounds = false): BallStepResult {
    // Gravity
    this.vel.y -= 21.5 * dt;

    // Magnus curve effect
    if (Math.abs(this.spin.y) > 0.01 && this.vel.lengthSq() > 4) {
      this.vel.x += this.spin.y * this.vel.z * 0.14 * dt;
      this.vel.z -= this.spin.y * this.vel.x * 0.14 * dt;
    }

    // Air drag
    this.vel.multiplyScalar(1 - 0.14 * dt);

    // Move
    this.pos.addScaledVector(this.vel, dt);

    // Ground collision & turf friction
    if (this.pos.y <= BALL_RADIUS) {
      this.pos.y = BALL_RADIUS;
      if (this.vel.y < -1.2) {
        this.vel.y = -this.vel.y * 0.56;
      } else {
        this.vel.y = 0;
      }
      const turfDrag = Math.pow(0.28, dt);
      this.vel.x *= turfDrag;
      this.vel.z *= turfDrag;
      this.spin.y *= 0.94;
    }

    // Visual ball spin rotation
    this.mesh.rotation.z -= (this.vel.x * dt) / BALL_RADIUS;
    this.mesh.rotation.x += (this.vel.z * dt) / BALL_RADIUS;

    // Goal post collisions
    const halfGoal = GOAL_WIDTH / 2;
    if (this.pos.y < GOAL_HEIGHT + BALL_RADIUS) {
      [-HALF_LENGTH, HALF_LENGTH].forEach(gx => {
        [-halfGoal, halfGoal].forEach(gz => {
          const dx = this.pos.x - gx;
          const dz = this.pos.z - gz;
          const dist = Math.hypot(dx, dz);
          if (dist < BALL_RADIUS + 0.08 && dist > 0.001) {
            const nx = dx / dist;
            const nz = dz / dist;
            this.pos.x = gx + nx * (BALL_RADIUS + 0.09);
            this.pos.z = gz + nz * (BALL_RADIUS + 0.09);
            const dot = this.vel.x * nx + this.vel.z * nz;
            if (dot < 0) {
              this.vel.x -= 1.8 * dot * nx;
              this.vel.z -= 1.8 * dot * nz;
              soundEngine.playPostHit();
            }
          }
        });
      });
    }

    // Check Goal Left (Away goal is Right +X, Home goal is Left -X)
    if (Math.abs(this.pos.z) < halfGoal - 0.1 && this.pos.y < GOAL_HEIGHT - 0.05) {
      if (this.pos.x > HALF_LENGTH + BALL_RADIUS) {
        // Clamp net back
        if (this.pos.x > HALF_LENGTH + GOAL_DEPTH - BALL_RADIUS) {
          this.pos.x = HALF_LENGTH + GOAL_DEPTH - BALL_RADIUS;
          this.vel.multiplyScalar(-0.2);
        }
        soundEngine.playGoalNet();
        this.mesh.position.copy(this.pos);
        return { goal: 'home', outOfBounds: null };
      }
      if (this.pos.x < -HALF_LENGTH - BALL_RADIUS) {
        if (this.pos.x < -HALF_LENGTH - GOAL_DEPTH + BALL_RADIUS) {
          this.pos.x = -HALF_LENGTH - GOAL_DEPTH + BALL_RADIUS;
          this.vel.multiplyScalar(-0.2);
        }
        soundEngine.playGoalNet();
        this.mesh.position.copy(this.pos);
        return { goal: 'away', outOfBounds: null };
      }
    }

    // Bounds detection (Throw-in vs Corner/Goal Kick)
    if (!ignoreBounds) {
      if (Math.abs(this.pos.z) > HALF_WIDTH + BALL_RADIUS) {
        this.mesh.position.copy(this.pos);
        return {
          goal: null,
          outOfBounds: {
            side: 'side',
            x: Math.max(-HALF_LENGTH + 1, Math.min(HALF_LENGTH - 1, this.pos.x)),
            z: this.pos.z > 0 ? HALF_WIDTH : -HALF_WIDTH,
          },
        };
      }
      if (Math.abs(this.pos.x) > HALF_LENGTH + BALL_RADIUS) {
        this.mesh.position.copy(this.pos);
        return {
          goal: null,
          outOfBounds: {
            side: 'end',
            x: this.pos.x > 0 ? HALF_LENGTH : -HALF_LENGTH,
            z: this.pos.z,
          },
        };
      }
    }

    this.mesh.position.copy(this.pos);
    return { goal: null, outOfBounds: null };
  }
}
