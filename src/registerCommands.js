import 'dotenv/config';
import { REST, Routes, SlashCommandBuilder } from 'discord.js';

const commands = [
  new SlashCommandBuilder()
    .setName('usercreate')
    .setDescription('Create a user on your Pterodactyl panel')
    .addStringOption(o => o.setName('username').setDescription('Username (Pterodactyl)').setRequired(true))
    .addStringOption(o => o.setName('email').setDescription('Email').setRequired(true))
    .addStringOption(o => o.setName('password').setDescription('Password (min 8 chars)').setMinLength(8).setRequired(true))
    .addStringOption(o => o.setName('confirm_password').setDescription('Confirm password').setMinLength(8).setRequired(true))
    .addStringOption(o => o.setName('first').setDescription('First name (optional)'))
    .addStringOption(o => o.setName('last').setDescription('Last name (optional)'))
    .toJSON(),
];

async function main() {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;
  const guildId = process.env.DISCORD_GUILD_ID;

  if (!token || !clientId) throw new Error('Missing DISCORD_TOKEN or DISCORD_CLIENT_ID');

  const rest = new REST({ version: '10' }).setToken(token);

  if (guildId) {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
    console.log('✅ Registered guild commands');
  } else {
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log('✅ Registered global commands');
  }
}

main().catch(err => {
  console.error('❌ Failed to register commands:', err);
  process.exit(1);
});
