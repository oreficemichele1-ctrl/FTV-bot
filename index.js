const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

// Dati temporanei in memoria (per un progetto serio si usa un database come MongoDB o SQLite)
const candidatureDB = [];
const matchDB = [];
const classificaDB = {}; // Esempio: { "Napoli": { pt: 0, gf: 0, gs: 0 }, "Juve": ... }

client.once('ready', async () => {
    console.log(`FTV bot online come ${client.user.tag}!`);

    // Registrazione dei comandi Slash
    const commands = [
        new SlashCommandBuilder()
            .setName('candidatura')
            .setDescription('Invia la tua candidatura')
            .addStringOption(option =>
                option.setName('ruolo')
                    .setDescription('Vuoi candidarti come Free Agent o Manager?')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Free Agent', value: 'free_agent' },
                        { name: 'Manager', value: 'manager' }
                    ))
            .addStringOption(option =>
                option.setName('squadra')
                    .setDescription('Squadra scelta (o preferita)')
                    .setRequired(true))
            .addStringOption(option =>
                option.setName('rank')
                    .setDescription('Il tuo rank (es. Master, Diamante)')
                    .setRequired(false))
            .addStringOption(option =>
                option.setName('position')
                    .setDescription('La tua posizione in campo (es. ATT, CC, DIF)')
                    .setRequired(false)),

        new SlashCommandBuilder()
            .setName('match')
            .setDescription('[Solo Owner] Inserisci il risultato di una partita')
            .addStringOption(option => option.setName('partita').setDescription('Es. Napoli-Juve').setRequired(true))
            .addStringOption(option => option.setName('risultato').setDescription('Es. 2-1').setRequired(true))
            .addStringOption(option => option.setName('marcatori').setDescription('Es. Osimhen, Kvaratskhelia').setRequired(true))
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

        new SlashCommandBuilder()
            .setName('classifica')
            .setDescription('Visualizza la classifica attuale del torneo')
    ].map(command => command.toJSON());

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands },
        );
        console.log('Comandi slash registrati con successo!');
    } catch (error) {
        console.error(error);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    // COMANDO /CANDIDATURA
    if (commandName === 'candidatura') {
        const ruolo = interaction.options.getString('ruolo');
        const squadra = interaction.options.getString('squadra');
        const rank = interaction.options.getString('rank') || 'Non specificato';
        const position = interaction.options.getString('position') || 'Non specificata';

        candidaturaDB.push({
            user: interaction.user.tag,
            ruolo,
            squadra,
            rank,
            position
        });

        const embed = new EmbedBuilder()
            .setTitle('📋 Nuova Candidatura FTV')
            .setColor(0x00AE86)
            .addFields(
                { name: 'Utente', value: interaction.user.toString(), inline: true },
                { name: 'Ruolo', value: ruolo === 'free_agent' ? 'Free Agent' : 'Manager', inline: true },
                { name: 'Squadra', value: squadra, inline: true },
                { name: 'Rank', value: rank, inline: true },
                { name: 'Posizione', value: position, inline: true }
            )
            .setTimestamp();

        await interaction.reply({ content: 'Candidatura inviata con successo!', ephemeral: true });
        
        // Se hai un canale log specifico puoi inviarla lì, per ora la mandiamo nel canale corrente o la salviamo
        await interaction.channel.send({ embeds: [embed] });
    }

    // COMANDO /MATCH
    else if (commandName === 'match') {
        const partita = interaction.options.getString('partita');
        const risultato = interaction.options.getString('risultato');
        const marcatori = interaction.options.getString('marcatori');

        matchDB.push({ partita, risultato, marcatori });

        const embed = new EmbedBuilder()
            .setTitle('⚽ Risultato Match FTV')
            .setColor(0xFF4500)
            .addFields(
                { name: 'Partita', value: partita, inline: false },
                { name: 'Risultato', value: `\`${risultato}\``, inline: true },
                { name: 'Marcatori', value: marcatori, inline: false }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }

    // COMANDO /CLASSIFICA
    else if (commandName === 'classifica') {
        const embed = new EmbedBuilder()
            .setTitle('🏆 Classifica FTV')
            .setColor(0xFFD700)
            .setDescription('Ecco gli ultimi risultati registrati:')
            .setTimestamp();

        if (matchDB.length === 0) {
            embed.addFields({ name: 'Stato', value: 'Nessuna partita registrata al momento.' });
        } else {
            let matchText = '';
            matchDB.forEach((m, index) => {
                matchText += `**${index + 1}.** ${m.partita} ➔ **${m.risultato}**\n`;
            });
            embed.addFields({ name: 'Partite Giocate', value: matchText });
        }

        await interaction.reply({ embeds: [embed] });
    }
});

client.login(process.env.DISCORD_TOKEN);
