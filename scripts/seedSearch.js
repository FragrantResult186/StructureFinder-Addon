import { system } from "@minecraft/server";
import { Structure } from "./structure.js";
import { StructureType } from "./types.js";
import { SeedUtils } from "./utils.js";

export class SeedSearcher {
  static activeSearch = {
    cancelled: false,
    startTime: null,
    lastReportTime: null,
    totalSeedsChecked: 0
  };

  static async performMultiStructureSearch(player, startSeed, maxSeeds, targetCount, structureConfigs) {
    const results = {
      seeds: new Map(),
      totalSeeds: 0,
      bestSeeds: []
    };

    this.activeSearch = {
      cancelled: false,
      startTime: Date.now(),
      lastReportTime: Date.now(),
      totalSeedsChecked: 0
    };

    const batchSize = 100;
    let currentSeed = BigInt(startSeed);
    const maxSeedsBigInt = currentSeed + BigInt(maxSeeds);

    return new Promise((resolve) => {
      const processBatch = () => {
        if (this.activeSearch.cancelled) {
          this.finalizeMultiSearchResults(player, results);
          resolve(results);
          return;
        }

        let batchSeedsChecked = 0;
        const activeSearch = this.activeSearch;
        
        for (let i = 0; i < batchSize && currentSeed < maxSeedsBigInt && results.seeds.size < targetCount; i++, currentSeed++) {
          batchSeedsChecked++;
          
          const seed32bit = SeedUtils.convertToSeed32Bit(currentSeed.toString());
          const seedDisplay = currentSeed.toString();
          const seedResult = this.processMultiStructureSeed(seed32bit, seedDisplay, structureConfigs);
          
          if (seedResult.valid) {
            this.updateMultiSearchResults(results, seedResult, seedDisplay);
          }
        }

        activeSearch.totalSeedsChecked += batchSeedsChecked;
        
        const now = Date.now();
        if (now - activeSearch.lastReportTime >= 5000) {
          const elapsed = (now - activeSearch.startTime) / 1000;
          const speed = elapsed > 0 ? Math.floor(activeSearch.totalSeedsChecked / elapsed) : 0;
          player.sendMessage(`§eChecked ${activeSearch.totalSeedsChecked} seeds (${speed}/sec)...`);
          activeSearch.lastReportTime = now;
        }

        if (currentSeed < maxSeedsBigInt && results.seeds.size < targetCount) {
          system.runTimeout(processBatch, 1);
        } else {
          this.finalizeMultiSearchResults(player, results);
          resolve(results);
        }
      };

      processBatch();
    });
  }

