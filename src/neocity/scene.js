import * as THREE from "../../node_modules/three/build/three.module.js";
import { NPCS, PICKUPS, BUILDINGS, dist } from "./world.js";
import { asphalt, cityDetails, batchStaticBoxes } from "./visuals.js";
const material = (color, glow = false) =>
  new THREE.MeshStandardMaterial({
    color,
    roughness: glow ? 0.35 : 0.72,
    metalness: 0.3,
    emissive: glow ? color : "#000000",
    emissiveIntensity: glow ? 2 : 0,
  });
const cache = new Map();
const suitMaterial = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.62,
  metalness: 0.25,
});
function mergeSuit(group, limbs) {
  const positions = [],
    normals = [],
    colors = [];
  for (const mesh of [...group.children]) {
    if (limbs.includes(mesh)) continue;
    mesh.updateMatrix();
    const transformed = mesh.geometry.clone().applyMatrix4(mesh.matrix);
    const geometry = transformed.index
      ? transformed.toNonIndexed()
      : transformed;
    const p = geometry.getAttribute("position"),
      n = geometry.getAttribute("normal"),
      color = mesh.material.color;
    for (let i = 0; i < p.count; i++) {
      positions.push(p.getX(i), p.getY(i), p.getZ(i));
      normals.push(n.getX(i), n.getY(i), n.getZ(i));
      colors.push(color.r, color.g, color.b);
    }
    group.remove(mesh);
    mesh.geometry.dispose();
    geometry.dispose();
    if (geometry !== transformed) transformed.dispose();
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  group.add(new THREE.Mesh(geometry, suitMaterial));
}
function mat(color, glow = false) {
  const key = color + glow;
  if (!cache.has(key)) cache.set(key, material(color, glow));
  return cache.get(key);
}
function cube(parent, w, h, d, color, x = 0, y = 0, z = 0, glow = false) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, glow));
  m.position.set(x, y, z);
  m.castShadow = !glow;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
