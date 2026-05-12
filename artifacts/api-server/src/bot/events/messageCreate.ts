import {
  Message,
  EmbedBuilder,
  PermissionFlagsBits,
  GuildMember,
  TextChannel,
} from "discord.js";
import { logger } from "../../lib/logger.js";

const PREFIX = "?";
const COLOR_SUCCESS = 0x2ecc71;
const COLOR_ERROR = 0xe74c3c;
const COLOR_WARN = 0xf39c12;

function err(msg: string) {
  return {
    embeds: [new EmbedBuilder().setColor(COLOR_ERROR).setDescription(`❌ ${msg}`)],
  };
}

export async function onMessageCreate(message: Message) {
  if (message.author.bot) return;
  if (!message.guild) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const command = args.shift()?.toLowerCase();

  try {
    switch (command) {
      case "ban":
        await prefixBan(message, args);
        break;
      case "kick":
        await prefixKick(message, args);
        break;
      case "timeout":
      case "mute":
        await prefixTimeout(message, args);
        break;
      case "untimeout":
      case "unmute":
        await prefixUntimeout(message, args);
        break;
      case "unban":
        await prefixUnban(message, args);
        break;
      case "clear":
      case "purge":
        await prefixClear(message, args);
        break;
      case "warn":
        await prefixWarn(message, args);
        break;
      case "help":
        await prefixHelp(message);
        break;
      default:
        break;
    }
  } catch (error) {
    logger.error({ error }, "Prefix command error");
  }
}

async function prefixBan(message: Message, args: string[]) {
  if (!message.member?.permissions.has(PermissionFlagsBits.BanMembers)) return;
  const target = message.mentions.members?.first() ?? message.guild!.members.cache.get(args[0] ?? "");
  const reason = args.slice(1).join(" ") || "لا يوجد سبب";
  if (!target) { await message.reply(err("حدد العضو")); return; }
  await target.ban({ reason });
  await message.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(COLOR_SUCCESS)
        .setTitle("🔨 تم البان")
        .addFields(
          { name: "العضو", value: target.user.tag, inline: true },
          { name: "السبب", value: reason, inline: true }
        )
        .setTimestamp(),
    ],
  });
}

async function prefixKick(message: Message, args: string[]) {
  if (!message.member?.permissions.has(PermissionFlagsBits.KickMembers)) return;
  const target = message.mentions.members?.first() ?? message.guild!.members.cache.get(args[0] ?? "");
  const reason = args.slice(1).join(" ") || "لا يوجد سبب";
  if (!target) { await message.reply(err("حدد العضو")); return; }
  await target.kick(reason);
  await message.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(COLOR_SUCCESS)
        .setTitle("👢 تم الكيك")
        .addFields(
          { name: "العضو", value: target.user.tag, inline: true },
          { name: "السبب", value: reason, inline: true }
        )
        .setTimestamp(),
    ],
  });
}

async function prefixTimeout(message: Message, args: string[]) {
  if (!message.member?.permissions.has(PermissionFlagsBits.ModerateMembers)) return;
  const target = message.mentions.members?.first() ?? message.guild!.members.cache.get(args[0] ?? "");
  const minutes = parseInt(args[1] ?? "10");
  const reason = args.slice(2).join(" ") || "لا يوجد سبب";
  if (!target || isNaN(minutes)) { await message.reply(err("الاستخدام: ?timeout @عضو دقائق سبب")); return; }
  await (target as GuildMember).timeout(minutes * 60 * 1000, reason);
  await message.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(COLOR_WARN)
        .setTitle("⏱️ تايم اوت")
        .addFields(
          { name: "العضو", value: target.user.tag, inline: true },
          { name: "المدة", value: `${minutes} دقيقة`, inline: true },
          { name: "السبب", value: reason, inline: true }
        )
        .setTimestamp(),
    ],
  });
}

