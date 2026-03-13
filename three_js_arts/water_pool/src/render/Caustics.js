import * as THREE from '../../../libs/three.module.js';

export class Caustics {
  constructor({ width, depth, y }) {
    this.width = width;
    this.depth = depth;

    this.canvas = document.createElement('canvas');
    this.canvas.width = 1024;
    this.canvas.height = 1024;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });

    this.texture = new THREE.CanvasTexture(this.canvas);

    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width - 0.02, depth - 0.02),
      new THREE.MeshBasicMaterial({
        map: this.texture,
        transparent: true,
        opacity: 0.32,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        color: 0xfaffff
      })
    );

    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.y = y;
  }

  update(sim, time) {
    const ctx = this.ctx;
    const w = 1024;
    const h = 1024;
    const r = sim.resolution;

    ctx.clearRect(0, 0, w, h);

    // Layer 1: many thin broken streaks driven by simulation gradients
    for (let gy = 1; gy < r; gy += 2) {
      for (let gx = 1; gx < r; gx += 2) {
        const { dx, dy } = sim.sampleGradient(gx, gy);
        const energy = Math.abs(dx) + Math.abs(dy);

        if (energy < 0.0025) continue;

        const u = gx / r;
        const v = gy / r;
        const x = u * w;
        const y = v * h;

        const angle = Math.atan2(dy, dx) + Math.PI * 0.5;
        const len = Math.min(28, 8 + energy * 9000);
        const wid = Math.min(3.2, 0.8 + energy * 1200);

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle + Math.sin(time * 0.7 + gx * 0.15 + gy * 0.1) * 0.08);

        const g = ctx.createLinearGradient(-len, 0, len, 0);
        g.addColorStop(0.0, 'rgba(255,255,255,0.0)');
        g.addColorStop(0.42, 'rgba(255,255,255,0.05)');
        g.addColorStop(0.5, 'rgba(255,255,255,0.18)');
        g.addColorStop(0.58, 'rgba(255,255,255,0.05)');
        g.addColorStop(1.0, 'rgba(255,255,255,0.0)');

        ctx.fillStyle = g;
        ctx.fillRect(-len, -wid, len * 2, wid * 2);
        ctx.restore();
      }
    }

    // Layer 2: subtle broken wave lines
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1.2;

    for (let i = 0; i < 36; i++) {
      const baseY = (i / 36) * h;
      ctx.beginPath();

      for (let x = 0; x <= w; x += 16) {
        const u = x / w;
        const gx = Math.min(r, Math.max(0, Math.round(u * r)));
        const gy = Math.min(r, Math.max(0, Math.round((baseY / h) * r)));
        const { dx, dy } = sim.sampleGradient(gx, gy);

        const yy =
          baseY +
          Math.sin(x * 0.02 + time * 2.1 + i * 0.6) * 5 +
          dx * 1800 +
          dy * 1300;

        if (x === 0) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }

      ctx.stroke();
    }

    this.texture.needsUpdate = true;
  }
}