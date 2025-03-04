import { Box, Vec2i } from './types.js';

export function intDiv(a, b) {
  return (a / b) | 0;
}

export function scala_down(pos, factor) {
  const x = pos.x < 0 ? intDiv(pos.x - factor + 1, factor) : intDiv(pos.x, factor);
  const z = pos.z < 0 ? intDiv(pos.z - factor + 1, factor) : intDiv(pos.z, factor);
  return new Vec2i(x, z);
}

export function scala_up(pos, spacing) {
  const minX = pos.x * spacing;
  const minZ = pos.z * spacing;
  
  return new Box(
    new Vec2i(minX, minZ), 
    new Vec2i(minX + spacing - 1, minZ + spacing - 1)
  );
}

export function get_cong_with_module(start, mod, target) {
  return start + ((target - start % mod + mod) % mod);
}

export function calculate_area_seed(worldSeed, salt, x, z) {
  return (salt + worldSeed - 245998635 * z - 1724254968 * x) >>> 0;
}

export class SeedUtils {
  static convertToSeed32Bit(seedInput) {
    try {
      if (typeof seedInput === 'number') {
        return seedInput & 0xffffffff;
      }
      
      if (typeof seedInput === 'string') {
        const trimmed = seedInput.trim();
        const seedNum = Number(trimmed);
        
        if (!isNaN(seedNum) && seedNum <= Number.MAX_SAFE_INTEGER && seedNum >= Number.MIN_SAFE_INTEGER) {
          const result = seedNum & 0xffffffff;
          return result > 0x7fffffff ? result - 0x100000000 : result;
        }
        
        const seedBigInt = BigInt(trimmed);
        const mask32bit = BigInt(0xffffffff);
        const result = Number(seedBigInt & mask32bit);
        
        return result > 0x7fffffff ? result - 0x100000000 : result;
      }
      
      return 0;
    } catch (error) {
      console.error("Error converting seed:", error);
      return 0;
    }
  }
  
  static parseCoordinate(input) {
    if (typeof input === 'string') {
      const trimmed = input.trim();
      if (trimmed === '') return 0;
      return parseInt(trimmed, 10) || 0;
    }
    return (typeof input === 'number' ? input : 0);
  }
}

export class CoordinateUtils {
  static chunkToBlock(chunkX, chunkZ) {
    return {
      x: (chunkX << 4) + 8,
      z: (chunkZ << 4) + 8
    };
  }

  static blockToChunk(blockX, blockZ) {
    return {
      x: blockX >> 4,
      z: blockZ >> 4
    };
  }

  static getChunkDistance(chunkX1, chunkZ1, chunkX2, chunkZ2) {
    const dx = chunkX2 - chunkX1;
    const dz = chunkZ2 - chunkZ1;
    return Math.hypot(dx, dz);
  }

  static getBlockDistance(blockX1, blockZ1, blockX2, blockZ2) {
    return Math.hypot(blockX2 - blockX1, blockZ2 - blockZ1);
  }

  static chunkPosToBlockPos(chunkPos) {
    return this.chunkToBlock(chunkPos.x, chunkPos.z);
  }

  static blockPosToChunkPos(blockPos) {
    const chunk = this.blockToChunk(blockPos.x, blockPos.z);
    return new Vec2i(chunk.x, chunk.z);
  }
  
  static getChunkBox(chunkX, chunkZ) {
    const minX = chunkX << 4;
    const minZ = chunkZ << 4;
    return new Box(
      new Vec2i(minX, minZ), 
      new Vec2i(minX + 15, minZ + 15)
    );
  }
  
  static getChunkBoxFromPos(chunkPos) {
    return this.getChunkBox(chunkPos.x, chunkPos.z);
  }
}