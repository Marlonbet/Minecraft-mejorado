export function voxelRaycast(world, origin, dir, maxDist = 6) {
  let x = Math.floor(origin.x), y = Math.floor(origin.y), z = Math.floor(origin.z);

  const stepX = Math.sign(dir.x), stepY = Math.sign(dir.y), stepZ = Math.sign(dir.z);
  const tDX = stepX ? Math.abs(1 / dir.x) : Infinity;
  const tDY = stepY ? Math.abs(1 / dir.y) : Infinity;
  const tDZ = stepZ ? Math.abs(1 / dir.z) : Infinity;

  let tMX = stepX ? ((stepX > 0 ? x + 1 - origin.x : x - origin.x) / dir.x) : Infinity;
  let tMY = stepY ? ((stepY > 0 ? y + 1 - origin.y : y - origin.y) / dir.y) : Infinity;
  let tMZ = stepZ ? ((stepZ > 0 ? z + 1 - origin.z : z - origin.z) / dir.z) : Infinity;

  let nx = 0, ny = 0, nz = 0, t = 0;

  while (t <= maxDist) {
    if (world.getBlock(x, y, z)) return { x, y, z, nx, ny, nz };

    if (tMX < tMY && tMX < tMZ) {
      x += stepX; t = tMX; tMX += tDX; nx = -stepX; ny = 0; nz = 0;
    } else if (tMY < tMZ) {
      y += stepY; t = tMY; tMY += tDY; nx = 0; ny = -stepY; nz = 0;
    } else {
      z += stepZ; t = tMZ; tMZ += tDZ; nx = 0; ny = 0; nz = -stepZ;
    }
  }
  return null;
}