import * as THREE from '../../libs/three.module.js';
import { OBJLoader } from '../../libs/OBJLoader.js';
import { CONFIG } from './config.js';
import { WaterSimulation } from './simulation/WaterSimulation.js';
import { WaterSurface } from './render/WaterSurface.js';
import { Pool } from './render/Pool.js';
import { Caustics } from './render/Caustics.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0000000);

const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.01, 100);
camera.position.set(0, 2.1, 4.3);
camera.lookAt(0, -0.35, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.4));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
// use ACES tone mapping and sRGB output for better dynamic range and correct color response
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputEncoding = THREE.sRGBEncoding;

const hemi = new THREE.HemisphereLight(0xf9fbff, 0xd7e1ea, 0.72);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xffffff, 3.2);
sun.castShadow = true;
sun.shadow.mapSize.width = 2048;
sun.shadow.mapSize.height = 2048;
sun.shadow.camera.near = 0.1;
sun.shadow.camera.far = 16;
sun.shadow.camera.left = -5;
sun.shadow.camera.right = 5;
sun.shadow.camera.top = 5;
sun.shadow.camera.bottom = -5;
sun.shadow.bias = -0.0004;
// place the sun opposite the camera so reflections are directed into the view
sun.position.copy(camera.position).multiplyScalar(-1);
sun.position.y = Math.abs(sun.position.y) + 3.0;
// ensure the light targets the scene center
sun.target.position.set(0, 0, 0);
scene.add(sun);
scene.add(sun.target);

const fillLight = new THREE.DirectionalLight(0xeaf6ff, 0.14);
fillLight.position.set(-1.8, 1.5, 1.6);
scene.add(fillLight);

// subtle ambient to lift shadows and give more natural fill
const ambient = new THREE.AmbientLight(0xffffff, 0.12);
scene.add(ambient);

// const room = new THREE.Mesh(
//   new THREE.PlaneGeometry(18, 18),
//   new THREE.MeshStandardMaterial({ color: 0xf2f5f8, roughness: 1.0, metalness: 0.0 })
// );
// room.rotation.x = -Math.PI / 2;
// room.position.y = -1.06;
// room.receiveShadow = true;
// scene.add(room);

const innerWidth = CONFIG.poolWidth - CONFIG.wallThickness * 2 - 0.04;
const innerDepth = CONFIG.poolDepth - CONFIG.wallThickness * 2 - 0.04;
const innerHalfW = innerWidth * 0.5;
const innerHalfD = innerDepth * 0.5;

// Pool rim top is not y=0, but wallThickness * 0.5
const rimTopY = CONFIG.wallThickness * 0.5;

// Water surface sits slightly below the rim
const waterInset = 0.10;
const waterY = rimTopY - waterInset;

console.log('rimTopY =', rimTopY, 'waterY =', waterY);

const pool = new Pool({
  width: CONFIG.poolWidth,
  depth: CONFIG.poolDepth,
  height: CONFIG.poolHeight,
  wallThickness: CONFIG.wallThickness,
});
scene.add(pool.group);

const sim = new WaterSimulation(
  CONFIG.simResolution,
  CONFIG.damping,
  CONFIG.propagation
);

const surface = new WaterSurface({
  width: innerWidth,
  depth: innerDepth,
  resolution: CONFIG.simResolution,
  waterLevel: waterY,
  lightDirection: sun.position,
});
scene.add(surface.mesh);

const caustics = new Caustics({
  width: innerWidth,
  depth: innerDepth,
  y: -CONFIG.poolHeight + 0.003,
});
scene.add(caustics.mesh);

// Very light water volume sides
const sideWaterMat = new THREE.MeshPhysicalMaterial({
  color: 0x9fdcff,
  roughness: 0.18,
  metalness: 0.0,
  transmission: 0.22,
  transparent: true,
  opacity: 0.08,
  thickness: 0.6,
  ior: 1.333,
  side: THREE.DoubleSide
});

const waterHeight = waterY - (-CONFIG.poolHeight);

function makeWaterSide(w, h, rotY, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), sideWaterMat);
  mesh.rotation.y = rotY;
  mesh.position.set(x, y, z);
  return mesh;
}

