import {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
} from "discord.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [Partials.Channel, Partials.Message],
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(client as any).commands = new Collection();

export default client;
