require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  Collection,
  REST,
  Routes
} = require("discord.js");

const fs = require("fs");
const path = require("path");

const {
  createMusicPlayer,
  clearTimers
} = require("./music/player");

const autoMod = require("./automod/autoMod");
const antiNuke = require("./antinuke/antiNuke");

const autoResponder = require("./events/autoresponder");

const ticketSetup = require("./events/ticketSetup");
const ticketSetupSelectors = require("./events/ticketSetupSelectors");
const ticketSetupFinish = require("./events/ticketSetupFinish");

// =====================================
// ENV CHECK
// =====================================

if (!process.env.DISCORD_TOKEN) {
  throw new Error("DISCORD_TOKEN missing from .env");
}

if (!process.env.CLIENT_ID) {
  throw new Error("CLIENT_ID missing from .env");
}

if (!process.env.GUILD_ID) {
  throw new Error("GUILD_ID missing from .env");
}

// =====================================
// CLIENT
// =====================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ]
});

client.commands = new Collection();

client.musicPlayer = createMusicPlayer(client);

// =====================================
// COMMAND LOADER
// =====================================

const commandsPath = path.join(__dirname, "commands");

const commandFiles = fs
  .readdirSync(commandsPath)
  .filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
  try {
    const commandPath = path.join(commandsPath, file);

    delete require.cache[require.resolve(commandPath)];

    const command = require(commandPath);

    if (
      !command.data ||
      typeof command.execute !== "function"
    ) {
      console.log(`⚠️ Skipped invalid command: ${file}`);
      continue;
    }

    const name = command.data.name;

    if (client.commands.has(name)) {
      console.log(
        `⚠️ Duplicate command skipped: /${name} (${file})`
      );
      continue;
    }

    client.commands.set(name, command);

    console.log(`📦 Loaded /${name}`);
  } catch (error) {
    console.error(
      `❌ Failed loading ${file}:`,
      error
    );
  }
}

// =====================================
// ROLE PING
// =====================================

try {
  const rolePing = require("./events/rolePing");

  client.on("messageCreate", async message => {
    try {
      await rolePing.execute(message);
    } catch (error) {
      console.error(
        "❌ Role Ping Error:",
        error
      );
    }
  });
} catch (error) {
  console.error(
    "❌ Role Ping failed:",
    error
  );
}

// =====================================
// AUTOMOD
// =====================================

client.on("messageCreate", async message => {
  try {
    await autoMod.handle(message);
  } catch (error) {
    console.error(
      "❌ AutoMod Error:",
      error
    );
  }
});

// =====================================
// AFK + AUTORESPONDER
// =====================================

client.on("messageCreate", async message => {
  try {
    if (!message.guild || message.author.bot) return;

    // ================================
    // AFK
    // ================================
    const afkPath = path.join(
      __dirname,
      "utils/afk.json"
    );

    let afkData = {};
    try {
      afkData = JSON.parse(
        fs.readFileSync(afkPath, "utf8")
      );
    } catch {}

    // Remove YOUR AFK when you send any message
    if (afkData[message.author.id]) {
      delete afkData[message.author.id];

      fs.writeFileSync(
        afkPath,
        JSON.stringify(afkData, null, 2)
      );

      await message.reply(
        "👋 Welcome back! Your AFK status has been removed."
      );
    }

    // Tell users when they mention someone who is AFK
    for (const user of message.mentions.users.values()) {
      const afk = afkData[user.id];

      if (!afk) continue;

      const since = afk.since
        ? `<t:${Math.floor(afk.since / 1000)}:R>`
        : "a while ago";

      await message.reply(
        `💤 **${user.tag}** is currently AFK.\n` +
        `📝 Reason: **${afk.reason || "No reason provided"}**\n` +
        `⏰ Since: ${since}`
      );
    }

    // ================================
    // AUTORESPONDER
    // ================================
    await autoResponder.handle(message);

  } catch (error) {
    console.error(
      "❌ AFK/Autoresponder Error:",
      error
    );
  }
});

// =====================================
// ANTINUKE
// =====================================

client.on(
  "guildAuditLogEntryCreate",
  async entry => {
    try {
      if (
        antiNuke &&
        typeof antiNuke.handleAuditLog ===
          "function"
      ) {
        await antiNuke.handleAuditLog(entry);
      }
    } catch (error) {
      console.error(
        "❌ AntiNuke Error:",
        error
      );
    }
  }
);

// =====================================
// READY
// =====================================

client.once("ready", async () => {
  console.log(
    `🤖 Logged in as ${client.user.tag}`
  );

  try {
    const rest = new REST({
      version: "10"
    }).setToken(
      process.env.DISCORD_TOKEN
    );

    const commands = [
      ...client.commands.values()
    ].map(command =>
      command.data.toJSON()
    );

    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      {
        body: commands
      }
    );

    console.log(
      `✅ Registered ${commands.length} GUILD commands.`
    );

    console.log(
      `🏠 Guild: ${process.env.GUILD_ID}`
    );

    console.log(
      "🟢 VIOLATE MANAGER online."
    );
  } catch (error) {
    console.error(
      "❌ Command registration failed:",
      error
    );
  }
});

// =====================================
// INTERACTIONS
// =====================================

client.on(
  "interactionCreate",
  async interaction => {
    try {

      // =================================
      // SLASH COMMANDS
      // =================================

      if (interaction.isChatInputCommand()) {
        const command =
          client.commands.get(
            interaction.commandName
          );

        if (!command) return;

        await command.execute(interaction);
        return;
      }

      // =================================
      // NEW TICKET SETUP
      // =================================

      if (interaction.isButton()) {
        const handled =
          await ticketSetup.handle(
            interaction
          );

        if (handled) return;
      }

      // =================================
      // TICKET CATEGORY SELECTORS
      // =================================

      if (
        interaction.isChannelSelectMenu() ||
        interaction.isRoleSelectMenu()
      ) {
        const handled =
          await ticketSetupSelectors.handleSelector(
            interaction
          );

        if (handled) return;
      }

      // =================================
      // OTHER INTERACTIONS
      // =================================

      if (
        interaction.isButton() ||
        interaction.isModalSubmit() ||
        interaction.isStringSelectMenu()
      ) {
        console.log(
          `ℹ️ Unhandled interaction: ${interaction.customId || "unknown"}`
        );
      }

    } catch (error) {
      console.error(
        "❌ Interaction Error:",
        error
      );

      try {
        const response = {
          content:
            `❌ ${
              error.message ||
              "Something went wrong."
            }`,
          ephemeral: true
        };

        if (
          interaction.replied ||
          interaction.deferred
        ) {
          await interaction.editReply(
            response
          );
        } else {
          await interaction.reply(
            response
          );
        }
      } catch {}
    }
  }
);

// =====================================
// LOGIN
// =====================================

client.login(
  process.env.DISCORD_TOKEN
)
.then(() => {
  console.log(
    "🔐 Discord login successful."
  );
})
.catch(error => {
  console.error(
    "❌ Login failed:",
    error.message
  );
});