const waterSides = new THREE.Group();
scene.add(waterSides);

// Back water side
waterSides.add(
  makeWaterSide(
    innerWidth,
    waterHeight,
    0,
    0,
    -CONFIG.poolHeight + waterHeight * 0.5,
    -innerHalfD + 0.002
  )
);

// Front water side REMOVED because the pool is open toward the camera

// Left water side
waterSides.add(
  makeWaterSide(
    innerDepth,
    waterHeight,
    Math.PI * 0.5,
    -innerHalfW + 0.002,
    -CONFIG.poolHeight + waterHeight * 0.5,
    0
  )
);

// Right water side
waterSides.add(
  makeWaterSide(
    innerDepth,
    waterHeight,
    -Math.PI * 0.5,
    innerHalfW - 0.002,
    -CONFIG.poolHeight + waterHeight * 0.5,
    0
  )
);

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const topPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -waterY);
const hit = new THREE.Vector3();
const lastUV = new THREE.Vector2();
const halfW = innerHalfW;
const halfD = innerHalfD;

// Duck model loading and drop simulation
const loader = new OBJLoader();
let duckModel = null;
const ducks = [];

const duckUrl = new URL('../Duck/Duck.obj', import.meta.url).href;
fetch(duckUrl).then(r => r.text()).then(text => {
  try {
    duckModel = loader.parse(text);
    duckModel.scale.set(0.02, 0.02, 0.02);

    // try to load textures from Duck folder and apply to meshes
    const texLoader = new THREE.TextureLoader();
    const duckFolder = new URL('../Duck/', import.meta.url).href;
    const maps = {
      map: new URL('Duck_albedo.jpg', duckFolder).href,
      normalMap: new URL('Duck_normal.png', duckFolder).href,
      roughnessMap: new URL('Duck_roughness.jpg', duckFolder).href,
      metalnessMap: new URL('Duck_metallic.jpg', duckFolder).href,
      aoMap: new URL('Duck_AO.jpg', duckFolder).href,
    };

    const loaded = {};
    Object.keys(maps).forEach((key) => {
      const url = maps[key];
      texLoader.load(url, (tex) => { loaded[key] = tex; }, undefined, () => { /* ignore errors */ });
    });

    // after a short delay to allow textures to start loading, apply materials
    setTimeout(() => {
      duckModel.traverse((c) => {
        if (c.isMesh) {
          const matOptions = { color: 0xffffff };
          if (loaded.map) matOptions.map = loaded.map;
          if (loaded.normalMap) matOptions.normalMap = loaded.normalMap;
          if (loaded.roughnessMap) matOptions.roughnessMap = loaded.roughnessMap;
          if (loaded.metalnessMap) matOptions.metalnessMap = loaded.metalnessMap;
          if (loaded.aoMap) matOptions.aoMap = loaded.aoMap;
          const m = new THREE.MeshStandardMaterial(matOptions);
          m.needsUpdate = true;
          c.material = m;
        }
      });
    }, 80);

  } catch (e) {
    console.warn('Failed to parse duck OBJ', e);
    duckModel = null;
  }
}).catch(err => {
  console.warn('Failed to load duck OBJ', err);
  duckModel = null;
});

function spawnDuckAt(x, z) {
  if (!duckModel) return;
  const duck = duckModel.clone(true);
  duck.position.set(x, waterY + 2.2, z);
  duck.traverse((c) => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });

  // compute approximate collision radius from bounding box
  const box = new THREE.Box3().setFromObject(duck);
  const size = new THREE.Vector3();
  box.getSize(size);
  const radius = Math.max(size.x, size.y, size.z) * 0.5;

  duck.userData.radius = radius || 0.2;
  // make ducks lighter
  duck.userData.mass = Math.max(0.25, radius * 1.0);
  // more bouncy initial downward velocity and slight horizontal impulse
  duck.userData.velocity = new THREE.Vector3((Math.random() - 0.5) * 0.4, -3.6 - Math.random() * 1.2, (Math.random() - 0.5) * 0.4);
  duck.userData.isInWater = false;
  duck.userData.age = 0;
  // bounciness (coefficient of restitution)
  duck.userData.restitution = 0.55;
  // longer life
  duck.userData.maxAge = 18.0 + Math.random() * 8.0;
  scene.add(duck);
  ducks.push(duck);
}

