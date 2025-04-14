const { Client, GatewayIntentBits, SlashCommandBuilder } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
require('dotenv').config();

// const DISCORD_BOT_TOKEN = "4d832a9367a2601f2d16c858081dcc1cd2afa0c9eedcd8461d2f794fe0b37ec5"
// const CLIENT_ID = "1352367431598739610"

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
let votes = {}; // Store votes in-memory

const commands = [
    new SlashCommandBuilder()
        .setName('start_vote')
        .setDescription('Starts a ranked-choice vote')
        .addIntegerOption(option =>
            option.setName('duration')
                .setDescription('Duration in seconds')
                .setRequired(true)
        ),
    new SlashCommandBuilder()
        .setName('vote')
        .setDescription('Submit your ranked vote')
        .addStringOption(option =>
            option.setName('first')
                .setDescription('Your first choice')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('second')
                .setDescription('Your second choice')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('third')
                .setDescription('Your third choice')
                .setRequired(true)
        )
];

const rest = new REST({ version: '10' }).setToken(TOKEN);
(async () => {
    try {
        console.log('Registering commands...');
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands.map(cmd => cmd.toJSON()) });
        console.log('Commands registered!');
    } catch (error) {
        console.error(error);
    }
})();

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;
    const { commandName } = interaction;

    if (commandName === 'start_vote') {
        votes = {}; // Reset votes
        const duration = interaction.options.getInteger('duration');
        await interaction.reply(`Voting started! You have ${duration} seconds to vote.`);
        setTimeout(() => countVotes(interaction), duration * 1000);
    } else if (commandName === 'vote') {
        const userId = interaction.user.id;
        if (votes[userId]) {
            await interaction.reply({ content: 'You have already voted!', ephemeral: true });
            return;
        }

        votes[userId] = [
            interaction.options.getString('first'),
            interaction.options.getString('second'),
            interaction.options.getString('third')
        ];
        await interaction.reply({ content: 'Vote recorded!', ephemeral: true });
    }
});

function countVotes(interaction) {
    const results = irvCount(Object.values(votes));
    const winner = results.length ? results[0] : 'No winner';
    interaction.followUp(`Voting ended! The winner is: **${winner}**`);
}

function irvCount(ballots) {
    let candidates = new Set(["Option 1", "Option 2", "Option 3", "Option 4"]);
    while (candidates.size > 1) {
        let tally = {};
        for (let ballot of ballots) {
            for (let choice of ballot) {
                if (candidates.has(choice)) {
                    tally[choice] = (tally[choice] || 0) + 1;
                    break;
                }
            }
        }
        let minVotes = Math.min(...Object.values(tally));
        let eliminated = Object.keys(tally).filter(c => tally[c] === minVotes);
        if (eliminated.length === candidates.size) return Array.from(candidates);
        eliminated.forEach(c => candidates.delete(c));
    }
    return Array.from(candidates);
}

client.login(TOKEN);
