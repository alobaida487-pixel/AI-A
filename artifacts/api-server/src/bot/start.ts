import client from "./client.js";
import { onReady } from "./events/ready.js";
import { onInteractionCreate } from "./events/interactionCreate.js";
import { onMessageCreate } from "./events/messageCreate.js";
import { logger } from "../lib/logger.js";

const RECONNECT_INTERVAL_MS = 30_000; // check every 30s

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

  client.on("shardDisconnect", (event, shardId) => {
    logger.warn({ code: event.code, shardId }, "Shard disconnected — will attempt reconnect");
  });

  client.on("shardReconnecting", (shardId) => {
    logger.info({ shardId }, "Shard reconnecting…");
  });

  client.on("shardResume", (shardId, replayed) => {
    logger.info({ shardId, replayed }, "Shard resumed");
  });

  async function login() {
    try {
      await client.login(token);
    } catch (err) {
      logger.error({ err }, "Failed to login to Discord — retrying in 30s");
      setTimeout(login, RECONNECT_INTERVAL_MS);
    }
  }

  // Periodic watchdog: if the client is not ready, re-login
  setInterval(() => {
    if (!client.isReady()) {
      logger.warn("Watchdog: client not ready — attempting re-login");
      login().catch(() => {});
    }
  }, RECONNECT_INTERVAL_MS);

  login();
}
