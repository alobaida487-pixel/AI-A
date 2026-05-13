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
  GuildMember,
} from "discord.js";
import { logger } from "../../lib/logger.js";

const COLOR_SUCCESS = 0x2ecc71;
const COLOR_ERROR = 0xe74c3c;
const COLOR_INFO = 0x5865f2;
const COLOR_QUEUE = 0xf39c12;

interface QueueItem {
  title: string;
  url: string;
  channelName: string;
  duration: string;
  thumbnail: string | null;
}

interface MusicState {
  connection: VoiceConnection;
  player: AudioPlayer;
  queue: QueueItem[];
  current: QueueItem | null;
  guildId: string;
}

const musicStates = new Map<string, MusicState>();

function formatDuration(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

async function playNext(state: MusicState): Promise<void> {
  if (state.queue.length === 0) {
    state.current = null;
    logger.info({ guildId: state.guildId }, "Queue empty, waiting in channel");
    return;
  }

  const item = state.queue.shift()!;
  state.current = item;

  try {
    const stream = ytdl(item.url, {
      filter: "audioonly",
      quality: "highestaudio",
      highWaterMark: 1 << 25,
    });

    const resource = createAudioResource(stream, { inputType: StreamType.Arbitrary });
    state.player.play(resource);
    logger.info({ guildId: state.guildId, title: item.title }, "Now playing");
  } catch (err) {
    logger.error({ err, title: item.title }, "Failed to play track, skipping");
    await playNext(state);
  }
}

function createState(
  guildId: string,
  voiceChannel: VoiceChannel,
  guild: NonNullable<ChatInputCommandInteraction["guild"]>
): MusicState {
  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId,
    adapterCreator: guild.voiceAdapterCreator,
  });

  const player = createAudioPlayer();
  connection.subscribe(player);

  const state: MusicState = {
    connection,
    player,
    queue: [],
    current: null,
    guildId,
  };

  player.on(AudioPlayerStatus.Idle, () => {
    playNext(state).catch((err) =>
      logger.error({ err }, "playNext error on idle")
    );
  });

  player.on("error", (err) => {
    logger.error({ err }, "Audio player error");
    playNext(state).catch(() => {});
  });

  connection.on(VoiceConnectionStatus.Disconnected, () => {
    musicStates.delete(guildId);
    logger.info({ guildId }, "Voice connection disconnected");
  });

  musicStates.set(guildId, state);
  return state;
}

async function resolveVoiceChannel(
  interaction: ChatInputCommandInteraction
): Promise<VoiceChannel | null> {
  const channelOption = interaction.options.getChannel("channel");
  if (channelOption && channelOption.type === ChannelType.GuildVoice) {
    return channelOption as VoiceChannel;
  }
  const member = interaction.member as GuildMember | null;
  const vc = member?.voice?.channel;
  if (vc && vc.type === ChannelType.GuildVoice) return vc as VoiceChannel;
  return null;
}

// /join — join a voice channel only
export async function handleJoin(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId || !interaction.guild) {
    return interaction.reply({ content: "❌ هذا الأمر يعمل داخل السيرفر فقط", ephemeral: true });
  }

  const channelOption = interaction.options.getChannel("channel", true);

  if (channelOption.type !== ChannelType.GuildVoice) {
    return interaction.reply({ content: "❌ اختر قناة صوتية", ephemeral: true });
  }

  const voiceChannel = channelOption as VoiceChannel;
  await interaction.deferReply();

  try {
    let state = musicStates.get(interaction.guildId);
    if (!state) {
      state = createState(interaction.guildId, voiceChannel, interaction.guild);
    }
    await entersState(state.connection, VoiceConnectionStatus.Ready, 10_000);

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(COLOR_INFO)
          .setTitle("🔊 تم الانضمام")
          .setDescription(`انضممت إلى **${voiceChannel.name}**`)
          .setFooter({ text: "/play لتشغيل أغنية • /leave للخروج" })
          .setTimestamp(),
      ],
    });
  } catch (err) {
    logger.error({ err }, "handleJoin error");
    await interaction.editReply({
      embeds: [new EmbedBuilder().setColor(COLOR_ERROR).setDescription("❌ حدث خطأ، تحقق من صلاحيات البوت وحاول مرة أخرى")],
    });
  }
}

// /play — add song to queue (joins user's voice channel if not already connected)
export async function handlePlay(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId || !interaction.guild) {
    return interaction.reply({ content: "❌ هذا الأمر يعمل داخل السيرفر فقط", ephemeral: true });
  }

  const songName = interaction.options.getString("song", true);
  await interaction.deferReply();

  try {
    let state = musicStates.get(interaction.guildId);

    if (!state) {
      const voiceChannel = await resolveVoiceChannel(interaction);
      if (!voiceChannel) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLOR_ERROR)
              .setDescription("❌ ادخل قناة صوتية أو استخدم `/join` أول"),
          ],
        });
      }
      state = createState(interaction.guildId, voiceChannel, interaction.guild);
      await entersState(state.connection, VoiceConnectionStatus.Ready, 10_000);
    }

    return await addToQueue(interaction, state, songName, state.connection.joinConfig.channelId, false);
  } catch (err) {
    logger.error({ err }, "handlePlay error");
    await interaction.editReply({
      embeds: [new EmbedBuilder().setColor(COLOR_ERROR).setDescription("❌ حدث خطأ، حاول مرة أخرى")],
    });
  }
}

