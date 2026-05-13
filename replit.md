# Discord Admin Bot

بوت Discord إداري متكامل مع نظام تكت وأوامر إدارية وجحفلة وبرودكاست.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — تشغيل السيرفر + البوت (port 5000)
- `pnpm run typecheck` — فحص TypeScript
- `pnpm run build` — بناء جميع الحزم
- Required env: `DISCORD_TOKEN` — توكن البوت

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- Discord: discord.js v14
- Build: esbuild (ESM bundle)

## Where things live

- `artifacts/api-server/src/bot/` — كود البوت الكامل
  - `client.ts` — Discord client
  - `commandDefs.ts` — تعريف الـ slash commands
  - `start.ts` — تشغيل البوت
  - `handlers/admin.ts` — ban, kick, timeout, unban, warn, clear
  - `handlers/nuke.ts` — جحفلة شاملة
  - `handlers/broadcast.ts` — إرسال DM لجميع الأعضاء
  - `handlers/tickets.ts` — نظام التكت الكامل
  - `events/ready.ts` — تسجيل slash commands عند التشغيل
  - `events/interactionCreate.ts` — معالجة التفاعلات
  - `events/messageCreate.ts` — أوامر البريفكس `?`
- `artifacts/api-server/src/routes/health.ts` — `/api/healthz` و `/api/ping` لـ Uptime Robot

## Architecture decisions

- البوت يعمل داخل نفس عملية Express (monorepo)
- Slash commands تُسجَّل لكل guild عند بدء التشغيل (فورية)
- بيانات التكت تُحفظ في الذاكرة (Map) — تُعاد عند إعادة تشغيل البوت
- يُستخرج الـ CLIENT_ID تلقائياً من التوكن (base64 decode)

## Product

### أوامر البريفكس `?`
- `?ban @عضو [سبب]` — بان
- `?kick @عضو [سبب]` — كيك
- `?timeout @عضو دقائق [سبب]` — تايم اوت
- `?untimeout @عضو` — رفع تايم اوت
- `?unban [ID]` — رفع بان
- `?warn @عضو سبب` — تحذير
- `?clear عدد` — حذف رسائل
- `?help` — قائمة الأوامر

### Slash Commands
- `/ban` `/kick` `/timeout` `/untimeout` `/unban` `/warn` `/clear`
- `/nuke channels:عام,اعلانات invite:رابط ban_all:true/false` — جحفلة
- `/broadcast message:الرسالة` — DM لجميع الأعضاء
- `/ticket-panel` — إنشاء لوحة التكت
- `/close-ticket` — إغلاق التكت
- `/invite` — رابط الانضمام للسيرفر
- `/join channel:QueueName song:اسم الأغنية` — يدخل قناة صوتية ويشغل أغنية (بحث YouTube)
- `/leave` — يخرج من القناة الصوتية ويوقف التشغيل

### نظام الموسيقى
- يبحث عن الأغنية على YouTube بالاسم
- يظهر embed بعنوان الأغنية + اسم القناة + المدة + الصورة المصغرة
- يخرج تلقائياً عند انتهاء الأغنية
- بيانات الحالة محفوظة في الذاكرة (Map) per-guild

### نظام التكت
- المستخدم يضغط زر "افتح تكت" → قناة خاصة تُنشأ
- زر "إغلاق التكت" يحذف القناة ويسجّل في `#ticket-logs`

## Uptime Robot

أضف هذا الـ URL لـ Uptime Robot:
`https://<your-domain>/api/ping`

## Render Deployment

1. أنشئ Web Service على Render
2. Build Command: `pnpm --filter @workspace/api-server run build`
3. Start Command: `node --enable-source-maps artifacts/api-server/dist/index.mjs`
4. أضف Environment Variable: `DISCORD_TOKEN`

## User preferences

- البريفكس: `?`
- اللغة: عربي في الـ embeds

## Gotchas

- البوت يحتاج صلاحيات: `GUILD_MEMBERS` intent مفعّل في Developer Portal
- Privileged Gateway Intents يجب تفعيلها يدوياً: Server Members Intent + Message Content Intent
