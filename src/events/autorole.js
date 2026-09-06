const fs = require("fs");
const path = require("path");

const DATA = path.join(
  __dirname,
  "../utils/autorole.json"
);

function load() {
  try {
    return JSON.parse(
      fs.readFileSync(DATA, "utf8")
    );
  } catch {
    return {
      enabled: true,
      roles: []
    };
  }
}

module.exports = {
  async handle(member) {
    if (!member || !member.guild) return;

    const data = load();

    if (!data.enabled || !data.roles.length) return;

    const botMember =
      member.guild.members.me;

    if (!botMember) return;

    for (const roleId of data.roles) {
      const role =
        member.guild.roles.cache.get(roleId);

      if (!role) continue;
      if (role.managed) continue;

      if (
        role.position >=
        botMember.roles.highest.position
      ) {
        console.log(
          `⚠️ Cannot assign autorole ${role.name}: role is above my highest role.`
        );
        continue;
      }

      if (member.roles.cache.has(role.id)) {
        continue;
      }

      try {
        await member.roles.add(
          role,
          "Autorole system"
        );

        console.log(
          `✅ Autorole ${role.name} given to ${member.user.tag}`
        );
      } catch (error) {
        console.error(
          `❌ Failed to give autorole ${role.name}:`,
          error
        );
      }
    }
  }
};
