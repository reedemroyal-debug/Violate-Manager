require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  Collection,
  REST,
  Routes,
  ActionRowBuilder,
  ButtonBuilder
} = require("discord.js");

const fs = require("fs");
const path = require("path");

const {
  createMusicPlayer,
  clearTimers
} = require("./music/player");

const autoMod =
  require("./automod/autoMod");

const autoModCommand =
  require("./commands/automod");

const antiNuke =
  require("./antinuke/antiNuke");

// =====================================
// ENV CHECK
// =====================================

if (!process.env.DISCORD_TOKEN) {
  throw new Error(
    "DISCORD_TOKEN missing from .env"
  );
}

if (!process.env.CLIENT_ID) {
  throw new Error(
    "CLIENT_ID missing from .env"
  );
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

client.commands =
  new Collection();

client.musicPlayer =
  createMusicPlayer(client);

// =====================================
// COMMAND LOADER
// =====================================

const commandsPath =
  path.join(
    __dirname,
    "commands"
  );

const commandFiles =
  fs.readdirSync(commandsPath)
    .filter(
      file =>
        file.endsWith(".js")
    );

for (
  const file of commandFiles
) {
  try {
    const commandPath =
      path.join(
        commandsPath,
        file
      );

    delete require.cache[
      require.resolve(
        commandPath
      )
    ];

    const command =
      require(commandPath);

    if (
      !command.data ||
      typeof command.execute !==
        "function"
    ) {
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

// =====================================
// ROLE PING
// =====================================

try {
  const rolePing =
    require("./events/rolePing");

  client.on(
    "messageCreate",
    async message => {
      try {
        await rolePing.execute(
          message
        );
      } catch (error) {
        console.error(
          "❌ Role Ping Error:",
          error
        );
      }
    }
  );

} catch (error) {
  console.error(
    "❌ Role Ping failed:",
    error
  );
}

// =====================================
// AUTOMOD
// =====================================

client.on(
  "messageCreate",
  async message => {
    try {
      await autoMod.handle(
        message
      );
    } catch (error) {
      console.error(
        "❌ AutoMod Error:",
        error
      );
    }
  }
);

// =====================================
// ANTINUKE
// =====================================

client.on(
  "guildAuditLogEntryCreate",
  async entry => {
    try {
      await antiNuke.handleAuditLog(
        entry
      );
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

client.once(
  "ready",
  async () => {

    console.log(
      `🤖 Logged in as ${client.user.tag}`
    );

    try {
      const rest =
        new REST({
          version: "10"
        }).setToken(
          process.env.DISCORD_TOKEN
        );

      const commands =
        [
          ...client.commands.values()
        ].map(
          command =>
            command.data.toJSON()
        );

      await rest.put(
        Routes.applicationCommands(
          process.env.CLIENT_ID
        ),
        {
          body: commands
        }
      );

      console.log(
        `✅ Registered ${commands.length} GLOBAL commands.`
      );

      console.log(
        "🌍 Commands available in all servers."
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
  }
);

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

      if (
        interaction.isChatInputCommand()
      ) {
        const command =
          client.commands.get(
            interaction.commandName
          );

        if (!command) {
          return;
        }

        await command.execute(
          interaction
        );

        return;
      }

      // =================================
      // AUTOMOD INTERACTIONS
      // =================================

      if (
        interaction.isButton() ||
        interaction.isStringSelectMenu() ||
        interaction.isModalSubmit()
      ) {

        const customId =
          interaction.customId || "";

        if (
          customId.startsWith(
            "automod_"
          )
        ) {

          // -----------------------------
          // BAD WORD MODAL
          // -----------------------------

          if (
            interaction.isModalSubmit() &&
            customId ===
              "automod_words_modal"
          ) {

            if (
              !interaction.memberPermissions.has(
                "ManageGuild"
              )
            ) {
              return interaction.reply({
                content:
                  "❌ Manage Server required.",
                flags: 64
              });
            }

            const configModule =
              require(
                "./automod/config"
              );

            const config =
              configModule.getConfig(
                interaction.guild.id
              );

            const input =
              interaction.fields
                .getTextInputValue(
                  "words"
                );

            const newWords =
              input
                .split(",")
                .map(
                  word =>
                    word.trim()
                )
                .filter(Boolean);

            if (
              !newWords.length
            ) {
              return interaction.reply({
                content:
                  "❌ No valid words provided.",
                flags: 64
              });
            }

            config.wordFilter.words ??=
              [];

            const existing =
              new Set(
                config.wordFilter.words.map(
                  word =>
                    String(word)
                      .toLowerCase()
                )
              );

            let added = 0;

            for (
              const word of newWords
            ) {

              const normalized =
                word.toLowerCase();

              if (
                !existing.has(
                  normalized
                )
              ) {
                config.wordFilter.words.push(
                  word
                );

                existing.add(
                  normalized
                );

                added++;
              }
            }

            configModule.updateConfig(
              interaction.guild.id,
              config
            );

            return interaction.reply({
              content:
                `✅ Added **${added}** new word(s).\n\n` +
                `🤬 Total blocked words: **${config.wordFilter.words.length}**`,
              flags: 64
            });
          }

          // -----------------------------
          // AUTOMOD PANEL
          // -----------------------------

          const handled =
            await autoModCommand.handle(
              interaction
            );

          if (handled) {
            return;
          }
        }
      }

      // =================================
      // MUSIC BUTTONS
      // =================================

      if (
        interaction.isButton()
      ) {

        const musicIds = [
          "music_pause",
          "music_skip",
          "music_stop",
          "music_loop",
          "music_queue",
          "music_shuffle"
        ];

        if (
          musicIds.includes(
            interaction.customId
          )
        ) {

          const queue =
            client.musicPlayer.nodes.get(
              interaction.guild.id
            );

          if (!queue) {
            return interaction.reply({
              content:
                "❌ Abhi music session active nahi hai.",
              flags: 64
            });
          }

          // -----------------------------
          // PAUSE
          // -----------------------------

          if (
            interaction.customId ===
            "music_pause"
          ) {

            const paused =
              queue.node.isPaused();

            queue.node.setPaused(
              !paused
            );

            return interaction.reply({
              content:
                paused
                  ? "▶️ Music resumed."
                  : "⏸️ Music paused.",
              flags: 64
            });
          }

          // -----------------------------
          // SKIP
          // -----------------------------

          if (
            interaction.customId ===
            "music_skip"
          ) {

            try {
              await queue.node.skip();

              return interaction.reply({
                content:
                  "⏭️ Skipped.",
                flags: 64
              });

            } catch (error) {
              return interaction.reply({
                content:
                  `❌ Skip failed: ${error.message}`,
                flags: 64
              });
            }
          }

          // -----------------------------
          // STOP
          // -----------------------------

          if (
            interaction.customId ===
            "music_stop"
          ) {

            clearTimers(
              interaction.guild.id
            );

            queue.delete();

            return interaction.reply({
              content:
                "⏹️ Music stopped.",
              flags: 64
            });
          }

          // -----------------------------
          // LOOP
          // -----------------------------

          if (
            interaction.customId ===
            "music_loop"
          ) {

            const mode =
              Number(
                queue.repeatMode
              );

            let nextMode;
            let label;
            let emoji;

            if (
              mode === 0
            ) {
              nextMode = 1;
              label = "Loop: Track";
              emoji = "🔂";

            } else if (
              mode === 1
            ) {
              nextMode = 2;
              label = "Loop: Queue";
              emoji = "🔁";

            } else {
              nextMode = 0;
              label = "Loop: Off";
              emoji = "⛔";
            }

            queue.setRepeatMode(
              nextMode
            );

            const rows =
              interaction.message.components.map(
                row =>
                  new ActionRowBuilder()
                    .addComponents(
                      row.components.map(
                        component => {

                          const button =
                            ButtonBuilder.from(
                              component
                            );

                          if (
                            component.customId ===
                            "music_loop"
                          ) {
                            button
                              .setLabel(
                                label
                              )
                              .setEmoji(
                                emoji
                              );
                          }

                          return button;
                        }
                      )
                    )
              );

            return interaction.update({
              components: rows
            });
          }

          // -----------------------------
          // QUEUE
          // -----------------------------

          if (
            interaction.customId ===
            "music_queue"
          ) {

            const current =
              queue.currentTrack;

            if (!current) {
              return interaction.reply({
                content:
                  "📭 Queue empty hai.",
                flags: 64
              });
            }

            const tracks =
              queue.tracks.toArray();

            let text =
              `🎵 **Now Playing:** ${current.title}\n\n`;

            if (
              !tracks.length
            ) {
              text +=
                "📭 No more songs in queue.";
            } else {
              text +=
                tracks
                  .slice(0, 10)
                  .map(
                    (
                      track,
                      index
                    ) =>
                      `**${index + 1}.** ${track.title}`
                  )
                  .join("\n");
            }

            return interaction.reply({
              content: text,
              flags: 64
            });
          }

          // -----------------------------
          // SHUFFLE
          // -----------------------------

          if (
            interaction.customId ===
            "music_shuffle"
          ) {

            queue.tracks.shuffle();

            return interaction.reply({
              content:
                "🔀 Queue shuffled.",
              flags: 64
            });
          }
        }
      }

      // =================================
      // TICKET SYSTEM
      // =================================

      if (
        interaction.isButton() ||
        interaction.isModalSubmit() ||
        interaction.isChannelSelectMenu() ||
        interaction.isRoleSelectMenu() ||
        interaction.isStringSelectMenu()
      ) {

        let handled = false;

        // -----------------------------
        // TICKET COMMAND
        // -----------------------------

        try {

          const ticketCommand =
            client.commands.get(
              "ticket"
            );

          if (
            ticketCommand &&
            typeof ticketCommand.handle ===
              "function"
          ) {

            handled =
              await ticketCommand.handle(
                interaction
              );
          }

        } catch (error) {

          console.error(
            "❌ Ticket Setup Error:",
            error
          );
        }

        if (handled) {
          return;
        }

        // -----------------------------
        // TICKET EVENTS
        // -----------------------------

        try {

          const tickets =
            require(
              "./events/tickets"
            );

          if (
            typeof tickets.handle ===
              "function"
          ) {

            handled =
              await tickets.handle(
                interaction
              );
          }

        } catch (error) {

          console.error(
            "❌ Ticket System Error:",
            error
          );
        }

        if (handled) {
          return;
        }
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
          flags: 64
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
