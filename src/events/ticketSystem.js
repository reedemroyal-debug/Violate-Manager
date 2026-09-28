const {
  MessageFlags
} = require("discord.js");

const {
  createTicket,
  closeTicket
} = require("../tickets/manager");

async function handleInteraction(interaction) {
  try {
    if (!interaction.isButton()) {
      return false;
    }

    if (interaction.customId === "ticket_close") {
      await closeTicket(interaction);
      return true;
    }

    if (
      interaction.customId.startsWith(
        "ticket_create_"
      )
    ) {
      const categoryId =
        interaction.customId.replace(
          "ticket_create_",
          ""
        );

      await createTicket(
        interaction,
        categoryId
      );

      return true;
    }

    return false;
  } catch (error) {
    console.error(
      "❌ Ticket interaction error:",
      error
    );

    if (
      !interaction.replied &&
      !interaction.deferred
    ) {
      await interaction.reply({
        content:
          "❌ Ticket interaction failed.",
        flags: MessageFlags.Ephemeral
      }).catch(() => {});
    }

    return true;
  }
}

function init(client) {
  return client;
}

module.exports = {
  init,
  handleInteraction
};
