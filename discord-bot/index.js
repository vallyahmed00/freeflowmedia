require('dotenv').config();
const { Client, GatewayIntentBits, Events } = require('discord.js');
const { runSalesAgent }     = require('./agents/salesAgent');
const { runMarketingAgent } = require('./agents/marketingAgent');
const { runFinanceAgent }   = require('./agents/financeAgent');
const { runLeadsAgent }     = require('./agents/leadsAgent');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, () => {
  console.log(`✅ Drift Studio Bot online as ${client.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  await interaction.deferReply();

  const { commandName } = interaction;
  let reply = '';

  try {
    if (commandName === 'sales') {
      const brief = interaction.options.getString('brief');
      const type  = interaction.options.getString('type') || 'pitch';
      reply = await runSalesAgent(brief, type);
    }
    else if (commandName === 'marketing') {
      const brief = interaction.options.getString('brief');
      const type  = interaction.options.getString('type') || 'ideas';
      reply = await runMarketingAgent(brief, type);
    }
    else if (commandName === 'finance') {
      const query = interaction.options.getString('query') || 'summary';
      reply = await runFinanceAgent(query);
    }
    else if (commandName === 'leads') {
      const status = interaction.options.getString('status') || 'all';
      reply = await runLeadsAgent(status);
    }

    // Discord max 2000 chars
    if (reply.length > 1950) {
      await interaction.editReply(reply.slice(0, 1950) + '\n_…truncated_');
    } else {
      await interaction.editReply(reply || 'No response generated.');
    }
  } catch (err) {
    console.error(`/${commandName} error:`, err?.message ?? err);
    const userMsg = err?.message?.includes('timed out')
      ? 'Request timed out — Gemini is slow right now, try again.'
      : `Error: ${err?.message ?? 'Unknown error'}`;
    await interaction.editReply(userMsg);
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
