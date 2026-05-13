import {
  Interaction,
  ChatInputCommandInteraction,
  ButtonInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
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
import { handleJoin, handlePlay, handleSkip, handleQueue, handleLeave } from "../handlers/music.js";
import { logger } from "../../lib/logger.js";

const SERVER_INVITE = "https://discord.gg/UxPfaB5RJ";

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
    case "invite":
      await handleInvite(interaction);
      break;
    case "join":
      await handleJoin(interaction);
      break;
    case "play":
      await handlePlay(interaction);
      break;
    case "skip":
      await handleSkip(interaction);
      break;
    case "queue":
      await handleQueue(interaction);
      break;
    case "leave":
      await handleLeave(interaction);
      break;
    default:
      break;
  }
}

async function handleInvite(interaction: ChatInputCommandInteraction) {
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("🔗 انضم لسيرفر GRoupLost")
    .setDescription(`اضغط الزر أدناه للانضمام للسيرفر!`)
    .setTimestamp();

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setLabel("انضم للسيرفر")
      .setStyle(ButtonStyle.Link)
      .setURL(SERVER_INVITE)
      .setEmoji("🎮")
  );

  await interaction.reply({ embeds: [embed], components: [row] });
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
