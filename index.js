const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionsBitField
} = require('discord.js');
const fs = require('fs');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const TOKEN = process.env.TOKEN;

// Charger config
let config = {};
if (fs.existsSync('./config.json')) {
  config = JSON.parse(fs.readFileSync('./config.json'));
}

// Ready
client.once('ready', async () => {
  console.log(`Connecté en tant que ${client.user.tag}`);

  const commands = [
    new SlashCommandBuilder()
      .setName('confess')
      .setDescription('Envoyer une confession anonyme')
      .addStringOption(o =>
        o.setName('message')
          .setDescription('Ta confession')
          .setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName('confess-setup')
      .setDescription('Configurer les salons de confession')
      .addChannelOption(o =>
        o.setName('confession')
          .setDescription('Salon des confessions')
          .setRequired(true)
      )
      .addChannelOption(o =>
        o.setName('logs')
          .setDescription('Salon des logs staff')
          .setRequired(true)
      )
  ];

  await client.application.commands.set(commands);
});

// Interaction
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  // SETUP
  if (interaction.commandName === 'confess-setup') {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: '❌ Admin uniquement', ephemeral: true });
    }

    const confession = interaction.options.getChannel('confession');
    const logs = interaction.options.getChannel('logs');

    config[interaction.guild.id] = {
      confession: confession.id,
      logs: logs.id
    };

    fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));

    return interaction.reply({
      content: '✅ Configuration enregistrée pour ce serveur',
      ephemeral: true
    });
  }

  // CONFESS
  if (interaction.commandName === 'confess') {
    const serverConfig = config[interaction.guild.id];
    if (!serverConfig) {
      return interaction.reply({
        content: '⚠️ Le bot n’est pas configuré. Utilise `/confess-setup`.',
        ephemeral: true
      });
    }

    const message = interaction.options.getString('message');

    const confessEmbed = new EmbedBuilder()
      .setTitle('💭 Confession Anonyme')
      .setDescription(message)
      .setColor(0x5865F2)
      .setTimestamp();

    const logEmbed = new EmbedBuilder()
      .setTitle('📜 Log Confession')
      .addFields(
        { name: 'Auteur', value: `${interaction.user.tag} (${interaction.user.id})` },
        { name: 'Message', value: message }
      )
      .setColor(0xED4245)
      .setTimestamp();

    await interaction.client.channels.fetch(serverConfig.confession)
      .then(c => c.send({ embeds: [confessEmbed] }));

    await interaction.client.channels.fetch(serverConfig.logs)
      .then(c => c.send({ embeds: [logEmbed] }));

    await interaction.reply({ content: '✅ Confession envoyée anonymement', ephemeral: true });
  }
});

client.login(TOKEN);
