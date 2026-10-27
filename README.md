# Mini Minecraft (Minecraft mejorado)

Juego web estilo Minecraft: mundo voxel, aldeanos con oficios que construyen
casas, granjas, murallas y más.

**Jugar en el iPhone / navegador:** https://marlonbet.github.io/Minecraft-mejorado/

En el iPhone: abre ese enlace en Safari → Compartir → *Añadir a pantalla de inicio*.
A partir de ahí abres el juego desde su icono, a pantalla completa, y siempre
verás la última versión publicada: cada actualización que se sube a este repo
se publica sola en ese mismo enlace, sin cambiar la dirección.

Versión actual: v9 (2026-10-26).
- Sonido sintetizado con WebAudio, sin archivos de audio: romper,
  colocar, pasos y daño, con timbre distinto según el material
  (madera grave, piedra áspera, cristal ping agudo, etc.).
- Partículas con el color del bloque al romper y al colocar, también
  cuando construyen los aldeanos (solo si están cerca).
- Cielo con sol, luna, estrellas, nubes que se mueven y atardeceres
  naranjas, enganchado al ciclo día/noche; reloj del juego en el HUD.
- Bloques nuevos: Cristal (transparente), Nieve (cimas de montañas)
  y Lámpara (brilla de noche). Las casas de las aldeas tienen
  ventanas de cristal y una lámpara dentro.
- Ajustes nuevos: volumen y distancia de dibujado (2-8 chunks, útil
  para el iPhone), con persistencia y aplicación en vivo.
- Guardado automático cada 30 s y al cerrar o cambiar de app, con la
  posición del jugador (antes solo se guardaba al editar bloques).
- Avisos ("Has muerto", "Volar activado/desactivado"), clic central
  para copiar el bloque apuntado y modo offline (service worker con
  caché versionada de los archivos de texto de la app).
- Rendimiento: la malla de chunks se construye desde un array local
  acolchado, sin búsquedas repetidas en el mapa de chunks; la malla
  resultante es idéntica a la de antes.
- El agua con nado NO entra: tocaría la física y la IA de aldeanos
  y animales, y queda fuera a petición del usuario.

Cambios v7:
- Menú viejo destruido: al abrir el juego solo hay dos botones en el
  medio, Menú y Elegir skins. El panel largo anterior se cortaba por
  arriba en pantallas bajas (fallo de centrado con flex) y por eso al
  bajar ya no se podía subir a elegir skin.
- Menú: lista de mundos guardados en local (nombre, modo, semilla,
  bloques editados, fecha), con Jugar y Borrar por mundo; crear nuevo
  mundo con nombre, modo Supervivencia/Creativo y semilla (número,
  texto o vacía = al azar, máximo 10 mundos).
- Dentro del mundo, botón ☰ en la esquina superior derecha que abre el
  menú del juego con Guardar mundo (además del guardado automático al
  editar), Continuar, Mundos y ajustes y Pantalla inicial.
- Botones de vuelo ya no invertidos: subir ⬆️ arriba y bajar ⬇️ debajo.

Cambios v6:
- Paredes al desplazarse: la evasión ya no solo funciona al construir.
  Antes, al caminar, la dirección se anulaba durante la evasión y la
  pared solo se detectaba a 0,08 bloques; ahora se mira 0,9 bloques por
  delante, el rodeo persistente vale para cualquier desplazamiento y al
  terminar se vuelve a la dirección original.
- Terreno: si no hay sitio plano, el aldeano lo aplana él mismo
  (destruye lo alto, incluidos árboles y lomas, y rellena lo bajo con
  tierra) y luego construye ahí mismo.
- Mapa 3D aprendido: cada ciudad encuesta su entorno en un radio de 128
  bloques (perfil por columna: suelo, árboles, estructuras), por sectores
  y también al caminar, y usa los sitios planos recordados para construir.
- Antes de llegar: al descubrir una aldea ya hay una obra a medias, y al
  volver después de un tiempo fuera la obra avanza según ese tiempo
  (con tope), en vez de empezar de cero solo cuando llegas.

Cambios v8 (IA por reglas, sin API):
- Necesidades: construir cansa (energía 100 -> a 25 el aldeano va al
  centro a descansar y recupera hasta 85); la obra queda en pausa, NO
  se cancela, porque cancelar perdería el trozo ya reclamado.
- Peligro: con un zombi a menos de 14 bloques, todos los aldeanos van
  al centro a refugiarse (el guardia también: no hay combate de
  aldeanos, así que no se finge que ataque).
- Reparto: ya no se abre una obra nueva si hay otra sin terminar; o
  se unen a la abierta o vagan/descansan. Antes, un aldeano con poco
  sesgo de construir podía saltarse la obra abierta y abrir otra.
- Órdenes del jugador en el menú del juego (☰): Construir (hasta
  guardia y explorador construyen), Descansar, Reunirse en el centro,
  Sin orden. Al cambiar de mundo la orden se limpia.
- HUD: línea con nº de aldeanos, cuántos construyen, descansan y
  huyen, y la orden activa.
