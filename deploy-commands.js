const { REST, Routes, SlashCommandBuilder } = require('discord.js');
const { token, clientId } = require('./config.js');

const commands = [
    new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play a song from a URL or search query')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('The song URL or search query (YouTube, Spotify, etc.)')
                .setRequired(true)
        )
        .toJSON(),  // Convert to JSON format
];

// REST API instance to register commands
const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationCommands(clientId), // For global commands
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();