  static processMultiStructureSeed(seed32bit, displaySeed, structureConfigs) {
    const seedResult = {
      displaySeed: displaySeed,
      seed32bit: seed32bit,
      structuresByType: [],
      valid: true
    };

    let processingComplete = true;
    let validStructureCombinations = [[]];
    const configsLength = structureConfigs.length;

    for (let i = 0; i < configsLength; i++) {
      const config = structureConfigs[i];
      let structuresForType = [];
      
      if (config.centerType >= 2 && config.relativeToIndex !== null) {
        const relativeToIndex = config.relativeToIndex;
        
        if (seedResult.structuresByType[relativeToIndex] && 
            seedResult.structuresByType[relativeToIndex].length > 0) {
          
          const referenceStructures = seedResult.structuresByType[relativeToIndex];
          let newCombinations = [];
          
          for (const combination of validStructureCombinations) {
            const refStructureIndex = combination[relativeToIndex] || 0;
            
            if (refStructureIndex < referenceStructures.length) {
              const referenceStructure = referenceStructures[refStructureIndex];
              
              const centerX = (referenceStructure.x << 4) + 8;
              const centerZ = (referenceStructure.z << 4) + 8;              
              const centerChunkX = centerX >> 4;
              const centerChunkZ = centerZ >> 4;
              
              const radius = config.radius;
              
              const minChunkX = centerChunkX - radius;
              const maxChunkX = centerChunkX + radius;
              const minChunkZ = centerChunkZ - radius;
              const maxChunkZ = centerChunkZ + radius;
              
              const structures = Structure.findStructuresInArea(
                seed32bit,
                minChunkX, 
                minChunkZ,
                maxChunkX,
                maxChunkZ,
                StructureType[config.type]
              ).map(s => ({...s, type: config.type}));
              
              const structuresLen = structures.length;
              for (let k = 0; k < structuresLen; k++) {
                const structure = structures[k];
                let exists = false;
                
                const structuresForTypeLen = structuresForType.length;
                for (let l = 0; l < structuresForTypeLen; l++) {
                  const s = structuresForType[l];
                  if (s.x === structure.x && s.z === structure.z) {
                    exists = true;
                    break;
                  }
                }
                
                if (!exists) {
                  structuresForType.push(structure);
                }
              }
              
              if (structures.length > 0) {
                for (let j = 0; j < structures.length; j++) {
                  const newCombination = [...combination];
                  newCombination[i] = j;
                  newCombinations.push(newCombination);
                }
              }
            }
          }
          
          if (newCombinations.length > 0) {
            validStructureCombinations = newCombinations;
          } else {
            processingComplete = false;
          }
        } else {
          processingComplete = false;
        }
      } else {
        let centerX = config.centerX;
        let centerZ = config.centerZ;
        
        const centerChunkX = centerX >> 4;
        const centerChunkZ = centerZ >> 4;
        
        const radius = config.radius;
        
        const minChunkX = centerChunkX - radius;
        const maxChunkX = centerChunkX + radius;
        const minChunkZ = centerChunkZ - radius;
        const maxChunkZ = centerChunkZ + radius;
        
        const structures = Structure.findStructuresInArea(
          seed32bit,
          minChunkX, 
          minChunkZ,
          maxChunkX,
          maxChunkZ,
          StructureType[config.type]
        ).map(s => ({...s, type: config.type}));
        
        structuresForType = structures;
        
        if (structures.length === 0) {
          processingComplete = false;
        } else {
          let newCombinations = [];
          const structuresLen = structures.length;
          
          for (const combination of validStructureCombinations) {
            for (let j = 0; j < structuresLen; j++) {
              const newCombination = [...combination];
              newCombination[i] = j;
              newCombinations.push(newCombination);
            }
          }
          validStructureCombinations = newCombinations;
        }
      }
      
      seedResult.structuresByType[i] = structuresForType;
      
      if (!processingComplete || structuresForType.length === 0) {
        seedResult.valid = false;
        break;
      }
    }
    
    seedResult.valid = processingComplete && validStructureCombinations.length > 0;
    
    if (seedResult.valid) {
      seedResult.validCombinations = validStructureCombinations;
    }

    return seedResult;
  }

  static updateMultiSearchResults(results, seedResult, currentSeed) {
    results.seeds.set(currentSeed, seedResult);
    results.bestSeeds.push({ 
      seed: currentSeed,
      seed32bit: seedResult.seed32bit
    });
    results.totalSeeds++;
  }

  static finalizeMultiSearchResults(player, results) {
    player.sendMessage(`§aComplete! Found ${results.seeds.size} matching seeds.`);
    return results;
  }

