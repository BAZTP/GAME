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
