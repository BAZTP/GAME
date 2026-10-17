# NeoCity 2077 — La ciudad recuerda

NeoCity es un segundo juego independiente, accesible desde el enlace **NeoCity** de las barras de Marea Negra. La versión publicable es `docs/neocity.html`; la versión portátil es `dist/neocity.html`. La ciudad, los personajes y el arte se generan localmente con Three.js. No necesita imágenes ni bibliotecas alojadas en un CDN.

## Qué incluye

- Ciudad 3D explorable con tres distritos: Mercado Neón, Jardines de Silicio y Distrito Núcleo. Edificios con colisión, tráfico y peatones ambientales, lluvia y luces de neón.
- Seis personajes principales: Luna, Kai, Iris, ECHO-9, Vera y ATLAS. Cada uno conserva confianza, encuentros, decisiones y sus últimas conversaciones.
- Historia completa: restaurar energía, salvar el invernadero, decidir sobre la memoria de un sintético, investigar el apagón y elegir entre una red libre, un consejo ciudadano o el control de Helix.
- Recompensas que solo se cobran una vez, créditos, resistencia para correr, un apoyo opcional al taller, mapa y bitácora de recuerdos.
- Consecuencias visibles: el mercado recupera iluminación al repararlo, los jardines cambian, los personajes confiados saludan y quienes recuerdan una traición se apartan de tu mirada. Una alarma elevada acelera a los peatones.
- Guardado local automático y al tomar decisiones. Clave propia `neocity-2077-v1`, independiente de Marea Negra. No hay sincronización entre dispositivos.
- Tres finales; después puedes seguir explorando. Empezar una historia nueva pide confirmación antes de reemplazar la anterior.

WASD o flechas: caminar. Shift: correr. E: hablar o recoger. M: mapa. J: memoria. C: distancia de cámara. Escape: pausa o cerrar ventana. En pantallas táctiles aparecen flechas y un botón para correr. El mapa orienta, pero no teletransporta al personaje.

## Conversaciones: dos modos distintos

**Diálogo local con memoria** está disponible en GitHub Pages y sin conexión después de cargar el HTML. Es un motor de respuestas por temas, personalidad, confianza y decisiones de la partida. **No es un modelo de lenguaje generativo.** La interfaz lo identifica expresamente. Se puede preguntar por la misión, la ciudad, Helix, el futuro y los recuerdos del personaje.

**IA generativa** utiliza el servidor Node incluido, que llama a la API Responses de OpenAI. El navegador envía un mensaje de hasta 400 caracteres y un contexto limitado a los últimos recuerdos y conversaciones del personaje. Las respuestas se muestran como texto; nunca se ejecuta HTML ni se permiten cambios de inventario, dinero o misiones mediante una respuesta del modelo. Las acciones del juego se realizan únicamente con los botones de decisión.

Si la IA falla o tarda demasiado, se utiliza la respuesta local y se informa en la conversación. Cerrar la conversación cancela la solicitud del navegador. Los mensajes ya escritos se conservan como parte de la memoria local.

## Activar conversaciones generativas

GitHub Pages sirve archivos estáticos y **no ejecuta el servidor Node**. El juego público funciona en modo local hasta que se conecte un servicio de IA.

1. Despliega `server.mjs` en un servicio que ejecute Node.js 20 o posterior y proporcione HTTPS. Se incluye una imagen opcional: `docker build -f deployment/neocity.Dockerfile -t neocity .`.
2. Configura **`OPENAI_API_KEY` como secreto del servidor**, nunca en el HTML, JavaScript del cliente, repositorio o chat.
3. Configura `OPENAI_MODEL` si quieres sustituir el modelo predeterminado `gpt-4.1-mini`, y `NEOCITY_ALLOWED_ORIGIN=https://baztp.github.io` para admitir el sitio de GitHub Pages. El origen no lleva `/GAME/`.
4. El servidor usa `PORT` (3000 por defecto). `GET /api/neocity/status` informa si hay una clave configurada, sin mostrarla. Ese estado por sí solo no demuestra que la clave tenga saldo o acceso al modelo.
5. En NeoCity, abre **Diálogo local → Conversaciones de NeoCity**, introduce la URL HTTPS de tu servidor y pulsa **Comprobar conexión**. No se introducen claves en esa pantalla. Después envía un mensaje para verificar la conexión real.

El proxy limita los mensajes, el historial y la salida del modelo, admite hasta cuatro solicitudes simultáneas y doce solicitudes por minuto por dirección de origen. Estos límites son de memoria y se reinician con el proceso; no reemplazan un presupuesto del proveedor o los controles de acceso del servicio de alojamiento. El uso del modelo tiene el coste de la cuenta de API configurada. No se envía historial del otro juego ni se incluyen identificadores personales adicionales. `store: false` desactiva el almacenamiento de la respuesta como recurso recuperable; siguen aplicando las condiciones del proveedor.

En este entorno no se encontró una clave ni un servidor de IA configurado. La integración se verifica con un proveedor simulado; no se ha verificado una respuesta generativa real ni se ha desplegado el servidor externo.

## Desarrollo y pruebas

```sh
npm ci --cache /tmp/npm-cache
npm start
npm test
npm run test:neocity
npm run build
```

`npm test` verifica movimiento, colisiones, objetos, decisiones, finales, memoria, restauración y el contrato HTTP del proxy. `test:neocity` comprueba WebGL, caminar y hablar, guardado, traición, un final, diseño móvil, la integración de conversación con un proveedor simulado y la salida alternativa sin WebGL. Las partidas preparadas se usan únicamente en las pruebas para alcanzar estados de progresión; no hay atajos de prueba dentro del juego.

La ciudad requiere WebGL 2. Los archivos generados incorporan Three.js y su licencia MIT. El cliente puede ejecutarse sin servidor de aplicación; el proxy solo es necesario para el modo generativo.
