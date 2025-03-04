# StructureFinder-Addon
This is an addon for finding structures in Minecraft Bedrock within the game.

## How to Use
1. Go to the "Tags" section and download the latest release file with the `.mcpack` extension.
2. Open the downloaded file by double-clicking it. This will launch Minecraft and begin the import process.
3. Once the import is successful, create a new world and add the addon from the behavior packs section. (It is recommended to use a Superflat world.)
4. Open the world, hold "wheat_seeds" in your main hand, and right-click to use it.

## Single Search
Single Search checks for structures in a single seed. This feature is rarely used.

## Brute-Force Search
Brute-Force Search continuously generates seeds until it finds one that contains the specified structures.

## Specifications
The processing speed of brute-force searching is likely your main concern. To be upfront—it is very slow. The speed is approximately **115 seeds/s** within a **64-chunk radius**. Since the addon is written in JavaScript, it is single-threaded and differs significantly from C or Java. Despite being slow, this is actually quite fast for an in-game Bedrock addon.

There is **no biome checking**, meaning the predicted structure locations are merely estimates. To find a seed where the desired structure appears in a suitable biome, additional brute-force searching is required by shifting the upper bits while keeping the lower 32 bits fixed. This can be easily achieved using **cubiomes**.

This addon is simply a way to fulfill my personal dream of finding structures **within the Minecraft Bedrock game itself**.  
If you prioritize processing speed, I recommend using **C or Java** instead.