function label(text, color, width = 10) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 128;
  const x = c.getContext("2d");
  x.fillStyle = "#07101cdd";
  x.fillRect(0, 0, 512, 128);
  x.strokeStyle = color;
  x.lineWidth = 5;
  x.strokeRect(3, 3, 506, 122);
  x.fillStyle = color;
  x.textAlign = "center";
  x.font = "bold 44px monospace";
  x.fillText(text, 256, 80);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    }),
  );
  sprite.scale.set(width, width / 4, 1);
  return sprite;
}
function avatar(color) {
  const g = new THREE.Group();
  cube(g, 0.85, 1.1, 0.5, color, 0, 1.35, 0);
  cube(g, 0.65, 0.22, 0.57, "#8ffff0", 0, 1.75, -0.02, true);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.31, 8, 6),
    mat("#b9b2b4"),
  );
  head.position.y = 2.2;
  g.add(head);
  const helmet = new THREE.Mesh(
    new THREE.SphereGeometry(0.34, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.57),
    mat("#26384c"),
  );
  helmet.position.y = 2.24;
  g.add(helmet);
  cube(g, 0.9, 0.14, 0.54, "#334759", 0, 0.93, 0);
  cube(g, 0.48, 0.66, 0.24, "#26384c", 0, 1.35, 0.33);
  cube(g, 0.47, 0.12, 0.22, "#79f7ef", 0, 2.23, -0.25, true);
  const limbs = [];
  for (const sign of [-1, 1]) {
    const leg = cube(g, 0.28, 0.85, 0.32, "#142032", sign * 0.24, 0.44, 0);
    const arm = cube(g, 0.23, 0.9, 0.25, color, sign * 0.58, 1.3, 0);
    limbs.push(leg, arm);
    cube(g, 0.32, 0.18, 0.48, "#26384c", sign * 0.24, 0.1, -0.06);
  }
  g.userData.limbs = limbs;
  mergeSuit(g, limbs);
  return g;
}
export class CityScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.far = false;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: devicePixelRatio < 2,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.65;
    this.renderer.shadowMap.enabled = false;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#1a2943");
    this.scene.fog = new THREE.FogExp2("#253950", 0.0055);
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.2, 600);
    this.scene.add(new THREE.HemisphereLight("#929bd8", "#39455e", 3.2));
    const sun = new THREE.DirectionalLight("#a1bcf3", 2);
    sun.position.set(-60, 120, 40);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, {
      left: -100,
      right: 100,
      top: 100,
      bottom: -100,
      far: 300,
    });
    sun.shadow.bias = -0.001;
    this.scene.add(sun);
    cube(this.scene, 410, 0.5, 410, "#253545", 0, -0.3, 0);
    const northRoad = asphalt(),
      eastRoad = asphalt(true);
    for (const x of [-150, -75, 0, 75, 150]) {
      cube(this.scene, 17, 0.035, 340, "#091322", x, 0.02, 0).material =
        northRoad;
      for (const side of [-1, 1])
        cube(
          this.scene,
          0.16,
          0.05,
          340,
          "#3f8f99",
          x + side * 9,
          0.06,
          0,
          true,
        );
      for (let z = -150; z < 155; z += 12)
        cube(this.scene, 0.13, 0.04, 3, "#768b9d", x, 0.07, z);
    }
    for (const z of [-105, -35, 35, 105]) {
      cube(this.scene, 340, 0.04, 14, "#0b1728", 0, 0.065, z).material =
        eastRoad;
      for (let x = -150; x < 155; x += 12)
        cube(this.scene, 3, 0.04, 0.13, "#768b9d", x, 0.09, z);
    }
    const windows = [];
    for (const b of BUILDINGS) {
      const color = b.x < 0 ? "#ff5d9d" : "#51e6d0";
      cube(this.scene, b.w, b.h, b.d, b.color, b.x, b.h / 2, b.z);
      cube(this.scene, b.w + 1, 1, b.d + 1, "#202d43", b.x, b.h, b.z);
      cube(this.scene, b.w + 2, 2, b.d + 2, "#253447", b.x, 1, b.z);
      cube(
        this.scene,
        b.w,
        0.24,
        0.23,
        color,
        b.x,
        6,
        b.z + b.d / 2 + 0.2,
        true,
      );
      cube(
        this.scene,
        0.18,
        b.h,
        1,
        color,
        b.x - b.w / 2 - 0.1,
        b.h / 2,
        b.z + 4,
        true,
      );
      for (let y = 9; y < b.h - 3; y += 4)
        for (let x = -b.w / 2 + 3; x < b.w / 2 - 2; x += 4) {
          if (Math.sin(x * y + b.seed) > 0.1)
            windows.push({ x: b.x + x, y, z: b.z + b.d / 2 + 0.03, color });
          if (Math.cos(x * y + b.seed) > 0.1)
            windows.push({
              x: b.x + x,
              y,
              z: b.z - b.d / 2 - 0.03,
              color: "#b8a7ff",
            });
        }
      const sign = label(
        [
          "NEON / 24",
          "HELIX",
          "SYNTH LAB",
          "MEMORY",
          "NIGHT SHIFT",
          "BIO / TECH",
        ][b.seed % 6],
        color,
        Math.min(b.w - 3, 24),
      );
      sign.position.set(b.x, 4, b.z + b.d / 2 + 1);
      this.scene.add(sign);
      if (b.seed % 2 === 0) {
        cube(this.scene, 8, 4, 8, "#324354", b.x, b.h + 2, b.z);
        cube(this.scene, 0.2, 10, 0.2, color, b.x, b.h + 9, b.z, true);
      }
    }
    const wg = new THREE.PlaneGeometry(1.7, 1.8),
      wm = new THREE.MeshBasicMaterial({
        color: "#ffffff",
        side: THREE.DoubleSide,
      });
    const wi = new THREE.InstancedMesh(wg, wm, windows.length),
      dummy = new THREE.Object3D();
    windows.forEach((w, i) => {
      dummy.position.set(w.x, w.y, w.z);
      dummy.updateMatrix();
      wi.setMatrixAt(i, dummy.matrix);
      wi.setColorAt(i, new THREE.Color(w.color).multiplyScalar(0.7));
    });
    this.scene.add(wi);
    this.windows = windows;
    this.windowMesh = wi;
    this.powerOn = null;
    // A skyline beyond the walkable districts gives the city depth without extra simulation.
    const skyline = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      mat("#172037"),
      36,
    );
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2,
        h = 35 + ((i * 19) % 70);
      dummy.position.set(Math.sin(a) * 230, h / 2, Math.cos(a) * 230);
      dummy.scale.set(16, h, 16);
      dummy.updateMatrix();
      skyline.setMatrixAt(i, dummy.matrix);
    }
    this.scene.add(skyline);
    const plaza = new THREE.Mesh(
      new THREE.CylinderGeometry(14, 14, 0.25, 32),
      mat("#183c44"),
    );
    plaza.position.set(75, 0.15, 35);
    this.scene.add(plaza);
    this.plants = [];
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6,
        x = 75 + Math.cos(a) * 12,
        z = 35 + Math.sin(a) * 12;
      cube(this.scene, 1.3, 1, 1.3, "#27424c", x, 0.5, z);
      const plant = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.5, 0),
        mat("#53c69b"),
      );
      plant.position.set(x, 2, z);
      this.scene.add(plant);
      this.plants.push(plant);
    }
    this.details = cityDetails(this.scene);
    batchStaticBoxes(this.scene);
    this.player = avatar("#d3dce8");
    this.scene.add(this.player);
    const contact = new THREE.Mesh(
      new THREE.PlaneGeometry(3.8, 3.8),
      this.details.shadow,
    );
    contact.rotation.x = -Math.PI / 2;
    contact.position.y = 0.16;
    this.player.add(contact);
    this.npcs = new Map();
    for (const n of NPCS) {
      const model = avatar(n.color);
      model.position.set(n.x, 0, n.z);
      if (n.id === "atlas") {
        model.scale.set(1.6, 1.6, 1.6);
        cube(model, 2.8, 0.25, 2.8, n.color, 0, 0.2, 0, true);
      }
      const name = label(n.name.toUpperCase(), n.color, 8);
      name.position.y = n.id === "atlas" ? 6 : 4.3;
      model.add(name);
      this.npcs.set(n.id, model);
      this.scene.add(model);
      const shadow = contact.clone();
      model.add(shadow);
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.3, 1.5, 24),
        new THREE.MeshBasicMaterial({
          color: n.color,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.5,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(n.x, 0.15, n.z);
      this.scene.add(ring);
    }
    this.items = new Map();
    for (const p of PICKUPS) {
      const group = new THREE.Group();
      const color =
        p.kind === "archive"
          ? "#be93ff"
          : p.kind === "filter"
            ? "#72e6c0"
            : "#ffd383";
      const m = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.8),
        mat(color, true),
      );
      m.position.y = 1.7;
      group.add(m);
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.1, 1.3, 24),
        new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.1;
      group.add(ring);
      group.position.set(p.x, 0, p.z);
      this.items.set(p.id, group);
      this.scene.add(group);
    }
    this.people = Array.from({ length: 16 }, (_, i) => {
      const a = avatar(["#747da5", "#768c83", "#9f7089"][i % 3]);
      a.userData.seed = i;
      a.scale.setScalar(0.9);
      this.scene.add(a);
      return a;
    });
    this.cars = Array.from({ length: 6 }, (_, i) => {
      const g = new THREE.Group();
      cube(g, 2.5, 0.8, 5, "#263849", 0, 0.9, 0);
      cube(g, 2, 0.65, 2, "#367282", 0, 1.5, 0.5);
      cube(g, 2.1, 0.1, 1.7, "#111e2e", 0, 1.87, 0.45);
      cube(g, 2.45, 0.12, 4.3, i % 2 ? "#ff7091" : "#86e9ec", 0, 0.56, 0, true);
      for (const side of [-1, 1])
        for (const z of [-1.5, 1.5]) {
          const wheel = new THREE.Mesh(
            new THREE.CylinderGeometry(0.45, 0.45, 0.25, 12),
            mat("#0e1723"),
          );
          wheel.rotation.z = Math.PI / 2;
          wheel.position.set(side * 1.25, 0.6, z);
          g.add(wheel);
        }
      for (const x of [-0.8, 0.8])
        cube(g, 0.4, 0.2, 0.1, i % 2 ? "#ff7091" : "#86e9ec", x, 1, -2.6, true);
      this.scene.add(g);
      return g;
    });
    const points = new Float32Array(450 * 3);
    for (let i = 0; i < 450; i++) {
      points[i * 3] = (Math.random() - 0.5) * 120;
      points[i * 3 + 1] = Math.random() * 60;
      points[i * 3 + 2] = (Math.random() - 0.5) * 120;
    }
    this.rainGeo = new THREE.BufferGeometry();
    this.rainGeo.setAttribute("position", new THREE.BufferAttribute(points, 3));
    this.rain = new THREE.Points(
      this.rainGeo,
      new THREE.PointsMaterial({
        color: "#7fadd1",
        size: 0.12,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
      }),
    );
    this.scene.add(this.rain);
    this.beacon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.5, 13, 8),
      new THREE.MeshBasicMaterial({
        color: "#f8d891",
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
      }),
    );
    this.scene.add(this.beacon);
    this.cameraPos = new THREE.Vector3();
    this.lastX = 0;
    this.lastZ = 0;
    let quality = "balanced";
    try {
      quality = localStorage.getItem("neocity-quality") || quality;
    } catch {}
    this.setQuality(quality);
    this.resize();
  }
  setQuality(value) {
    this.quality = ["performance", "balanced", "high"].includes(value)
      ? value
      : "balanced";
    this.renderer.setPixelRatio(
      Math.min(
        devicePixelRatio,
        { performance: 0.8, balanced: 1.25, high: 2 }[this.quality],
      ),
    );
    this.details.effects.visible = this.quality !== "performance";
    this.canvas.dataset.quality = this.quality;
    this.resize();
  }
  resize() {
    this.needsRender = true;
    const r = this.canvas.getBoundingClientRect();
    this.renderer.setSize(r.width, r.height, false);
    this.camera.aspect = r.width / r.height;
    this.camera.fov = r.width < 600 ? 65 : 55;
    this.camera.updateProjectionMatrix();
  }
  snap(p) {
    this.needsRender = true;
    this.cameraPos.set(p.x + 11, 22, p.z + 27);
    this.camera.position.copy(this.cameraPos);
    this.camera.lookAt(p.x, 2, p.z - 9);
    this.lastX = p.x;
    this.lastZ = p.z;
  }
  draw(s, dt, target) {
    const powered = s.completed.includes("power");
    if (this.powerOn !== powered) {
      this.powerOn = powered;
      this.windows.forEach((w, i) =>
        this.windowMesh.setColorAt(
          i,
          new THREE.Color(w.color).multiplyScalar(
            w.x < 0 && !powered ? 0.18 : 0.8,
          ),
        ),
      );
      this.windowMesh.instanceColor.needsUpdate = true;
    }
    const p = s.player,
      t = this.reduced ? 0 : s.time,
      moving = Math.hypot(p.x - this.lastX, p.z - this.lastZ) > 0.005;
    this.lastX = p.x;
    this.lastZ = p.z;
    this.player.position.set(p.x, 0, p.z);
    this.player.rotation.y = -p.heading;
    this.player.userData.limbs.forEach(
      (l, i) =>
        (l.rotation.x = moving
          ? Math.sin(t * 12 + (i < 2 ? 0 : Math.PI)) * 0.55
          : 0),
    );
    for (const n of NPCS) {
      const model = this.npcs.get(n.id);
      model.rotation.y =
        dist(p, n) < 15
          ? Math.atan2(p.x - n.x, p.z - n.z)
          : Math.sin(t * 0.3 + n.x) * 0.1;
      const memory = s.memories[n.id];
      if (memory.trust < 0 && dist(p, n) < 15) model.rotation.y += Math.PI;
      model.userData.limbs[1].rotation.z =
        memory.trust > 5 && dist(p, n) < 12 ? Math.sin(t * 4) * 0.3 + 0.8 : 0;
      model.visible = true;
    }
    for (const item of PICKUPS) {
      const group = this.items.get(item.id);
      group.visible = !s.collected.includes(item.id);
      group.children[0].rotation.y = t;
      group.children[0].position.y = 1.7 + Math.sin(t * 2 + item.x) * 0.25;
    }
    for (let i = 0; i < this.people.length; i++) {
      const a = this.people[i],
        lane = i % 2 ? -63 : 63;
      const z = ((t * (s.heat > 20 ? 7 : 2.5) + i * 23) % 260) - 130;
      a.position.set(lane, 0, z);
      a.rotation.y = i % 2 ? 0 : Math.PI;
      for (let j = 0; j < 4; j++)
        a.userData.limbs[j].rotation.x =
          Math.sin(t * (s.heat > 20 ? 15 : 7) + j) * 0.4;
      if (dist(p, { x: lane, z }) < 7) a.position.x += s.trust > 15 ? 2 : 5;
    }
    this.cars.forEach((car, i) => {
      car.position.set(i % 2 ? -4 : 4, 0.4, ((t * 18 + i * 65) % 320) - 160);
      car.rotation.y = i % 2 ? Math.PI : 0;
    });
    this.plants.forEach(
      (m) =>
        (m.material = mat(
          s.completed.includes("garden") ? "#76ffc4" : "#53c69b",
        )),
    );
    this.rain.visible = !this.reduced && this.quality !== "performance";
    this.rain.position.set(p.x, 0, p.z);
    const rp = this.rainGeo.attributes.position;
    for (let i = 0; i < rp.count; i++)
      rp.setY(i, (((i * 0.133 - t * 14) % 60) + 60) % 60);
    rp.needsUpdate = true;
    this.beacon.visible = !!target && !s.ending;
    if (target) this.beacon.position.set(target.x, 6.5, target.z);
    const offset = this.far ? 1.5 : 1;
    const desired = new THREE.Vector3(
      p.x + 11 * offset,
      22 * offset,
      p.z + 27 * offset,
    );
    this.cameraPos.lerp(desired, this.reduced ? 1 : 1 - Math.exp(-dt * 5));
    this.camera.position.copy(this.cameraPos);
    this.camera.lookAt(p.x, 2, p.z - 9);
    this.renderer.render(this.scene, this.camera);
  }
}