let hasPointer = false;
let lastRippleTime = 0;

function pointerRipple(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  if (!raycaster.ray.intersectPlane(topPlane, hit)) return;
  if (hit.x < -halfW || hit.x > halfW || hit.z < -halfD || hit.z > halfD) return;

  const u = (hit.x + halfW) / innerWidth;
  const v = 1.0 - (hit.z + halfD) / innerDepth;
  const now = performance.now() * 0.001;

  if (!hasPointer) {
    sim.addDrop(u, v, 2.8, 0.045);
    lastUV.set(u, v);
    hasPointer = true;
    lastRippleTime = now;
    // spawn duck when clicking
    if (event.type === 'pointerdown') spawnDuckAt(hit.x, hit.z);
    return;
  }

  const dist = lastUV.distanceTo(new THREE.Vector2(u, v));
  if (dist > 0.01 || now - lastRippleTime > 0.06) {
    sim.addDrop(u, v, 2.2 + dist * 18.0, Math.min(0.12, 0.03 + dist * 1.2));
    if (dist > 0.02) {
      sim.addDrop((u + lastUV.x) * 0.5, (v + lastUV.y) * 0.5, 1.5, 0.02);
    }
    lastUV.set(u, v);
    lastRippleTime = now;
    if (event.type === 'pointerdown') spawnDuckAt(hit.x, hit.z);
  }
}

renderer.domElement.addEventListener('pointermove', pointerRipple);
renderer.domElement.addEventListener('pointerdown', pointerRipple);
renderer.domElement.addEventListener('pointerleave', () => {
  hasPointer = false;
});

let autoT = 0;
let autoClock1 = 0;
let autoClock2 = 0;
let floorFrame = 0;
let causticFrame = 0;