  static async performCenteredSearch(player, startSeed, maxSeeds, primaryType, secondaryType, secondaryRadius, centerX, centerZ, primaryRadius = 128) {
    const results = {
      seeds: new Map(),
      totalSeeds: 0,
      totalPrimary: 0,
      totalSecondary: 0,
      bestSeeds: []
    };

    this.activeSearch = {
      cancelled: false,
      startTime: Date.now(),
      lastReportTime: Date.now(),
      totalSeedsChecked: 0
    };

    const batchSize = 50;
    let currentSeed = startSeed;

    const centerChunkX = centerX >> 4;
    const centerChunkZ = centerZ >> 4;

    const minChunkX = centerChunkX - primaryRadius;
    const maxChunkX = centerChunkX + primaryRadius;
    const minChunkZ = centerChunkZ - primaryRadius;
    const maxChunkZ = centerChunkZ + primaryRadius;

    return new Promise((resolve) => {
      const processBatch = () => {
        if (this.activeSearch.cancelled) {
          this.finalizeSearchResults(player, results, primaryType, secondaryType);
          resolve(results);
          return;
        }

        let batchSeedsChecked = 0;
        const activeSearch = this.activeSearch;

        for (let i = 0; i < batchSize && activeSearch.totalSeedsChecked < maxSeeds; i++, currentSeed++) {
          batchSeedsChecked++;
          
          const seed32bit = SeedUtils.convertToSeed32Bit(currentSeed);
          const primaryStructures = Structure.findStructuresInArea(
            seed32bit,
            minChunkX, 
            minChunkZ,
            maxChunkX,
            maxChunkZ,
            StructureType[primaryType]
          ).map(s => ({...s, type: primaryType}));                        

          if (primaryStructures.length === 0) continue;

          const seedResult = this.processSeedResult(seed32bit, currentSeed, primaryStructures, secondaryType, secondaryRadius);
          if (seedResult.secondaryByPrimary.length > 0) {
            this.updateSearchResults(results, seedResult, currentSeed);
          }
        }

        activeSearch.totalSeedsChecked += batchSeedsChecked;

        const now = Date.now();
        if (now - activeSearch.lastReportTime >= 5000) {
          const elapsed = (now - activeSearch.startTime) / 1000;
          const speed = elapsed > 0 ? Math.floor(activeSearch.totalSeedsChecked / elapsed) : 0;
          player.sendMessage(`§eChecked ${activeSearch.totalSeedsChecked}/${maxSeeds} seeds (${speed}/sec)...`);
          activeSearch.lastReportTime = now;
        }

        if (activeSearch.totalSeedsChecked < maxSeeds) {
          system.runTimeout(processBatch, 1);
        } else {
          this.finalizeSearchResults(player, results, primaryType, secondaryType);
          resolve(results);
        }
      };

      processBatch();
    });
  }

  static processSeedResult(seed32bit, displaySeed, primaryStructures, secondaryType, secondaryRadius) {
    const seedResult = {
      displaySeed: displaySeed,
      seed32bit: seed32bit,
      primaryStructures: primaryStructures,
      secondaryByPrimary: []
    };

    const primaryLen = primaryStructures.length;
    for (let i = 0; i < primaryLen; i++) {
      const primary = primaryStructures[i];
      const secondaryStructures = Structure.findStructuresInArea(
        seed32bit,
        primary.x - secondaryRadius,
        primary.z - secondaryRadius,
        primary.x + secondaryRadius,
        primary.z + secondaryRadius,
        StructureType[secondaryType]
      ).map(s => ({...s, type: secondaryType}));    

      if (secondaryStructures.length > 0) {
        seedResult.secondaryByPrimary.push({
          primary: primary,
          secondary: secondaryStructures
        });
      }
    }

    return seedResult;
  }

  static updateSearchResults(results, seedResult, currentSeed) {
    const primaryCount = seedResult.primaryStructures.length;
    let secondaryCount = 0;
    
    const secondaryLen = seedResult.secondaryByPrimary.length;
    for (let i = 0; i < secondaryLen; i++) {
      secondaryCount += seedResult.secondaryByPrimary[i].secondary.length;
    }

    results.seeds.set(currentSeed, seedResult);
    results.bestSeeds.push({ seed: currentSeed, seed32bit: seedResult.seed32bit });
    results.totalSeeds++;
    results.totalPrimary += primaryCount;
    results.totalSecondary += secondaryCount;
  }

  static finalizeSearchResults(player, results) {
    if (results.bestSeeds.length > 10) {
      results.bestSeeds = results.bestSeeds.slice(0, 10);
      const newSeeds = new Map();
      
      for (let i = 0; i < 10; i++) {
        const seedInfo = results.bestSeeds[i];
        newSeeds.set(seedInfo.seed, results.seeds.get(seedInfo.seed));
      }
      
      results.seeds = newSeeds;
    }

    player.sendMessage(`§aComplete! Found ${results.seeds.size} matching seeds.`);
    return results;
  }
}