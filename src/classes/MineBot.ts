import { createBot, Bot } from "mineflayer";
import { createClient } from "minecraft-protocol";
import { forgeHandshake } from "minecraft-protocol-forge";
import { Movements, goals, pathfinder } from "mineflayer-pathfinder";
import { mineflayer as mineflayerViewer } from "prismarine-viewer";
import MinecraftData from "minecraft-data";
import { Vec3 } from "vec3";

const BLACK_APRICORN_ID = 664;
const YELLOW_APRICORN_ID = 669;
const RANGE_GOAL = 1;

class MineBot {
  mineBot: Bot;
  minecraftData: MinecraftData.IndexedData;
  movements: Movements;
  isHarvesting: boolean = false;

  constructor(host: string, username: string, version: string) {
    const client = createClient({
      host,
      username,
      version,
    });

    forgeHandshake(client, {
      forgeMods: [
        { modid: "minecraft", version: "1.12.2" },
        { modid: "mcp", version: "9.42" },
        { modid: "FML", version: "8.0.99.99" },
        { modid: "Forge", version: "14.23.5.2860" },
        { modid: "storagenetwork", version: "1.8.3" },
        { modid: "locks", version: "3.0.0" },
        { modid: "ironchest", version: "1.12.2-7.0.67.844" },
        { modid: "foamfix", version: "0.10.14" },
        { modid: "betterfurnacesreforged", version: "1.4.5" },
        { modid: "pixelmon", version: "8.4.0" },
        { modid: "tcg", version: "1.12.2-8.3.0-8.0.0-universal" },
        { modid: "travelersbackpack", version: "1.0.35" },
        { modid: "jei", version: "4.16.1.301" },
      ],
    });

    this.mineBot = createBot({ client: client });
    this.mineBot.loadPlugin(pathfinder);

    (this.mineBot as any).registry.itemsArray.push({
      id: 5562,
      name: "Black Apricorn",
    });
    (this.mineBot as any).registry.itemsArray.push({
      id: 5567,
      name: "Yellow Apricorn",
    });

    this.mineBot.once("spawn", this.spawnHandler);
    this.mineBot.on("messagestr", this.chatHandler);
  }

  private delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  private spawnHandler = async () => {
    this.minecraftData = MinecraftData(this.mineBot.version);
    this.movements = new Movements(this.mineBot, this.minecraftData);
    this.movements.scafoldingBlocks = [];
    this.movements.allowFreeMotion = true;
    this.movements.blocksToAvoid.add(this.minecraftData.blocksByName.fence.id);
    this.movements.blocksCantBreak = new Set([
      BLACK_APRICORN_ID,
      YELLOW_APRICORN_ID,
    ]);

    this.mineBot.pathfinder.setMovements(this.movements);
    mineflayerViewer(this.mineBot, { port: 3000 });

    this.mineBot.chat("/logar mrX@10032000");
    await this.delay(2000);
    this.mineBot.chat("/queue pixelmon");
    await this.delay(2000);
    this.mineBot.chat("/home home");
  };

  private chatHandler = async (message: string) => {
    console.log(message);
  };

  private findAvaliableChest = async (chestList: Vec3[]) => {
    let isChestFull = true;
    let chestIndex = 0;

    while (isChestFull) {
      if (await this.isChestFull(chestList[chestIndex])) chestIndex++;
      else {
        isChestFull = false;
        break;
      }
    }

    return chestIndex;
  };

  private isChestFull = async (chestPosition: Vec3) => {
    await this.mineBot.pathfinder.goto(
      new goals.GoalNear(chestPosition.x, chestPosition.y, chestPosition.z, 1)
    );
    const chestBlock = this.mineBot.blockAt(chestPosition);
    const tempChest = await this.mineBot.openChest(chestBlock);
    const itemCount = tempChest.items().length;
    tempChest.close();
    return itemCount === 27;
  };

  emptyInventory = async () => {
    let chestList = this.mineBot.findBlocks({
      matching: this.minecraftData.blocksByName.chest.id,
      maxDistance: 2500,
      count: 24,
    });

    let chestPosition = await this.findAvaliableChest(chestList);
    let chestBlock = this.mineBot.blockAt(chestList[chestPosition]);
    let chest = await this.mineBot.openChest(chestBlock);
    for (const item of this.mineBot.inventory
      .items()
      .filter((item) => item !== null)) {
      if (item) {
        try {
          await chest.deposit(item.type, null, item.count);

          if (chest.items().length === 27) {
            chest.close();
            chestList.splice(chestPosition, 1);
            const newChestIndex = await this.findAvaliableChest(chestList);
            chest = await this.mineBot.openChest(
              this.mineBot.blockAt(chestList[newChestIndex])
            );
          }

          if (this.mineBot.inventory.items().length === 0) {
            chest.close();
            return;
          }
        } catch (err) {
          console.log(err);
        }
      }

      chest.close();
    }
  };

  private mapArea = (
    startX: number,
    endX: number,
    startZ: number,
    endZ: number,
    Y: number
  ) => {
    let area: Vec3[] = [];
    for (let i = startX; i <= endX; i++) {
      for (let j = startZ; j <= endZ; j++) {
        area.push(new Vec3(i, Y, j));
      }
    }

    return area;
  };

  enableHarvest = async () => {
    this.isHarvesting = true;
  };

  stopHarvest = async () => {
    this.isHarvesting = false;
  };

  harvest = async (
    startX: number,
    endX: number,
    startZ: number,
    endZ: number,
    Y: number
  ) => {
    const apricornsBlocks = this.mapArea(startX, endX, startZ, endZ, Y);
    while (this.isHarvesting) {
      try {
        for (const blockPos of apricornsBlocks) {
          const block = this.mineBot.blockAt(blockPos);
          await this.mineBot.pathfinder.goto(
            new goals.GoalBlock(blockPos.x, blockPos.y + 2, blockPos.z)
          );
          await this.mineBot.lookAt(block.position);
          await this.mineBot.activateBlock(block);
          if (this.mineBot.inventory.emptySlotCount() === 0)
            await this.emptyInventory();
        }
      } catch (err) {
        console.log(err);
      }
    }
  };

  getInventory = async () => {
    return this.mineBot.inventory.slots;
  };
}

export default MineBot;
