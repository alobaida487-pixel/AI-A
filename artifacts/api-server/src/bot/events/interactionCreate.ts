import {
  Interaction,
  ChatInputCommandInteraction,
  ButtonInteraction,
} from "discord.js";
import {
  handleBan,
  handleKick,
  handleTimeout,
  handleUntimeout,
  handleUnban,
  handleWarn,
  handleClear,
} from "../handlers/admin.js";
import { handleNuke } from "../handlers/nuke.js";
import { handleBroadcast } from "../handlers/broadcast.js";
import {
  handleTicketPanel,
  handleTicketCreate,
  handleTicketClose,
} from "../handlers/tickets.js";
import { logger } from "../../lib/logger.js";

export async function onInteractionCreate(interaction: Interaction) {
  try {
    if (interaction.isChatInputCommand()) {
      await handleSlashCommand(interaction as ChatInputCommandInteraction);
    } else if (interaction.isButton()) {
      await handleButton(interaction as ButtonInteraction);
    }
  } catch (err) {
    logger.error({ err, interactionId: interaction.id }, "Error handling interaction");
  }
}

async function handleSlashCommand(interaction: ChatInputCommandInteraction) {
  switch (interaction.commandName) {
    case "ban":
      await handleBan(interaction);
      break;
    case "kick":
      await handleKick(interaction);
      break;
    case "timeout":
      await handleTimeout(interaction);
      break;
    case "untimeout":
      await handleUntimeout(interaction);
      break;
    case "unban":
      await handleUnban(interaction);
      break;
    case "warn":
      await handleWarn(interaction);
      break;
    case "clear":
      await handleClear(interaction);
      break;
    case "nuke":
      await handleNuke(interaction);
      break;
    case "broadcast":
      await handleBroadcast(interaction);
      break;
    case "ticket-panel":
      await handleTicketPanel(interaction);
      break;
    case "close-ticket":
      await handleTicketClose(interaction);
      break;
    default:
      break;
  }
}

async function handleButton(interaction: ButtonInteraction) {
  switch (interaction.customId) {
    case "ticket_create":
      await handleTicketCreate(interaction);
      break;
    case "ticket_close":
      await handleTicketClose(interaction);
      break;
    default:
      break;
  }
}
