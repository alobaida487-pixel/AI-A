import client from "./client.js";
import { onReady } from "./events/ready.js";
import { onInteractionCreate } from "./events/interactionCreate.js";
import { onMessageCreate } from "./events/messageCreate.js";
import { logger } from "../lib/logger.js";

export function startBot() {
  const token = process.env["DISCORD_TOKEN"];
  if (!token) {
    logger.warn("DISCORD_TOKEN not set — bot will not start");
    return;
  }

  client.once("clientReady", (c) => onReady(c));
  client.on("interactionCreate", (i) => onInteractionCreate(i));
  client.on("messageCreate", (m) => onMessageCreate(m));

  client.on("error", (err) => logger.error({ err }, "Discord client error"));
  client.on("warn", (msg) => logger.warn({ msg }, "Discord client warning"));

  client.login(token).catch((err) => {
    logger.error({ err }, "Failed to login to Discord");
  });
}
