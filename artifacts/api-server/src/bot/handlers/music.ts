import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
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
const COLOR_INFO = 0x5865f2;

interface MusicState {
  connection: VoiceConnection;
  player: AudioPlayer;
}

const musicStates = new Map<string, MusicState>();

function getOrCreateState(guildId: string, voiceChannel: VoiceChannel, guild: NonNullable<ChatInputCommandInteraction["guild"]>): MusicState {
  const existing = musicStates.get(guildId);
  if (existing) return existing;

  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId,
    adapterCreator: guild.voiceAdapterCreator,
  });

  const player = createAudioPlayer();
  connection.subscribe(player);

  connection.on(VoiceConnectionStatus.Disconnected, () => {
    musicStates.delete(guildId);
    logger.info({ guildId }, "Voice connection disconnected");
  });

  const state: MusicState = { connection, player };
  musicStates.set(guildId, state);
  return state;
}

export async function handleJoin(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId || !interaction.guild) {
    return interaction.reply({ content: "❌ هذا الأمر يعمل داخل السيرفر فقط", ephemeral: true });
  }

  const channelOption = interaction.options.getChannel("channel", true);
  const songName = interaction.options.getString("song"); // optional

  if (channelOption.type !== ChannelType.GuildVoice) {
    return interaction.reply({ content: "❌ اختر قناة صوتية", ephemeral: true });
  }

  const voiceChannel = channelOption as VoiceChannel;

  await interaction.deferReply();

  try {
    // Get or create voice connection (don't destroy existing one)
    const state = getOrCreateState(interaction.guildId, voiceChannel, interaction.guild);

    await entersState(state.connection, VoiceConnectionStatus.Ready, 10_000);

    // If no song provided, just join the channel
    if (!songName) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLOR_INFO)
            .setTitle("🔊 تم الانضمام")
            .setDescription(`انضممت إلى **${voiceChannel.name}**\nاستخدم \`/join channel:#${voiceChannel.name} song:اسم الأغنية\` لتشغيل أغنية`)
            .setFooter({ text: "/leave للخروج" })
            .setTimestamp(),
        ],
      });
    }

    // Search YouTube for the song
    const result = await YouTube.searchOne(songName);
    if (!result || !result.url) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLOR_ERROR)
            .setDescription(`❌ لم أجد نتائج لـ: **${songName}**، جرب اسم مختلف`),
        ],
      });
    }

    // Stream audio from YouTube
    const stream = ytdl(result.url, {
      filter: "audioonly",
      quality: "highestaudio",
      highWaterMark: 1 << 25,
    });

    const resource = createAudioResource(stream, {
      inputType: StreamType.Arbitrary,
    });

    state.player.play(resource);

    // Log error but DON'T disconnect — only /leave disconnects
    state.player.on("error", (err) => {
      logger.error({ err }, "Audio player error");
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
          .setFooter({ text: "البحث عبر YouTube • /leave للخروج" })
          .setTimestamp(),
      ],
    });
  } catch (err) {
    logger.error({ err }, "handleJoin error");
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(COLOR_ERROR)
          .setDescription("❌ حدث خطأ، تأكد إن البوت عنده صلاحية الدخول للقناة وحاول مرة أخرى"),
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
        .setDescription("👋 تم الخروج من القناة الصوتية"),
    ],
  });
}