async function addToQueue(
  interaction: ChatInputCommandInteraction,
  state: MusicState,
  songName: string,
  channelName: string,
  isJoin: boolean
) {
  const result = await YouTube.searchOne(songName);
  if (!result || !result.url) {
    return interaction.editReply({
      embeds: [new EmbedBuilder().setColor(COLOR_ERROR).setDescription(`❌ لم أجد نتائج لـ: **${songName}**`)],
    });
  }

  const item: QueueItem = {
    title: result.title ?? songName,
    url: result.url,
    channelName: result.channel?.name ?? "غير معروف",
    duration: result.duration ? formatDuration(result.duration) : "غير معروف",
    thumbnail: result.thumbnail?.url ?? null,
  };

  const isPlaying = state.current !== null;
  state.queue.push(item);

  if (!isPlaying) {
    await playNext(state);
    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(COLOR_SUCCESS)
          .setTitle("🎵 يتم التشغيل الآن")
          .setDescription(`**[${item.title}](${item.url})**`)
          .addFields(
            { name: "📺 القناة", value: item.channelName, inline: true },
            { name: "⏱️ المدة", value: item.duration, inline: true },
            { name: "🎶 في الانتظار", value: `${state.queue.length} أغنية`, inline: true }
          )
          .setThumbnail(item.thumbnail)
          .setFooter({ text: "YouTube • /leave للخروج • /queue لعرض القائمة" })
          .setTimestamp(),
      ],
    });
  } else {
    const position = state.queue.length;
    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(COLOR_QUEUE)
          .setTitle("📋 تمت الإضافة للقائمة")
          .setDescription(`**[${item.title}](${item.url})**`)
          .addFields(
            { name: "⏱️ المدة", value: item.duration, inline: true },
            { name: "📍 الترتيب في القائمة", value: `#${position}`, inline: true }
          )
          .setThumbnail(item.thumbnail)
          .setFooter({ text: "YouTube • /queue لعرض كل القائمة" })
          .setTimestamp(),
      ],
    });
  }
}

// /queue — show current queue
export async function handleQueue(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId) {
    return interaction.reply({ content: "❌ هذا الأمر يعمل داخل السيرفر فقط", ephemeral: true });
  }

  const state = musicStates.get(interaction.guildId);
  if (!state || (!state.current && state.queue.length === 0)) {
    return interaction.reply({
      embeds: [new EmbedBuilder().setColor(COLOR_INFO).setDescription("📭 القائمة فارغة")],
      ephemeral: true,
    });
  }

  const lines: string[] = [];
  if (state.current) {
    lines.push(`**▶️ يتم التشغيل الآن:**\n[${state.current.title}](${state.current.url}) — \`${state.current.duration}\``);
  }
  if (state.queue.length > 0) {
    lines.push(`\n**📋 القائمة (${state.queue.length} أغنية):**`);
    state.queue.slice(0, 10).forEach((item, i) => {
      lines.push(`\`${i + 1}.\` [${item.title}](${item.url}) — \`${item.duration}\``);
    });
    if (state.queue.length > 10) {
      lines.push(`_...و${state.queue.length - 10} أغنية إضافية_`);
    }
  }

  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(COLOR_INFO)
        .setTitle("🎵 قائمة التشغيل")
        .setDescription(lines.join("\n"))
        .setFooter({ text: "/play لإضافة أغنية • /skip للتخطي • /leave للخروج" })
        .setTimestamp(),
    ],
  });
}

// /skip — skip current song
export async function handleSkip(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId) {
    return interaction.reply({ content: "❌ هذا الأمر يعمل داخل السيرفر فقط", ephemeral: true });
  }

  const state = musicStates.get(interaction.guildId);
  if (!state || !state.current) {
    return interaction.reply({
      embeds: [new EmbedBuilder().setColor(COLOR_ERROR).setDescription("❌ لا يوجد شيء يتم تشغيله الآن")],
      ephemeral: true,
    });
  }

  const skipped = state.current.title;
  state.player.stop(); // triggers Idle → playNext

  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(COLOR_SUCCESS)
        .setDescription(`⏭️ تم التخطي: **${skipped}**\n${state.queue.length > 0 ? `التالي: **${state.queue[0].title}**` : "القائمة فارغة"}`)
        .setTimestamp(),
    ],
  });
}

// /leave — disconnect
export async function handleLeave(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId) {
    return interaction.reply({ content: "❌ هذا الأمر يعمل داخل السيرفر فقط", ephemeral: true });
  }

  const state = musicStates.get(interaction.guildId);
  if (!state) {
    return interaction.reply({
      embeds: [new EmbedBuilder().setColor(COLOR_ERROR).setDescription("❌ البوت مش في قناة صوتية")],
      ephemeral: true,
    });
  }

  state.player.stop();
  state.connection.destroy();
  musicStates.delete(interaction.guildId);

  await interaction.reply({
    embeds: [new EmbedBuilder().setColor(COLOR_SUCCESS).setDescription("👋 تم الخروج من القناة الصوتية وتفريغ القائمة")],
  });
}
