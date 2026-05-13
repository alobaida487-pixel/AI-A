import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  StreamType,
  type VoiceConnection,
  type AudioPlayer,
} from "@discordjs/voice";
import ytdl from "@distube/ytdl-core";
import YouTube from "youtube-sr";
import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  VoiceChannel,
  ChannelType,
} from "discord.js";
import { logger } from "../../lib/logger.js";

const COLOR_SUCCESS = 0x2ecc71;
const COLOR_ERROR = 0xe74c3c;

interface MusicState {
  connection: VoiceConnection;
  player: AudioPlayer;
}

const musicStates = new Map<string, MusicState>();

export async function handleJoin(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId || !interaction.guild) {
    return interaction.reply({ content: "❌ هذا الأمر يعمل داخل السيرفر فقط", ephemeral: true });
  }

  const channelOption = interaction.options.getChannel("channel", true);
  const songName = interaction.options.getString("song", true);

  if (channelOption.type !== ChannelType.GuildVoice) {
    return interaction.reply({ content: "❌ اختر قناة صوتية", ephemeral: true });
  }

  const voiceChannel = channelOption as VoiceChannel;

  await interaction.deferReply();

  try {
    // Search YouTube for the song
    const result = await YouTube.searchOne(songName);
    if (!result || !result.url) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLOR_ERROR)
            .setDescription(`❌ لم أجد الأغنية: **${songName}**، جرب اسم مختلف`),
        ],
      });
    }

    // Destroy any existing connection in this guild
    const existing = musicStates.get(interaction.guildId);
    if (existing) {
      existing.player.stop();
      existing.connection.destroy();
      musicStates.delete(interaction.guildId);
    }

    // Join the voice channel
    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: interaction.guildId,
      adapterCreator: interaction.guild.voiceAdapterCreator,
    });

    await entersState(connection, VoiceConnectionStatus.Ready, 10_000);

    // Stream audio from YouTube
    const stream = ytdl(result.url, {
      filter: "audioonly",
      quality: "highestaudio",
      highWaterMark: 1 << 25,
    });

    const resource = createAudioResource(stream, {
      inputType: StreamType.Arbitrary,
    });

    const player = createAudioPlayer();
    connection.subscribe(player);
    player.play(resource);

    musicStates.set(interaction.guildId, { connection, player });

    // Auto-disconnect when song ends
    player.on(AudioPlayerStatus.Idle, () => {
      connection.destroy();
      musicStates.delete(interaction.guildId!);
      logger.info({ guildId: interaction.guildId }, "Music finished, disconnected");
    });

    player.on("error", (err) => {
      logger.error({ err }, "Audio player error");
      connection.destroy();
      musicStates.delete(interaction.guildId!);
    });

    connection.on(VoiceConnectionStatus.Disconnected, async () => {
      musicStates.delete(interaction.guildId!);
    });

    const duration = result.duration
      ? `${Math.floor(result.duration / 60)}:${String(result.duration % 60).padStart(2, "0")}`
      : "غير معروف";

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(COLOR_SUCCESS)
          .setTitle("🎵 يتم التشغيل الآن")
          .setDescription(`**[${result.title}](${result.url})**`)
          .addFields(
            { name: "📺 القناة", value: result.channel?.name ?? "غير معروف", inline: true },
            { name: "⏱️ المدة", value: duration, inline: true },
            { name: "🔊 القناة الصوتية", value: voiceChannel.name, inline: true }
          )
          .setThumbnail(result.thumbnail?.url ?? null)
          .setFooter({ text: "البحث عبر YouTube • /leave للإيقاف" })
          .setTimestamp(),
      ],
    });
  } catch (err) {
    logger.error({ err }, "handleJoin error");
    const existing = musicStates.get(interaction.guildId);
    if (existing) {
      existing.connection.destroy();
      musicStates.delete(interaction.guildId);
    }
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(COLOR_ERROR)
          .setDescription("❌ حدث خطأ أثناء تشغيل الأغنية، حاول مرة أخرى"),
      ],
    });
  }
}

export async function handleLeave(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId) {
    return interaction.reply({ content: "❌ هذا الأمر يعمل داخل السيرفر فقط", ephemeral: true });
  }

  const state = musicStates.get(interaction.guildId);
  if (!state) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(COLOR_ERROR)
          .setDescription("❌ البوت مش في قناة صوتية"),
      ],
      ephemeral: true,
    });
  }

  state.player.stop();
  state.connection.destroy();
  musicStates.delete(interaction.guildId);

  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(COLOR_SUCCESS)
        .setDescription("👋 تم الخروج من القناة الصوتية وإيقاف التشغيل"),
    ],
  });
}
