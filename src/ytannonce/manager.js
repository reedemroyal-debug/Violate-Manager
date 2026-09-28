const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "data.json");

const DEFAULT = {
  enabled: true,
  discordChannel: null,
  youtubeUrl: null,
  channelId: null,
  message:
    "{everyone} **{type}**\n\n" +
    "🎬 **{title}**\n" +
    "📺 **{channel}**\n\n" +
    "🔗 {link}",
  everyone: true,
  embed: true,
  thumbnail: true,
  lastVideo: null
};

function load() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, "{}");
    }
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return {};
  }
}

function save(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function get(guildId) {
  const data = load();

  if (!data[guildId]) {
    data[guildId] = { ...DEFAULT };
    save(data);
  }

  data[guildId] = {
    ...DEFAULT,
    ...data[guildId]
  };

  return data[guildId];
}

function update(guildId, changes) {
  const data = load();

  data[guildId] = {
    ...DEFAULT,
    ...(data[guildId] || {}),
    ...changes
  };

  save(data);
  return data[guildId];
}

function extractChannelId(html) {
  const patterns = [
    /"channelId":"(UC[a-zA-Z0-9_-]+)"/,
    /"externalId":"(UC[a-zA-Z0-9_-]+)"/,
    /channel\/(UC[a-zA-Z0-9_-]+)/
  ];

  for (const regex of patterns) {
    const match = html.match(regex);
    if (match) return match[1];
  }

  return null;
}

async function resolveChannelId(url) {
  let target = url.trim();

  if (!/^https?:\/\//i.test(target)) {
    target = `https://${target}`;
  }

  const res = await fetch(target, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; VIOLATE-MANAGER/1.0)"
    }
  });

  if (!res.ok) {
    throw new Error(`YouTube returned HTTP ${res.status}`);
  }

  const html = await res.text();

  const channelId = extractChannelId(html);

  if (!channelId) {
    throw new Error(
      "Could not find YouTube channel ID from this URL."
    );
  }

  return channelId;
}

function decodeXML(text) {
  return text
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function tag(xml, name) {
  const match = xml.match(
    new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i")
  );

  return match ? decodeXML(match[1]).trim() : null;
}

async function getFeed(channelId) {
  const url =
    `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; VIOLATE-MANAGER/1.0)"
    }
  });

  if (!res.ok) {
    throw new Error(`YouTube RSS returned HTTP ${res.status}`);
  }

  return await res.text();
}

function parseFeed(xml) {
  const entries = [
    ...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/gi)
  ];

  return entries.map(match => {
    const item = match[1];

    const videoId = tag(item, "yt:videoId");
    const title = tag(item, "title");
    const author = tag(item, "name");
    const published = tag(item, "published");

    const thumbnail =
      videoId
        ? `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`
        : null;

    return {
      videoId,
      title,
      author,
      published,
      link: videoId
        ? `https://youtu.be/${videoId}`
        : null,
      thumbnail
    };
  });
}

function detectType(item) {
  const title = String(item.title || "").toLowerCase();

  if (
    title.includes("#shorts") ||
    title.includes("#short")
  ) {
    return "⚡ NEW SHORT";
  }

  return "📺 NEW VIDEO";
}

function renderMessage(template, item, config, type) {
  const everyone =
    config.everyone ? "@everyone" : "";

  return String(template)
    .replaceAll("{everyone}", everyone)
    .replaceAll("{title}", item.title || "New upload")
    .replaceAll("{link}", item.link || "")
    .replaceAll("{channel}", item.author || "YouTube")
    .replaceAll("{type}", type);
}

async function checkGuild(guild, config) {
  if (!config.enabled) return;
  if (!config.channelId) return;
  if (!config.discordChannel) return;

  const channel =
    guild.channels.cache.get(config.discordChannel);

  if (!channel) return;

  const xml = await getFeed(config.channelId);
  const entries = parseFeed(xml);

  if (!entries.length) return;

  const latest = entries[0];

  if (!latest.videoId) return;

  if (config.lastVideo === null) {
    update(guild.id, {
      lastVideo: latest.videoId
    });

    return;
  }

  if (config.lastVideo === latest.videoId) return;

  const type = detectType(latest);

  const content = renderMessage(
    config.message,
    latest,
    config,
    type
  );

  const payload = {
    content,
    allowedMentions: {
      parse: config.everyone
        ? ["everyone"]
        : []
    }
  };

  if (config.embed) {
    payload.embeds = [{
      color:
        type.includes("SHORT")
          ? 0xff00aa
          : 0x00ffff,

      title: latest.title || "New YouTube Upload",

      url: latest.link,

      description:
        `📺 **${latest.author || "YouTube"}**\n\n` +
        `[▶️ Watch now](${latest.link})`,

      thumbnail:
        config.thumbnail && latest.thumbnail
          ? { url: latest.thumbnail }
          : undefined,

      footer: {
        text: "VIOLATE MANAGER • YouTube Announcements"
      },

      timestamp:
        latest.published || new Date().toISOString()
    }];
  }

  await channel.send(payload);

  update(guild.id, {
    lastVideo: latest.videoId
  });

  console.log(
    `📺 YouTube announcement sent in ${guild.name}: ${latest.title}`
  );
}

async function check(client) {
  const data = load();

  for (const guildId of Object.keys(data)) {
    const guild = client.guilds.cache.get(guildId);

    if (!guild) continue;

    try {
      await checkGuild(guild, get(guildId));
    } catch (error) {
      console.error(
        `❌ YouTube RSS error [${guild.name}]:`,
        error.message
      );
    }
  }
}

function init(client) {
  console.log("📺 YouTube RSS Auto Announcement loaded.");

  setTimeout(() => {
    check(client).catch(console.error);
  }, 10000);

  setInterval(() => {
    check(client).catch(console.error);
  }, 60000);
}

module.exports = {
  init,
  get,
  update,
  resolveChannelId
};
