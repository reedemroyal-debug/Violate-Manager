
const SpotifyWebApi = require("spotify-web-api-node");

let spotify = null;

function getSpotify() {
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!id || !secret) return null;

  if (!spotify) {
    spotify = new SpotifyWebApi({
      clientId: id,
      clientSecret: secret
    });
  }

  return spotify;
}

async function searchSpotify(query) {
  const api = getSpotify();
  if (!api) return null;

  try {
    const token = await api.clientCredentialsGrant();
    api.setAccessToken(token.body.access_token);

    const result = await api.searchTracks(query, { limit: 5 });
    return result.body.tracks.items || [];
  } catch (err) {
    console.error("❌ Spotify API:", err.message);
    return null;
  }
}

module.exports = { getSpotify, searchSpotify };
