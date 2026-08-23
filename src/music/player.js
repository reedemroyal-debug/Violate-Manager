const { Player } = require("discord-player");
const {
  DefaultExtractors
} = require("@discord-player/extractor");

function createMusicPlayer(client) {
  const player = new Player(client);

  player.extractors.loadMulti(
    DefaultExtractors
  );

  console.log("🎵 Music Player initialized.");

  return player;
}

module.exports = {
  createMusicPlayer
};
