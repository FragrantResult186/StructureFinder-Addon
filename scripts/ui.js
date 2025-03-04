import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { SeedSearcher } from "./seedSearch.js";
import { Structure } from "./structure.js";
import { CoordinateUtils, SeedUtils } from "./utils.js";

export class UI {
  static results = {
    centeredSearchResults: null,
    classicSearchResults: null,
    lastSearchType: null,
    structureConfigs: []
  };

  static isSearching = false;

  static async showInterruptDialog(player) {
    if (!SeedSearcher.activeSearch.cancelled) {
      const response = await new ActionFormData()
        .title ("Search Running")
        .body  ("Do you want to cancel the search?")
        .button("Yes")
        .button("No")
        .show(player);
      
      if (response.selection === 0) {
        SeedSearcher.activeSearch.cancelled = true;
        UI.isSearching = false;
        this.showMainForm(player);
        return true;
      }
    }
    return false;
  }
  
  static teleport(player, x, z) {
    try {
      const pos = CoordinateUtils.chunkToBlock(x, z);
      player.runCommandAsync(`tp @s ${pos.x} 256 ${pos.z}`);
      player.sendMessage    (`§aTeleported to (${pos.x}, ${pos.z})!`);
    } catch (error) {
      player.sendMessage    (`§cTeleport error: ${error.message}`);
    }
  }

  static showStructures(player, structures, structureType, primary = null) {
    if (structures.length === 0) {
      player.sendMessage("§cNo structures found.");
      return;
    }

    const name = Structure.getStructureDisplayName(
      (typeof structureType === 'number' ? 
        Object.keys(Structure.STRUCTURE_CONFIG)[structureType] : 
        structureType) || 'Unknown Structure'
    );

    const form = new ActionFormData()
      .title(primary ? `${name} Near Primary` : `${name} List`)
      .body(primary ? 
        `Found ${structures.length} ${name}s near X=${CoordinateUtils.chunkToBlock(primary.x, primary.z).x}, Z=${CoordinateUtils.chunkToBlock(primary.x, primary.z).z}:` : 
        `Found ${structures.length} ${name}s. Select to teleport:`);

    structures.forEach((structure, index) => {
      const pos = CoordinateUtils.chunkToBlock(structure.x, structure.z);
      let btnText = `${name} #${index + 1}: X=${pos.x}, Z=${pos.z}`;
      
      if (primary) {
        const primaryPos = CoordinateUtils.chunkToBlock(primary.x, primary.z);
        const dx = pos.x - primaryPos.x;
        const dz = pos.z - primaryPos.z;
        const distance = CoordinateUtils.getBlockDistance(pos.x, pos.z, primaryPos.x, primaryPos.z).toFixed(1);
        btnText = `${name} #${index + 1}: X=${pos.x} (Δ${dx}, Δ${dz}, ${distance} blocks)`;
      }
      
      form.button(btnText);
    });

    form.button("Return to Main Menu", "textures/blocks/barrier");
    form.show(player).then(response => {
      if (response.canceled) return;
      if (response.selection === structures.length) return UI.showMainForm(player);
      this.teleport(player, structures[response.selection].x, structures[response.selection].z);
    });
  }

  static showClassicSearch(player) {
    const structureNames = Object.values(Structure.STRUCTURE_CONFIG).map(c => c.displayName);
    
    new ModalFormData()
      .title       ("Single Search")
      .textField   ("World Seed", "12345")
      .textField   ("Center X", "0", "0")
      .textField   ("Center Z", "0", "0")
      .slider      ("Radius (chunks)", 0, 128, 1, 64)
      .dropdown    ("Target", structureNames)
      .toggle      ("Use Current Position")
      .submitButton("Search Structures")
      .show(player).then(response => {
        if (response.canceled) return;
      
        const [seedInput, xInput, zInput, radius, typeIndex, usePosition] = response.formValues;
        const worldSeed = SeedUtils.convertToSeed32Bit(seedInput);
        
        const [centerX, centerZ] = usePosition ? 
          [Math.floor(player.location.x), Math.floor(player.location.z)] :
          [SeedUtils.parseCoordinate(xInput), SeedUtils.parseCoordinate(zInput)];
        
        const centerChunk = CoordinateUtils.blockToChunk(centerX, centerZ);
        const structures = Structure.findStructuresInArea(
          worldSeed,
          centerChunk.x - radius,
          centerChunk.z - radius,
          centerChunk.x + radius,
          centerChunk.z + radius,
          Object.keys(Structure.STRUCTURE_CONFIG)[typeIndex]
        );
      
        UI.results = { 
          classicSearchResults: {
            structures,
            foundSeed: worldSeed,
            structureType: typeIndex
          },
          lastSearchType: 'classic'
        };    
        this.showStructures(player, structures, typeIndex);
      });
  }
  
