import {
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";

export async function handleBroadcast(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild) return;

  const message = interaction.options.getString("message", true);

  await interaction.deferReply({ ephemeral: true });

  await interaction.guild.members.fetch();
  const members = interaction.guild.members.cache.filter((m) => !m.user.bot);

  let sent = 0;
  let failed = 0;

  const msgEmbed = new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle(`📢 رسالة من ${interaction.guild.name}`)
    .setDescription(message)
    .setFooter({ text: `المُرسِل: ${interaction.user.tag}` })
    .setTimestamp();

  await Promise.all(
    members.map(async (member) => {
      try {
        await member.send({ embeds: [msgEmbed] });
        sent++;
      } catch {
        failed++;
      }
    })
  );

  await interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle("📢 اكتمل الـ Broadcast")
        .addFields(
          { name: "✅ تم الإرسال", value: `${sent} عضو`, inline: true },
          { name: "❌ فشل", value: `${failed} عضو`, inline: true }
        )
        .setTimestamp(),
    ],
  });
}