async function prefixUntimeout(message: Message, args: string[]) {
  if (!message.member?.permissions.has(PermissionFlagsBits.ModerateMembers)) return;
  const target = message.mentions.members?.first() ?? message.guild!.members.cache.get(args[0] ?? "");
  if (!target) { await message.reply(err("حدد العضو")); return; }
  await (target as GuildMember).timeout(null);
  await message.reply({
    embeds: [new EmbedBuilder().setColor(COLOR_SUCCESS).setDescription(`✅ رُفع التايم اوت عن **${target.user.tag}**`)],
  });
}

async function prefixUnban(message: Message, args: string[]) {
  if (!message.member?.permissions.has(PermissionFlagsBits.BanMembers)) return;
  const userId = args[0];
  if (!userId) { await message.reply(err("الاستخدام: ?unban [ID]")); return; }
  await message.guild!.members.unban(userId);
  await message.reply({
    embeds: [new EmbedBuilder().setColor(COLOR_SUCCESS).setDescription(`✅ رُفع البان عن \`${userId}\``)],
  });
}

async function prefixClear(message: Message, args: string[]) {
  if (!message.member?.permissions.has(PermissionFlagsBits.ManageMessages)) return;
  const amount = parseInt(args[0] ?? "10");
  if (isNaN(amount) || amount < 1 || amount > 100) {
    await message.reply(err("عدد بين 1 و 100")); return;
  }
  await message.delete().catch(() => null);
  const deleted = await (message.channel as TextChannel).bulkDelete(amount, true);
  const reply = await message.channel.send({
    embeds: [new EmbedBuilder().setColor(COLOR_SUCCESS).setDescription(`✅ حُذفت **${deleted.size}** رسالة`)],
  });
  setTimeout(() => reply.delete().catch(() => null), 3000);
}

async function prefixWarn(message: Message, args: string[]) {
  if (!message.member?.permissions.has(PermissionFlagsBits.ModerateMembers)) return;
  const target = message.mentions.users.first();
  const reason = args.slice(1).join(" ");
  if (!target || !reason) { await message.reply(err("الاستخدام: ?warn @عضو سبب")); return; }
  try {
    await target.send({
      embeds: [
        new EmbedBuilder()
          .setColor(COLOR_WARN)
          .setTitle(`⚠️ تحذير من ${message.guild!.name}`)
          .addFields({ name: "السبب", value: reason })
          .setTimestamp(),
      ],
    });
  } catch { /* DM blocked */ }
  await message.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(COLOR_WARN)
        .setTitle("⚠️ تم التحذير")
        .addFields({ name: "العضو", value: target.tag, inline: true }, { name: "السبب", value: reason, inline: true })
        .setTimestamp(),
    ],
  });
}

async function prefixHelp(message: Message) {
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("📋 قائمة الأوامر | البريفكس: `?`")
    .addFields(
      {
        name: "🔨 أوامر إدارية",
        value: [
          "`?ban @عضو [سبب]` — بان عضو",
          "`?kick @عضو [سبب]` — كيك عضو",
          "`?timeout @عضو دقائق [سبب]` — تايم اوت",
          "`?untimeout @عضو` — رفع تايم اوت",
          "`?unban [ID]` — رفع بان",
          "`?warn @عضو سبب` — تحذير",
          "`?clear عدد` — حذف رسائل (1-100)",
        ].join("\n"),
      },
      {
        name: "⚡ Slash Commands",
        value: [
          "`/ban` `/kick` `/timeout` `/untimeout` `/unban`",
          "`/warn` `/clear`",
          "`/nuke` — جحفلة شاملة",
          "`/broadcast` — رسالة لجميع الأعضاء",
          "`/ticket-panel` — إنشاء لوحة التكت",
          "`/close-ticket` — إغلاق التكت",
        ].join("\n"),
      }
    )
    .setFooter({ text: "بوت إداري متكامل" })
    .setTimestamp();

  await message.reply({ embeds: [embed] });
}
