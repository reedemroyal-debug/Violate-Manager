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
  createMusicPlayer
} = require("./music/player");

// ===============================
// ENV CHECK
// ===============================

for (const key of [
  "DISCORD_TOKEN",
  "CLIENT_ID"
]) {
  if (!process.env[key]) {
    throw new Error(`${key} missing from .env`);
  }
}

// ===============================
// CLIENT
// ===============================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ]
});

// ===============================
// COMMAND COLLECTION
// ===============================

client.commands = new Collection();

// ===============================
// MUSIC PLAYER
// ===============================

const musicPlayer = createMusicPlayer(client);

client.musicPlayer = musicPlayer;

// ===============================
// LOAD COMMANDS
// ===============================

const commandsPath = path.join(
  __dirname,
  "commands"
);

const commandFiles = fs
  .readdirSync(commandsPath)
  .filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
  try {
    const commandPath = path.join(
      commandsPath,
      file
    );

    const command = require(commandPath);

    if (!command.data || !command.execute) {
      console.log(
        `⚠️ Skipped invalid command: ${file}`
      );
      continue;
    }

    client.commands.set(
      command.data.name,
      command
    );

    console.log(
      `📦 Loaded /${command.data.name}`
    );

  } catch (error) {
    console.error(
      `❌ Failed loading ${file}:`,
      error
    );
  }
}

// ===============================
// ROLE PING SYSTEM
// ===============================

const rolePing = require(
  "./events/rolePing"
);

client.on(
  "messageCreate",
  async message => {
    try {
      await rolePing.execute(message);
    } catch (error) {
      console.error(
        "❌ Role Ping Error:",
        error
      );
    }
  }
);

// ===============================
// READY
// ===============================

client.once(
  "ready",
  async () => {
    console.log(
      `🤖 Logged in as ${client.user.tag}`
    );

    try {
      const rest = new REST({
        version: "10"
      }).setToken(
        process.env.DISCORD_TOKEN
      );

      const commandData = [
        ...client.commands.values()
      ].map(command =>
        command.data.toJSON()
      );

      await rest.put(
        Routes.applicationCommands(
          process.env.CLIENT_ID
        ),
        {
          body: commandData
        }
      );

      console.log(
        `✅ Registered ${commandData.length} GLOBAL commands.`
      );

      console.log(
        "🌍 Commands available in all servers."
      );

      console.log(
        "🟢 VIOLATE MANAGER online."
      );

    } catch (error) {
      console.error(
        "❌ Registration failed:",
        error
      );
    }
  }
);

// ===============================
// INTERACTIONS
// ===============================

client.on(
  "interactionCreate",
  async interaction => {

    try {

      // =============================
      // SLASH COMMANDS
      // =============================

      if (interaction.isChatInputCommand()) {

        const command =
          client.commands.get(
            interaction.commandName
          );

        if (!command) return;

        await command.execute(
          interaction
        );

        return;
      }

      // =============================
      // MUSIC PANEL BUTTONS
      // =============================

      if (interaction.isButton()) {

        const musicButtons = [
          "music_pause",
          "music_skip",
          "music_stop",
          "music_loop",
          "music_queue",
          "music_shuffle"
        ];

        if (
          musicButtons.includes(
            interaction.customId
          )
        ) {

          const player =
            interaction.client.musicPlayer;

          if (!player) {
            return interaction.reply({
              content:
                "❌ Music player initialize nahi hua.",
              ephemeral: true
            });
          }

          const queue =
            player.nodes.get(
              interaction.guildId
            );

          if (!queue) {
            return interaction.reply({
              content:
                "❌ Abhi koi music queue nahi chal rahi.",
              ephemeral: true
            });
          }

          // =========================
          // PAUSE / RESUME
          // =========================

          if (
            interaction.customId ===
            "music_pause"
          ) {

            if (queue.node.isPaused()) {

              queue.node.resume();

              return interaction.reply({
                content:
                  "▶️ Music resumed.",
                ephemeral: true
              });
            }

            queue.node.pause();

            return interaction.reply({
              content:
                "⏸️ Music paused.",
              ephemeral: true
            });
          }

          // =========================
          // SKIP
          // =========================

          if (
            interaction.customId ===
            "music_skip"
          ) {

            await queue.node.skip();

            return interaction.reply({
              content:
                "⏭️ Song skipped.",
              ephemeral: true
            });
          }

          // =========================
          // STOP
          // =========================

          if (
            interaction.customId ===
            "music_stop"
          ) {

            queue.delete();

            return interaction.reply({
              content:
                "⏹️ Music stopped.",
              ephemeral: true
            });
          }

          // =========================
          // LOOP
          // =========================

          if (
            interaction.customId ===
            "music_loop"
          ) {

            const mode =
              queue.repeatMode;

            if (mode === 0) {

              queue.setRepeatMode(1);

              return interaction.reply({
                content:
                  "🔂 Loop: **Current Song**",
                ephemeral: true
              });
            }

            if (mode === 1) {

              queue.setRepeatMode(2);

              return interaction.reply({
                content:
                  "🔁 Loop: **Queue**",
                ephemeral: true
              });
            }

            queue.setRepeatMode(0);

            return interaction.reply({
              content:
                "➡️ Loop disabled.",
              ephemeral: true
            });
          }

          // =========================
          // QUEUE
          // =========================

          if (
            interaction.customId ===
            "music_queue"
          ) {

            const tracks =
              queue.tracks.toArray();

            if (!tracks.length) {
              return interaction.reply({
                content:
                  "📭 Queue empty hai.",
                ephemeral: true
              });
            }

            const list =
              tracks
                .slice(0, 10)
                .map(
                  (track, index) =>
                    `**${index + 1}.** ${track.title}`
                )
                .join("\n");

            return interaction.reply({
              content:
                `📜 **Music Queue**\n\n${list}`,
              ephemeral: true
            });
          }

          // =========================
          // SHUFFLE
          // =========================

          if (
            interaction.customId ===
            "music_shuffle"
          ) {

            if (queue.tracks.size < 2) {
              return interaction.reply({
                content:
                  "❌ Shuffle ke liye queue mein 2+ songs chahiye.",
                ephemeral: true
              });
            }

            queue.tracks.shuffle();

            return interaction.reply({
              content:
                "🔀 Queue shuffled.",
              ephemeral: true
            });
          }

          return;
        }
      }

      // =============================
      // TICKET BUTTONS / MENUS
      // =============================

      if (
        interaction.isButton() ||
        interaction.isStringSelectMenu()
      ) {

        const tickets =
          require(
            "./events/tickets"
          );

        await tickets.handle(
          interaction
        );

        return;
      }

    } catch (error) {

      console.error(
        "❌ Interaction error:",
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

// ===============================
// LOGIN
// ===============================

client
  .login(
    process.env.DISCORD_TOKEN
  )
  .catch(error => {

    console.error(
      "❌ Login failed:",
      error.message
    );

  });
