const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const { JsonDB, Config } = require("node-json-db");
require("dotenv").config();

// Initialize the database
const db = new JsonDB(new Config("voiceLogDB", true, false, "/"));

// Create a new Discord client instance with necessary intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// When the bot is ready
client.once("ready", () => {
    console.log(`Logged in as ${client.user.tag}`);
});

// Handle message commands to set up the voice log channel
client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // Command to set the voice log channel
    if (command === "setvclog") {
        const logChannel = message.mentions.channels.first();
        if (!logChannel) {
            return message.reply("Please mention a valid channel.");
        }

        try {
            // Save the log channel in JsonDB
            await db.push(
                `/voiceLogChannel/${message.guild.id}`,
                logChannel.id,
            );
            return message.reply(`Voice log channel set to ${logChannel}`);
        } catch (err) {
            console.error("Error saving channel:", err);
            return message.reply(
                "There was an error saving the channel settings.",
            );
        }
    }

    // Command to remove the voice log channel
    if (command === "rmvclog") {
        try {
            await db.delete(`/voiceLogChannel/${message.guild.id}`);
            return message.reply("Voice log channel removed.");
        } catch (err) {
            if (err.name === "DataError") {
                return message.reply("No voice log channel was set.");
            }
            console.error("Error removing channel:", err);
            return message.reply(
                "There was an error removing the channel settings.",
            );
        }
    }

    // Command to check the current voice log channel
    if (command === "getvclog") {
        try {
            const logChannelId = await db.getData(
                `/voiceLogChannel/${message.guild.id}`,
            );
            const logChannel = message.guild.channels.cache.get(logChannelId);
            if (!logChannel) {
                return message.reply("The saved channel no longer exists.");
            }
            return message.reply(`Current voice log channel is: ${logChannel}`);
        } catch (err) {
            if (err.name === "DataError") {
                return message.reply("No voice log channel is set.");
            }
            console.error("Error getting channel:", err);
            return message.reply(
                "There was an error retrieving the channel settings.",
            );
        }
    }
});

// Handle voice state updates
client.on("voiceStateUpdate", async (oldState, newState) => {
    try {
        const guildId = oldState.guild.id;
        let logChannelId;

        try {
            logChannelId = await db.getData(`/voiceLogChannel/${guildId}`);
        } catch (err) {
            if (err.name === "DataError") return; // No log channel set
            console.error("Error reading log channel:", err);
            return;
        }

        const logChannel = oldState.guild.channels.cache.get(logChannelId);
        if (!logChannel) return;

        const embed = new EmbedBuilder().setColor(0x0099ff).setTimestamp();

        // Check if the user joined a voice channel
        if (!oldState.channel && newState.channel) {
            embed
                .setAuthor({
                    name: newState.member.user.tag,
                    iconURL: newState.member.user.displayAvatarURL(),
                })
                .setDescription(
                    `**<@${newState.id}> joined voice channel:** \`${newState.channel.name}\``,
                )
                .addFields(
                    { name: "User ID", value: newState.id, inline: true },
                    {
                        name: "Timestamp",
                        value: `<t:${Math.floor(Date.now() / 1000)}:R>`,
                        inline: true,
                    },
                );
        }

        // Check if the user left a voice channel
        else if (oldState.channel && !newState.channel) {
            embed
                .setAuthor({
                    name: oldState.member.user.tag,
                    iconURL: oldState.member.user.displayAvatarURL(),
                })
                .setDescription(
                    `**<@${oldState.id}> left voice channel:** \`${oldState.channel.name}\``,
                )
                .addFields(
                    { name: "User ID", value: oldState.id, inline: true },
                    {
                        name: "Timestamp",
                        value: `<t:${Math.floor(Date.now() / 1000)}:R>`,
                        inline: true,
                    },
                );
        }

        // Check if the user moved to a different voice channel
        else if (
            oldState.channel &&
            newState.channel &&
            oldState.channel.id !== newState.channel.id
        ) {
            embed
                .setAuthor({
                    name: newState.member.user.tag,
                    iconURL: newState.member.user.displayAvatarURL(),
                })
                .setDescription(
                    `**<@${newState.id}> moved from voice channel:** \`${oldState.channel.name}\` **to** \`${newState.channel.name}\``,
                )
                .addFields(
                    { name: "User ID", value: newState.id, inline: true },
                    {
                        name: "Timestamp",
                        value: `<t:${Math.floor(Date.now() / 1000)}:R>`,
                        inline: true,
                    },
                );
        }

        // Send the embed to the log channel
        await logChannel.send({ embeds: [embed] }).catch(console.error);
    } catch (error) {
        console.error("Error in voice state update:", error);
    }
});

// Error handling
process.on("unhandledRejection", (error) => {
    console.error("Unhandled promise rejection:", error);
});

// Login to Discord
client
    .login(process.env.DISCORD_BOT_TOKEN)
    .catch((err) => console.error("Failed to login:", err));
