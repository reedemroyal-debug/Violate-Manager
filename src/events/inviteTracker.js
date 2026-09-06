const fs = require("fs");
const path = require("path");

const DATA = path.join(__dirname, "../utils/inviteData.json");

function load() {
  try {
    return JSON.parse(fs.readFileSync(DATA, "utf8"));
  } catch {
    return {};
  }
}

function save(data) {
  fs.writeFileSync(DATA, JSON.stringify(data, null, 2));
}

function getGuildData(guildId) {
  const data = load();

  data[guildId] ??= {
    enabled: false,
    channelId: null,
    users: {}
  };

  return {
    data,
    guild: data[guildId]
  };
}

function ensureUser(guildData, userId) {
  guildData.users[userId] ??= {
    invites: 0,
    leaves: 0,
    fake: 0,
    invited: {}
  };

  return guildData.users[userId];
}

/*
 * Cache:
 * guildId -> Map(inviteCode, uses)
 */
const inviteCache = new Map();

async function cacheGuildInvites(guild) {
  try {
    const invites = await guild.invites.fetch();

    const map = new Map();

    for (const invite of invites.values()) {
      map.set(invite.code, {
        uses: invite.uses || 0,
        inviterId: invite.inviter?.id || null
      });
    }

    inviteCache.set(guild.id, map);

    return map;
  } catch (error) {
    console.error(
      `❌ Invite cache failed for ${guild.name}:`,
      error.message
    );

    return new Map();
  }
}

async function init(client) {
  for (const guild of client.guilds.cache.values()) {
    await cacheGuildInvites(guild);
  }

  console.log("📨 Invite tracker initialized.");
}

function findUsedInvite(oldMap, newMap) {
  for (const [code, current] of newMap.entries()) {
    const old = oldMap.get(code);

    if (!old && current.uses > 0) {
      return {
        code,
        inviterId: current.inviterId
      };
    }

    if (
      old &&
      current.uses > old.uses
    ) {
      return {
        code,
        inviterId: current.inviterId
      };
    }
  }

  return null;
}

function isFake(member) {
  const created = member.user.createdTimestamp;

  if (!created) return false;

  const age =
    Date.now() - created;

  const sevenDays =
    7 * 24 * 60 * 60 * 1000;

  return age < sevenDays;
}

async function handleJoin(member) {
  const guild = member.guild;

  const { data, guild: guildData } =
    getGuildData(guild.id);

  if (!guildData.enabled) {
    await cacheGuildInvites(guild);
    return;
  }

  const oldMap =
    inviteCache.get(guild.id) ||
    new Map();

  const newMap =
    await cacheGuildInvites(guild);

  const usedInvite =
    findUsedInvite(oldMap, newMap);

  if (!usedInvite) {
    console.log(
      `⚠️ Could not determine inviter for ${member.user.tag}`
    );

    return;
  }

  const inviterId =
    usedInvite.inviterId;

  if (!inviterId) {
    return;
  }

  const inviter =
    await guild.members
      .fetch(inviterId)
      .catch(() => null);

  if (!inviter) {
    return;
  }

  const stats =
    ensureUser(guildData, inviterId);

  const fake =
    isFake(member);

  stats.invites++;

  if (fake) {
    stats.fake++;
  }

  stats.invited[member.id] = {
    username: member.user.username,
    joinedAt: Date.now(),
    fake,
    left: false
  };

  save(data);

  console.log(
    `📨 ${member.user.tag} was invited by ${inviter.user.tag}`
  );

  /*
   * Invite log
   */
  if (guildData.channelId) {
    const channel =
      guild.channels.cache.get(
        guildData.channelId
      );

    if (channel?.isTextBased()) {
      const type =
        fake
          ? "⚠️ Fake"
          : "✅ Real";

      await channel.send({
        content:
          `📥 **Member Joined**\n\n` +
          `👤 Member: ${member}\n` +
          `📨 Invited by: ${inviter}\n` +
          `🔗 Invite: \`${usedInvite.code}\`\n` +
          `📊 Invites: **${stats.invites}**\n` +
          `🏷️ Type: **${type}**`
      }).catch(() => {});
    }
  }
}

async function handleLeave(member) {
  const guild = member.guild;

  const { data, guild: guildData } =
    getGuildData(guild.id);

  if (!guildData.enabled) {
    return;
  }

  let changed = false;

  for (
    const [inviterId, stats]
    of Object.entries(guildData.users)
  ) {
    const invited =
      stats.invited?.[member.id];

    if (!invited || invited.left) {
      continue;
    }

    invited.left = true;
    invited.leftAt = Date.now();

    stats.leaves++;

    changed = true;

    break;
  }

  if (changed) {
    save(data);
  }
}

function getStats(guildId, userId) {
  const data = load();

  const guildData =
    data[guildId];

  if (!guildData) {
    return {
      invites: 0,
      leaves: 0,
      fake: 0,
      real: 0,
      invited: {}
    };
  }

  const stats =
    guildData.users?.[userId];

  if (!stats) {
    return {
      invites: 0,
      leaves: 0,
      fake: 0,
      real: 0,
      invited: {}
    };
  }

  return {
    invites: stats.invites || 0,
    leaves: stats.leaves || 0,
    fake: stats.fake || 0,
    real: Math.max(
      0,
      (stats.invites || 0) -
      (stats.fake || 0)
    ),
    invited: stats.invited || {}
  };
}

module.exports = {
  init,
  handleJoin,
  handleLeave,
  getStats,
  load,
  save,
  getGuildData
};
