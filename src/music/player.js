
const { Player } = require("discord-player");
const { DefaultExtractors } = require("@discord-player/extractor");

const endTimers = new Map();
const emptyTimers = new Map();

const TWO_HOURS = 2 * 60 * 60 * 1000;
const FIVE_MINUTES = 5 * 60 * 1000;

function clearTimers(guildId) {
  const a = endTimers.get(guildId);
  const b = emptyTimers.get(guildId);

  if (a) clearTimeout(a);
  if (b) clearTimeout(b);

  endTimers.delete(guildId);
  emptyTimers.delete(guildId);
}

function startEmptyTimer(queue) {
  const guildId = queue.guild.id;
  if (emptyTimers.has(guildId)) return;

  const timer = setTimeout(() => {
    emptyTimers.delete(guildId);

    const current = queue.player.nodes.get(guildId);
    if (!current?.channel) return;

    const humans = current.channel.members.filter(
      member => !member.user.bot
    );

    if (!humans.size) current.delete();
  }, FIVE_MINUTES);

  emptyTimers.set(guildId, timer);
}

function cancelEmptyTimer(guildId) {
  const timer = emptyTimers.get(guildId);
  if (timer) clearTimeout(timer);
  emptyTimers.delete(guildId);
}

function startEndTimer(queue) {
  const guildId = queue.guild.id;
  if (endTimers.has(guildId)) return;

  const timer = setTimeout(() => {
    endTimers.delete(guildId);
    const current = queue.player.nodes.get(guildId);
    if (current) current.delete();
  }, TWO_HOURS);

  endTimers.set(guildId, timer);
}

function createMusicPlayer(client) {
  const player = new Player(client);

  player.extractors.loadMulti(DefaultExtractors);

  player.events.on("playerStart", (queue, track) => {
    clearTimers(queue.guild.id);

    console.log(
      `🎵 ${queue.guild.name}: ${track.title}`
    );
  });

  player.events.on("emptyQueue", queue => {
    startEndTimer(queue);
  });

  player.events.on("emptyChannel", queue => {
    startEmptyTimer(queue);
  });

  player.events.on("debug", (queue, message) => {
    if (message) {
      console.log(`[MUSIC ${queue.guild.id}] ${message}`);
    }
  });

  console.log("🎵 Music Player initialized.");
  return player;
}

function getQueue(interaction) {
  return interaction.client.musicPlayer?.nodes.get(
    interaction.guild?.id
  );
}

async function musicAction(interaction, action) {
  const queue = getQueue(interaction);

  if (!queue) {
    return interaction.reply({
      content: "📭 Music queue active nahi hai.",
      ephemeral: true
    });
  }

  try {
    switch (action) {
      case "pause":
        if (!queue.node.isPaused()) {
          queue.node.pause();
          return interaction.reply("⏸️ Music paused.");
        }
        queue.node.resume();
        return interaction.reply("▶️ Music resumed.");

      case "skip":
        queue.node.skip();
        return interaction.reply("⏭️ Skipped.");

      case "stop":
        queue.delete();
        return interaction.reply("⏹️ Music stopped.");

      case "shuffle":
        queue.tracks.shuffle();
        return interaction.reply("🔀 Queue shuffled.");

      case "loop":
        {
          const mode = queue.repeatMode === 0 ? 1 : 0;
          queue.setRepeatMode(mode);
          return interaction.reply(
            mode ? "🔁 Loop enabled." : "➡️ Loop disabled."
          );
        }

      case "vol_down":
        {
          const current = queue.node.volume || 100;
          const volume = Math.max(0, current - 10);
          queue.node.setVolume(volume);
          return interaction.reply(`🔉 Volume: **${volume}%**`);
        }

      case "vol_up":
        {
          const current = queue.node.volume || 100;
          const volume = Math.min(150, current + 10);
          queue.node.setVolume(volume);
          return interaction.reply(`🔊 Volume: **${volume}%**`);
        }

      case "queue":
        {
          const tracks = queue.tracks.toArray();

          if (!tracks.length) {
            return interaction.reply("📭 Queue empty hai.");
          }

          const text = tracks
            .slice(0, 15)
            .map((t, i) => `**${i + 1}.** ${t.title}`)
            .join("\n");

          return interaction.reply({
            content:
              `📜 **Queue**\n\n${text}` +
              (tracks.length > 15
                ? `\n\n...and ${tracks.length - 15} more`
                : "")
          });
        }
    }
  } catch (err) {
    console.error("❌ Music action:", err);

    if (!interaction.replied && !interaction.deferred) {
      return interaction.reply({
        content: `❌ Music action failed: ${err.message}`,
        ephemeral: true
      });
    }
  }
}

module.exports = {
  createMusicPlayer,
  clearTimers,
  startEmptyTimer,
  cancelEmptyTimer,
  musicAction
};
