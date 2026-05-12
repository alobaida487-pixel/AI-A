import {
  ChatInputCommandInteraction,
  ButtonInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  OverwriteType,
  TextChannel,
  Guild,
} from "discord.js";

// In-memory ticket store: channelId -> { userId, guildId, openedAt }
const ticketStore = new Map<string, { userId: string; guildId: string; openedAt: Date }>();

const TICKET_LOG_CHANNEL_NAME = "ticket-logs";
const COLOR_TICKET = 0x5865f2;

async function getOrCreateLogChannel(guild: Guild): Promise<TextChannel | null> {
  const existing = guild.channels.cache.find(
    (c) => c.name === TICKET_LOG_CHANNEL_NAME && c.isTextBased()
  ) as TextChannel | undefined;
  if (existing) return existing;

  try {
    const ch = await guild.channels.create({
      name: TICKET_LOG_CHANNEL_NAME,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          deny: [PermissionFlagsBits.ViewChannel],
          type: OverwriteType.Role,
        },
      ],
    });
    return ch as TextChannel;
  } catch {
    return null;
  }
}

export async function handleTicketPanel(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild) return;

  const title = interaction.options.getString("title") ?? "🎫 نظام التكت";
  const description =
    interaction.options.getString("description") ??
    "اضغط على الزر أدناه لفتح تكت والتحدث مع الإدارة.";

  const embed = new EmbedBuilder()
    .setColor(COLOR_TICKET)
    .setTitle(title)
    .setDescription(description)
    .setFooter({ text: "سيتم إنشاء قناة خاصة بك عند الضغط على الزر" })
    .setTimestamp();

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_create")
      .setLabel("افتح تكت")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("🎫")
  );

  await interaction.reply({ content: "✅ تم إنشاء لوحة التكت.", ephemeral: true });
  await interaction.channel?.send({ embeds: [embed], components: [row] });
}

export async function handleTicketCreate(interaction: ButtonInteraction) {
  if (!interaction.guild) return;

  await interaction.deferReply({ ephemeral: true });

  const guild = interaction.guild;
  const user = interaction.user;

  // Check if user already has an open ticket
  const existingTicket = guild.channels.cache.find(
    (c) =>
      c.name === `ticket-${user.username.toLowerCase().replace(/[^a-z0-9]/g, "")}` ||
      ticketStore.get(c.id)?.userId === user.id
  );

  if (existingTicket) {
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xe74c3c)
          .setDescription(`❌ لديك تكت مفتوح بالفعل: ${existingTicket}`),
      ],
    });
    return;
  }

  const channelName = `ticket-${user.username.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20) || user.id.slice(-6)}`;

  try {
    const ticketChannel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          deny: [PermissionFlagsBits.ViewChannel],
          type: OverwriteType.Role,
        },
        {
          id: user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
          ],
          type: OverwriteType.Member,
        },
        {
          id: guild.members.me!.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.ReadMessageHistory,
          ],
          type: OverwriteType.Member,
        },
      ],
    }) as TextChannel;

    ticketStore.set(ticketChannel.id, {
      userId: user.id,
      guildId: guild.id,
      openedAt: new Date(),
    });

    const embed = new EmbedBuilder()
      .setColor(COLOR_TICKET)
      .setTitle("🎫 تكت مفتوح")
      .setDescription(
        `مرحباً ${user}!\nشكراً لتواصلك مع الإدارة. اكتب مشكلتك وسيرد عليك أحد المشرفين قريباً.`
      )
      .addFields({ name: "فُتح في", value: `<t:${Math.floor(Date.now() / 1000)}:F>` })
      .setTimestamp();

    const closeRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("ticket_close")
        .setLabel("إغلاق التكت")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("🔒")
    );

    await ticketChannel.send({
      content: `${user}`,
      embeds: [embed],
      components: [closeRow],
    });

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x2ecc71)
          .setDescription(`✅ تم فتح تكتك: ${ticketChannel}`),
      ],
    });
  } catch {
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xe74c3c)
          .setDescription("❌ فشل إنشاء التكت. تحقق من صلاحيات البوت."),
      ],
    });
  }
}

export async function handleTicketClose(
  interaction: ButtonInteraction | ChatInputCommandInteraction
) {
  if (!interaction.guild) return;

  const channel = interaction.channel as TextChannel | null;
  if (!channel) return;

  const ticketData = ticketStore.get(channel.id);
  if (!ticketData && !channel.name.startsWith("ticket-")) {
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xe74c3c)
          .setDescription("❌ هذه القناة ليست تكتاً."),
      ],
      ephemeral: true,
    });
    return;
  }

  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0xf39c12)
        .setDescription("🔒 جاري إغلاق التكت..."),
    ],
    ephemeral: true,
  });

  const guild = interaction.guild;
  const logChannel = await getOrCreateLogChannel(guild);

  // Collect transcript (last 100 messages)
  let transcript = "";
  try {
    const messages = await channel.messages.fetch({ limit: 100 });
    const sorted = [...messages.values()].reverse();
    transcript = sorted
      .map(
        (m) =>
          `[${m.createdAt.toISOString()}] ${m.author.tag}: ${m.content || "[embed/file]"}`
      )
      .join("\n");
  } catch {
    transcript = "فشل جمع سجل الرسائل.";
  }

  if (logChannel) {
    const logEmbed = new EmbedBuilder()
      .setColor(0x95a5a6)
      .setTitle("🔒 تكت مُغلق")
      .addFields(
        {
          name: "اسم القناة",
          value: channel.name,
          inline: true,
        },
        {
          name: "صاحب التكت",
          value: ticketData ? `<@${ticketData.userId}>` : "غير معروف",
          inline: true,
        },
        {
          name: "أُغلق بواسطة",
          value: interaction.user.tag,
          inline: true,
        },
        {
          name: "فُتح في",
          value: ticketData
            ? `<t:${Math.floor(ticketData.openedAt.getTime() / 1000)}:F>`
            : "غير معروف",
          inline: true,
        },
        {
          name: "أُغلق في",
          value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
          inline: true,
        }
      )
      .setTimestamp();

    await logChannel.send({ embeds: [logEmbed] });

    if (transcript.length > 0) {
      const chunks = transcript.match(/[\s\S]{1,1900}/g) ?? [];
      for (const chunk of chunks.slice(0, 5)) {
        await logChannel.send({ content: `\`\`\`\n${chunk}\n\`\`\`` }).catch(() => null);
      }
    }
  }

  ticketStore.delete(channel.id);

  setTimeout(async () => {
    await channel.delete("تكت مغلق").catch(() => null);
  }, 3000);
}
