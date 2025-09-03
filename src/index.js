import 'dotenv/config';
import axios from 'axios';
import { Client, GatewayIntentBits, Partials, ActivityType, EmbedBuilder, Colors } from 'discord.js';
import { z } from 'zod';

// Environment
const {
  DISCORD_TOKEN,
  ALLOWED_GUILDS,
  ALLOWED_CHANNELS,
  PTERO_BASE_URL,
  PTERO_API_KEY,
  DEFAULT_FIRST_NAME = 'Discord',
  DEFAULT_LAST_NAME = 'User',
} = process.env;

if (!DISCORD_TOKEN) throw new Error('DISCORD_TOKEN missing');
if (!PTERO_BASE_URL || !PTERO_API_KEY) throw new Error('PTERO_BASE_URL or PTERO_API_KEY missing');

const allowedGuilds = (ALLOWED_GUILDS || '').split(',').map(s => s.trim()).filter(Boolean);
const allowedChannels = (ALLOWED_CHANNELS || '').split(',').map(s => s.trim()).filter(Boolean);

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
  partials: [Partials.GuildMember],
});

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  rotatePresence();
  setInterval(rotatePresence, 15_000);
});

function rotatePresence() {
  const cycles = [
    { name: 'Made by Joy', type: ActivityType.Playing },
    { name: 'Pterodactyl users', type: ActivityType.Watching },
    { name: '/usercreate', type: ActivityType.Listening },
  ];
  const i = Math.floor(Date.now() / 15_000) % cycles.length;
  client.user.setPresence({ activities: [cycles[i]], status: 'online' });
}

// Validation
const CreateInput = z.object({
  username: z.string().min(3).max(191),
  email: z.string().email(),
  password: z.string().min(8),
  confirm_password: z.string().min(8),
  first: z.string().optional(),
  last: z.string().optional(),
}).refine(d => d.password === d.confirm_password, {
  message: 'Passwords do not match.',
  path: ['confirm_password'],
});

// Pterodactyl client (Application API)
const ptero = axios.create({
  baseURL: `${PTERO_BASE_URL.replace(/\/$/, '')}/api/application`,
  timeout: 15_000,
  headers: {
    Authorization: `Bearer ${PTERO_API_KEY}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

async function createPanelUser({ username, email, password, first, last }) {
  const payload = {
    email,
    username,
    first_name: first || DEFAULT_FIRST_NAME,
    last_name: last || DEFAULT_LAST_NAME,
    password,
  };
  const { data } = await ptero.post('/users', payload);
  return data;
}

function replyError(interaction, title, description) {
  const embed = new EmbedBuilder()
    .setTitle(`❌ ${title}`)
    .setDescription(description)
    .setColor(Colors.Red);
  return interaction.editReply({ embeds: [embed], ephemeral: true });
}

function replySuccess(interaction, title, fields) {
  const embed = new EmbedBuilder()
    .setTitle(`✅ ${title}`)
    .addFields(fields)
    .setColor(Colors.Green)
    .setFooter({ text: 'Made by Joy • Pterodactyl User Bot' })
    .setTimestamp(new Date());
  return interaction.editReply({ embeds: [embed], ephemeral: true });
}

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'usercreate') return;

  if (allowedGuilds.length && !allowedGuilds.includes(interaction.guildId)) {
    return interaction.reply({ content: 'This command is not available in this server.', ephemeral: true });
  }
  if (allowedChannels.length && !allowedChannels.includes(interaction.channelId)) {
    return interaction.reply({ content: 'This command is restricted in this channel.', ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const parsed = CreateInput.parse({
      username: interaction.options.getString('username', true),
      email: interaction.options.getString('email', true),
      password: interaction.options.getString('password', true),
      confirm_password: interaction.options.getString('confirm_password', true),
      first: interaction.options.getString('first') || undefined,
      last: interaction.options.getString('last') || undefined,
    });

    const user = await createPanelUser(parsed);

    const userId = user?.attributes?.id ?? user?.id ?? 'unknown';
    const adminUrl = `${PTERO_BASE_URL.replace(/\/$/, '')}/admin/users/view/${userId}`;

    await replySuccess(interaction, 'Panel user created', [
      { name: 'Username', value: `\`${parsed.username}\``, inline: true },
      { name: 'Email', value: `\`${parsed.email}\``, inline: true },
      { name: 'Panel Login', value: PTERO_BASE_URL, inline: false },
      { name: 'Admin View', value: adminUrl, inline: false },
    ]);
  } catch (err) {
    console.error(err);

    if (err?.name === 'ZodError') {
      const msg = err.issues.map(i => `• **${i.path.join('.')}:** ${i.message}`).join('\n');
      return replyError(interaction, 'Validation failed', msg);
    }

    const apiMessage = err?.response?.data?.errors?.[0]?.detail
      || err?.response?.data?.errors?.[0]?.code
      || err?.response?.data?.errors
      || err?.response?.data
      || err.message;

    return replyError(interaction, 'Could not create user', String(apiMessage).slice(0, 1000));
  }
});

client.login(DISCORD_TOKEN);
