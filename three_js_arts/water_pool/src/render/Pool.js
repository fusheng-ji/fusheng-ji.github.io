import * as THREE from '../../../libs/three.module.js';

export class Pool {
  constructor({
    width,
    depth,
    height,
    wallThickness,
  }) {
    this.width = width;
    this.depth = depth;
    this.height = height;
    this.wallThickness = wallThickness;

    this.group = new THREE.Group();
    this.halfW = width * 0.5;
    this.halfD = depth * 0.5;

    this._buildWalls();
    this._buildFloor();
  }

  _buildWalls() {
    // Walls removed intentionally.
  }

  _buildFloor() {
    this.baseCanvas = document.createElement('canvas');
    this.baseCanvas.width = 1024;
    this.baseCanvas.height = 1024;
    this.baseCtx = this.baseCanvas.getContext('2d', { willReadFrequently: true });

    this.distortedCanvas = document.createElement('canvas');
    this.distortedCanvas.width = 1024;
    this.distortedCanvas.height = 1024;
    this.distortedCtx = this.distortedCanvas.getContext('2d', { willReadFrequently: true });

    this._drawBaseTiles();
    this.baseImageData = this.baseCtx.getImageData(0, 0, 1024, 1024);

    this.floorTexture = new THREE.CanvasTexture(this.distortedCanvas);
    this.floorTexture.colorSpace = THREE.SRGBColorSpace;

    const floorMat = new THREE.MeshStandardMaterial({
      map: this.floorTexture,
      color: 0xffffff,
      roughness: 0.86,
      metalness: 0.0,
    });

    this.floorMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(this.width, this.depth),
      floorMat
    );
    this.floorMesh.rotation.x = -Math.PI / 2;
    this.floorMesh.position.y = -this.height;
    this.group.add(this.floorMesh);
  }

  _drawBaseTiles() {
    const ctx = this.baseCtx;
    ctx.clearRect(0, 0, 1024, 1024);
    ctx.fillStyle = '#8fa7bb';
    ctx.fillRect(0, 0, 1024, 1024);

    const tile = 64;
    for (let y = 0; y < 1024; y += tile) {
      for (let x = 0; x < 1024; x += tile) {
        const tint = ((x / tile + y / tile) % 2 === 0) ? '#c7d8e6' : '#9fb7cb';
        ctx.fillStyle = tint;
        ctx.fillRect(x, y, tile, tile);
      }
    }

    ctx.strokeStyle = 'rgba(42, 64, 84, 0.65)';
    ctx.lineWidth = 3;

    for (let i = 0; i <= 16; i++) {
      const p = i * tile;

      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, 1024);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(1024, p);
      ctx.stroke();
    }
  }

  updateFloorDistortion(sim, time) {
    const src = this.baseImageData.data;
    const out = this.distortedCtx.createImageData(1024, 1024);
    const dst = out.data;
    const r = sim.resolution;

    for (let y = 0; y < 1024; y++) {
        const v = y / 1023;
        const gy = Math.min(r, Math.max(0, Math.round(v * r)));

        for (let x = 0; x < 1024; x++) {
        const u = x / 1023;
        const gx = Math.min(r, Math.max(0, Math.round(u * r)));

        const { dx, dy } = sim.sampleGradient(gx, gy);

        const micro =
            Math.sin(u * 38.0 + time * 1.6) * 0.35 +
            Math.cos(v * 34.0 - time * 1.2) * 0.3;

        const offX = dx * 180 + micro * 0.28;
        const offY = dy * 180 + micro * 0.18;

        const sx = Math.max(0, Math.min(1023, Math.round(x + offX)));
        const sy = Math.max(0, Math.min(1023, Math.round(y + offY)));

        const si = (sy * 1024 + sx) * 4;
        const di = (y * 1024 + x) * 4;

        const energy = Math.abs(dx) + Math.abs(dy);
        const boost = Math.min(7, energy * 2600);

        dst[di] = Math.min(255, src[si] + boost * 0.20);
        dst[di + 1] = Math.min(255, src[si + 1] + boost * 0.35);
        dst[di + 2] = Math.min(255, src[si + 2] + boost * 0.55);
        dst[di + 3] = 255;
        }
    }

    this.distortedCtx.putImageData(out, 0, 0);
    this.floorTexture.needsUpdate = true;
    }
}