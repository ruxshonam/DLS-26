import * as THREE from 'three';

export const PITCH_LENGTH = 105; // X axis: -52.5 to +52.5
export const PITCH_WIDTH = 68;   // Z axis: -34 to +34
export const HALF_LENGTH = PITCH_LENGTH / 2;
export const HALF_WIDTH = PITCH_WIDTH / 2;
export const GOAL_WIDTH = 7.32;
export const GOAL_HEIGHT = 2.44;
export const GOAL_DEPTH = 2.4;

export interface StadiumHandle {
  group: THREE.Group;
  updateCrowd: (time: number, excitement: number) => void;
  updateAdBoards: (time: number) => void;
}

function createPitchTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1326;
  const ctx = canvas.getContext('2d')!;

  // Mowed grass stripes (18 stripes across pitch length)
  const stripeCount = 18;
  const stripeW = canvas.width / stripeCount;
  for (let i = 0; i < stripeCount; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#1b7a38' : '#218c42';
    ctx.fillRect(i * stripeW, 0, stripeW + 1, canvas.height);
  }

  // Subtle grass grain noise
  ctx.fillStyle = 'rgba(255,255,255,0.02)';
  for (let i = 0; i < 6000; i++) {
    ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 3, 2);
  }

  // Pitch white lines helper (mapping meters to canvas pixels)
  const padX = 70;
  const padY = 55;
  const fieldW = canvas.width - padX * 2;
  const fieldH = canvas.height - padY * 2;
  const m2x = (m: number) => padX + (m / PITCH_LENGTH) * fieldW;
  const m2y = (m: number) => padY + (m / PITCH_WIDTH) * fieldH;

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.94)';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
  ctx.lineWidth = 6;

  // Touchlines & goal lines
  ctx.strokeRect(padX, padY, fieldW, fieldH);

  // Halfway line
  ctx.beginPath();
  ctx.moveTo(m2x(HALF_LENGTH), padY);
  ctx.lineTo(m2x(HALF_LENGTH), padY + fieldH);
  ctx.stroke();

  // Center circle & center spot
  const rCenter = (9.15 / PITCH_LENGTH) * fieldW;
  ctx.beginPath();
  ctx.arc(m2x(HALF_LENGTH), m2y(HALF_WIDTH), rCenter, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(m2x(HALF_LENGTH), m2y(HALF_WIDTH), 9, 0, Math.PI * 2);
  ctx.fill();

  // Left Penalty Area (16.5m deep, 40.32m wide)
  const penW = (16.5 / PITCH_LENGTH) * fieldW;
  const penH = (40.32 / PITCH_WIDTH) * fieldH;
  const sixW = (5.5 / PITCH_LENGTH) * fieldW;
  const sixH = (18.32 / PITCH_WIDTH) * fieldH;

  ctx.strokeRect(padX, m2y(HALF_WIDTH) - penH / 2, penW, penH);
  ctx.strokeRect(padX, m2y(HALF_WIDTH) - sixH / 2, sixW, sixH);
  ctx.beginPath();
  ctx.arc(m2x(11), m2y(HALF_WIDTH), 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(m2x(11), m2y(HALF_WIDTH), rCenter, -0.64, 0.64);
  ctx.stroke();

  // Right Penalty Area
  ctx.strokeRect(padX + fieldW - penW, m2y(HALF_WIDTH) - penH / 2, penW, penH);
  ctx.strokeRect(padX + fieldW - sixW, m2y(HALF_WIDTH) - sixH / 2, sixW, sixH);
  ctx.beginPath();
  ctx.arc(m2x(PITCH_LENGTH - 11), m2y(HALF_WIDTH), 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(m2x(PITCH_LENGTH - 11), m2y(HALF_WIDTH), rCenter, Math.PI - 0.64, Math.PI + 0.64);
  ctx.stroke();

  // 4 Corner arcs
  const cornerR = (1.6 / PITCH_LENGTH) * fieldW;
  const corners: [number, number, number, number][] = [
    [padX, padY, 0, Math.PI / 2],
    [padX + fieldW, padY, Math.PI / 2, Math.PI],
    [padX + fieldW, padY + fieldH, Math.PI, Math.PI * 1.5],
    [padX, padY + fieldH, Math.PI * 1.5, Math.PI * 2],
  ];
  corners.forEach(([cx, cy, s, e]) => {
    ctx.beginPath();
    ctx.arc(cx, cy, cornerR, s, e);
    ctx.stroke();
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createGoal(isRight: boolean): THREE.Group {
  const goal = new THREE.Group();
  const dir = isRight ? 1 : -1;
  const postMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.25,
    metalness: 0.55,
  });

  const postGeo = new THREE.CylinderGeometry(0.08, 0.08, GOAL_HEIGHT, 12);
  const leftPost = new THREE.Mesh(postGeo, postMat);
  leftPost.position.set(0, GOAL_HEIGHT / 2, -GOAL_WIDTH / 2);
  leftPost.castShadow = true;

  const rightPost = new THREE.Mesh(postGeo, postMat);
  rightPost.position.set(0, GOAL_HEIGHT / 2, GOAL_WIDTH / 2);
  rightPost.castShadow = true;

  const crossbarGeo = new THREE.CylinderGeometry(0.08, 0.08, GOAL_WIDTH + 0.16, 12);
  crossbarGeo.rotateX(Math.PI / 2);
  const crossbar = new THREE.Mesh(crossbarGeo, postMat);
  crossbar.position.set(0, GOAL_HEIGHT, 0);
  crossbar.castShadow = true;

  // Back support stanchions
  const barGeo = new THREE.CylinderGeometry(0.05, 0.05, GOAL_DEPTH, 8);
  barGeo.rotateZ(Math.PI / 2);
  [-GOAL_WIDTH / 2, GOAL_WIDTH / 2].forEach(z => {
    const topBar = new THREE.Mesh(barGeo, postMat);
    topBar.position.set(dir * (GOAL_DEPTH / 2), GOAL_HEIGHT, z);
    const botBar = new THREE.Mesh(barGeo, postMat);
    botBar.position.set(dir * (GOAL_DEPTH / 2), 0.05, z);
    const backPost = new THREE.Mesh(postGeo, postMat);
    backPost.position.set(dir * GOAL_DEPTH, GOAL_HEIGHT / 2, z);
    goal.add(topBar, botBar, backPost);
  });

  // Procedural Net Material
  const netMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    wireframe: true,
    transparent: true,
    opacity: 0.48,
    side: THREE.DoubleSide,
  });

  const backNet = new THREE.Mesh(new THREE.PlaneGeometry(GOAL_WIDTH, GOAL_HEIGHT, 18, 8), netMat);
  backNet.rotation.y = Math.PI / 2;
  backNet.position.set(dir * GOAL_DEPTH, GOAL_HEIGHT / 2, 0);

  const roofNet = new THREE.Mesh(new THREE.PlaneGeometry(GOAL_DEPTH, GOAL_WIDTH, 6, 18), netMat);
  roofNet.rotation.x = Math.PI / 2;
  roofNet.position.set(dir * (GOAL_DEPTH / 2), GOAL_HEIGHT, 0);

  const sideLeft = new THREE.Mesh(new THREE.PlaneGeometry(GOAL_DEPTH, GOAL_HEIGHT, 6, 8), netMat);
  sideLeft.position.set(dir * (GOAL_DEPTH / 2), GOAL_HEIGHT / 2, -GOAL_WIDTH / 2);

  const sideRight = new THREE.Mesh(new THREE.PlaneGeometry(GOAL_DEPTH, GOAL_HEIGHT, 6, 8), netMat);
  sideRight.position.set(dir * (GOAL_DEPTH / 2), GOAL_HEIGHT / 2, GOAL_WIDTH / 2);

  goal.add(leftPost, rightPost, crossbar, backNet, roofNet, sideLeft, sideRight);
  goal.position.set(dir * HALF_LENGTH, 0, 0);
  return goal;
}

function createAdBoardTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  const colors = ['#0284c7', '#0f172a', '#d97706', '#059669'];
  const labels = ['DREAM LEAGUE 3D', 'TURON ARENA', 'FAIR PLAY FIFA', 'CHAMPS CUP'];
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = colors[i];
    ctx.fillRect(i * 256, 0, 256, 128);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(labels[i], i * 256 + 128, 64);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildStadium(primaryHex: string, secondaryHex: string): StadiumHandle {
  const group = new THREE.Group();

  // Outer world stadium earth/apron so nothing floats in void
  const outerApron = new THREE.Mesh(
    new THREE.CircleGeometry(280, 48),
    new THREE.MeshStandardMaterial({ color: 0x0f1f14, roughness: 0.95 })
  );
  outerApron.rotation.x = -Math.PI / 2;
  outerApron.position.y = -0.06;
  outerApron.receiveShadow = true;
  group.add(outerApron);

  // Athletics running track & pitch apron
  const trackMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(PITCH_LENGTH + 26, PITCH_WIDTH + 22),
    new THREE.MeshStandardMaterial({ color: 0x164e32, roughness: 0.9 })
  );
  trackMesh.rotation.x = -Math.PI / 2;
  trackMesh.position.y = -0.02;
  trackMesh.receiveShadow = true;
  group.add(trackMesh);

  // Main Football Pitch with markings
  const pitchTex = createPitchTexture();
  const pitchMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(PITCH_LENGTH + 7.4, PITCH_WIDTH + 6),
    new THREE.MeshStandardMaterial({
      map: pitchTex,
      roughness: 0.88,
      metalness: 0.02,
    })
  );
  pitchMesh.rotation.x = -Math.PI / 2;
  pitchMesh.receiveShadow = true;
  group.add(pitchMesh);

  // Goals
  group.add(createGoal(false));
  group.add(createGoal(true));

  // Corner Flags
  const flagPoleMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.4 });
  const flagClothMat = new THREE.MeshStandardMaterial({ color: 0xef4444, side: THREE.DoubleSide });
  [
    [-HALF_LENGTH, -HALF_WIDTH],
    [-HALF_LENGTH, HALF_WIDTH],
    [HALF_LENGTH, -HALF_WIDTH],
    [HALF_LENGTH, HALF_WIDTH],
  ].forEach(([cx, cz]) => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.5, 8), flagPoleMat);
    pole.position.set(cx, 0.75, cz);
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.3), flagClothMat);
    cloth.position.set(cx + 0.22, 1.32, cz);
    group.add(pole, cloth);
  });

  // LED Ad Boards around the field
  const adTex = createAdBoardTexture();
  const adMat = new THREE.MeshStandardMaterial({
    map: adTex,
    emissive: 0x222222,
    emissiveMap: adTex,
    emissiveIntensity: 0.65,
    roughness: 0.4,
  });

  const northAd = new THREE.Mesh(new THREE.BoxGeometry(PITCH_LENGTH + 6, 1.05, 0.35), adMat);
  northAd.position.set(0, 0.52, -HALF_WIDTH - 4.2);
  const southAd = new THREE.Mesh(new THREE.BoxGeometry(PITCH_LENGTH + 6, 1.05, 0.35), adMat);
  southAd.position.set(0, 0.52, HALF_WIDTH + 4.2);
  const westAd = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.05, PITCH_WIDTH + 6), adMat);
  westAd.position.set(-HALF_LENGTH - 5.2, 0.52, 0);
  const eastAd = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.05, PITCH_WIDTH + 6), adMat);
  eastAd.position.set(HALF_LENGTH + 5.2, 0.52, 0);
  group.add(northAd, southAd, westAd, eastAd);

  // Stadium Multi-tier Grandstands
  const concreteMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6, metalness: 0.3 });

  const buildStand = (x: number, z: number, width: number, depth: number, rotY: number) => {
    const stand = new THREE.Group();
    for (let tier = 0; tier < 4; tier++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(width, 2.2, depth / 4), concreteMat);
      step.position.set(0, 1.1 + tier * 2.1, tier * (depth / 4) - depth / 2 + depth / 8);
      step.receiveShadow = true;
      stand.add(step);
    }
    const roof = new THREE.Mesh(new THREE.BoxGeometry(width + 2, 0.6, depth + 4), roofMat);
    roof.position.set(0, 12.2, 0);
    roof.rotation.x = 0.12;
    stand.add(roof);
    stand.position.set(x, 0, z);
    stand.rotation.y = rotY;
    return stand;
  };

  group.add(buildStand(0, -HALF_WIDTH - 15, PITCH_LENGTH + 20, 14, 0));
  group.add(buildStand(0, HALF_WIDTH + 15, PITCH_LENGTH + 20, 14, Math.PI));
  group.add(buildStand(-HALF_LENGTH - 16, 0, PITCH_WIDTH + 16, 14, Math.PI / 2));
  group.add(buildStand(HALF_LENGTH + 16, 0, PITCH_WIDTH + 16, 14, -Math.PI / 2));

  // Stadium Floodlight Towers (4 corners)
  const towerMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6, roughness: 0.4 });
  const bulbMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfffbeb,
    emissiveIntensity: 1.8,
  });
  [
    [-HALF_LENGTH - 18, -HALF_WIDTH - 16],
    [HALF_LENGTH + 18, -HALF_WIDTH - 16],
    [-HALF_LENGTH - 18, HALF_WIDTH + 16],
    [HALF_LENGTH + 18, HALF_WIDTH + 16],
  ].forEach(([tx, tz]) => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.7, 32, 8), towerMat);
    pole.position.set(tx, 16, tz);
    const head = new THREE.Mesh(new THREE.BoxGeometry(5.5, 2.8, 0.8), bulbMat);
    head.position.set(tx, 32, tz);
    head.lookAt(0, 0, 0);
    group.add(pole, head);
  });

  // Instanced Animated Crowd Spectators (1600 fans across stands)
  const fanCount = 1400;
  const fanGeo = new THREE.BoxGeometry(0.45, 0.8, 0.35);
  const fanMat = new THREE.MeshStandardMaterial({ roughness: 0.7 });
  const fans = new THREE.InstancedMesh(fanGeo, fanMat, fanCount);

  const fanBasePos: { x: number; y: number; z: number; phase: number }[] = [];
  const dummy = new THREE.Object3D();
  const cPrimary = new THREE.Color(primaryHex);
  const cSecondary = new THREE.Color(secondaryHex);
  const cAccent = new THREE.Color('#e2e8f0');

  for (let i = 0; i < fanCount; i++) {
    const side = i % 4;
    const tier = Math.floor(Math.random() * 4);
    const y = 2.4 + tier * 2.1;
    let x = 0;
    let z = 0;
    if (side === 0) {
      x = (Math.random() - 0.5) * (PITCH_LENGTH + 14);
      z = -HALF_WIDTH - 9.5 - tier * 3.2;
    } else if (side === 1) {
      x = (Math.random() - 0.5) * (PITCH_LENGTH + 14);
      z = HALF_WIDTH + 9.5 + tier * 3.2;
    } else if (side === 2) {
      x = -HALF_LENGTH - 10.5 - tier * 3.2;
      z = (Math.random() - 0.5) * (PITCH_WIDTH + 10);
    } else {
      x = HALF_LENGTH + 10.5 + tier * 3.2;
      z = (Math.random() - 0.5) * (PITCH_WIDTH + 10);
    }
    fanBasePos.push({ x, y, z, phase: Math.random() * Math.PI * 2 });
    dummy.position.set(x, y, z);
    dummy.updateMatrix();
    fans.setMatrixAt(i, dummy.matrix);

    const r = Math.random();
    fans.setColorAt(i, r < 0.45 ? cPrimary : r < 0.78 ? cSecondary : cAccent);
  }
  fans.instanceMatrix.needsUpdate = true;
  if (fans.instanceColor) fans.instanceColor.needsUpdate = true;
  group.add(fans);

  return {
    group,
    updateCrowd(time: number, excitement: number) {
      const amp = 0.08 + excitement * 0.36;
      const speed = 4 + excitement * 7;
      for (let i = 0; i < fanCount; i++) {
        const b = fanBasePos[i];
        dummy.position.set(b.x, b.y + Math.abs(Math.sin(time * speed + b.phase)) * amp, b.z);
        dummy.updateMatrix();
        fans.setMatrixAt(i, dummy.matrix);
      }
      fans.instanceMatrix.needsUpdate = true;
    },
    updateAdBoards(time: number) {
      adTex.offset.x = (time * 0.03) % 1;
    },
  };
}
