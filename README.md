# Mini Minecraft (Minecraft mejorado)

Juego web estilo Minecraft: mundo voxel, aldeanos con oficios que construyen
casas, granjas, murallas y más.

**Jugar en el iPhone / navegador:** https://marlonbet.github.io/Minecraft-mejorado/

En el iPhone: abre ese enlace en Safari → Compartir → *Añadir a pantalla de inicio*.
A partir de ahí abres el juego desde su icono, a pantalla completa, y siempre
verás la última versión publicada: cada actualización que se sube a este repo
se publica sola en ese mismo enlace, sin cambiar la dirección.

Versión actual: v6 (2026-10-26).
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
