const { Player } = require("discord-player");
const {
  DefaultExtractors
} = require("@discord-player/extractor");

const endTimers = new Map();
const emptyTimers = new Map();

const TWO_HOURS = 2 * 60 * 60 * 1000;
const FIVE_MINUTES = 5 * 60 * 1000;

function clearTimers(guildId) {
  const end = endTimers.get(guildId);
  const empty = emptyTimers.get(guildId);

  if (end) clearTimeout(end);
  if (empty) clearTimeout(empty);

  endTimers.delete(guildId);
  emptyTimers.delete(guildId);
}

function startEmptyTimer(queue) {
  const guildId = queue.guild.id;

  if (emptyTimers.has(guildId)) return;

  console.log(
    `⏱️ ${queue.guild.name}: VC empty, 5-minute timer started.`
  );

  const timer = setTimeout(() => {
    emptyTimers.delete(guildId);

    const current = queue.player.nodes.get(guildId);

    if (!current) return;

    const channel = current.channel;

    if (!channel) return;

    const humans = channel.members.filter(
      member => !member.user.bot
    );

    if (humans.size === 0) {
      console.log(
        `🚪 ${queue.guild.name}: VC empty for 5 minutes. Leaving.`
      );

      current.delete();
    }
  }, FIVE_MINUTES);

  emptyTimers.set(guildId, timer);
}

function cancelEmptyTimer(guildId) {
  const timer = emptyTimers.get(guildId);

  if (!timer) return;

  clearTimeout(timer);
  emptyTimers.delete(guildId);

  console.log(
    `👤 ${guildId}: Member returned, empty timer cancelled.`
  );
}

function startEndTimer(queue) {
  const guildId = queue.guild.id;

  if (endTimers.has(guildId)) return;

  console.log(
    `⏱️ ${queue.guild.name}: Queue finished, staying for 2 hours.`
  );

  const timer = setTimeout(() => {
    endTimers.delete(guildId);

    const current = queue.player.nodes.get(guildId);

    if (!current) return;

    console.log(
      `🚪 ${queue.guild.name}: 2-hour music idle period finished.`
    );

    current.delete();
  }, TWO_HOURS);

  endTimers.set(guildId, timer);
}

function createMusicPlayer(client) {
  const player = new Player(client);

  player.extractors.loadMulti(DefaultExtractors);

  player.events.on("playerStart", (queue, track) => {
    clearTimers(queue.guild.id);

    console.log(
      `🎵 Playing: ${track.title} | ${queue.guild.name}`
    );
  });

  player.events.on("emptyQueue", queue => {
    startEndTimer(queue);
  });

  player.events.on("emptyChannel", queue => {
    startEmptyTimer(queue);
  });

  player.events.on("debug", (queue, message) => {
    console.log(
      `[MUSIC ${queue.guild.id}] ${message}`
    );
  });

  console.log("🎵 Music Player initialized.");

  return player;
}

module.exports = {
  createMusicPlayer,
  clearTimers,
  startEmptyTimer,
  cancelEmptyTimer
};
