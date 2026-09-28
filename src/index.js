const vmGlobalPanel=require("./voicemaster/globalPanel");
const voiceMasterStaff = require("./voicemaster/staff");
const ticketSystem = require("./events/ticketSystem");
const antiNukeCommand = require("./commands/antinuke");
const autoModCommand = require("./commands/automod");
const logsCommand = require("./commands/logs");
const festival = require("./events/festival");
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
const autoRole = require("./events/autorole");
const autoResponder = require("./events/autoresponder");
const memberLogs = require("./events/memberLogs");
const voiceLogs = require("./events/voiceLogs");
const voiceMaster = require("./events/voiceMaster");
const channelLogs = require("./events/channelLogs");
const messageLogs = require("./events/messageLogs");


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

antiNuke.init(client);
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
// AUTOROLE
// =====================================

client.on("guildMemberAdd", async member => {
  try {
    await autoRole.handle(member);
  } catch (error) {
    console.error(
      "❌ Autorole Error:",
      error
    );
  }
});

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


client.on("voiceStateUpdate", async (oldState, newState) => {
  try {
    const guild = newState.guild || oldState.guild;
    if (!guild) return;

    const cfg = voiceMasterStaff.get(guild.id);
    if (!cfg?.enabled || !cfg.roleId) return;

    const role = guild.roles.cache.get(cfg.roleId);
    if (!role) return;

    const category = guild.channels.cache.find(
      c =>
        c.type === 4 &&
        c.name === "༺🔊 VIOLATE VC MASTER ༻"
    );

    if (!category) return;

    for (const channel of category.children.cache.values()) {
      if (channel.type !== 2) continue;
      if (channel.name === "ᴊᴏɪɴ・ᴛᴏ・ᴄʀᴇᴀᴛᴇ") continue;

      await channel.permissionOverwrites.edit(role.id, {
        ViewChannel: true,
        Connect: true
      }).catch(() => {});
    }
  } catch {}
});

