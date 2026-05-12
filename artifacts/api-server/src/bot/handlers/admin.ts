import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
  PermissionFlagsBits,
} from "discord.js";

const COLOR_SUCCESS = 0x2ecc71;
const COLOR_ERROR = 0xe74c3c;
const COLOR_WARN = 0xf39c12;

function errorEmbed(msg: string) {
  return new EmbedBuilder().setColor(COLOR_ERROR).setDescription(`❌ ${msg}`);
}

export async function handleBan(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild) return;
  await interaction.deferReply({ ephemeral: true });

  const target = interaction.options.getUser("user", true);
  const reason =
    interaction.options.getString("reason") ?? "لا يوجد سبب محدد";

  try {
    await interaction.guild.members.ban(target.id, { reason });
    const embed = new EmbedBuilder()
      .setColor(COLOR_SUCCESS)
      .setTitle("🔨 تم البان")
      .addFields(
        { name: "العضو", value: `${target.tag} (${target.id})`, inline: true },
        { name: "السبب", value: reason, inline: true },
        { name: "المشرف", value: interaction.user.tag, inline: true }
      )
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
  } catch {
    await interaction.editReply({ embeds: [errorEmbed("فشل البان. تحقق من صلاحيات البوت.")] });
  }
}

export async function handleKick(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild) return;
  await interaction.deferReply({ ephemeral: true });

  const target = interaction.options.getUser("user", true);
  const reason =
    interaction.options.getString("reason") ?? "لا يوجد سبب محدد";

  const member = interaction.guild.members.cache.get(target.id);
  if (!member) {
    await interaction.editReply({ embeds: [errorEmbed("العضو غير موجود في السيرفر.")] });
    return;
  }

  try {
    await member.kick(reason);
    const embed = new EmbedBuilder()
      .setColor(COLOR_SUCCESS)
      .setTitle("👢 تم الكيك")
      .addFields(
        { name: "العضو", value: `${target.tag} (${target.id})`, inline: true },
        { name: "السبب", value: reason, inline: true },
        { name: "المشرف", value: interaction.user.tag, inline: true }
      )
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
  } catch {
    await interaction.editReply({ embeds: [errorEmbed("فشل الكيك. تحقق من صلاحيات البوت.")] });
  }
}

export async function handleTimeout(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild) return;
  await interaction.deferReply({ ephemeral: true });

  const target = interaction.options.getUser("user", true);
  const minutes = interaction.options.getInteger("minutes", true);
  const reason =
    interaction.options.getString("reason") ?? "لا يوجد سبب محدد";

  const member = interaction.guild.members.cache.get(target.id) as GuildMember | undefined;
  if (!member) {
    await interaction.editReply({ embeds: [errorEmbed("العضو غير موجود في السيرفر.")] });
    return;
  }

  try {
    await member.timeout(minutes * 60 * 1000, reason);
    const embed = new EmbedBuilder()
      .setColor(COLOR_WARN)
      .setTitle("⏱️ تم التايم اوت")
      .addFields(
        { name: "العضو", value: `${target.tag} (${target.id})`, inline: true },
        { name: "المدة", value: `${minutes} دقيقة`, inline: true },
        { name: "السبب", value: reason, inline: true },
        { name: "المشرف", value: interaction.user.tag, inline: true }
      )
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
  } catch {
    await interaction.editReply({ embeds: [errorEmbed("فشل التايم اوت.")] });
  }
}

export async function handleUntimeout(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild) return;
  await interaction.deferReply({ ephemeral: true });

  const target = interaction.options.getUser("user", true);
  const member = interaction.guild.members.cache.get(target.id) as GuildMember | undefined;
  if (!member) {
    await interaction.editReply({ embeds: [errorEmbed("العضو غير موجود.")] });
    return;
  }

  try {
    await member.timeout(null);
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(COLOR_SUCCESS)
          .setDescription(`✅ تم رفع التايم اوت عن **${target.tag}**`)
          .setTimestamp(),
      ],
    });
  } catch {
    await interaction.editReply({ embeds: [errorEmbed("فشل رفع التايم اوت.")] });
  }
}

export async function handleUnban(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild) return;
  await interaction.deferReply({ ephemeral: true });

  const userId = interaction.options.getString("userid", true).trim();

  try {
    await interaction.guild.members.unban(userId);
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(COLOR_SUCCESS)
          .setDescription(`✅ تم رفع البان عن العضو ذو الـ ID: \`${userId}\``)
          .setTimestamp(),
      ],
    });
  } catch {
    await interaction.editReply({ embeds: [errorEmbed("فشل رفع البان. تأكد من الـ ID.")] });
  }
}

export async function handleWarn(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild) return;
  await interaction.deferReply({ ephemeral: true });

  const target = interaction.options.getUser("user", true);
  const reason = interaction.options.getString("reason", true);

  const member = interaction.guild.members.cache.get(target.id);
  if (!member) {
    await interaction.editReply({ embeds: [errorEmbed("العضو غير موجود.")] });
    return;
  }

  try {
    await target.send({
      embeds: [
        new EmbedBuilder()
          .setColor(COLOR_WARN)
          .setTitle(`⚠️ تحذير من سيرفر ${interaction.guild.name}`)
          .addFields(
            { name: "السبب", value: reason },
            { name: "المشرف", value: interaction.user.tag }
          )
          .setTimestamp(),
      ],
    });
  } catch {
    // DM blocked
  }

  await interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setColor(COLOR_WARN)
        .setTitle("⚠️ تم التحذير")
        .addFields(
          { name: "العضو", value: `${target.tag}`, inline: true },
          { name: "السبب", value: reason, inline: true }
        )
        .setTimestamp(),
    ],
  });
}

export async function handleClear(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild) return;
  await interaction.deferReply({ ephemeral: true });

  const amount = interaction.options.getInteger("amount", true);
  const channel = interaction.channel;

  if (!channel || !channel.isTextBased() || channel.isDMBased()) {
    await interaction.editReply({ embeds: [errorEmbed("لا يمكن تنفيذ الأمر هنا.")] });
    return;
  }

  if (!interaction.guild.members.me?.permissions.has(PermissionFlagsBits.ManageMessages)) {
    await interaction.editReply({ embeds: [errorEmbed("البوت لا يملك صلاحية حذف الرسائل.")] });
    return;
  }

  try {
    const deleted = await (channel as import("discord.js").TextChannel).bulkDelete(amount, true);
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(COLOR_SUCCESS)
          .setDescription(`✅ تم حذف **${deleted.size}** رسالة`)
          .setTimestamp(),
      ],
    });
  } catch {
    await interaction.editReply({ embeds: [errorEmbed("فشل حذف الرسائل.")] });
  }
}
