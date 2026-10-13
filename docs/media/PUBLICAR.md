# Video corto: Marea Negra en 2D y 3D

- Video horizontal nuevo: `marea-negra-2d-3d.mp4` (1280 × 720, H.264/AAC, 30 fps).
- Portada: `marea-negra-2d-3d-portada.jpg`.
- Ver y descargar: https://baztp.github.io/GAME/video.html
- Jugar y elegir vista: https://baztp.github.io/GAME/

Muestra el selector de la barra, navegación y combate en 2D, el cambio real al 3D y la cámara detrás del barco. Textos en español y música sintetizada original, sin voz en off. El 2D usa partidas de demostración; el 3D se graba desde una expedición nueva con controles reales.

**Título sugerido:** Marea Negra: elige tu aventura en 2D o 3D 🏴‍☠️

**Texto para publicar:** ¡Dos formas de surcar el mar! Explora la campaña 2D o toma el timón en nuestra primera expedición 3D. Elige tu vista en la barra superior, combate a los corsarios y navega entre islas. Juega gratis desde tu navegador: https://baztp.github.io/GAME/

#MareaNegra #JuegoPirata #JuegosIndie #Gameplay #2D #3D

## Reproducir el video nuevo

Con `npm start` ejecutándose:

```sh
npm run video:modes
DEMO_WORK_DIR=/tmp/marea-modes DEMO_BASENAME=marea-negra-2d-3d python3 scripts/finish-demo.py
```

Requiere Chromium, Playwright, FFmpeg y NumPy. Los clips y fotogramas intermedios se guardan en `/tmp/marea-modes`. `MODES_WORK_DIR` cambia esa carpeta y `MODES_SCENES` permite volver a grabar clips concretos. Las acciones del juego se conservan; se adapta el encuadre y se añaden rótulos para facilitar la lectura del video.

---

# Video de Marea Negra

- Archivo para YouTube y Facebook: `marea-negra-demo.mp4`.
- Portada: `marea-negra-portada.jpg`.
- Página de reproducción: `https://baztp.github.io/GAME/video.html` tras el despliegue de GitHub Pages.
- Juego: `https://baztp.github.io/GAME/`.

El video muestra gameplay real con partidas de demostración preparadas para enseñar cada función. Incluye textos en español y música instrumental sintetizada original; no incluye narración de voz ni materiales de terceros.

## Título sugerido

Marea Negra: cuatro barcos, dos mundos y una aventura pirata por descubrir

## Descripción sugerida

¡Iza las velas! 🏴‍☠️ Explora ocho islas, combate a los corsarios y cruza al mar espectral en Marea Negra: Ecos del Abismo.

Elige entre cuatro navíos con habilidades propias, rescata náufragos, completa contratos y recupera las tres reliquias que abren la Boca del Abismo.

🎮 Juega gratis en computadora o móvil: https://baztp.github.io/GAME/

WASD o flechas para navegar · Espacio para disparar · F para tu habilidad · Q para cruzar el velo · E para explorar.

¿Qué barco elegirías para tu primera travesía?

#MareaNegra #JuegoPirata #JuegosIndie #AventuraNaval #Gameplay

## Reproducir la grabación

1. Inicia el juego con `npm start`.
2. Ejecuta `node scripts/record-demo.mjs` (requiere Playwright, Chromium y FFmpeg).
3. Ejecuta `python3 scripts/finish-demo.py` (requiere NumPy y FFmpeg).

Los fotogramas temporales se guardan en `/tmp/marea-recording`; se pueden cambiar con `DEMO_WORK_DIR`. No se incluyen en Git. La grabación conserva los controles y las reglas del juego; ajusta el encuadre y añade títulos para el video.
