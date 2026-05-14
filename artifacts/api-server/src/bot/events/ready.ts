import { Client, ActivityType, REST, Routes, Guild } from "discord.js";
import { commandDefinitions } from "../commandDefs.js";
import { logger } from "../../lib/logger.js";

const commandsJSON = commandDefinitions.map((c) => c.toJSON());

export function getRestAndClientId() {
  const token = process.env["DISCORD_TOKEN"]!;
  const clientId = Buffer.from(token.split(".")[0], "base64").toString("ascii");
  const rest = new REST({ version: "10" }).setToken(token);
  return { rest, clientId };
}

export async function registerCommandsForGuild(guildId: string) {
  try {
    const { rest, clientId } = getRestAndClientId();
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: commandsJSON,
    });
    logger.info({ guildId }, "Slash commands registered for guild");
  } catch (err) {
    logger.error({ err, guildId }, "Failed to register slash commands for guild");
  }
}

export async function onReady(client: Client<true>) {
  logger.info({ tag: client.user.tag }, "Discord bot is ready");

  client.user.setActivity("GRoupLost", {
    type: ActivityType.Streaming,
    url: "https://www.twitch.tv/grouplost",
  });

  // Register commands in all current guilds
  for (const [guildId] of client.guilds.cache) {
    await registerCommandsForGuild(guildId);
  }
}

export async function onGuildCreate(guild: Guild) {
  logger.info({ guildId: guild.id, guildName: guild.name }, "Bot joined new guild — registering commands");
  await registerCommandsForGuild(guild.id);
}
