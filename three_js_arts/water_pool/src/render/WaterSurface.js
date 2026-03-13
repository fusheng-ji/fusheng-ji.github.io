import * as THREE from '../../../libs/three.module.js';

export class WaterSurface {
  constructor({
    width,
    depth,
    resolution,
    waterLevel,
    lightDirection,
  }) {
    this.width = width;
    this.depth = depth;
    this.resolution = resolution;

    this.geometry = new THREE.PlaneGeometry(width, depth, resolution, resolution);
    this.geometry.rotateX(-Math.PI / 2);

    this.basePositions = new Float32Array(this.geometry.attributes.position.array.length);
    this.basePositions.set(this.geometry.attributes.position.array);

    this.uniforms = {
      time: { value: 0 },
      lightDir: { value: lightDirection.clone().normalize() },
      normalMap: { value: null },
      normalScale: { value: 1.0 }
    };

    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      transparent: true,
      side: THREE.DoubleSide,
      vertexShader: `
        varying vec3 vWorldPos;
        varying vec3 vNormalW;
        varying vec3 vViewDir;
        varying vec2 vUv;

        void main() {
          vUv = uv;
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          vNormalW = normalize(mat3(modelMatrix) * normal);
          vViewDir = normalize(cameraPosition - worldPos.xyz);
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 lightDir;
        uniform sampler2D normalMap;
        uniform float normalScale;

        varying vec3 vWorldPos;
        varying vec3 vNormalW;
        varying vec3 vViewDir;
        varying vec2 vUv;

        float hash(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 34.45);
          return fract(p.x * p.y);
        }

        float sparkle(vec2 uv, float scale, float width) {
          vec2 gv = fract(uv * scale) - 0.5;
          vec2 id = floor(uv * scale);
          float h = hash(id);
          float d = length(gv + vec2(h - 0.5, fract(h * 19.7) - 0.5) * 0.24);
          float s = smoothstep(width, 0.0, d);
          return s * smoothstep(0.74, 1.0, h);
        }

        void main() {
            // base geometry normal
            vec3 N = normalize(vNormalW);
            // sample normal map and perturb normal for micro detail
            vec3 nSample = texture(normalMap, vUv * 6.0 + vec2(time * 0.02, time * 0.015)).xyz * 2.0 - 1.0;
            nSample.xy *= normalScale;
            // transform sampled normal from tangent-space approximation to world-ish by combining
            N = normalize(mix(N, normalize(N + nSample * 0.5), 0.85));
            vec3 V = normalize(vViewDir);
            vec3 L = normalize(lightDir);

            float NoV = max(dot(N, V), 0.0);
            // stronger Fresnel for glassy edges
            float fresnel = pow(1.0 - NoV, 4.5);

            // Two-layer specular: soft lobe + very sharp tight highlight
            float specWide = pow(max(dot(reflect(-L, N), V), 0.0), 18.0);
            float specTight = pow(max(dot(reflect(-L, N), V), 0.0), 640.0);

            // Fine sparkles
            float spark1 = sparkle(vUv + vec2(time * 0.010, -time * 0.013), 54.0, 0.14);
            float spark2 = sparkle(vUv * 1.75 + vec2(-time * 0.018, time * 0.015), 82.0, 0.11);
            float spark3 = sparkle(vUv * 2.45 + vec2(time * 0.025, time * 0.017), 120.0, 0.08);

            float sparkleMask =
            (spark1 * 0.45 + spark2 * 0.80 + spark3 * 0.70) *
            (specWide * 0.30 + specTight * 1.20);

            // Crystal-clear palette
            vec3 shallow = vec3(0.92, 0.97, 1.00);
            vec3 midWater = vec3(0.75, 0.90, 0.98);
            vec3 body = mix(shallow, midWater, 0.18);

            // Strong reflection tint (nearly white) for glass look
            vec3 reflected = vec3(1.0, 1.0, 1.0);

            // transmission-like mixture: more white at grazing angles
            vec3 glass = mix(body * 0.6, reflected, fresnel * 0.85);

            vec3 color = glass;
            // bright, tight highlights
            color += vec3(1.0, 0.995, 0.98) * specWide * 0.22;
            color += vec3(1.0) * specTight * 0.55;
            // add subtle sparkles
            color += vec3(1.0) * sparkleMask * 1.1;

            // slight desaturation toward white to mimic clear water
            color = mix(color, vec3(1.0), 0.06);

            // more transparent overall, but stronger Fresnel makes edges more opaque
            float baseAlpha = 0.42;
            float alpha = clamp(baseAlpha + fresnel * 0.5, baseAlpha, 0.92);

            gl_FragColor = vec4(color, alpha);
        }
      `
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.position.y = waterLevel;
    this.mesh.receiveShadow = true;

    // load a normals texture to add micro normal detail (tile and animate it)
    const texLoader = new THREE.TextureLoader();
    const normalTex = texLoader.load(new URL('../../../libs/waternormals.jpg', import.meta.url).href, (t) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(6, 6);
      this.uniforms.normalMap.value = t;
      this.uniforms.normalScale.value = 1.0;
    }, undefined, () => {
      // ignore failures
    });
  }

  update(sim, time) {
    const pos = this.geometry.attributes.position;
    const r = this.resolution;

    for (let y = 0; y <= r; y++) {
      for (let x = 0; x <= r; x++) {
        const i = x + y * (r + 1);

        const px = this.basePositions[i * 3 + 0];
        const py = this.basePositions[i * 3 + 1];
        const pz = this.basePositions[i * 3 + 2];

        const u = x / r;
        const v = y / r;
        const edgeFade = Math.pow(Math.sin(u * Math.PI) * Math.sin(v * Math.PI), 0.82);

        const micro1 = Math.sin(px * 9.0 + time * 1.4) * 0.010;
        const micro2 = Math.cos(pz * 10.5 - time * 1.2) * 0.008;
        const micro3 = Math.sin((px + pz) * 7.0 + time * 2.6) * 0.004;
        const micro4 = Math.cos((px - pz) * 14.0 - time * 2.0) * 0.0025;

        const h = sim.sampleHeight(x, y) * 0.22 + (micro1 + micro2 + micro3 + micro4) * edgeFade;
        pos.setXYZ(i, px, py, pz + h);
      }
    }

    pos.needsUpdate = true;
    this.geometry.computeVertexNormals();
    this.uniforms.time.value = time;
  }
}