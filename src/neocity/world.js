export const SAVE_KEY = "neocity-2077-v1";
export const DISTRICTS = [
  {
    id: "market",
    name: "Mercado Neón",
    x: -75,
    z: 35,
    color: "#ff6bab",
    description: "La calle recuerda quién la ayuda.",
  },
  {
    id: "gardens",
    name: "Jardines de Silicio",
    x: 75,
    z: 35,
    color: "#70f3cd",
    description: "Bajo el neón, todavía crece la vida.",
  },
  {
    id: "core",
    name: "Distrito Núcleo",
    x: 0,
    z: -100,
    color: "#a69bff",
    description: "La ciudad escucha. Tú decides qué puede oír.",
  },
];
export const NPCS = [
  {
    id: "luna",
    name: "Luna Vex",
    role: "Mensajera de la resistencia",
    x: -8,
    z: 24,
    color: "#ff6bab",
    district: "market",
    personality:
      "Directa, protectora y desconfiada de Helix. Habla con frases breves.",
    greeting:
      "Llegas justo a tiempo. Helix va a reiniciar la red. Necesito saber a quién confiarle las llaves de esta ciudad.",
  },
  {
    id: "kai",
    name: "Kai Mori",
    role: "Mecánico de barrio",
    x: -77,
    z: 33,
    color: "#ffd17e",
    district: "market",
    personality:
      "Ingenioso y pragmático. Hace bromas sobre máquinas; valora cumplir promesas.",
    greeting:
      "La torre del mercado está sin energía. Si traes tres celdas, devolveremos la luz a las viviendas.",
  },
  {
    id: "iris",
    name: "Iris Vale",
    role: "Botánica y médica",
    x: 75,
    z: 39,
    color: "#70f3cd",
    district: "gardens",
    personality: "Serena y empática. Prioriza a las personas y el jardín.",
    greeting:
      "El invernadero está fallando. Hay un filtro limpio en el almacén. Con él salvaremos los cultivos del barrio.",
  },
  {
    id: "echo",
    name: "ECHO-9",
    role: "Sintético independiente",
    x: 77,
    z: -32,
    color: "#8edbff",
    district: "gardens",
    personality:
      "Curioso y preciso. Pregunta por el significado de recordar. Desea conservar su identidad.",
    greeting:
      "Mi registro pertenece legalmente a Helix. ¿Una memoria es propiedad de alguien, o parte de quien la vive?",
  },
  {
    id: "vera",
    name: "Vera Kade",
    role: "Auditora de Helix",
    x: -67,
    z: -82,
    color: "#b4a2ff",
    district: "core",
    personality:
      "Formal, persuasiva, nunca caricaturesca. Defiende estabilidad pero respeta evidencias.",
    greeting:
      "El apagón también dejó hospitales sin servicio. Una ciudad libre necesita algo más que buenas intenciones.",
  },
  {
    id: "atlas",
    name: "ATLAS",
    role: "Inteligencia de la ciudad",
    x: 0,
    z: -111,
    color: "#80f7ed",
    district: "core",
    personality:
      "Reflexivo y transparente. Reconoce incertidumbre y respeta el consentimiento.",
    greeting:
      "Escucho millones de señales, pero todavía aprendo a escuchar a una persona. Las tres claves decidirán mi futuro.",
  },
];
export const PICKUPS = [
  { id: "cell1", kind: "cell", name: "Celda de energía", x: -34, z: 45 },
  { id: "cell2", kind: "cell", name: "Celda de energía", x: -90, z: 8 },
  { id: "cell3", kind: "cell", name: "Celda de energía", x: -43, z: -29 },
  {
    id: "filter",
    kind: "filter",
    name: "Filtro del invernadero",
    x: 107,
    z: 24,
  },
  {
    id: "archive",
    kind: "archive",
    name: "Prueba del apagón",
    x: -98,
    z: -112,
  },
  {
    id: "cache",
    kind: "credits",
    name: "Alijo de componentes",
    x: 104,
    z: -101,
  },
];
export const BUILDINGS = [];
// Streets are continuous along x = 0 / ±75 and z = 35 / -35 / -105.
for (let row = 0; row < 4; row++)
  for (let col = 0; col < 4; col++) {
    const x = -112.5 + col * 75,
      z = -140 + row * 70;
    const seed = row * 31 + col * 17 + 3,
      h = 18 + (seed % 8) * 7;
    BUILDINGS.push({
      x,
      z,
      w: 38 + (seed % 3) * 3,
      d: 34,
      h,
      seed,
      color: col < 2 ? "#182336" : "#183132",
    });
  }
export const limit = 155;
export const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export function districtAt(p) {
  return p.z < -65 ? DISTRICTS[2] : p.x > 15 ? DISTRICTS[1] : DISTRICTS[0];
}
