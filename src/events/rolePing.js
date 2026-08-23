const {
  PermissionsBitField,
  EmbedBuilder
} = require("discord.js");

const store =
  require("../utils/rolePingStore");

const fs = require("fs");
const path = require("path");

// =====================================
// CENTRAL LOG CONFIG
// =====================================

const logsFile = path.join(
  __dirname,
  "../utils/logsData.json"
);

function getRolePingLogChannelId(guildId) {
  try {
    if (!fs.existsSync(logsFile)) {
      return null;
    }

    const data = JSON.parse(
      fs.readFileSync(logsFile, "utf8")
    );

    return data[guildId]?.rolePing || null;
  } catch (error) {
    console.error(
      "❌ Logs config error:",
      error.message
    );

    return null;
  }
}

// =====================================
// ROLE PING SYSTEM
// =====================================

module.exports = {
  async execute(message) {
    try {
      // Ignore DMs
      if (!message.guild) return;

      // Ignore bots
      if (message.author.bot) return;

      // Member must exist
      if (!message.member) return;

      // =================================
      // ADMINISTRATOR BYPASS
      // =================================

      if (
        message.member.permissions.has(
          PermissionsBitField.Flags.Administrator
        )
      ) {
        return;
      }

      const detected = [];

      // =================================
      // DIRECT ROLE MENTIONS
      // <@&ROLE_ID>
      // =================================

      const roleMatches = [
        ...message.content.matchAll(
          /<@&(\d+)>/g
        )
      ];

      for (const match of roleMatches) {
        const roleId = match[1];

        const role =
          message.guild.roles.cache.get(
            roleId
          );

        if (!role) continue;

        if (
          store.isProtected(roleId)
        ) {
          detected.push({
            type: "role",
            role
          });
        }
      }

      // =================================
      // USER MENTIONS
      // <@USER_ID>
      // <@!USER_ID>
      // =================================

      const userMatches = [
        ...message.content.matchAll(
          /<@!?(\d+)>/g
        )
      ];

      for (const match of userMatches) {
        const userId = match[1];

        const member =
          await message.guild.members
            .fetch(userId)
            .catch(() => null);

        if (!member) continue;

        for (
          const role
          of member.roles.cache.values()
        ) {
          if (
            store.isProtected(role.id)
          ) {
            detected.push({
              type: "user",
              member,
              role
            });
          }
        }
      }

      // =================================
      // NOTHING PROTECTED DETECTED
      // =================================

      if (!detected.length) {
        return;
      }

      console.log(
        `🎯 Protected targets detected: ${detected.length}`
      );

      // =================================
      // CHECK PERMISSIONS
      // =================================

      const blocked = [];

      for (const target of detected) {
        const allowed =
          store.canPing(
            message.member,
            target.role.id
          );

        console.log(
          `🔐 ${message.author.tag} -> ${target.role.name} = ${
            allowed
              ? "ALLOWED"
              : "BLOCKED"
          }`
        );

        if (!allowed) {
          blocked.push(target);
        }
      }

      // Everything allowed
      if (!blocked.length) {
        return;
      }

      console.log(
        `🚨 Unauthorized protected ping: ${message.author.tag} | ${blocked.length}`
      );

      // =================================
      // DELETE MESSAGE
      // =================================

      const deleted =
        await message.delete()
          .then(() => true)
          .catch(error => {
            console.error(
              "❌ Message delete failed:",
              error.message
            );

            return false;
          });

      // =================================
      // TIMEOUT
      // 2 OR MORE UNAUTHORIZED TARGETS
      // =================================

      let timedOut = false;

      let timeoutReason =
        "Not required";

      if (blocked.length >= 2) {
        try {
          const offender =
            await message.guild.members.fetch(
              message.author.id
            );

          const botMember =
            await message.guild.members.fetchMe();

          // Bot permission check
          if (
            !botMember.permissions.has(
              PermissionsBitField.Flags.ModerateMembers
            )
          ) {
            timeoutReason =
              "Bot does not have Moderate Members permission.";

            console.error(
              `❌ ${timeoutReason}`
            );
          }

          // Role hierarchy check
          else if (
            !offender.moderatable
          ) {
            timeoutReason =
              "Member cannot be moderated due to role hierarchy.";

            console.error(
              `❌ ${timeoutReason}`
            );
          }

          // Apply timeout
          else {
            await offender.timeout(
              60 * 1000,
              "Multiple unauthorized protected-role pings"
            );

            timedOut = true;

            console.log(
              `⏱️ TIMEOUT SUCCESS: ${offender.user.tag}`
            );
          }
        } catch (error) {
          timeoutReason =
            error.message;

          console.error(
            "❌ TIMEOUT FAILED:",
            error.message
          );
        }
      }

      // =================================
      // WARNING MESSAGE
      // =================================

      let warningText;

      if (timedOut) {
        warningText =
          "🚫 Multiple unauthorized protected-role pings detected.\n" +
          "⏱️ You have been timed out for **1 minute**.";
      } else if (
        blocked.length >= 2
      ) {
        warningText =
          "🚫 Multiple unauthorized protected-role pings detected.\n" +
          `⚠️ Timeout failed: ${timeoutReason}`;
      } else {
        warningText =
          "❌ You are not allowed to ping that protected role/member.";
      }

      const warningMessage =
        await message.channel
          .send({
            content: warningText
          })
          .catch(error => {
            console.error(
              "❌ Warning message failed:",
              error.message
            );

            return null;
          });

      if (warningMessage) {
        setTimeout(() => {
          warningMessage
            .delete()
            .catch(() => {});
        }, 7000);
      }

      // =================================
      // CENTRAL ROLE-PING LOG CHANNEL
      // =================================

      const logChannelId =
        getRolePingLogChannelId(
          message.guild.id
        );

      console.log(
        `📋 Role-ping log channel: ${
          logChannelId || "NOT CONFIGURED"
        }`
      );

      if (!logChannelId) {
        console.log(
          "⚠️ Run /logs setup first."
        );

        return;
      }

      const logChannel =
        message.guild.channels.cache.get(
          logChannelId
        );

      if (
        !logChannel ||
        !logChannel.isTextBased()
      ) {
        console.error(
          "❌ Role-ping log channel not found."
        );

        return;
      }

      // =================================
      // TARGET INFORMATION
      // =================================

      const targetInfo =
        blocked
          .map(target => {
            if (target.type === "user") {
              return (
                `👤 **${target.member.user.tag}**\n` +
                `User ID: \`${target.member.id}\`\n` +
                `Protected Role: **${target.role.name}**\n` +
                `Role ID: \`${target.role.id}\``
              );
            }

            return (
              `🎭 **${target.role.name}**\n` +
              `Role ID: \`${target.role.id}\``
            );
          })
          .join("\n\n")
          .slice(0, 1024);

      // =================================
      // LOG EMBED
      // =================================

      const embed =
        new EmbedBuilder()
          .setTitle(
            "🚨 Unauthorized Role Ping"
          )
          .addFields(
            {
              name: "👤 Offender",
              value:
                `${message.author.tag}\n` +
                `ID: \`${message.author.id}\``
            },
            {
              name: "📍 Channel",
              value:
                `${message.channel}\n` +
                `ID: \`${message.channel.id}\``
            },
            {
              name: "🎯 Protected Target",
              value:
                targetInfo ||
                "Unknown"
            },
            {
              name: "🔢 Unauthorized Pings",
              value:
                String(blocked.length),
              inline: true
            },
            {
              name: "🗑️ Message Deleted",
              value:
                deleted
                  ? "Yes"
                  : "No",
              inline: true
            },
            {
              name: "⏱️ Timeout",
              value:
                timedOut
                  ? "1 minute"
                  : blocked.length >= 2
                    ? "Failed"
                    : "Not required",
              inline: true
            }
          )
          .setTimestamp();

      // =================================
      // SEND LOG
      // =================================

      await logChannel
        .send({
          embeds: [embed]
        })
        .then(() => {
          console.log(
            "✅ Role-ping log sent."
          );
        })
        .catch(error => {
          console.error(
            "❌ Role-ping log failed:",
            error.message
          );
        });

    } catch (error) {
      console.error(
        "❌ Role Ping System Error:",
        error
      );
    }
  }
};
