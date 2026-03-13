// Minimal ES module version of Three.js OBJLoader (adapted from three.js examples)
import * as THREE from './three.module.js';

class OBJLoader {
	constructor(manager) {
		this.manager = manager !== undefined ? manager : null;
		this.materials = null;
	}

	setMaterials(materials) {
		this.materials = materials;
		return this;
	}

	parse(text) {
		const object = new THREE.EventDispatcher();
		const objects = [];

		let vertices = [];
		let normals = [];
		let uvs = [];

		function parseVertexIndex(value) {
			const index = parseInt(value, 10);
			return (index >= 0 ? index - 1 : index + vertices.length / 3);
		}

		function parseNormalIndex(value) {
			const index = parseInt(value, 10);
			return (index >= 0 ? index - 1 : index + normals.length / 3);
		}

		function parseUVIndex(value) {
			const index = parseInt(value, 10);
			return (index >= 0 ? index - 1 : index + uvs.length / 2);
		}

		const lines = text.split('\n');
		let geometry = {
			vertices: [],
			normals: [],
			uvs: []
		};

		const material = { name: '' };

		for (let i = 0, l = lines.length; i < l; i++) {
			let line = lines[i].trim();
			if (line.length === 0 || line.charAt(0) === '#') continue;

			const parts = line.split(/\s+/);
			const directive = parts.shift();

			switch (directive) {
				case 'v':
					vertices.push(parseFloat(parts[0]), parseFloat(parts[1]), parseFloat(parts[2]));
					break;
				case 'vn':
					normals.push(parseFloat(parts[0]), parseFloat(parts[1]), parseFloat(parts[2]));
					break;
				case 'vt':
					uvs.push(parseFloat(parts[0]), parseFloat(parts[1]));
					break;
				case 'f':
					const faceVertices = parts.map(function (part) {
						const indices = part.split('/');
						return {
							vertex: parseVertexIndex(indices[0]),
							uv: indices[1] ? parseUVIndex(indices[1]) : undefined,
							normal: indices[2] ? parseNormalIndex(indices[2]) : undefined
						};
					});

					for (let j = 1; j < faceVertices.length - 1; j++) {
						const v1 = faceVertices[0];
						const v2 = faceVertices[j];
						const v3 = faceVertices[j + 1];

						geometry.vertices.push(
							vertices[v1.vertex * 3], vertices[v1.vertex * 3 + 1], vertices[v1.vertex * 3 + 2],
							vertices[v2.vertex * 3], vertices[v2.vertex * 3 + 1], vertices[v2.vertex * 3 + 2],
							vertices[v3.vertex * 3], vertices[v3.vertex * 3 + 1], vertices[v3.vertex * 3 + 2]
						);

						if (v1.normal !== undefined && v2.normal !== undefined && v3.normal !== undefined) {
							geometry.normals.push(
								normals[v1.normal * 3], normals[v1.normal * 3 + 1], normals[v1.normal * 3 + 2],
								normals[v2.normal * 3], normals[v2.normal * 3 + 1], normals[v2.normal * 3 + 2],
								normals[v3.normal * 3], normals[v3.normal * 3 + 1], normals[v3.normal * 3 + 2]
							);
						}

						if (v1.uv !== undefined && v2.uv !== undefined && v3.uv !== undefined) {
							geometry.uvs.push(
								uvs[v1.uv * 2], uvs[v1.uv * 2 + 1],
								uvs[v2.uv * 2], uvs[v2.uv * 2 + 1],
								uvs[v3.uv * 2], uvs[v3.uv * 2 + 1]
							);
						}
					}
					break;
				case 'o':
				case 'g':
					// start new geometry
					if (geometry.vertices.length > 0) {
						objects.push({ geometry: geometry, material: material });
						geometry = { vertices: [], normals: [], uvs: [] };
					}
					break;
				case 'usemtl':
					material.name = parts.join(' ');
					break;
				default:
					break;
			}
		}

		if (geometry.vertices.length > 0) {
			objects.push({ geometry: geometry, material: material });
		}

		// build meshes
		const group = new THREE.Group();
		for (let i = 0; i < objects.length; i++) {
			const obj = objects[i];
			const geom = new THREE.BufferGeometry();
			geom.setAttribute('position', new THREE.Float32BufferAttribute(obj.geometry.vertices, 3));
			if (obj.geometry.normals.length > 0) geom.setAttribute('normal', new THREE.Float32BufferAttribute(obj.geometry.normals, 3));
			if (obj.geometry.uvs.length > 0) geom.setAttribute('uv', new THREE.Float32BufferAttribute(obj.geometry.uvs, 2));

			const material = new THREE.MeshStandardMaterial({ color: 0xffcc00 });
			const mesh = new THREE.Mesh(geom, material);
			mesh.castShadow = true;
			mesh.receiveShadow = true;
			group.add(mesh);
		}

		return group;
	}
}

export { OBJLoader };
