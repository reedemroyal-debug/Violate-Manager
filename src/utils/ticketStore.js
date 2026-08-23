const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "../../tickets.json");

const DEFAULT_CATEGORIES = {
    general: {
        name: "General Support",
        emoji: "🎫",
        description: "General support and help.",
        categoryId: null,
        staffRoles: []
    },

    partnership: {
        name: "Partnership",
        emoji: "🤝",
        description: "Partnership requests.",
        categoryId: null,
        staffRoles: []
    },

    staff: {
        name: "Staff Application",
        emoji: "🛡️",
        description: "Apply for staff.",
        categoryId: null,
        staffRoles: []
    },

    report: {
        name: "Report Player",
        emoji: "🚨",
        description: "Report a player.",
        categoryId: null,
        staffRoles: []
    }
};

function load() {
    if (!fs.existsSync(DB_PATH)) {
        const data = { guilds: {} };
        save(data);
        return data;
    }

    try {
        return JSON.parse(
            fs.readFileSync(DB_PATH, "utf8")
        );
    } catch {
        const data = { guilds: {} };
        save(data);
        return data;
    }
}

function save(data) {
    fs.writeFileSync(
        DB_PATH,
        JSON.stringify(data, null, 2)
    );
}

function getGuild(data, guildId) {
    if (!data.guilds[guildId]) {
        data.guilds[guildId] = {
            counter: 0,

            panel: {
                title: "🎫 Support Center",
                description:
                    "Select a category below to open a private ticket.",
                color: 0x5865F2
            },

            categories: structuredClone(
                DEFAULT_CATEGORIES
            ),

            tickets: {}
        };
    }

    return data.guilds[guildId];
}

module.exports = {
    load,
    save,
    getGuild
};
