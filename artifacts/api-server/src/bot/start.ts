import client from "./client.js";
import { onReady } from "./events/ready.js";
import { onInteractionCreate } from "./events/interactionCreate.js";
import { onMessageCreate } from "./events/messageCreate.js";
import { logger } from "../lib/logger.js";

let token: string | null = null;
let isLoggingIn = false;
let readyFired = false;

export async function ensureConnected(): Promise<void> {
  if (!token) return;
  if (client.isReady()) return;
  if (isLoggingIn) return;

  isLoggingIn = true;
  logger.warn("ensureConnected: client not ready — re-logging in");
  try {
    await client.login(token);
  } catch (err) {
    logger.error({ err }, "Re-login failed");
  } finally {
    isLoggingIn = false;
  }
}

export function startBot() {
  token = process.env["DISCORD_TOKEN"] ?? null;
  if (!token) {
    logger.warn("DISCORD_TOKEN not set — bot will not start");
    return;
  }

  // Prevent running in two places simultaneously (Replit dev + Render)
  // Set DISCORD_ENABLED=true on Render only
  const enabled = process.env["DISCORD_ENABLED"];
  if (enabled !== undefined && enabled !== "true") {
    logger.warn("DISCORD_ENABLED is not 'true' — bot will not start (set DISCORD_ENABLED=true on Render)");
    return;
  }

  // Register listeners only once
  client.once("clientReady", (c) => {
    readyFired = true;
    onReady(c);
  });

  // Re-register on every reconnect so commands keep working
  client.on("clientReady", (c) => {
    if (!readyFired) return; // skip the first (handled by once above)
    logger.info({ tag: c.user.tag }, "Bot reconnected and ready");
    onReady(c).catch((err) => logger.error({ err }, "onReady error after reconnect"));
  });

  client.on("interactionCreate", (i) => onInteractionCreate(i));
  client.on("messageCreate", (m) => onMessageCreate(m));

  client.on("error", (err) => logger.error({ err }, "Discord client error"));
  client.on("warn", (msg) => logger.warn({ msg }, "Discord client warning"));

  client.on("shardDisconnect", (event, shardId) => {
    logger.warn({ code: event.code, shardId }, "Shard disconnected");
    // Reconnect immediately (small delay to respect rate limits)
    setTimeout(() => ensureConnected().catch(() => {}), 5_000);
  });

  client.on("shardReconnecting", (shardId) =>
    logger.info({ shardId }, "Shard reconnecting…")
  );

  client.on("shardResume", (shardId, replayed) =>
    logger.info({ shardId, replayed }, "Shard resumed ✓")
  );

  // Watchdog every 15 seconds
  setInterval(() => {
    ensureConnected().catch(() => {});
  }, 15_000);

  // Initial login
  client.login(token).catch((err) => {
    logger.error({ err }, "Initial login failed — watchdog will retry");
  });
}
