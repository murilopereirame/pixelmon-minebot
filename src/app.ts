import express from "express";
import MineBot from "./classes/MineBot";
const app = express();
const port = 9090;

const bot = new MineBot("jogar.minepcruim.com", "Harvy", "1.12.2");

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/harvest/start", (req, res) => {
  bot.enableHarvest();
  bot.harvest(-10816, -10769, -14992, -14945, 120);

  res.status(200).json({
    success: true,
  });
});

app.get("/harvest/stop", (req, res) => {
  bot.stopHarvest();

  res.status(200).json({
    success: true,
  });
});

app.get("/harvest/status", (req, res) => {
  res.status(200).json({
    isHarvesting: bot.isHarvesting,
  });
});

app.get("/status/inventory", async (req, res) => {
  const items = (await bot.getInventory()).filter((item) => item !== null);
  const itemCount = {};

  for (const item of items) {
    if (itemCount[item.type]) itemCount[item.type] += item.count;
    else itemCount[item.type] = item.count;
  }

  return res.status(200).json({
    success: true,
    inventory: items,
    itemCount,
  });
});

app.get("/status/inventory/clear", async (req, res) => {
  await bot.emptyInventory();

  return res.status(200).json({
    success: true,
  });
});

app.listen(port, () => {
  console.log(`Server running at ${port}`);
  console.log(`Bot state: ${bot.mineBot._client.state}`);
});
