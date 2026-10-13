import * as THREE from "../../node_modules/three/build/three.module.js";
import { ISLANDS, TREASURE, forward } from "./simulation.js";

const mat = (color, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...extra });
const materials = {
  wood: mat("#49352c"),
  deck: mat("#b49263"),
  trim: mat("#d5b873"),
  sail: mat("#eee5c7", { side: THREE.DoubleSide }),
  red: mat("#823e36"),
  iron: mat("#25343a"),
  leaf: mat("#51775b"),
  trunk: mat("#907654"),
  sand: mat("#d7c397"),
  rock: mat("#7a8577"),
  grass: mat("#77906a"),
};
function mesh(geometry, material, parent, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
function box(parent, w, h, d, material, x = 0, y = 0, z = 0) {
  return mesh(new THREE.BoxGeometry(w, h, d), material, parent, x, y, z);
}
function pole(parent, a, b, r, material) {
  const from = new THREE.Vector3(...a),
    to = new THREE.Vector3(...b),
    delta = to.clone().sub(from);
  const m = mesh(
    new THREE.CylinderGeometry(r, r, delta.length(), 6),
    material,
    parent,
  );
  m.position.copy(from.add(to).multiplyScalar(0.5));
  m.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    delta.normalize(),
  );
  return m;
}
function sail(parent, w, h, y, z, material) {
  const g = new THREE.PlaneGeometry(w, h, 8, 5),
    p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      v = p.getY(i);
    p.setZ(
      i,
      -Math.sin((x / w + 0.5) * Math.PI) *
        Math.sin((v / h + 0.5) * Math.PI) *
        w *
        0.16,
    );
    p.setX(i, x * (0.8 + 0.2 * (v / h + 0.5)));
  }
  g.computeVertexNormals();
  mesh(g, material, parent, 0, y, z);
  pole(
    parent,
    [-w / 2, y + h / 2, z],
    [w / 2, y + h / 2, z],
    0.1,
    materials.wood,
  );
}
function ship(enemy = false) {
  const group = new THREE.Group();
  const stations = [
    [-7, 0],
    [-5, 1.55],
    [-1, 2.3],
    [3.6, 2.1],
    [5, 1.55],
  ];
  const vertices = [],
    indices = [];
  for (const [z, w] of stations)
    for (const [x, y] of [
      [-w, 1.7],
      [-w * 0.76, 0.1],
      [0, -0.8],
      [w * 0.76, 0.1],
      [w, 1.7],
    ])
      vertices.push(x, y, z);
  for (let j = 0; j < stations.length - 1; j++)
    for (let k = 0; k < 4; k++) {
      const a = j * 5 + k,
        b = a + 5;
      indices.push(a, a + 1, b, b, a + 1, b + 1);
    }
  indices.push(20, 21, 24, 21, 23, 24, 21, 22, 23);
  const hull = new THREE.BufferGeometry();
  hull.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  hull.setIndex(indices);
  hull.computeVertexNormals();
  mesh(hull, enemy ? materials.red : materials.wood, group);
  const shape = new THREE.Shape();
  shape.moveTo(0, -7);
  shape.lineTo(1.55, -5);
  shape.lineTo(2.3, -1);
  shape.lineTo(2.1, 3.6);
  shape.lineTo(1.55, 5);
  shape.lineTo(-1.55, 5);
  shape.lineTo(-2.1, 3.6);
  shape.lineTo(-2.3, -1);
  shape.lineTo(-1.55, -5);
  shape.closePath();
  const deck = mesh(
    new THREE.ShapeGeometry(shape),
    materials.deck,
    group,
    0,
    1.7,
    0,
  );
  deck.rotation.x = Math.PI / 2;
  deck.material = materials.deck.clone();
  deck.material.side = THREE.DoubleSide;
  for (let n = 0; n < stations.length - 1; n++) {
    const [z, w] = stations[n],
      [z2, w2] = stations[n + 1];
    for (const sign of [-1, 1]) {
      pole(
        group,
        [w * sign, 1.8, z],
        [w2 * sign, 1.8, z2],
        0.12,
        materials.trim,
      );
      pole(
        group,
        [w * sign, 2.55, z],
        [w2 * sign, 2.55, z2],
        0.07,
        materials.wood,
      );
    }
  }
  for (let z = -4; z < 5; z += 1.1) {
    const w = z < -3 ? 1.4 : 2;
    box(group, w * 2, 0.018, 0.035, materials.wood, 0, 1.73, z);
    for (const x of [-w, w])
      pole(group, [x, 1.75, z], [x, 2.55, z], 0.045, materials.wood);
  }
  box(
    group,
    2.6,
    1.3,
    2.4,
    enemy ? materials.red : materials.wood,
    0,
    2.2,
    3.4,
  );
  box(group, 3, 0.15, 2.7, materials.deck, 0, 2.93, 3.4);
  for (const x of [-0.72, 0.72])
    box(group, 0.48, 0.42, 0.08, materials.trim, x, 2.28, 4.63);
  pole(group, [0, 1.7, 0.4], [0, 13, 0.4], 0.13, materials.wood);
  pole(group, [0, 1.7, -3.2], [0, 9.4, -3.2], 0.1, materials.wood);
  sail(group, 7.7, 5.1, 8.8, 0.28, enemy ? materials.red : materials.sail);
  sail(group, 5.5, 3.1, 6.5, -3.3, materials.sail);
  const ropes = new THREE.LineBasicMaterial({ color: "#635a44" }),
    points = [];
  for (const x of [-2, 2])
    for (const z of [-2, 3]) {
      points.push(new THREE.Vector3(x, 1.85, z), new THREE.Vector3(0, 12, 0.4));
    }
  const rg = new THREE.BufferGeometry().setFromPoints(points);
  group.add(new THREE.LineSegments(rg, ropes));
  pole(group, [0, 2, -5], [0, 3.2, -9], 0.1, materials.wood);
  const flag = box(
    group,
    2,
    0.85,
    0.025,
    enemy ? materials.iron : materials.red,
    1,
    12.7,
    0.4,
  );
  group.userData.flag = flag;
  for (const z of [-1.7, 1])
    for (const sign of [-1, 1]) {
      const cannon = mesh(
        new THREE.CylinderGeometry(0.19, 0.28, 1.8, 8),
        materials.iron,
        group,
        sign * 2,
        2.25,
        z,
      );
      cannon.rotation.z = Math.PI / 2;
      box(group, 0.6, 0.32, 0.7, materials.wood, sign * 1.45, 1.95, z);
    }
  return group;
}
function palm(group, x, y, z, seed) {
  const angle = seed * 2.3,
    top = [x + Math.cos(angle) * 1.1, y + 7, z + Math.sin(angle) * 1.1];
  pole(group, [x, y, z], top, 0.22, materials.trunk);
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3 + angle,
      leaf = new THREE.BufferGeometry();
    leaf.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        [
          0,
          0,
          0,
          Math.cos(a + 0.3) * 2,
          1,
          Math.sin(a + 0.3) * 2,
          Math.cos(a) * 4.2,
          -0.9,
          Math.sin(a) * 4.2,
          Math.cos(a - 0.3) * 2,
          1,
          Math.sin(a - 0.3) * 2,
        ],
        3,
      ),
    );
    leaf.setIndex([0, 1, 2, 0, 2, 3]);
    leaf.computeVertexNormals();
    const m = mesh(leaf, materials.leaf, group, ...top);
    m.material = materials.leaf;
    m.material.side = THREE.DoubleSide;
  }
}
function islandMesh(island) {
  const group = new THREE.Group();
  group.position.set(island.x, 0, island.z);
  const segments = 48,
    rings = 8,
    positions = [],
    colors = [],
    index = [];
  for (let j = 0; j <= rings; j++) {
    const f = j / rings;
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      const radius =
        island.r *
        f *
        (1 +
          0.07 * Math.sin(a * 5 + island.seed) * f +
          0.04 * Math.cos(a * 9) * f);
      const h =
        j === rings
          ? -1.2
          : 1.5 +
            Math.pow(1 - f, 1.55) * island.r * 0.65 +
            Math.sin(a * 3 + island.seed) * 3 * (1 - f);
      positions.push(Math.cos(a) * radius, h, Math.sin(a) * radius);
      const color = new THREE.Color(
        f > 0.78 ? "#d7c397" : f > 0.43 ? "#7c986b" : "#718376",
      );
      color.multiplyScalar(0.94 + 0.08 * Math.sin(i * 2 + j));
      colors.push(color.r, color.g, color.b);
    }
  }
  for (let j = 0; j < rings; j++)
    for (let i = 0; i < segments; i++) {
      const a = j * (segments + 1) + i,
        b = a + segments + 1;
      index.push(a, a + 1, b, b, a + 1, b + 1);
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 1,
      side: THREE.DoubleSide,
    }),
    group,
  );
  for (let i = 0; i < 15; i++) {
    const a = i * 2.4 + island.seed,
      f = 0.62 + (i % 3) * 0.06;
    const x = Math.cos(a) * island.r * f,
      z = Math.sin(a) * island.r * f,
      y =
        1.5 +
        Math.pow(1 - f, 1.55) * island.r * 0.65 +
        Math.sin(a * 3 + island.seed) * 3 * (1 - f);
    palm(group, x, y, z, i);
  }
  for (let i = 0; i < 9; i++) {
    const a = i * 2.3 + island.seed;
    const rock = mesh(
      new THREE.DodecahedronGeometry(2 + (i % 3), 0),
      materials.rock,
      group,
      Math.cos(a) * island.r * 0.94,
      0.6,
      Math.sin(a) * island.r * 0.94,
    );
    rock.scale.y = 1.5;
    rock.rotation.set(i, 0.2 * i, 0);
  }
  if (island.seed === 3) {
    box(group, 12, 0.6, 26, materials.deck, 12, 2, -island.r - 1);
    for (const x of [7, 17])
      for (let z = -island.r - 10; z < -island.r + 10; z += 8)
        pole(group, [x, -1, z], [x, 3, z], 0.3, materials.wood);
    for (let i = 0; i < 3; i++) {
      box(group, 6, 4.5, 6, materials.sand, -12 + i * 10, 5, -island.r * 0.65);
      const roof = mesh(
        new THREE.ConeGeometry(5, 3.7, 4),
        materials.red,
        group,
        -12 + i * 10,
        9,
        -island.r * 0.65,
      );
      roof.rotation.y = Math.PI / 4;
    }
  }
  // A faint foam ring marks the safe waterline without obscuring the sand.
  const ring = mesh(
    new THREE.RingGeometry(island.r * 1.02, island.r * 1.045, 64),
    new THREE.MeshBasicMaterial({
      color: "#e6eddb",
      transparent: true,
      opacity: 0.32,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
    group,
    0,
    0.12,
    0,
  );
  ring.rotation.x = -Math.PI / 2;
  return group;
}
export class OceanScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.far = false;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: devicePixelRatio < 2,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(
      Math.min(devicePixelRatio, innerWidth < 700 ? 1.5 : 1.75),
    );
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog("#b5d4d5", 220, 950);
    this.camera = new THREE.PerspectiveCamera(58, 1, 0.3, 1600);
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(1250, 24, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        vertexShader:
          "varying vec3 vWorld; void main(){vWorld=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
        fragmentShader:
          "varying vec3 vWorld;void main(){float h=normalize(vWorld).y; vec3 col=mix(vec3(.78,.86,.82),vec3(.23,.53,.65),smoothstep(0.,.65,h));gl_FragColor=vec4(col,1.);}",
      }),
    );
    this.scene.add(sky);
    const sun = mesh(
      new THREE.SphereGeometry(19, 24, 16),
      new THREE.MeshBasicMaterial({ color: "#fff1c7" }),
      this.scene,
      -230,
      215,
      -520,
    );
    sun.castShadow = false;
    this.scene.add(new THREE.HemisphereLight("#c9e7ef", "#5b7161", 2.1));
    this.sun = new THREE.DirectionalLight("#ffe1ab", 3.1);
    this.sun.position.set(-100, 180, -120);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.camera.left = -95;
    this.sun.shadow.camera.right = 95;
    this.sun.shadow.camera.top = 95;
    this.sun.shadow.camera.bottom = -95;
    this.sun.shadow.camera.far = 500;
    this.sun.shadow.bias = -0.001;
    this.sun.shadow.normalBias = 0.08;
    this.scene.add(this.sun, this.sun.target);
    this.waterMaterial = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uEye: { value: new THREE.Vector3() } },
      vertexShader: `
      uniform float uTime; varying vec3 vWorld; varying vec3 vNormal;
      void main(){vec3 p=position;float a=p.x*.085+p.y*.045+uTime*1.1;float b=p.y*.12-p.x*.025+uTime*.8;
      float height=sin(a)*.43+sin(b)*.23;vec4 world=modelMatrix*vec4(p.x,p.y,height,1.);vWorld=world.xyz;
      vNormal=normalize(vec3(-cos(a)*.0365+cos(b)*.00575,1.,cos(a)*.01935+cos(b)*.0276));
      gl_Position=projectionMatrix*viewMatrix*world;}`,
      fragmentShader: `
      uniform float uTime;uniform vec3 uEye;varying vec3 vWorld;varying vec3 vNormal;
      void main(){vec3 n=normalize(vNormal);vec3 view=normalize(uEye-vWorld);float fresnel=pow(1.-max(dot(view,n),0.),3.);
      float lines=sin(vWorld.x*.52+sin(vWorld.z*.25+uTime)*1.6+uTime)*sin(vWorld.z*.43-uTime*.7);
      float foam=smoothstep(.86,1.,lines)*.20;float spec=pow(max(dot(reflect(normalize(vec3(.5,-1.,.6)),n),view),0.),100.);
      vec3 col=mix(vec3(.035,.29,.33),vec3(.29,.53,.56),fresnel);col+=vec3(.30,.47,.40)*foam+vec3(1.,.83,.5)*spec*.65;
      float haze=smoothstep(170.,920.,length(uEye-vWorld));col=mix(col,vec3(.69,.81,.81),haze);
      gl_FragColor=vec4(col,1.);}`,
    });
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(2400, 2400, 160, 160),
      this.waterMaterial,
    );
    water.rotation.x = -Math.PI / 2;
    water.position.y = -0.12;
    this.scene.add(water);
    for (const i of ISLANDS) this.scene.add(islandMesh(i));
    this.player = ship();
    this.scene.add(this.player);
    this.enemies = [ship(true), ship(true)];
    this.enemies.forEach((e) => this.scene.add(e));
    this.chest = new THREE.Group();
    this.chest.position.set(TREASURE.x, 0.5, TREASURE.z);
    box(this.chest, 7, 0.6, 7, materials.wood);
    box(this.chest, 2.5, 1.6, 1.7, materials.trim, 0, 1, 0);
    box(this.chest, 2.3, 0.25, 1.8, materials.deck, 0, 1.9, 0);
    box(this.chest, 0.35, 1.9, 1.9, materials.iron, 0, 1, 0);
    this.scene.add(this.chest);
    this.beacon = mesh(
      new THREE.CylinderGeometry(0.6, 1, 24, 8, 1, true),
      new THREE.MeshBasicMaterial({
        color: "#ffe7a1",
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
      this.scene,
      TREASURE.x,
      14,
      TREASURE.z,
    );
    this.beacon.castShadow = false;
    const bulletGeometry = new THREE.SphereGeometry(0.48, 6, 6),
      bulletMat = mat("#ffe4a8", { emissive: "#ffcf72", emissiveIntensity: 1 });
    this.bulletMeshes = Array.from({ length: 20 }, () => {
      const m = mesh(bulletGeometry, bulletMat, this.scene);
      m.visible = false;
      return m;
    });
    const pg = new THREE.BufferGeometry();
    pg.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(new Float32Array(180 * 3), 3),
    );
    pg.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(new Float32Array(180 * 3), 3),
    );
    pg.setDrawRange(0, 0);
    this.particleGeometry = pg;
    this.particles = new THREE.Points(
      pg,
      new THREE.PointsMaterial({
        size: 1.6,
        vertexColors: true,
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
      }),
    );
    this.particles.frustumCulled = false;
    this.scene.add(this.particles);
    this.wakes = Array.from({ length: 28 }, () => {
      const m = mesh(
        new THREE.RingGeometry(0.7, 1, 12),
        new THREE.MeshBasicMaterial({
          color: "#e0ece0",
          transparent: true,
          opacity: 0.15,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
        this.scene,
      );
      m.rotation.x = -Math.PI / 2;
      m.castShadow = false;
      return m;
    });
    this.cameraPos = new THREE.Vector3();
    this.lookAt = new THREE.Vector3();
    this.resize();
  }
  resize() {
    const r = this.canvas.getBoundingClientRect();
    this.renderer.setSize(r.width, r.height, false);
    this.camera.aspect = r.width / r.height;
    this.camera.fov = r.width < 650 ? 68 : 58;
    this.camera.updateProjectionMatrix();
  }
  snap(p) {
    const f = forward(p.heading),
      d = this.far ? 40 : 29;
    this.cameraPos.set(
      p.x - f.x * d + Math.cos(p.heading) * 9,
      this.far ? 22 : 14,
      p.z - f.z * d + Math.sin(p.heading) * 9,
    );
    this.lookAt.set(p.x + f.x * 28, 3, p.z + f.z * 28);
    this.camera.position.copy(this.cameraPos);
    this.camera.lookAt(this.lookAt);
  }
  draw(s, dt) {
    const p = s.player,
      t = this.reduced ? 0 : s.time,
      f = forward(p.heading);
    this.player.position.set(p.x, Math.sin(t * 1.5) * 0.16, p.z);
    this.player.rotation.set(
      Math.sin(t * 1.2) * 0.015,
      -p.heading,
      Math.sin(t * 1.6) * 0.025,
    );
    this.player.userData.flag.rotation.y = Math.sin(t * 4) * 0.12;
    this.player.visible =
      p.invulnerable <= 0 || Math.floor(s.time * 8) % 2 === 0 || this.reduced;
    s.enemies.forEach((e, i) => {
      const model = this.enemies[i];
      model.visible = e.sink < 1;
      model.position.set(e.x, -e.sink * 7 + Math.sin(t * 1.7 + i) * 0.18, e.z);
      model.rotation.set(
        e.sink * 0.3,
        -e.heading,
        e.sink * 0.8 + Math.sin(t + i) * 0.03,
      );
    });
    this.chest.visible = !s.won;
    this.beacon.visible = s.sunk >= 2 && !s.won;
    this.chest.position.y = 0.5 + Math.sin(t * 1.3) * 0.18;
    this.bulletMeshes.forEach((m, i) => {
      const b = s.bullets[i];
      m.visible = !!b;
      if (b) m.position.set(b.x, b.y, b.z);
    });
    const positions = this.particleGeometry.attributes.position,
      colors = this.particleGeometry.attributes.color;
    s.particles.forEach((part, i) => {
      positions.setXYZ(i, part.x, part.y, part.z);
      const color =
        part.kind === "smoke"
          ? [0.5, 0.48, 0.42]
          : part.kind === "fire"
            ? [1, 0.63, 0.18]
            : [0.8, 0.92, 0.85];
      colors.setXYZ(i, ...color);
    });
    positions.needsUpdate = true;
    colors.needsUpdate = true;
    this.particleGeometry.setDrawRange(0, s.particles.length);
    for (let i = 0; i < this.wakes.length; i++) {
      const w = this.wakes[i],
        age = (t * 0.55 + i / this.wakes.length) % 1;
      w.visible = Math.abs(p.speed) > 2;
      w.position.set(
        p.x - f.x * (7 + age * 42),
        0.22,
        p.z - f.z * (7 + age * 42),
      );
      w.scale.set(1 + age * 6, 0.5 + age * 2, 1);
      w.material.opacity = (1 - age) * 0.23;
    }
    const d = this.far ? 40 : 29,
      desired = new THREE.Vector3(
        p.x - f.x * d + Math.cos(p.heading) * 9,
        this.far ? 22 : 14,
        p.z - f.z * d + Math.sin(p.heading) * 9,
      ),
      look = new THREE.Vector3(p.x + f.x * 28, 3, p.z + f.z * 28);
    const blend = this.reduced ? 1 : 1 - Math.exp(-dt * 4);
    this.cameraPos.lerp(desired, blend);
    this.lookAt.lerp(look, blend);
    // Lift the chase camera above shoreline terrain when turning beside an island.
    for (const island of ISLANDS)
      if (
        Math.hypot(this.cameraPos.x - island.x, this.cameraPos.z - island.z) <
        island.r + 8
      )
        this.cameraPos.y = Math.max(this.cameraPos.y, island.r * 0.7 + 10);
    this.camera.position.copy(this.cameraPos);
    this.camera.lookAt(this.lookAt);
    this.sun.position.set(p.x - 100, 180, p.z - 120);
    this.sun.target.position.set(p.x, 0, p.z);
    this.waterMaterial.uniforms.uTime.value = t;
    this.waterMaterial.uniforms.uEye.value.copy(this.camera.position);
    this.renderer.render(this.scene, this.camera);
  }
  screenPoint(target) {
    const point = new THREE.Vector3(target.x, 15, target.z).project(
      this.camera,
    );
    return {
      x: (point.x * 0.5 + 0.5) * this.canvas.clientWidth,
      y: (-0.5 * point.y + 0.5) * this.canvas.clientHeight,
      visible:
        point.z < 1 &&
        point.z > -1 &&
        Math.abs(point.x) < 0.9 &&
        Math.abs(point.y) < 0.8,
    };
  }
}