  static showMultiStructureForm(player) {
    new ModalFormData()
      .title       ("Multi-Structure Search")
      .textField   ("Start Seed", "0", "0")
      .slider      ("Seeds to Check", 1, 100000, 10, 100)
      .slider      ("Target Results", 1, 100, 1, 1)
      .textField   ("Global Center X", "0", "0")
      .textField   ("Global Center Z", "0", "0")
      .toggle      ("Use Current Position")
      .submitButton("Next")
      .show(player).then(response => {
        if (response.canceled) return this.showMainForm(player);
        
        const [startSeed, maxSeeds, targetCount, globalCenterXInput, globalCenterZInput, useCurrentPos] = response.formValues;
        
        const [globalCenterX, globalCenterZ] = useCurrentPos ? 
          [Math.floor(player.location.x), Math.floor(player.location.z)] :
          [SeedUtils.parseCoordinate(globalCenterXInput), SeedUtils.parseCoordinate(globalCenterZInput)];
        
        this.configStructure(player, {
          startSeed,
          maxSeeds,
          targetCount,
          globalCenterX,
          globalCenterZ,
          structureConfigs: []
        }, 1);
      });
  }
  
  static configStructure(player, params, step) {
    if (step > 5) {
      this.confirmSearch(player, params, step);
      return;
    }
    
    const structureNames = Object.values(Structure.STRUCTURE_CONFIG).map(c => c.displayName);
    const centerOptions = ["Global Center", "Custom Center"];
    
    for (let i = 1; i < step; i++) centerOptions.push(`Structure #${i}`);
    
    const form = new ModalFormData()
      .title    (`Configure Structure #${step}`)
      .dropdown (`Structure #${step} Type`, structureNames, step === 1 ? 10 : 0)
      .slider   (`Search Radius (chunks)`, 0, 128, 1, 64)
      .dropdown (`Structure #${step} Center`, centerOptions, 0)
      .textField(`Custom Center X`, "0", "")
      .textField(`Custom Center Z`, "0", "");

    if (step < 5) {
      form.toggle      (`Add Structure #${step + 1}?`, step === 1);
      form.submitButton(`Next`);
    } else {
      form.submitButton("Start Search");
    }

    form.show(player).then(response => {
      if (response.canceled) {
        return params.structureConfigs.length > 0 ? 
          this.confirmSearch(player, params, step) : 
          this.showMainForm(player);
      }
      
      const [typeIndex, radius, centerType, centerXInput, centerZInput, addNext = false] = response.formValues;
      
      let centerX, centerZ;
      if (centerType === 0) {
        centerX = params.globalCenterX;
        centerZ = params.globalCenterZ;
      } else if (centerType === 1) {
        centerX = SeedUtils.parseCoordinate(centerXInput);
        centerZ = SeedUtils.parseCoordinate(centerZInput);
      } else {
        centerX = null;
        centerZ = null;
      }
      
      params.structureConfigs.push({
        type: Object.keys(Structure.STRUCTURE_CONFIG)[typeIndex],
        radius,
        centerType,
        centerX,
        centerZ,
        relativeToIndex: centerType >= 2 ? centerType - 2 : null
      });
      
      if (addNext && step < 5) {
        this.configStructure(player, params, step + 1);
      } else {
        this.confirmSearch(player, params, step);
      }
    });
  }
  
