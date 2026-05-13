import { Client, ActivityType, REST, Routes } from "discord.js";
import { commandDefinitions } from "../commandDefs.js";
import { logger } from "../../lib/logger.js";

export async function onReady(client: Client<true>) {
  logger.info({ tag: client.user.tag }, "Discord bot is ready");

  client.user.setActivity("GRoupLost", {
    type: ActivityType.Streaming,
    url: "https://www.twitch.tv/grouplost",
  });

  const token = process.env["DISCORD_TOKEN"]!;
  // Extract client ID from token (first segment is base64-encoded client ID)
  const clientId = Buffer.from(token.split(".")[0], "base64").toString("ascii");

  const rest = new REST({ version: "10" }).setToken(token);
  const commandsJSON = commandDefinitions.map((c) => c.toJSON());

  try {
    // Register to all guilds the bot is in for instant deployment
    const guilds = client.guilds.cache;
    for (const [guildId] of guilds) {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
        body: commandsJSON,
      });
      logger.info({ guildId }, "Slash commands registered for guild");
    }
  } catch (err) {
    logger.error({ err }, "Failed to register slash commands");
  }
}
