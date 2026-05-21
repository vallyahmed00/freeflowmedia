require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
  new SlashCommandBuilder()
    .setName('sales')
    .setDescription('Generate a sales pitch, outreach email, or follow-up')
    .addStringOption(o => o.setName('brief').setDescription('Business/lead description').setRequired(true))
    .addStringOption(o => o.setName('type').setDescription('pitch / email / followup').setRequired(false)),

  new SlashCommandBuilder()
    .setName('marketing')
    .setDescription('Generate marketing content, post ideas, or a strategy')
    .addStringOption(o => o.setName('brief').setDescription('Topic, campaign, or business brief').setRequired(true))
    .addStringOption(o => o.setName('type').setDescription('post / reel / ideas / strategy').setRequired(false)),

  new SlashCommandBuilder()
    .setName('finance')
    .setDescription('Get a financial summary, unpaid invoices, or expense report')
    .addStringOption(o => o.setName('query').setDescription('summary / invoices / expenses').setRequired(false)),

  new SlashCommandBuilder()
    .setName('leads')
    .setDescription('Quick view of the lead pipeline')
    .addStringOption(o => o.setName('status').setDescription('all / new / contacted / interested / converted').setRequired(false)),
].map(c => c.toJSON());

const rest = new REST().setToken(process.env.DISCORD_BOT_TOKEN);

(async () => {
  console.log('Registering slash commands...');
  await rest.put(
    Routes.applicationGuildCommands(
      process.env.DISCORD_APPLICATION_ID,
      process.env.DISCORD_GUILD_ID
    ),
    { body: commands }
  );
  console.log('Done — commands registered to your server.');
})().catch(console.error);