  static confirmSearch(player, params, step) {
    let summary = `Search Configuration Summary:

- Start Seed: ${params.startSeed}
- Seeds to Check: ${params.maxSeeds}
- Target Results: ${params.targetCount}
- Global Center: X=${params.globalCenterX}, Z=${params.globalCenterZ}

Structure Configurations:`;

    params.structureConfigs.forEach((config, index) => {
      const name = Structure.getStructureDisplayName(config.type);
      let centerInfo = "Global Center";
      
      if (config.centerType === 1) {
        centerInfo = `Custom Center (X=${config.centerX}, Z=${config.centerZ})`;
      } else if (config.centerType >= 2) {
        centerInfo = `Relative to Structure #${config.relativeToIndex + 1}`;
      }
      
      summary += `\n${index + 1}. ${name} - Radius: ${config.radius} chunks, Center: ${centerInfo}`;
    });
    
    new ActionFormData()
      .title ("Confirm Search")
      .body  (summary)
      .button("Yes, Start Search")
      .button("No, Continue Configuring")
      .show(player).then(response => {
        if (response.canceled || response.selection === 1) {
          if (step <= 5) {
            if (params.structureConfigs.length > 0) {
              const lastConfig = params.structureConfigs.pop();
              this.configStructure(player, params, params.structureConfigs.length + 1);
            } else {
              this.configStructure(player, params, 1);
            }
          } else {
            this.configStructure(player, params, 5);
          }
          return;
        }
        this.startMultiSearch(player, params);
      });
  }
  
  static startMultiSearch(player, params) {
    if (params.structureConfigs.length === 0) {
      player.sendMessage("§cPlease configure at least one structure.");
      return;
    }
    
    UI.isSearching = true;
    player.sendMessage(`§aSearching for ${params.targetCount} seeds...`);

    SeedSearcher.performMultiStructureSearch(
      player,
      params.startSeed,
      params.maxSeeds,
      params.targetCount,
      params.structureConfigs
    ).then(results => {
      UI.isSearching = false;
      UI.results = {
        centeredSearchResults: results,
        lastSearchType: 'centered',
        structureConfigs: params.structureConfigs
      };
      this.showMultiResults(player, results, params.structureConfigs);
    })
    .catch(error => {
      UI.isSearching = false;
      player.sendMessage(`§cSearch failed: ${error}`);
    });
  }

  static showMultiResults(player, results, configs) {
    const form = new ActionFormData()
      .title("Search Results")
      .body (`Found ${results.seeds.size} matching seeds with all required structures.`);

    results.bestSeeds.forEach(seedInfo => form.button(`Seed ${seedInfo.seed}`));
    
    form.button("Return to Menu");
    form.show(player).then(response => {
      if (response.canceled || response.selection === results.bestSeeds.length) return UI.showMainForm(player);
      
      const selectedSeed = results.bestSeeds[response.selection].seed;
      const seedData = results.seeds.get(selectedSeed);
      this.showSeedDetails(player, selectedSeed, seedData, configs);
    });
  }

  static showSeedDetails(player, seed, data, configs) {
    const form = new ActionFormData()
      .title(`Seed ${seed} Details`)
      .body ("Select a structure type to view its locations:");

    configs.forEach((config, index) => {
      const name = Structure.getStructureDisplayName(config.type);
      const count = data.structuresByType[index] ? data.structuresByType[index].length : 0;
      form.button(`${name} (${count} found)`);
    });
    
    form.button("Back to Results");
    
    form.show(player).then(response => {
      if (response.canceled || response.selection === configs.length) 
        return this.showMultiResults(player, UI.results.centeredSearchResults, configs);
      
      const selectedStructures = data.structuresByType[response.selection] || [];
      const structureType = configs[response.selection].type;
      
      this.showStructures(player, selectedStructures, structureType);
    });
  }

  static handleLastResults(player) {
    if (UI.results.lastSearchType === 'centered' && UI.results.centeredSearchResults) {
      this.showMultiResults(player, UI.results.centeredSearchResults, UI.results.structureConfigs);
    } else if (UI.results.lastSearchType === 'classic' && UI.results.classicSearchResults) {
      this.showStructures(
        player,
        UI.results.classicSearchResults.structures,
        UI.results.classicSearchResults.structureType
      );
    } else {
      player.sendMessage("§cNo previous results available.");
      this.showMainForm(player);
    }
  }

  static showMainForm(player) {
    if (UI.isSearching) return this.showInterruptDialog(player);

    new ActionFormData()
      .title ("Structure Finder")
      .body  ("Select search mode:")
      .button("Single Search")
      .button("Multi-Structure Search")
      .button("View Last Results")
      .show(player).then(response => {
        if (response.canceled) return;
        
        const actions = [
          () => this.showClassicSearch(player),
          () => this.showMultiStructureForm(player),
          () => this.handleLastResults(player)
        ];
        
        actions[response.selection]();
      });
  }
}