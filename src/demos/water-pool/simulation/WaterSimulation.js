export class WaterSimulation {
  constructor(resolution, damping, propagation) {
    this.resolution = resolution;
    this.size = resolution + 1;
    this.damping = damping;
    this.propagation = propagation;

    this.heights = new Float32Array(this.size * this.size);
    this.velocities = new Float32Array(this.size * this.size);
  }

  idx(x, y) {
    return x + y * this.size;
  }

  addDrop(u, v, radius, strength) {
    const cx = u * this.resolution;
    const cy = v * this.resolution;
    const r2 = radius * radius;

    const minX = Math.max(1, Math.floor(cx - radius));
    const maxX = Math.min(this.resolution - 1, Math.ceil(cx + radius));
    const minY = Math.max(1, Math.floor(cy - radius));
    const maxY = Math.min(this.resolution - 1, Math.ceil(cy + radius));

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const d2 = dx * dx + dy * dy;
        if (d2 > r2) continue;

        const falloff = Math.exp(-d2 / (r2 * 0.55));
        this.velocities[this.idx(x, y)] += strength * falloff;
      }
    }
  }

  step() {
    const r = this.resolution;

    for (let y = 1; y < r; y++) {
      for (let x = 1; x < r; x++) {
        const i = this.idx(x, y);
        const lap =
          this.heights[this.idx(x - 1, y)] +
          this.heights[this.idx(x + 1, y)] +
          this.heights[this.idx(x, y - 1)] +
          this.heights[this.idx(x, y + 1)] -
          this.heights[i] * 4.0;

        this.velocities[i] += lap * this.propagation;
        this.velocities[i] *= this.damping;
      }
    }

    for (let y = 1; y < r; y++) {
      for (let x = 1; x < r; x++) {
        const i = this.idx(x, y);
        this.heights[i] += this.velocities[i];
      }
    }

    for (let i = 0; i < this.size; i++) {
      this.heights[this.idx(0, i)] *= 0.989;
      this.heights[this.idx(r, i)] *= 0.989;
      this.heights[this.idx(i, 0)] *= 0.989;
      this.heights[this.idx(i, r)] *= 0.989;
    }
  }

  sampleHeight(x, y) {
    return this.heights[this.idx(x, y)];
  }

  sampleGradient(x, y) {
    const x0 = Math.max(0, x - 1);
    const x1 = Math.min(this.resolution, x + 1);
    const y0 = Math.max(0, y - 1);
    const y1 = Math.min(this.resolution, y + 1);

    const dx = this.heights[this.idx(x1, y)] - this.heights[this.idx(x0, y)];
    const dy = this.heights[this.idx(x, y1)] - this.heights[this.idx(x, y0)];

    return { dx, dy };
  }
}