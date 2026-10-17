import * as THREE from "../../node_modules/three/build/three.module.js";
import { BUILDINGS } from "./world.js";

export function batchStaticBoxes(scene) {
  const batches = new Map();
  for (const mesh of [...scene.children]) {
    if (
      !mesh.isMesh ||
      mesh.isInstancedMesh ||
      mesh.geometry.type !== "BoxGeometry"
    )
      continue;
    if (!batches.has(mesh.material)) batches.set(mesh.material, []);
    batches.get(mesh.material).push(mesh);
  }
  const size = new THREE.Matrix4();
  for (const [material, meshes] of batches) {
    const batch = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      material,
      meshes.length,
    );
    meshes.forEach((mesh, index) => {
      const { width, height, depth } = mesh.geometry.parameters;
      mesh.updateMatrix();
      batch.setMatrixAt(
        index,
        mesh.matrix.clone().multiply(size.makeScale(width, height, depth)),
      );
      scene.remove(mesh);
      mesh.geometry.dispose();
    });
    scene.add(batch);
  }
}

// Generated textures keep the published game self-contained and offline-capable.
export function asphalt(horizontal = false) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const c = canvas.getContext("2d");
  c.fillStyle = "#293747";
  c.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 3500; i++) {
    const v = 30 + ((i * 37) % 35);
    c.fillStyle = `rgba(${v},${v + 12},${v + 22},.5)`;
    c.fillRect((i * 17.31) % 128, (i * 29.57) % 128, 1, 1);
  }
  c.strokeStyle = "#152332";
  c.beginPath();
  c.moveTo(0, 80);
  c.lineTo(28, 76);
  c.lineTo(58, 88);
  c.lineTo(73, 128);
  c.stroke();
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(horizontal ? 35 : 2, horizontal ? 2 : 35);
  return new THREE.MeshStandardMaterial({
    map,
    roughness: 0.47,
    metalness: 0.45,
    bumpMap: map,
    bumpScale: 0.035,
  });
}

export function cityDetails(scene) {
  const batches = new Map(),
    dummy = new THREE.Object3D();
  function box(color, x, y, z, w, h, d, glow = false) {
    const key = color + glow;
    if (!batches.has(key)) batches.set(key, { color, glow, items: [] });
    batches.get(key).items.push({ x, y, z, w, h, d });
  }
  const glowCanvas = document.createElement("canvas");
  glowCanvas.width = glowCanvas.height = 64;
  const g = glowCanvas.getContext("2d"),
    gradient = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "#ffffff99");
  gradient.addColorStop(0.25, "#ffffff44");
  gradient.addColorStop(1, "#ffffff00");
  g.fillStyle = gradient;
  g.fillRect(0, 0, 64, 64);
  const glowMap = new THREE.CanvasTexture(glowCanvas);
  const effects = new THREE.Group();
  scene.add(effects);
  function pool(x, z, color, width = 12, length = 22) {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width, length),
      new THREE.MeshBasicMaterial({
        color,
        map: glowMap,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.13, z);
    effects.add(mesh);
  }
  for (const b of BUILDINGS) {
    const accent = b.z < -65 ? "#b49aff" : b.x < 0 ? "#ff7cb4" : "#77ebd2";
    // Raised floor bands and vertical mullions wrap all four sides.
    for (let y = 7; y < b.h; y += 8) {
      box("#344759", b.x, y, b.z, b.w + 0.4, 0.3, b.d + 0.4);
    }
    for (const side of [-1, 1]) {
      for (let z = -b.d / 2 + 3; z < b.d / 2; z += 5) {
        box(
          "#3b5060",
          b.x + side * (b.w / 2 + 0.12),
          b.h / 2,
          b.z + z,
          0.3,
          b.h,
          0.25,
        );
        for (let y = 10; y < b.h - 3; y += 4) {
          const lit = Math.sin(y * z + b.seed) > -0.15;
          box(
            lit ? accent : "#142535",
            b.x + side * (b.w / 2 + 0.17),
            y,
            b.z + z + 1.5,
            0.08,
            1.7,
            2.1,
            lit,
          );
        }
      }
      const face = b.z + side * (b.d / 2 + 0.3);
      for (let x = -b.w / 2 + 4; x < b.w / 2 - 2; x += 7) {
        box("#0e2030", b.x + x, 2.5, face, 5.8, 3.8, 0.24);
        box(accent, b.x + x, 4.5, face, 5.8, 0.14, 0.35, true);
        box("#42606d", b.x + x, 2.5, face + side * 0.2, 0.12, 3.8, 0.12);
      }
      box("#263e50", b.x, 5.5, face + side * 1.1, b.w - 3, 0.35, 2.7);
      pool(b.x, face + side * 3, accent, b.w, 14);
    }
    // Roof machinery and antennas stay inside the existing building footprint.
    box("#526272", b.x + 7, b.h + 1.5, b.z - 5, 7, 3, 6);
    for (let i = 0; i < 5; i++)
      box("#1c2b3b", b.x + 4.5 + i, b.h + 3.03, b.z - 5, 0.35, 0.1, 5);
    box(accent, b.x + 7, b.h + 3.3, b.z - 5, 0.3, 0.4, 0.3, true);
  }
  // Street furniture sits on the sidewalk, outside the main walking routes.
  for (const x of [-75, 0, 75])
    for (const z of [-115, -45, 25, 95]) {
      for (const side of [-1, 1]) {
        const sx = x + side * 11;
        box("#40566a", sx, 3.6, z, 0.22, 7.2, 0.22);
        box("#40566a", sx - side, 7.2, z, 2.2, 0.2, 0.35);
        box("#b9eaff", sx - side * 1.8, 7.05, z, 0.9, 0.12, 0.55, true);
        pool(sx - side * 2, z, "#7cb8dc", 11, 16);
        box("#425465", sx + side * 1.5, 0.85, z + 6, 0.6, 0.25, 3);
        box("#283d4b", sx + side * 1.5, 0.4, z + 5, 0.45, 0.8, 0.4);
        box("#283d4b", sx + side * 1.5, 0.4, z + 7, 0.45, 0.8, 0.4);
      }
      // Painted crossings and drain grates.
      for (let i = -3; i <= 3; i++)
        box("#7e9ba7", x + i * 1.8, 0.115, z + 16, 0.85, 0.015, 3.5);
      for (let i = 0; i < 6; i++)
        box("#526577", x + 7, 0.12, z + i * 0.22, 1.3, 0.02, 0.09);
    }
  for (const batch of batches.values()) {
    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({
        color: batch.color,
        roughness: 0.6,
        metalness: 0.45,
        emissive: batch.glow ? batch.color : "#000000",
        emissiveIntensity: batch.glow ? 0.85 : 0,
      }),
      batch.items.length,
    );
    batch.items.forEach((item, i) => {
      dummy.position.set(item.x, item.y, item.z);
      dummy.scale.set(item.w, item.h, item.d);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    scene.add(mesh);
  }
  // Soft contact shadows anchor the characters without expensive shadow maps.
  const shadow = new THREE.MeshBasicMaterial({
    color: "#000000",
    map: glowMap,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
  });
  return { effects, shadow };
}
