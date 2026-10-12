# Marea Negra — Ecos del Abismo

Una aventura pirata original para navegador, en español. Navega por un archipiélago ilustrado, combate a los corsarios, descubre tesoros y cruza a un mar espectral para recuperar tres reliquias y derrotar al Almirante Hueco.

## Jugar y desarrollar

La versión portátil generada está en **`dist/marea-negra.html`**. Abre ese archivo en un navegador moderno para jugar sin instalar Node.js ni iniciar un servidor. Todo el arte, código y estilos están incluidos. El guardado local depende de que el navegador permita almacenamiento para archivos locales.

Requiere **Node.js 20 o posterior**. El juego no necesita servicios externos, claves, cuentas, base de datos ni dependencias de ejecución.

```sh
cd /workspace/GAME
npm start
```

El servidor escucha en el **puerto 3000**, configurable con `PORT`. Sirve directamente los archivos HTML, CSS y JavaScript; no requiere compilación. Fuera del entorno de incorporación de Codex, abre ese puerto en tu navegador o mediante el mecanismo de acceso de tu plataforma. La interfaz de incorporación no proporciona una vista previa web.

Para instalar las herramientas de pruebas:

```sh
npm ci --cache /tmp/npm-cache
npm run check
npm test
npm run test:browser
npm run build
```

Las pruebas de navegador usan Playwright y Chromium en `/usr/bin/chromium`. Puedes indicar otra instalación mediante `CHROMIUM_PATH=/ruta/al/chromium npm run test:browser`. La prueba inicia su propio servidor en el puerto 3107, lo detiene al terminar y guarda capturas en `test-results/`. `TEST_BASE_URL` permite utilizar un servidor existente. La caché de npm en `/tmp` evita depender de permisos de escritura en el directorio personal.

El Chromium administrado de este entorno bloquea las direcciones `file://`. Por eso, la prueba de la versión portátil carga el HTML por HTTP y desconecta la red para comprobar el juego y el guardado; la apertura directa de archivos locales debe realizarse en un navegador que la permita.

## Publicar en GitHub Pages

El archivo `docs/index.html` contiene el juego completo y sus recursos incorporados. `npm run build` regenera tanto ese archivo como la versión portátil de `dist`.

En el repositorio `BAZTP/GAME`, abre **Settings → Pages**, selecciona **Deploy from a branch**, elige la rama **main** y la carpeta **/docs**, y pulsa **Save**. Cuando GitHub termine el despliegue, el enlace previsto es **https://baztp.github.io/GAME/**. Ese enlace solo estará disponible después de activar Pages y completar el despliegue. La disponibilidad de Pages en repositorios privados depende del plan de GitHub.

Después de modificar el juego, ejecuta `npm run build` y sube también el nuevo `docs/index.html`; GitHub actualizará la publicación desde esa carpeta.

## La aventura

- **Ocho islas**: dos puertos, tres santuarios de reliquias, dos escondites de tesoros y la Boca del Abismo.
- **Dos mundos**: cruza el velo para encontrar tesoros invisibles, combatir barcos espectrales y evitar la tormenta. El velo dura hasta 25 segundos; su energía se recupera en el mar real.
- **Combate naval**: proyectiles, recarga, enemigos con patrullas y persecución, botín flotante y un jefe con salvas de cinco disparos.
- **Astilleros**: reparaciones gratuitas y tres niveles de mejora para casco, cañones y velas.
- **Exploración**: carta náutica interactiva, rumbos personalizados, brújula de misión y bitácora.
- **Campaña con final**: reúne las reliquias del Sol, la Luna y la Marea, cruza al mundo espectral junto a la Boca del Abismo e interactúa para invocar al guardián. Tras ganar, puedes seguir explorando.
- **Naufragio**: reapareces en Puerto Bruma, pierdes un 15 % de tus doblones y conservas reliquias y mejoras.
- **Sonido opcional**: efectos sintetizados mediante Web Audio, activables en la cabecera.
- **Guardado local**: automático cada cinco segundos de juego, al pausar, al abandonar la página y después de las acciones de progreso. Una partida por navegador y origen; no hay sincronización entre dispositivos. Una nueva travesía pide confirmación antes de reemplazarla.

Todo el arte está dibujado con Canvas y SVG; no se cargan fuentes, imágenes o audios remotos. La versión portátil funciona sin conexión. En la versión servida por HTTP, la pestaña puede seguir funcionando sin red después de cargar sus archivos, pero la recarga sin conexión no está implementada.

## Controles

| Acción                                      | Teclado / ratón                      |
| ------------------------------------------- | ------------------------------------ |
| Navegar                                     | WASD o flechas, incluidas diagonales |
| Disparar al enemigo cercano del mismo mundo | Espacio                              |
| Apuntar y disparar                          | Clic sobre el mar                    |
| Impulso de velocidad                        | Shift; recarga de 6 segundos         |
| Cruzar el velo                              | Q o botón de la luna                 |
| Explorar una isla / atracar                 | E o aviso junto a la costa           |
| Abrir la carta náutica                      | M                                    |
| Marcar rumbo                                | Clic en la carta náutica             |
| Pausar / cerrar ventana                     | Esc                                  |

En dispositivos táctiles aparecen flechas de navegación, disparo e impulso. Los botones de la luna, el mapa y el aviso de interacción también se pueden tocar. Al perder el foco, el juego se pausa.

## Estructura

| Archivo                   | Responsabilidad                                               |
| ------------------------- | ------------------------------------------------------------- |
| `src/game.js`             | Simulación, combate, economía, misión y guardado serializable |
| `src/render.js`           | Ilustración del mundo, barcos, partículas, cámara y mapas     |
| `src/main.js`             | Interfaz, controles, ventanas, audio y almacenamiento local   |
| `src/style.css`           | Interfaz adaptable a escritorio y móvil                       |
| `server.mjs`              | Servidor estático sin dependencias                            |
| `tests/game.test.mjs`     | Pruebas de reglas y progresión completa                       |
| `tests/browser.smoke.mjs` | Pruebas de interacción en Chromium, escritorio y móvil        |

La campaña es para **un jugador**. No incluye multijugador ni publicación automática. Las pruebas del final cargan estados de partida controlados para verificar la interfaz, además de recorrer la progresión en las pruebas de simulación.
