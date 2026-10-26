# Mini Minecraft (Minecraft mejorado)

Juego web estilo Minecraft: mundo voxel, aldeanos con oficios que construyen
casas, granjas, murallas y más.

**Jugar en el iPhone / navegador:** https://marlonbet.github.io/Minecraft-mejorado/

En el iPhone: abre ese enlace en Safari → Compartir → *Añadir a pantalla de inicio*.
A partir de ahí abres el juego desde su icono, a pantalla completa, y siempre
verás la última versión publicada: cada actualización que se sube a este repo
se publica sola en ese mismo enlace, sin cambiar la dirección.

Versión actual: v7 (2026-10-26).
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
