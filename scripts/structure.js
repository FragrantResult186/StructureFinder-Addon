import { StructureFinder } from './finder.js';
import { StructureType, Vec2i } from './types.js';

export class Structure {
  static STRUCTURE_CONFIG = {
    'Ancient_City':            { displayName: 'Ancient City' },
    'Buried_Treasure':         { displayName: 'Buried Treasure' },
    'Desert_Temple':           { displayName: 'Desert Temple' },
    'Igloo':                   { displayName: 'Igloo' },
    'Jungle_Temple':           { displayName: 'Jungle Temple' },
    'Ocean_Ruin':              { displayName: 'Ocean Ruin' },
    'Ocean_Monument':          { displayName: 'Ocean Monument' },
    'Pillager_Outpost':        { displayName: 'Pillager Outpost' },
    'Ruined_Portal_Overworld': { displayName: 'Ruined Portal (Overworld)' },
    'Shipwreck':               { displayName: 'Shipwreck' },
    'Village':                 { displayName: 'Village' },
    'Witch_Hut':               { displayName: 'Witch Hut' },
    'Woodland_Mansion':        { displayName: 'Woodland Mansion' },
    'Bastion_Remnant':         { displayName: 'Bastion Remnant' },
    'Nether_Fortress':         { displayName: 'Nether Fortress' },
    'Ruined_Portal_Nether':    { displayName: 'Ruined Portal (Nether)' },
    'End_City':                { displayName: 'End City', minDistanceFromOrigin: 63 }
  };
  
  static getStructureDisplayName(structureKey) {
    return this.STRUCTURE_CONFIG[structureKey]?.displayName || structureKey;
  }
  
  static findStructuresInArea(worldSeed, startX, startZ, endX, endZ, structureType) {
    const structureTypeValue = typeof structureType === 'string' 
      ? StructureType[structureType] 
      : structureType;
      
    const centerX = Math.floor((startX + endX) / 2);
    const centerZ = Math.floor((startZ + endZ) / 2);
    
    const searchRadius = Math.max(Math.abs(endX - startX), Math.abs(endZ - startZ)) / 2 + 16;
    
    const finder = new StructureFinder(
      new Vec2i(centerX * 16, centerZ * 16),
      searchRadius * 16,
      structureTypeValue
    );
    
    const positions = finder.find_candidate_positions(worldSeed);
    
    const structureKey = typeof structureType === 'string' 
      ? structureType 
      : Object.keys(StructureType)[structureType];
      
    const config = this.STRUCTURE_CONFIG[structureKey];
    const minDistance = config?.minDistanceFromOrigin;
    
    return positions
      .filter(pos => {
        const chunkX = Math.floor(pos.x / 16);
        const chunkZ = Math.floor(pos.z / 16);
        
        if (!(chunkX >= startX && chunkX <= endX && chunkZ >= startZ && chunkZ <= endZ)) {
          return false;
        }
        
        if (minDistance) {
          const distanceFromOrigin = Math.sqrt(chunkX * chunkX + chunkZ * chunkZ);
          return distanceFromOrigin >= minDistance;
        }
        
        return true;
      })
      .map(pos => ({
        x: Math.floor(pos.x / 16),
        z: Math.floor(pos.z / 16),
        type: structureType
      }));
  }
}