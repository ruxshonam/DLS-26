import * as THREE from 'three';
import { PlayerData, TeamData } from '../types/game';

export interface PlayerMeshHandle {
  group: THREE.Group;
  bodyGroup: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  ringMesh: THREE.Mesh;
  dirArrowMesh: THREE.Mesh;
  cardSprite: THREE.Mesh;
  updateAnimation: (
    dt: number,
    speed: number,
    isKicking: boolean,
    isTackling: boolean,
    isDiving: number,
    isCelebrating: boolean
  ) => void;
  setControlled: (active: boolean, color?: number) => void;
  showCard: (type: 'yellow' | 'red' | null) => void;
}

function createJerseyTexture(
  primary: string,
  secondary: string,
  pattern: TeamData['pattern'],
  number: number
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = primary;
  ctx.fillRect(0, 0, 256, 256);

  if (pattern === 'stripes') {
    ctx.fillStyle = secondary;
    for (let x = 0; x < 256; x += 48) {
      ctx.fillRect(x, 0, 22, 256);
    }
  } else if (pattern === 'hoops') {
    ctx.fillStyle = secondary;
    for (let y = 0; y < 256; y += 52) {
      ctx.fillRect(0, y, 256, 24);
    }
  } else if (pattern === 'sash') {
    ctx.fillStyle = secondary;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(75, 0);
    ctx.lineTo(256, 200);
    ctx.lineTo(256, 256);
    ctx.lineTo(180, 256);
    ctx.lineTo(0, 56);
    ctx.closePath();
    ctx.fill();
  }

  // Number on back
  ctx.fillStyle = primary.toLowerCase() === '#ffffff' || primary.toLowerCase() === '#f8fafc' ? '#0f172a' : '#ffffff';
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 5;
  ctx.font = 'bold 92px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.strokeText(String(number), 128, 134);
  ctx.fillText(String(number), 128, 134);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createPlayerMesh(player: PlayerData, team: TeamData): PlayerMeshHandle {
  const group = new THREE.Group();
  const bodyGroup = new THREE.Group();
  group.add(bodyGroup);

  const isGK = player.position === 'GK';
  const kitPrimary = isGK ? team.gkColor : team.primaryColor;
  const kitSecondary = team.secondaryColor;
  const skinColor = player.skinTone || '#e0b892';
  const hairColor = player.hairColor || '#1c150e';

  const jerseyTex = createJerseyTexture(kitPrimary, kitSecondary, isGK ? 'solid' : team.pattern, player.number);
  const jerseyMat = new THREE.MeshStandardMaterial({ map: jerseyTex, roughness: 0.65 });
  const shortsMat = new THREE.MeshStandardMaterial({ color: isGK ? '#0f172a' : kitSecondary, roughness: 0.7 });
  const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.75 });
  const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.85 });
  const bootMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.4 });
  const sockMat = new THREE.MeshStandardMaterial({ color: kitPrimary, roughness: 0.7 });

  // Torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.6, 0.28), jerseyMat);
  torso.position.y = 1.05;
  torso.castShadow = true;
  bodyGroup.add(torso);

  // Shorts
  const shorts = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.24, 0.27), shortsMat);
  shorts.position.y = 0.68;
  shorts.castShadow = true;
  bodyGroup.add(shorts);

  // Head + Hair
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), skinMat);
  head.position.y = 1.54;
  head.castShadow = true;
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.168, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
    hairMat
  );
  hair.position.y = 1.56;
  bodyGroup.add(head, hair);

  // Legs
  const makeLeg = (xOffset: number) => {
    const legGroup = new THREE.Group();
    legGroup.position.set(xOffset, 0.6, 0);
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.072, 0.34, 8), skinMat);
    thigh.position.y = -0.17;
    const sock = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.26, 8), sockMat);
    sock.position.y = -0.44;
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.09, 0.24), bootMat);
    boot.position.set(0, -0.56, 0.04);
    legGroup.add(thigh, sock, boot);
    legGroup.traverse(m => {
      if ((m as THREE.Mesh).isMesh) m.castShadow = true;
    });
    return legGroup;
  };
  const leftLeg = makeLeg(-0.13);
  const rightLeg = makeLeg(0.13);
  bodyGroup.add(leftLeg, rightLeg);

  // Arms
  const makeArm = (xOffset: number) => {
    const armGroup = new THREE.Group();
    armGroup.position.set(xOffset, 1.3, 0);
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.065, 0.24, 8), jerseyMat);
    sleeve.position.y = -0.11;
    const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.048, 0.28, 8), skinMat);
    forearm.position.y = -0.34;
    armGroup.add(sleeve, forearm);
    return armGroup;
  };
  const leftArm = makeArm(-0.31);
  const rightArm = makeArm(0.31);
  bodyGroup.add(leftArm, rightArm);

  // Controlled Ring on ground
  const ringMesh = new THREE.Mesh(
    new THREE.RingGeometry(0.48, 0.64, 24),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.9 })
  );
  ringMesh.rotation.x = -Math.PI / 2;
  ringMesh.position.y = 0.03;
  ringMesh.visible = false;
  group.add(ringMesh);

  // Direction indicator arrow
  const arrowShape = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-0.18, 0, 0.65),
    new THREE.Vector3(0.18, 0, 0.65),
    new THREE.Vector3(0, 0, 0.95),
  ]);
  arrowShape.setIndex([0, 1, 2]);
  const dirArrowMesh = new THREE.Mesh(
    arrowShape,
    new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide })
  );
  dirArrowMesh.position.y = 0.035;
  dirArrowMesh.visible = false;
  group.add(dirArrowMesh);

  // Overhead Yellow/Red Card indicator
  const cardSprite = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.34, 0.04),
    new THREE.MeshBasicMaterial({ color: 0xfacc15 })
  );
  cardSprite.position.y = 2.15;
  cardSprite.visible = false;
  group.add(cardSprite);

  let phase = Math.random() * Math.PI * 2;
  let kickTimer = 0;

  return {
    group,
    bodyGroup,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    ringMesh,
    dirArrowMesh,
    cardSprite,
    setControlled(active: boolean, color = 0x38bdf8) {
      ringMesh.visible = active;
      dirArrowMesh.visible = active;
      (ringMesh.material as THREE.MeshBasicMaterial).color.setHex(color);
    },
    showCard(type: 'yellow' | 'red' | null) {
      if (!type) {
        cardSprite.visible = false;
        return;
      }
      cardSprite.visible = true;
      (cardSprite.material as THREE.MeshBasicMaterial).color.setHex(type === 'yellow' ? 0xfacc15 : 0xef4444);
    },
    updateAnimation(dt, speed, isKicking, isTackling, isDiving, isCelebrating) {
      if (isKicking) kickTimer = 0.28;
      if (kickTimer > 0) kickTimer = Math.max(0, kickTimer - dt);

      if (isDiving !== 0) {
        bodyGroup.rotation.z = isDiving * 1.15;
        bodyGroup.position.y = 0.45;
        leftArm.rotation.z = -0.9;
        rightArm.rotation.z = 0.9;
        return;
      }

      if (isTackling) {
        bodyGroup.rotation.x = -1.15;
        bodyGroup.position.y = 0.22;
        rightLeg.rotation.x = -0.9;
        leftLeg.rotation.x = 0.4;
        return;
      }

      bodyGroup.rotation.x = 0;
      bodyGroup.rotation.z = 0;

      if (isCelebrating) {
        phase += dt * 10;
        bodyGroup.position.y = Math.abs(Math.sin(phase)) * 0.45;
        leftArm.rotation.x = -2.4;
        rightArm.rotation.x = -2.4;
        leftLeg.rotation.x = 0;
        rightLeg.rotation.x = 0;
        return;
      }

      if (speed > 0.25) {
        phase += dt * Math.min(18, 4 + speed * 1.65);
        const swing = Math.sin(phase) * Math.min(0.95, 0.25 + speed * 0.08);
        leftLeg.rotation.x = swing;
        rightLeg.rotation.x = kickTimer > 0 ? -1.15 : -swing;
        leftArm.rotation.x = -swing * 0.85;
        rightArm.rotation.x = swing * 0.85;
        bodyGroup.position.y = Math.abs(Math.cos(phase)) * 0.05;
      } else {
        bodyGroup.position.y = 0;
        leftLeg.rotation.x *= 0.82;
        rightLeg.rotation.x = kickTimer > 0 ? -1.1 : rightLeg.rotation.x * 0.82;
        leftArm.rotation.x *= 0.82;
        rightArm.rotation.x *= 0.82;
      }
    },
  };
}
