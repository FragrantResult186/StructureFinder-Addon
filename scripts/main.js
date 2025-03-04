import * as server from "@minecraft/server";
import { UI } from "./ui.js";

server.world.afterEvents.itemUse.subscribe((ev) => {
  try {
    if (ev.itemStack.typeId === "minecraft:wheat_seeds" && ev.source instanceof server.Player) {
      UI.showMainForm(ev.source);
    }
  } catch (error) {
    console.error("Error handling item use:", error);
  }
});