function animate() {
  requestAnimationFrame(animate);

  const t = performance.now() * 0.001;
  autoT += 0.005;
  autoClock1 += 0.016;
  autoClock2 += 0.016;

  const u1 = 0.5 + Math.cos(autoT * 0.8) * 0.18;
  const v1 = 0.5 + Math.sin(autoT * 1.1) * 0.18;
  const u2 = 0.5 + Math.cos(autoT * 1.45 + 1.7) * 0.27;
  const v2 = 0.5 + Math.sin(autoT * 0.95 + 2.0) * 0.2;

  if (autoClock1 > CONFIG.autoRippleIntervalA) {
    sim.addDrop(u1, v1, 1.6, 0.0045);
    autoClock1 = 0;
  }

  if (autoClock2 > CONFIG.autoRippleIntervalB) {
    sim.addDrop(u2, v2, 2.1, 0.006);
    autoClock2 = 0;
  }

  if (!hasPointer && Math.random() < 0.01) {
    sim.addDrop(
      0.5 + Math.cos(autoT * 1.0) * 0.3,
      0.5 + Math.sin(autoT * 1.4) * 0.25,
      1.2,
      0.0035
    );
  }

  sim.step();
  sim.step();

  surface.update(sim, t);

  causticFrame++;
  if (causticFrame % 2 === 0) {
    caustics.update(sim, t);
  }

  floorFrame++;
  if (floorFrame % 3 === 0) {
    pool.updateFloorDistortion(sim, t);
  }

  // update ducks (physics with buoyancy and simple collision volume)
  const dt = 0.016; // fixed step
  for (let i = ducks.length - 1; i >= 0; i--) {
    const d = ducks[i];
    const v = d.userData.velocity;
    const r = d.userData.radius || 0.2;
    const mass = d.userData.mass || 1.0;

    // gravity
    v.y -= 9.8 * dt;

    // integrate
    d.position.x += v.x * dt;
    d.position.y += v.y * dt;
    d.position.z += v.z * dt;
    d.userData.age += dt;
    d.rotation.y += dt * 0.6;

    // pool wall collision (simple sphere vs box)
    const minX = -halfW + r;
    const maxX = halfW - r;
    const minZ = -halfD + r;
    const maxZ = halfD - r;
    if (d.position.x < minX) { d.position.x = minX; v.x = -v.x * 0.4; }
    if (d.position.x > maxX) { d.position.x = maxX; v.x = -v.x * 0.4; }
    if (d.position.z < minZ) { d.position.z = minZ; v.z = -v.z * 0.4; }
    if (d.position.z > maxZ) { d.position.z = maxZ; v.z = -v.z * 0.4; }

    // water interaction
    // depth of submersion: positive when submerged
    const submerged = Math.max(0, (r + waterY) - d.position.y);
    if (submerged > 0 && !d.userData.isInWater) {
      // first contact — create initial splash
      d.userData.isInWater = true;
      const uDuck = (d.position.x + halfW) / innerWidth;
      const vDuck = 1.0 - (d.position.z + halfD) / innerDepth;
      const strength = Math.min(3.5, Math.abs(v.y) * 0.9 + 0.6);
      sim.addDrop(uDuck, vDuck, strength, 0.05);
    }

    if (d.userData.isInWater) {
      // simple buoyancy: upward force proportional to submerged volume
      const buoyancy = 30.0 * submerged; // tuned constant
      // acceleration = (buoyancy - gravity * mass) / mass
      v.y += (buoyancy / Math.max(0.1, mass)) * dt;

      // linear drag
      v.x *= 0.992;
      v.z *= 0.992;
      v.y *= 0.985;

      // gentle bobbing rotation/tilt
      d.rotation.z = Math.sin(d.userData.age * 1.6) * 0.06;
      d.rotation.x = Math.sin(d.userData.age * 1.2) * 0.03;

      // keep duck near surface (soft clamp)
      const targetY = waterY + r * 0.6;
      d.position.y += (targetY - d.position.y) * 0.06;

      if (d.userData.age > d.userData.maxAge) {
        scene.remove(d);
        ducks.splice(i, 1);
      }
    }
  }

  // simple duck-vs-duck collisions (sphere-sphere)
  for (let a = 0; a < ducks.length; a++) {
    for (let b = a + 1; b < ducks.length; b++) {
      const A = ducks[a];
      const B = ducks[b];
      const dx = B.position.x - A.position.x;
      const dz = B.position.z - A.position.z;
      const dy = B.position.y - A.position.y;
      const dist2 = dx * dx + dy * dy + dz * dz;
      const rSum = (A.userData.radius || 0.2) + (B.userData.radius || 0.2);
      if (dist2 > 0 && dist2 < rSum * rSum) {
        const dist = Math.sqrt(dist2);
        const overlap = rSum - dist;
        const nx = dx / dist;
        const ny = dy / dist;
        const nz = dz / dist;
        // push them apart
        A.position.x -= nx * overlap * 0.5;
        A.position.y -= ny * overlap * 0.5;
        A.position.z -= nz * overlap * 0.5;
        B.position.x += nx * overlap * 0.5;
        B.position.y += ny * overlap * 0.5;
        B.position.z += nz * overlap * 0.5;
        // exchange velocities along normal (elastic-ish)
        const va = A.userData.velocity;
        const vb = B.userData.velocity;
        const rel = (va.x - vb.x) * nx + (va.y - vb.y) * ny + (va.z - vb.z) * nz;
        if (rel < 0) {
          const e = Math.min(A.userData.restitution || 0.5, B.userData.restitution || 0.5);
          const j = -(1 + e) * rel / (1 / A.userData.mass + 1 / B.userData.mass);
          va.x += (j * nx) / A.userData.mass;
          va.y += (j * ny) / A.userData.mass;
          va.z += (j * nz) / A.userData.mass;
          vb.x -= (j * nx) / B.userData.mass;
          vb.y -= (j * ny) / B.userData.mass;
          vb.z -= (j * nz) / B.userData.mass;
        }
      }
    }
  }

  renderer.render(scene, camera);
}

pool.updateFloorDistortion(sim, 0);
caustics.update(sim, 0);
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});