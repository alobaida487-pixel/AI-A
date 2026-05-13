import {
  SlashCommandBuilder,
  PermissionFlagsBits,
} from "discord.js";

export const commandDefinitions = [
  new SlashCommandBuilder()
    .setName("ban")
    .setDescription("بان عضو من السيرفر")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption((o) =>
      o.setName("user").setDescription("العضو المراد بانه").setRequired(true)
    )
    .addStringOption((o) =>
      o.setName("reason").setDescription("سبب البان").setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("kick")
    .setDescription("طرد عضو من السيرفر")
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption((o) =>
      o.setName("user").setDescription("العضو المراد طرده").setRequired(true)
    )
    .addStringOption((o) =>
      o.setName("reason").setDescription("سبب الكيك").setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("تايم اوت لعضو")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((o) =>
      o.setName("user").setDescription("العضو").setRequired(true)
    )
    .addIntegerOption((o) =>
      o
        .setName("minutes")
        .setDescription("عدد الدقائق")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(40320)
    )
    .addStringOption((o) =>
      o.setName("reason").setDescription("السبب").setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("untimeout")
    .setDescription("رفع التايم اوت عن عضو")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((o) =>
      o.setName("user").setDescription("العضو").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("unban")
    .setDescription("رفع البان عن عضو")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addStringOption((o) =>
      o.setName("userid").setDescription("ID العضو").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("nuke")
    .setDescription("جحفلة — احذف قنوات وأنشئ جديدة وأرسل رابط سيرفر")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((o) =>
      o
        .setName("channels")
        .setDescription("أسماء القنوات الجديدة مفصولة بفاصلة (مثال: عام,اعلانات,بوت)")
        .setRequired(true)
    )
    .addStringOption((o) =>
      o
        .setName("invite")
        .setDescription("رابط السيرفر الذي سيُرسل بعد الجحفلة")
        .setRequired(true)
    )
    .addBooleanOption((o) =>
      o
        .setName("ban_all")
        .setDescription("هل تريد بان جميع الأعضاء؟")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("broadcast")
    .setDescription("إرسال رسالة لجميع أعضاء السيرفر عبر DM")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((o) =>
      o
        .setName("message")
        .setDescription("الرسالة التي ستُرسل")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("ticket-panel")
    .setDescription("إنشاء لوحة التكت في هذه القناة")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((o) =>
      o
        .setName("title")
        .setDescription("عنوان اللوحة")
        .setRequired(false)
    )
    .addStringOption((o) =>
      o
        .setName("description")
        .setDescription("وصف اللوحة")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("close-ticket")
    .setDescription("إغلاق التكت الحالي")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  new SlashCommandBuilder()
    .setName("invite")
    .setDescription("احصل على رابط الانضمام للسيرفر"),

  new SlashCommandBuilder()
    .setName("warn")
    .setDescription("تحذير عضو")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((o) =>
      o.setName("user").setDescription("العضو").setRequired(true)
    )
    .addStringOption((o) =>
      o.setName("reason").setDescription("سبب التحذير").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("clear")
    .setDescription("حذف رسائل من القناة")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption((o) =>
      o
        .setName("amount")
        .setDescription("عدد الرسائل (1-100)")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    ),
];