client.once("ready", async () => {
  festival.init(client);
  memberLogs.init(client);
  voiceLogs.init(client);
  voiceMaster.init(client);
  channelLogs.init(client);
  messageLogs.init(client);
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
      // TICKET SYSTEM
      // =================================

      if (
        interaction.isStringSelectMenu() ||
        interaction.isButton() ||
        interaction.isRoleSelectMenu() ||
        interaction.isChannelSelectMenu() ||
        interaction.isModalSubmit()
      ) {
        const handled =
          await ticketSystem.handleInteraction(interaction);

        if (handled) return;
      }

      // =================================
      // AUTOMOD PANEL
      // =================================

      if (
        interaction.isButton() ||
        interaction.isModalSubmit() ||
        interaction.isStringSelectMenu()
      ) {
        const handled =
          await autoModCommand.handle(interaction);

        if (handled) return;
      }

      // =================================
      // ANTINUKE PANEL
      // =================================

      if (
        interaction.isButton() ||
        interaction.isModalSubmit() ||
        interaction.isStringSelectMenu()
      ) {
        const handled =
          await antiNukeCommand.handle?.(interaction);

        if (handled) return;
      }

      // =================================
      // LOGS PANEL
      // =================================

      if (
        interaction.isButton() ||
        interaction.isChannelSelectMenu()
      ) {
        const handled =
          await logsCommand.handleInteraction(interaction);

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
// EXTRA OWNER COMMANDS
// =====================================

const extraOwnerManager =
  require("./utils/extraOwnerManager");

client.on("messageCreate", async message => {
  try {
    if (!message.guild || message.author.bot) return;

    const content = message.content.trim();

    if (!content.toLowerCase().startsWith("!extraowner")) {
      return;
    }

    // ONLY MAIN BOT OWNER
    if (!extraOwnerManager.isMainOwner(message.author.id)) {
      await message.reply(
        "❌ Only the main bot owner can manage Extra Owners."
      );
      return;
    }

    const args = content.split(/\s+/);
    const action = args[1]?.toLowerCase();

    if (action === "add") {
      const member =
        message.mentions.members.first();

      if (!member) {
        await message.reply(
          "❌ Usage: `!extraowner add @user`"
        );
        return;
      }

      if (extraOwnerManager.isMainOwner(member.id)) {
        await message.reply(
          "ℹ️ You are already the Main Bot Owner."
        );
        return;
      }

      if (extraOwnerManager.add(member.id)) {
        await message.reply(
          `✅ ${member} is now an **Extra Owner**.`
        );
      } else {
        await message.reply(
          `ℹ️ ${member} is already an Extra Owner.`
        );
      }

      return;
    }

    if (action === "remove") {
      const member =
        message.mentions.members.first();

      if (!member) {
        await message.reply(
          "❌ Usage: `!extraowner remove @user`"
        );
        return;
      }

      if (extraOwnerManager.remove(member.id)) {
        await message.reply(
          `✅ ${member} has been removed from Extra Owners.`
        );
      } else {
        await message.reply(
          `ℹ️ ${member} is not an Extra Owner.`
        );
      }

      return;
    }

    if (action === "list") {
      const users = extraOwnerManager.list();

      if (!users.length) {
        await message.reply(
          "📋 No Extra Owners are currently configured."
        );
        return;
      }

      const list = users
        .map((id, index) => `${index + 1}. <@${id}>`)
        .join("\n");

      await message.reply(
        `👑 **Extra Owners**\n\n${list}`
      );

      return;
    }

    await message.reply(
      "❌ Usage:\n" +
      "`!extraowner add @user`\n" +
      "`!extraowner remove @user`\n" +
      "`!extraowner list`"
    );

  } catch (error) {
    console.error(
      "❌ Extra Owner Error:",
      error
    );
  }
});

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


/* ================================
   VIOLATE MANAGER LEVELING SYSTEM
   ================================ */
try {
  const leveling = require("./utils/leveling");

  client.on("messageCreate", async (message) => {
    try {
      await leveling.handleMessage(message);
    } catch (error) {
      console.error("❌ Leveling error:", error);
    }
  });

  console.log("🎮 Leveling system loaded.");
} catch (error) {
  console.error("❌ Failed to load Leveling system:", error);
}


/* =================================
   VIOLATE YOUTUBE RSS ANNOUNCER
   ================================= */
try {
  const ytAnnounce = require("./ytannonce/manager");
  ytAnnounce.init(client);
} catch (error) {
  console.error("❌ YouTube RSS announcer failed:", error);
}


// VIOLATE MUSIC BUTTON HANDLER
client.on("interactionCreate", async interaction => {
  if (!interaction.isButton()) return;

  const ids = [
    "music_pause",
    "music_skip",
    "music_stop",
    "music_shuffle",
    "music_loop",
    "music_queue",
    "music_vol_down",
    "music_vol_up"
  ];

  if (!ids.includes(interaction.customId)) return;

  try {
    const { musicAction } = require("./music/player");

    const action = interaction.customId.replace("music_", "");

    await musicAction(interaction, action);
  } catch (error) {
    console.error("❌ Music button error:", error);

    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({
          content: "❌ Music button failed."
        });
      } else {
        await interaction.reply({
          content: "❌ Music button failed.",
          ephemeral: true
        });
      }
    } catch {}
  }
});

// Real API heartbeat/ping logging
setInterval(() => {
  const ping = client.ws.ping;

  if (Number.isFinite(ping) && ping >= 0) {
    console.log(`📡 Discord WebSocket: ${ping}ms`);
  }
}, 30000);


client.on("voiceStateUpdate", async (oldState, newState) => {
  try {
    const guild = newState.guild || oldState.guild;
    if (!guild) return;

    await voiceMasterStaff.applyStaffAccess(guild);
    await voiceMasterStaff.refreshPanel(guild);
  } catch {}
});

client.on("interactionCreate", async interaction => {
  try {
    if (interaction.isModalSubmit()) {
      const handled = await voiceMasterStaff.handleModal(interaction);
      if (handled) return;
    }

    if (
      interaction.isButton() ||
      interaction.isStringSelectMenu()
    ) {
      const handled = await voiceMasterStaff.handle(interaction);
      if (handled) return;
    }
  } catch (err) {
    console.error("❌ VoiceMaster Staff:", err);
  }
});


client.on("interactionCreate",async interaction=>{
 try{
  if(interaction.isModalSubmit()){
   if(await vmGlobalPanel.modal(interaction))return;
  }
  if(interaction.isButton()||interaction.isStringSelectMenu()){
   if(await vmGlobalPanel.handle(interaction))return;
  }
 }catch(e){console.error("VC Global Panel:",e)}
});

client.on("voiceStateUpdate",async(oldState,newState)=>{
 try{
  const guild=newState.guild||oldState.guild;
  if(!guild)return;
  await vmGlobalPanel.panel(guild);
 }catch{}
});
