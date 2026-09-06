const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
} = require("discord.js");

const data = new SlashCommandBuilder()
    .setName("giveaway")
    .setDescription("Giveaway system")
    .addSubcommand(sub =>
        sub
            .setName("create")
            .setDescription("Create a giveaway")
            .addIntegerOption(option =>
                option
                    .setName("minutes")
                    .setDescription("Giveaway duration in minutes")
                    .setRequired(true)
                    .setMinValue(1)
            )
            .addStringOption(option =>
                option
                    .setName("prize")
                    .setDescription("Giveaway prize")
                    .setRequired(true)
            )
            .addIntegerOption(option =>
                option
                    .setName("winners")
                    .setDescription("Number of winners")
                    .setRequired(false)
                    .setMinValue(1)
                    .setMaxValue(20)
            )
    );

async function execute(interaction) {

    if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({
            content: "❌ You need **Manage Server** permission.",
            ephemeral: true
        });
    }

    const minutes = interaction.options.getInteger("minutes");
    const prize = interaction.options.getString("prize");
    const winnerCount =
        interaction.options.getInteger("winners") || 1;

    const endTime = Date.now() + minutes * 60 * 1000;
    const endUnix = Math.floor(endTime / 1000);

    const embed = new EmbedBuilder()
        .setTitle("🎉 GIVEAWAY")
        .setDescription(
            `🎁 **Prize:** ${prize}\n` +
            `🏆 **Winners:** ${winnerCount}\n` +
            `⏰ **Ends:** <t:${endUnix}:R>\n\n` +
            `React with 🎉 to enter!`
        )
        .setFooter({
            text: "VIOLATE MANAGER • Giveaway"
        })
        .setTimestamp();

    const message = await interaction.reply({
        embeds: [embed],
        fetchReply: true
    });

    await message.react("🎉");

    setTimeout(async () => {

        try {

            const giveawayMessage =
                await interaction.channel.messages.fetch(message.id);

            const reaction =
                giveawayMessage.reactions.cache.get("🎉");

            if (!reaction) {
                return interaction.channel.send(
                    "🎉 Giveaway ended — nobody entered."
                );
            }

            const users =
                await reaction.users.fetch();

            const entries = [
                ...users.values()
            ].filter(user => !user.bot);

            if (entries.length === 0) {
                return interaction.channel.send(
                    "🎉 Giveaway ended — nobody entered."
                );
            }

            // Shuffle entries randomly
            const shuffled = [...entries];

            for (let i = shuffled.length - 1; i > 0; i--) {

                const random =
                    Math.floor(Math.random() * (i + 1));

                [
                    shuffled[i],
                    shuffled[random]
                ] = [
                    shuffled[random],
                    shuffled[i]
                ];
            }

            // Pick unique winners
            const winners =
                shuffled.slice(
                    0,
                    Math.min(winnerCount, shuffled.length)
                );

            const winnerMentions =
                winners
                    .map(user => `${user}`)
                    .join(", ");

            if (winners.length === 1) {

                return interaction.channel.send(
                    `🎉 **GIVEAWAY WINNER!**\n\n` +
                    `Congratulations ${winnerMentions}!\n` +
                    `You won **${prize}**! 🏆`
                );
            }

            return interaction.channel.send(
                `🎉 **GIVEAWAY ENDED!**\n\n` +
                `🏆 **Winners:** ${winnerMentions}\n\n` +
                `🎁 Prize: **${prize}**`
            );

        } catch (error) {

            console.error(
                "❌ Giveaway ending error:",
                error
            );

        }

    }, minutes * 60 * 1000);
}

module.exports = {
    data,
    execute
};
