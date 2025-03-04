export class Vec2i {
    constructor(x, z) {
      this.x = x;
      this.z = z;
    }
    
    equals(other) {
      return this.x === other.x && this.z === other.z;
    }
  }
  
  export class Box {
    constructor(min, max) {
      this.min = min;
      this.max = max;
    }
  }
  
  export class StructureConfig {
    constructor(spacing, separation, salt, num) {
      this.spacing = spacing;
      this.separation = separation;
      this.salt = salt;
      this.num = num;
    }
  }
  
  export const StructureType = {
    Ancient_City:             0,
    Buried_Treasure:          1,
    Desert_Temple:            2,
    Igloo:                    3,
    Jungle_Temple:            4,
    Ocean_Ruin:               5,
    Ocean_Monument:           6,
    Pillager_Outpost:         7,
    Ruined_Portal_Overworld:  8,
    Shipwreck:                9,
    Village:                 10,
    Witch_Hut:               11,
    Woodland_Mansion:        12,
    Bastion_Remnant:         13,
    Nether_Fortress:         14,
    Ruined_Portal_Nether:    15,
    End_City:                16,
  };
  
  const CONFIGS = {
    ANCIENT_CITY:            new StructureConfig(24, 16,  20083232, 4),
    BURIED_TREASURE:         new StructureConfig( 4,  2,  16842397, 4),
    OCEAN_RUIN:              new StructureConfig(20, 12,  14357621, 2),
    OCEAN_MONUMENT:          new StructureConfig(32, 27,  10387313, 4),
    PILLAGER_OUTPOST:        new StructureConfig(80, 56, 165745296, 4),
    RUINED_PORTAL_OVERWORLD: new StructureConfig(40, 25,  40552231, 2),
    SHIPWRECK:               new StructureConfig(24, 20, 165745295, 2),
    TEMPLE:                  new StructureConfig(32, 24,  14357617, 2),
    VILLAGE:                 new StructureConfig(34, 26,  10387312, 4),
    WOODLAND_MANSION:        new StructureConfig(80, 60,  10387319, 4),
    NETHER_STRUCTURE:        new StructureConfig(30, 26,  30084232, 2),
    RUINED_PORTAL_NETHER:    new StructureConfig(25, 15,  40552231, 2),
    END_CITY:                new StructureConfig(20,  9,  10387313, 4),
  };
  
  export function get_structure_config(type) {
    switch (type) {
      case StructureType.Ancient_City:
        return CONFIGS.ANCIENT_CITY;
      case StructureType.Buried_Treasure:
        return CONFIGS.BURIED_TREASURE;
      case StructureType.Desert_Temple:
      case StructureType.Jungle_Temple:
      case StructureType.Witch_Hut:
      case StructureType.Igloo:
        return CONFIGS.TEMPLE;
      case StructureType.Ocean_Ruin:
        return CONFIGS.OCEAN_RUIN;
      case StructureType.Ocean_Monument:
        return CONFIGS.OCEAN_MONUMENT;
      case StructureType.Pillager_Outpost:
        return CONFIGS.PILLAGER_OUTPOST;
      case StructureType.Ruined_Portal_Overworld:
        return CONFIGS.RUINED_PORTAL_OVERWORLD;
      case StructureType.Shipwreck:
        return CONFIGS.SHIPWRECK;
      case StructureType.Village:
        return CONFIGS.VILLAGE;
      case StructureType.Woodland_Mansion:
        return CONFIGS.WOODLAND_MANSION;
      case StructureType.Bastion_Remnant:
      case StructureType.Nether_Fortress:
        return CONFIGS.NETHER_STRUCTURE;
      case StructureType.Ruined_Portal_Nether:
        return CONFIGS.RUINED_PORTAL_NETHER;
      case StructureType.End_City:
        return CONFIGS.END_CITY;
      default:
        return new StructureConfig(0, 0, 0, 0);
    }
  }